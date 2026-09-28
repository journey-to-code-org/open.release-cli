# open.release

A small CLI for the repetitive release flow used across the Journey to Code
open-source packages. It now uses `@journey-to-code/open-preflight` as a safety
gate before pushing or publishing.

It can:

1. run tests,
2. stage all changes,
3. create one source-change commit,
4. bump the npm version and create the Git tag,
5. run `open.preflight` against the release state,
6. push commits and tags,
7. inspect the npm package with `npm pack --dry-run`,
8. publish the package to npm,
9. create the matching GitHub Release.

## Install

Globally:

```bash
npm install --global @journey-to-code/open-release
```

Or use it without a global install:

```bash
npx @journey-to-code/open-release patch -m "fix: harden CSV parsing"
```

## Typical patch release

```bash
open-release patch -m "fix: harden CSV and TSV conversion behavior"
```

If the current package version is `1.0.1`, this:

- runs `npm test`,
- commits your staged project changes with your message,
- runs `npm version patch`,
- creates tag `v1.0.2`,
- pushes the current branch plus tags,
- publishes `1.0.2` to npm,
- creates GitHub Release `v1.0.2`.

## First release using the current package version

If `package.json` already says `1.0.0` and you do **not** want a version bump:

```bash
open-release current -m "feat: establish project v1 foundation"
```

`current` creates an annotated `v<package-version>` tag instead of running
`npm version`.

## Other versions

```bash
open-release minor -m "feat: add formatter API"
open-release major -m "feat!: redesign public API"
open-release 2.4.0 -m "feat: prepare 2.4 release"
```

Supported release arguments:

- `current`
- `patch`
- `minor`
- `major`
- an exact `x.y.z` version

## Dry run

See every command without changing anything:

```bash
open-release patch -m "fix: example" --dry-run
```

## Useful options

```text
-m, --message <text>   Source-change commit message
--skip-tests           Do not run npm test
--skip-preflight       Skip open.preflight safety checks
--no-npm               Do not run npm pack/publish
--no-github            Do not create a GitHub Release
--remote <name>        Git remote to push (default: origin)
--access <level>       npm access level (default: public)
--dry-run              Print commands without executing them
-h, --help             Show help
-V, --version          Show open.release version
```

## Examples

Release a package to GitHub but not npm:

```bash
open-release patch -m "fix: update docs" --no-npm
```

Publish to npm but skip GitHub Release creation:

```bash
open-release patch -m "fix: parser edge case" --no-github
```

Preview the release:

```bash
open-release current -m "feat: establish v1 foundation" --dry-run
```


### Windows

`open-release` supports Windows PowerShell and Command Prompt. npm/npx are
invoked through the Windows command processor because npm installs `.cmd`
shims on Windows.


## Requirements

The CLI expects:

- Git
- Node.js 18+
- npm
- GitHub CLI (`gh`) when GitHub releases are enabled
- npm authentication when npm publishing is enabled
- GitHub authentication when GitHub releases are enabled

For public scoped packages, npm publishing uses:

```bash
npm publish --access public
```

## Release behavior

`open.release` intentionally stops on the first failed command.

It does not try to undo already-completed remote actions. For example, if the
Git tag has been pushed and npm later rejects the publish, the tag remains
pushed so the failure is visible rather than hidden.

The source-change commit and npm version commit remain separate:

```text
fix: harden CSV parsing
chore: release v1.0.2
```

This keeps the functional change atomic while letting npm's version commit
remain easy to identify.

## Scope

`open.release` is deliberately not a full release-management platform.

It does not:

- generate changelogs,
- decide semantic version numbers for you,
- modify source code,
- manage npm/GitHub credentials,
- recover or rewrite failed remote releases,
- publish Docker images or other registries.

## Development

```bash
npm test
```

## License

MIT


## Preflight integration

Starting in v1.0.2, `open-release` invokes
`@journey-to-code/open-preflight` after the local release version/tag has been
created and before any push or publish operation.

The matching local version tag is expected at that stage, so that one
preflight condition is treated as satisfied. Other failures—including package
metadata problems, npm authentication/version conflicts, packaging failures,
missing remotes, GitHub authentication issues, or an existing GitHub
release—stop the release before remote mutation.

Use `--skip-preflight` only when you intentionally want the older direct
release flow.
