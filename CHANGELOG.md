# Changelog

## [1.0.3] - 2026-09-28

### Fixed

- Execute npm/npx through the Windows command processor instead of spawning
  `.cmd` shims directly.
- Preserve `shell: false` for normal executables and avoid PowerShell-specific
  behavior.
- Fix `spawnSync npm.cmd EINVAL` on Windows.

## [1.0.2] - 2026-09-28

### Added

- Integrate `@journey-to-code/open-preflight` as a default safety gate.
- Run preflight after local version/tag creation and before remote push/publish.
- Add `--skip-preflight` for intentional bypasses.

### Changed

- Treat the matching local version tag as expected during release preflight.
- Block remote release steps when any other preflight check fails.

## [1.0.1] - 2026-09-28

### Fixed

- Resolve `npm`/`npx` as `.cmd` executables on Windows when spawning commands
  without a shell.

## [1.0.0] - 2026-09-28

### Added

- `open-release` CLI
- `current`, `patch`, `minor`, `major`, and exact-version releases
- test-before-release workflow
- atomic source-change commit
- npm version commit/tag creation
- Git push with tags
- npm dry-run and publish
- GitHub Release creation through `gh`
- dry-run mode
- npm/GitHub skip flags
- configurable remote and npm access level
- Node.js test suite
- GitHub Actions CI
