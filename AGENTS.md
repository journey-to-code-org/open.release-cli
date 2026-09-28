# AI agent guidance

AI-assisted contributions are welcome.

Before editing:

1. Read README.md and all tests.
2. Identify whether a change affects command ordering or remote side effects.
3. Preserve dry-run support.

During implementation:

- Never interpolate user input into a shell command string.
- Use executable + argument arrays.
- Preserve stop-on-first-failure behavior.
- Do not add credential storage.
- Do not add automatic destructive rollback.
- Add tests for CLI planning and validation.
- Keep the project dependency-free unless explicitly approved.
