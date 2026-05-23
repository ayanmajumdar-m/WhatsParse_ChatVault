<!-- BEGIN:nextjs-agent-rules -->
# Agent Guidelines for Chat Vault

This file defines agent roles, rules, and guardrails for automated assistants (subagents, CI bots, or AI coding tools) that operate on this repository. It sits alongside `CLAUDE.md` (persistent assistant instructions) and provides operational guidance for short-lived agents.

Purpose
-------
- Describe available agent roles and their permitted actions.
- Provide invocation patterns and examples for subagents.
- Define safety boundaries, file areas agents may change, and escalation paths.

Quick rules
-----------
- Always consult `CLAUDE.md` before making design or persistence changes.
- Write a concise plan before changing code (3–6 bullets). Create a todo entry using the repository's TODO process if available.
- Keep diffs small and focused. Avoid mass refactors unless approved by a maintainer.
- Never commit secrets, API keys, or credentials. Use `.env` and `.env.example` for secrets documentation.

Agent roles
-----------
- `Explore` — read-only, fast codebase explorer. Use for searching files, building context, and answering questions. Must not modify files.
- `Code` — makes focused code changes. Must produce a short plan, run or describe tests, and keep changes minimal.
- `Graph` — runs repository analysis tools (`graphify`) and writes outputs to `graphify-out/` only. Must not modify source code.
- `CI` — runs builds, linters, and tests. May alter CI configs only after explicit approval.
- `Reviewer` — inspects diffs and adds comments or suggestions. Should not push changes directly unless previously authorized.

Invocation & subagent usage
---------------------------
- Use the project's subagent mechanism to run read-only explorations (example: `runSubagent` with `Explore`).
- When launching `Code` subagents, pass a clear task prompt and required file paths. Require reply with a short plan before applying patches.
- Example: to regenerate graphs run:

```bash
pip install graphifyy
graphify update .
```

Allowed file areas for automated edits
------------------------------------
- `src/` — source code changes allowed with tests and plan.
- `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md` — docs edits allowed.
- `graphify-out/` — analysis outputs may be written by `Graph` agents.

Documentation should stay aligned with the current Android workflow: static export to `out/`, Capacitor sync into `android/`, and the Android audio stack that prefers native playback with HTMLAudio/WebAudio fallbacks.

Restricted areas (require human approval)
--------------------------------------
- Any change to `src/services/db.ts` that modifies IndexedDB schema or versioning.
- Adding or replacing major dependencies (bundle size or security impact).
- CI pipeline changes under `.github/workflows/`.
- Anything that would change how user data is stored/transmitted.

Workflow requirements for `Code` agents
-------------------------------------
1. Produce a short plan (3–6 bullets) and list files to change.
2. Run linters and tests (or provide commands) and report results.
3. Apply minimal `apply_patch` edits and include an explanation for each patch.
4. After changes, run `graphify update .` if the change affects code structure (optional).

Safety & privacy
----------------
- Do not export chat contents, telemetry, or user data outside the local environment without explicit approval.
- Use environment variables for all secrets. Do not place secrets in code or commit history.

Escalation and human approval
-----------------------------
- If a change touches restricted areas, stop and open an issue describing the change, rationale, and migration path. Tag `@maintainer` or the repo owner.
- For schema migrations, include a migration script and a rollback plan.

Example agent prompt templates
-----------------------------
- Explore: "Explore the repo to find parsing logic and list files that read messages from IndexedDB. Return filenames and short descriptions."
- Code: "Plan and implement a mobile layout tweak to make the composer sticky. Provide plan, then apply patches limited to layout files."

Revision history
----------------
- 2026-05-21: Expanded agent rules and workflows.

<!-- END:nextjs-agent-rules -->
