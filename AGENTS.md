# AGENTS.md

## Project Goal
Build a production-ready MVP with simple architecture, fast iteration, strong reliability, and clean maintainable code.

## Operating Rules
- First read README.md, PRD.md, TASKS.md, and relevant source files.
- Do not rewrite large parts of the codebase unless explicitly asked.
- Prefer simple, boring, maintainable code.
- No new dependency unless clearly justified.
- Before changing code, explain intended files and approach.
- After changing code, run tests and show results.
- If tests fail, fix the smallest root cause.
- Never touch .env or secrets.
- Update TASKS.md after completing meaningful work.
- Do not continue to the next task unless the current task is complete and verified.

## Karpathy-Style Development Rules
- English-first development: understand the product before writing code.
- Keep implementation small and inspectable.
- Avoid clever abstractions.
- Avoid overengineering.
- Prefer one clear solution over many generic layers.
- Human readability is more important than framework cleverness.
- Add tests for every important behavior.
- Review generated code for bloat, repetition, security issues, and bad abstractions.
- If a file crosses 300 lines, suggest a split before adding more.
- If logic is duplicated twice, extract it once.
- If the requirement is unclear, make the safest reasonable assumption and document it.

## Code Style
- Small files.
- Clear names.
- No dead code.
- No duplicate business logic.
- Validate inputs at boundaries.
- Keep UI, business logic, and data access separate.
- Keep domain logic testable.
- Use environment variables only through a config layer.
- Never hardcode secrets, API keys, passwords, or production URLs.

## Required Workflow
For every coding task:
1. Read PRD.md and TASKS.md.
2. Identify the smallest next task.
3. State files to be changed.
4. Implement only that task.
5. Add or update tests.
6. Run verify command.
7. Show changed files and test result.
8. Update TASKS.md.

## Definition of Done
- Feature works.
- Tests pass.
- Lint passes.
- Build passes.
- Edge cases handled.
- README or docs updated if behavior changed.
- TASKS.md updated.

## Default Commands
Use the correct commands based on detected stack. If unknown, create these scripts:
- Setup: scripts/setup.sh
- Verify: scripts/verify.sh
- Test: project test command
- Lint: project lint command
- Build: project build command

## Security Rules
- Never expose secrets.
- Never commit .env.
- Use .env.example only for placeholder variables.
- Validate user input.
- Handle auth, permissions, and data access explicitly.
- Fail safely with clear errors.

## Output Style
- Be concise.
- Show exact commands.
- Show exact files changed.
- Do not give theory unless asked.
- Do not make unrelated changes.
