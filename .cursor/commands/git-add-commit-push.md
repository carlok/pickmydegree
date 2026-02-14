# Git Add, Commit, Push

Run from the repository root. If the user did not give a commit message, suggest one from the staged diff (short, imperative: e.g. "Add tap-to-keep emphasis in Phase 2").

**1. Check status** (see what will be committed):

```bash
git status
```

**2. Stage all changes:**

```bash
git add -A
```

**3. Commit** (use the user’s message or your suggested one):

```bash
git commit -m "Short description of the change"
```

If there is nothing to commit (`nothing added to commit`), skip push and report that the working tree is clean.

**4. Push current branch** (set upstream if needed):

```bash
git push -u origin $(git branch --show-current)
```

Only run `git push` if the user asked to push or the command is "add, commit, push". If push fails (e.g. no remote, auth, or non-fast-forward), report the error and do not retry push automatically.
