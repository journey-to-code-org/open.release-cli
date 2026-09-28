import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReleasePlan,
  parseArgs,
  validateRelease
} from "../src/index.js";

test("parseArgs defaults to patch release", () => {
  const result = parseArgs(["-m", "fix: example"]);

  assert.equal(result.release, "patch");
  assert.equal(result.message, "fix: example");
});

test("parseArgs supports current release", () => {
  const result = parseArgs([
    "current",
    "-m",
    "feat: establish v1"
  ]);

  assert.equal(result.release, "current");
});

test("parseArgs supports skip flags and dry-run", () => {
  const result = parseArgs([
    "minor",
    "-m",
    "feat: example",
    "--skip-tests",
    "--no-npm",
    "--no-github",
    "--dry-run"
  ]);

  assert.equal(result.skipTests, true);
  assert.equal(result.npm, false);
  assert.equal(result.github, false);
  assert.equal(result.dryRun, true);
});

test("parseArgs supports remote and access options", () => {
  const result = parseArgs([
    "patch",
    "-m",
    "fix: example",
    "--remote",
    "upstream",
    "--access",
    "restricted"
  ]);

  assert.equal(result.remote, "upstream");
  assert.equal(result.access, "restricted");
});

test("parseArgs requires a source commit message", () => {
  assert.throws(
    () => parseArgs(["patch"]),
    /commit message/u
  );
});

test("validateRelease accepts supported values", () => {
  for (const value of [
    "current",
    "patch",
    "minor",
    "major",
    "1.0.0",
    "2.1.0-beta.1"
  ]) {
    assert.doesNotThrow(() => validateRelease(value));
  }
});

test("validateRelease rejects invalid values", () => {
  assert.throws(() => validateRelease("banana"));
  assert.throws(() => validateRelease("1.2"));
});

test("patch plan runs tests, commit, version, push, npm, and GitHub", () => {
  const plan = buildReleasePlan({
    release: "patch",
    message: "fix: example",
    packageName: "@journey-to-code/example",
    packageVersion: "1.0.0",
    repoName: "example",
    branch: "main"
  });

  assert.deepEqual(
    plan.map((step) => step.label),
    [
      "Run tests",
      "Stage all changes",
      "Commit source changes",
      "Bump version (patch)",
      "Push commits and tags",
      "Inspect npm package",
      "Publish @journey-to-code/example to npm",
      "Create GitHub Release"
    ]
  );
});

test("current plan creates explicit current-version tag", () => {
  const plan = buildReleasePlan({
    release: "current",
    message: "feat: establish v1",
    packageName: "@journey-to-code/example",
    packageVersion: "1.0.0",
    repoName: "example",
    branch: "main"
  });

  const tagStep = plan.find(
    (step) =>
      step.type === "command" &&
      step.executable === "git" &&
      step.args[0] === "tag"
  );

  assert.ok(tagStep);
  assert.ok(tagStep.args.includes("v1.0.0"));
});

test("plan can omit tests, npm, and GitHub", () => {
  const plan = buildReleasePlan({
    release: "patch",
    message: "fix: example",
    skipTests: true,
    npm: false,
    github: false,
    packageName: "@journey-to-code/example",
    packageVersion: "1.0.0",
    repoName: "example",
    branch: "main"
  });

  assert.equal(plan.some((step) => step.label === "Run tests"), false);
  assert.equal(
    plan.some((step) => step.label.includes("Publish")),
    false
  );
  assert.equal(
    plan.some((step) => step.type === "github-release"),
    false
  );
});
