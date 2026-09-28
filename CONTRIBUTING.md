# Contributing

`open.release` should remain small, understandable, and dependency-free.

## Development

```bash
npm test
```

## Pull requests

Changes should:

- preserve dry-run behavior,
- avoid shell-string command construction,
- add tests for planning/argument behavior,
- stop on failed subprocesses,
- avoid hiding partially completed release state,
- update README documentation when CLI behavior changes.
