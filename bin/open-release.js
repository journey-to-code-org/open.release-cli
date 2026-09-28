#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildReleasePlan, parseArgs } from "../src/index.js";

const TOOL_PACKAGE_PATH = resolve(
  fileURLToPath(new URL("../package.json", import.meta.url))
);

const HELP = `
open-release [current|patch|minor|major|x.y.z] -m "<commit message>" [options]

Options:
  -m, --message <text>   Source-change commit message
  --skip-tests           Skip npm test
  --skip-preflight       Skip open.preflight safety checks
  --no-npm               Skip npm pack and npm publish
  --no-github            Skip GitHub Release creation
  --remote <name>        Git remote to push (default: origin)
  --access <level>       npm access level (default: public)
  --dry-run              Print commands without executing
  -h, --help             Show help
  -V, --version          Show open.release version
`.trim();

async function main() {
  let args;

  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(error.message);
  }

  const toolPackage = readJson(TOOL_PACKAGE_PATH);

  if (args.help) {
    console.log(HELP);
    return;
  }

  if (args.version) {
    console.log(toolPackage.version);
    return;
  }

  const projectPackagePath = resolve(process.cwd(), "package.json");
  let projectPackage;

  try {
    projectPackage = readJson(projectPackagePath);
  } catch {
    fail("Could not read package.json from the current directory.");
  }

  if (!projectPackage.name || !projectPackage.version) {
    fail("package.json must contain name and version.");
  }

  ensureGitRepository(args.dryRun);

  const branch = readCommand("git", ["branch", "--show-current"], args.dryRun);
  if (!branch && !args.dryRun) {
    fail("Could not determine the current Git branch.");
  }

  const resolvedBranch = branch || "<current-branch>";
  const repoName = basename(process.cwd());

  if (args.npm && !args.dryRun) {
    requireExecutable("npm");
  }

  if (args.github && !args.dryRun) {
    requireExecutable("gh");
  }

  const plan = buildReleasePlan({
    release: args.release,
    message: args.message,
    skipTests: args.skipTests,
    skipPreflight: args.skipPreflight,
    npm: args.npm,
    github: args.github,
    remote: args.remote,
    access: args.access,
    packageName: projectPackage.name,
    packageVersion: projectPackage.version,
    repoName,
    branch: resolvedBranch
  });

  console.log(`\nReleasing ${projectPackage.name}@${projectPackage.version}`);
  console.log(`Mode: ${args.release}${args.dryRun ? " (dry run)" : ""}\n`);

  for (const step of plan) {
    await runStep(step, args.dryRun);
  }

  const finalPackage = args.dryRun
    ? projectPackage
    : readJson(projectPackagePath);

  console.log(`\n✓ Release workflow completed for ${finalPackage.name}@${finalPackage.version}`);
}

async function runStep(step, dryRun) {
  console.log(`→ ${step.label}`);

  if (step.type === "command") {
    runCommand(step.executable, step.args, dryRun);
    return;
  }

  if (step.type === "commit-if-needed") {
    if (dryRun) {
      console.log(`  $ git diff --cached --quiet`);
      console.log(`  $ git commit -m ${quote(step.message)}  # if staged changes exist`);
      return;
    }

    const diff = spawnSync("git", ["diff", "--cached", "--quiet"], {
      stdio: "ignore",
      shell: false
    });

    if (diff.status === 0) {
      console.log("  No staged source changes; skipping source commit.");
      return;
    }

    if (diff.status !== 1) {
      fail("Unable to inspect staged Git changes.");
    }

    runCommand("git", ["commit", "-m", step.message], false);
    return;
  }

  if (step.type === "preflight") {
    if (dryRun) {
      console.log(
        `  $ open-preflight --skip-tests${step.npm ? "" : " --skip-npm --skip-pack"}${step.github ? "" : " --skip-github"}`
      );
      console.log("  # matching local version tag is expected at this stage");
      return;
    }

    const runPreflight = await loadPreflight();

    const preflight = runPreflight({
      skipTests: true,
      skipPack: !step.npm,
      skipNpm: !step.npm,
      skipGithub: !step.github
    });

    const blockingFailures = preflight.checks.filter(
      (check) =>
        check.status === "fail" &&
        check.id !== "git-tag"
    );

    for (const check of preflight.checks) {
      const symbol =
        check.status === "pass"
          ? "✓"
          : check.status === "warn"
            ? "!"
            : check.id === "git-tag"
              ? "✓"
              : "✗";

      const message =
        check.id === "git-tag" && check.status === "fail"
          ? `${check.message} (expected: release tag was just created)`
          : check.message;

      console.log(`  ${symbol} ${message}`);
    }

    if (blockingFailures.length > 0) {
      fail(
        `preflight failed with ${blockingFailures.length} blocking check(s).`
      );
    }

    return;
  }

  if (step.type === "github-release") {
    if (dryRun) {
      console.log(
        `  $ gh release create v<version> --title ${quote(`${step.repoName} v<version>`)} --generate-notes --verify-tag`
      );
      return;
    }

    const pkg = readJson(resolve(process.cwd(), "package.json"));
    const tag = `v${pkg.version}`;

    runCommand(
      "gh",
      [
        "release",
        "create",
        tag,
        "--title",
        `${step.repoName} ${tag}`,
        "--generate-notes",
        "--verify-tag"
      ],
      false
    );
  }
}


async function loadPreflight() {
  try {
    const module = await import("@journey-to-code/open-preflight");

    if (typeof module.runPreflight !== "function") {
      fail(
        "@journey-to-code/open-preflight does not export runPreflight()."
      );
    }

    return module.runPreflight;
  } catch (error) {
    fail(
      [
        "Could not load @journey-to-code/open-preflight.",
        error instanceof Error ? error.message : String(error),
        "",
        "Try reinstalling open-release after repairing open-preflight."
      ].join("\n")
    );
  }
}

function runCommand(executable, args, dryRun) {
  if (dryRun) {
    console.log(`  $ ${formatCommand(executable, args)}`);
    return;
  }

  const result = spawnPortable(executable, args, {
    stdio: "inherit"
  });

  if (result.error) {
    fail(`${executable} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${executable} exited with status ${result.status}.`);
  }
}

function spawnPortable(executable, args, options = {}) {
  if (
    process.platform === "win32" &&
    (executable === "npm" || executable === "npx")
  ) {
    const commandProcessor = process.env.ComSpec || "cmd.exe";

    return spawnSync(
      commandProcessor,
      ["/d", "/s", "/c", buildWindowsCommand(executable, args)],
      {
        ...options,
        shell: false
      }
    );
  }

  return spawnSync(executable, args, {
    ...options,
    shell: false
  });
}

function buildWindowsCommand(executable, args) {
  return [executable, ...args]
    .map(quoteWindowsCmdArg)
    .join(" ");
}

function quoteWindowsCmdArg(value) {
  const string = String(value);

  if (/^[A-Za-z0-9_./:@%+=,-]+$/u.test(string)) {
    return string;
  }

  // cmd.exe uses doubled quotes inside a quoted argument.
  return `"${string.replace(/"/gu, '""')}"`;
}

function readCommand(executable, args, dryRun) {
  if (dryRun) {
    return "";
  }

  const result = spawnPortable(executable, args, {
    encoding: "utf8",
    stdio: "pipe"
  });

  if (result.error || result.status !== 0) {
    return "";
  }

  return result.stdout.trim();
}

function ensureGitRepository(dryRun) {
  if (dryRun) {
    return;
  }

  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    encoding: "utf8",
    shell: false
  });

  if (result.status !== 0 || result.stdout.trim() !== "true") {
    fail("The current directory is not a Git repository.");
  }
}

function requireExecutable(name) {
  const check = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(check, [name], {
    stdio: "ignore",
    shell: false
  });

  if (result.status !== 0) {
    fail(`Required executable not found: ${name}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function formatCommand(executable, args) {
  return [executable, ...args].map(quote).join(" ");
}

function quote(value) {
  const string = String(value);

  if (/^[A-Za-z0-9_./:@%+=,-]+$/u.test(string)) {
    return string;
  }

  return JSON.stringify(string);
}

function fail(message) {
  console.error(`\nopen-release: ${message}`);
  process.exit(1);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
