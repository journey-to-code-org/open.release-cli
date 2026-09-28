const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

export function parseArgs(argv) {
  const result = {
    release: null,
    message: null,
    skipTests: false,
    npm: true,
    github: true,
    remote: "origin",
    access: "public",
    dryRun: false,
    help: false,
    version: false
  };

  const args = [...argv];

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === "-h" || arg === "--help") {
      result.help = true;
      continue;
    }

    if (arg === "-V" || arg === "--version") {
      result.version = true;
      continue;
    }

    if (arg === "--skip-tests") {
      result.skipTests = true;
      continue;
    }

    if (arg === "--no-npm") {
      result.npm = false;
      continue;
    }

    if (arg === "--no-github") {
      result.github = false;
      continue;
    }

    if (arg === "--dry-run") {
      result.dryRun = true;
      continue;
    }

    if (arg === "-m" || arg === "--message") {
      const value = args.shift();
      if (!value) {
        throw new Error(`${arg} requires a commit message`);
      }
      result.message = value;
      continue;
    }

    if (arg === "--remote") {
      const value = args.shift();
      if (!value) {
        throw new Error("--remote requires a value");
      }
      result.remote = value;
      continue;
    }

    if (arg === "--access") {
      const value = args.shift();
      if (!value) {
        throw new Error("--access requires a value");
      }
      result.access = value;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (result.release !== null) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    result.release = arg;
  }

  if (!result.help && !result.version) {
    result.release ??= "patch";
    validateRelease(result.release);

    if (!result.message) {
      throw new Error(
        'A source commit message is required. Use -m "fix: describe the change".'
      );
    }
  }

  return result;
}

export function validateRelease(release) {
  if (
    release !== "current" &&
    release !== "patch" &&
    release !== "minor" &&
    release !== "major" &&
    !EXACT_VERSION.test(release)
  ) {
    throw new Error(
      `Invalid release "${release}". Use current, patch, minor, major, or x.y.z.`
    );
  }
}

export function buildReleasePlan({
  release,
  message,
  skipTests = false,
  npm = true,
  github = true,
  remote = "origin",
  access = "public",
  packageName,
  packageVersion,
  repoName,
  branch
}) {
  validateRelease(release);

  const steps = [];

  if (!skipTests) {
    steps.push(command("npm", ["test"], "Run tests"));
  }

  steps.push(command("git", ["add", "-A"], "Stage all changes"));

  // This is conditional at runtime. It commits only when staged changes exist.
  steps.push({
    type: "commit-if-needed",
    label: "Commit source changes",
    message
  });

  if (release === "current") {
    const tag = `v${packageVersion}`;
    steps.push(
      command(
        "git",
        ["tag", "-a", tag, "-m", `${repoName} ${tag}`],
        `Create ${tag}`
      )
    );
  } else {
    steps.push(
      command(
        "npm",
        ["version", release, "-m", "chore: release v%s"],
        `Bump version (${release})`
      )
    );
  }

  steps.push(
    command(
      "git",
      ["push", remote, branch, "--follow-tags"],
      "Push commits and tags"
    )
  );

  if (npm) {
    steps.push(command("npm", ["pack", "--dry-run"], "Inspect npm package"));
    steps.push(
      command(
        "npm",
        ["publish", "--access", access],
        `Publish ${packageName} to npm`
      )
    );
  }

  if (github) {
    steps.push({
      type: "github-release",
      label: "Create GitHub Release",
      repoName
    });
  }

  return steps;
}

function command(executable, args, label) {
  return {
    type: "command",
    executable,
    args,
    label
  };
}
