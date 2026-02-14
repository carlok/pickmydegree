# Test coverage

Run the test suite with coverage inside Docker, report the results, then try to increase coverage.

## 1. Run and report

- Run: `npm run test:coverage` (or `docker run --rm -e NPM_CONFIG_LOGLEVEL=warn -v "$(pwd):/app" -w /app node:20-alpine sh -c "npm ci --no-audit --prefer-offline && npx vitest run --coverage"`).
- Summarize: **pass/fail**, number of tests, and the **coverage table** (statements, branches, functions, lines) from the v8 report.
- If tests fail, include the failing test names and error messages.

## 2. Try to increase coverage

After reporting, **aim to improve coverage on every run**:

- **Identify** the most valuable gaps: files with **0%** or **low** statement/line coverage, or composables/components with **uncovered branches/lines** listed in the report.
- **Pick one target** for this run (e.g. one component, one composable, or one uncovered branch in an already-tested file).
- **Add or extend tests** for that target (new test file in `tests/unit/` or new cases in an existing spec). Use the same stack (Vitest, Vue Test Utils, happy-dom) and patterns as in `tests/unit/`.
- **Re-run** `npm run test:coverage` and confirm that overall or file-level coverage increased (or that the new tests pass and cover the chosen code path).
- If the user has not asked for more coverage work, a **short suggestion** is enough (e.g. “Next run could add tests for `Phase1Filter.vue` or for branch X in `useGameEngine.js`”).

Prefer **high-impact, maintainable tests** (e.g. one solid test for a composable or a key component) over many trivial assertions.
