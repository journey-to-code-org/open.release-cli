import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const cli = resolve("bin/open-release.js");

test("--version works without executing preflight", () => {
  const result = spawnSync(process.execPath, [cli, "--version"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout.trim(), /^1\.0\.4$/u);
});

test("--help works without executing preflight", () => {
  const result = spawnSync(process.execPath, [cli, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /open-release/u);
  assert.match(result.stdout, /--skip-preflight/u);
});
