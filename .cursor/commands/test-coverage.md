# Test coverage

Run the test suite with coverage inside Docker and report the results.

1. Run: `npm run test:coverage` (or `docker run --rm -v "$(pwd):/app" -w /app node:20-alpine sh -c "npm ci && npx vitest run --coverage"`).
2. Summarize the outcome: pass/fail, number of tests, and the coverage table (statements, branches, functions, lines) from the v8 report.
3. If tests fail, include the failing test names and error messages.
