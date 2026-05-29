<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow: always plan before changing code

Before making ANY code change in this repo (Edit, Write, or modifying-Bash):

1. Enter plan mode (via ExitPlanMode tool flow).
2. If anything is ambiguous, ask clarifying questions with AskUserQuestion FIRST.
3. Present a concrete plan: files to touch, what changes, why, and any tradeoffs.
4. Wait for explicit user approval (ExitPlanMode acceptance).
5. Only then execute the plan.

Read-only operations (Read, grep/find via Bash, build/test runs, git status/log/diff) do NOT require plan mode.

# Git: never merge to main without explicit approval

- Push to `develop` (or feature branches) freely once changes are working.
- **Never** merge any PR into `main`, push directly to `main`, or run `git push origin develop:main` without the user explicitly asking for it (e.g. "mergeá a main", "merge this PR", "push to main").
- A green build, a passing PR, or even "dale" / "ok" on a feature does NOT imply approval to merge to main. Ask first if unsure.
- Same rule for force-pushing `main`, tagging releases on `main`, or any operation that lands code on the production branch.
