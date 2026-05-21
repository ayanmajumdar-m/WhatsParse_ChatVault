# CLAUDE.md — Persistent AI assistant instructions

Purpose
-------
This file provides persistent, repository-root instructions and context for AI coding assistants (e.g., Claude Code). It is intended to speed onboarding, enforce repository conventions, and reduce repetitive context passed to assistants during code edits.

Keep this file concise, authoritative, and up-to-date. When in doubt, prefer explicit rules over heuristics.

Project summary
---------------
- Name: Chat Vault
- Purpose: Compact, privacy-first chat viewer and importer. Supports importing text and ZIP exports with media, virtualized chat rendering and offline storage.
- Tech stack: Next.js (App Router), TypeScript, React, Tailwind CSS, Zustand, react-window, JSZip, IndexedDB.

Who I am: a human maintainer working on chat import, storage, and UI reliability. When you need a decision you can't make safely, ask for clarification.

High-level architecture
-----------------------
- `app/` — root Next.js App Router layout and pages.
- `src/components/` — UI components grouped by feature (`chat/`, `layout/`, `common/`, `media/`).
- `src/parser/` — import/parsing logic (primary entry: `parser.ts`).
- `src/stores/` — Zustand stores and actions (primary entry: `chatStore.ts`).
- `src/services/` — persistence and media helpers (`db.ts`, `audioManager.ts`).

Coding standards and conventions
------------------------------
- Use TypeScript for all new code and prefer explicit types for public interfaces.
- Prefer React functional components with hooks. Avoid class components.
- Keep components small and focused; favor composition over large monolithic components.
- Naming:
	- Files: `kebab-case` for file names, `PascalCase` for components, `camelCase` for functions/variables.
	- Stores: `use*Store` or `use*` hooks (e.g., `useChatStore`).
- Styling: Use Tailwind utility classes. Avoid inline styles unless required for dynamic calculations.
- State management: Use Zustand for app-wide state. Do not directly mutate store state; use provided actions.
- Async: Use `async/await` and try/catch. Surface user-friendly error messages through UI actions.
- Tests: Add unit tests for parsing logic and any pure functions. Keep UI tests focused and small.

Workflow requirements for AI tools
--------------------------------
Before making code changes, the assistant must:

1. Write a short plan (3–6 bullets) describing the intended changes and files to modify.
2. Run static checks locally (or list the equivalent commands) and explain how you'll verify the change.
3. Implement changes with minimal, focused diffs. Avoid touching unrelated files.
4. Run or describe tests to validate behavior. If tests cannot be run here, provide reproduction steps.

Commands the assistant can assume are available
---------------------------------------------
```bash
npm install      # install JS deps
npm run dev      # start Next dev server
npm run build    # build for production
npm run start    # run production build
pip install graphifyy  # (optional) to run graphify tools
graphify update .       # regenerate code graph outputs
```

Files to inspect for common tasks
--------------------------------
- Chat UI and virtualization: `src/components/chat/ChatContainer.tsx`
- Upload/import behavior: `src/components/common/UploadZone.tsx`
- Parsing: `src/parser/parser.ts`
- Store & persistence: `src/stores/chatStore.ts`, `src/services/db.ts`
- Layout: `src/components/layout/ChatLayout.tsx`, `app/layout.tsx`

Known gotchas & guardrails
--------------------------
- Do NOT save empty imports: `importChat` now rejects empty parsed messages. If you change that behavior, ensure tests and UI messaging are updated.
- React-window scrolling issues: ensure container ancestors allow shrinking (CSS `min-h-0`) when adding or refactoring layout wrappers.
- Tailwind class names: project expects standard Tailwind utilities — do not rename or invent custom utilities in code without updating config.
- IndexedDB persistence: database schema is simple but versioned externally; any changes to `db.ts` require a migration plan.
- Large ZIP files: the importer extracts media into IndexedDB; be mindful of memory usage when parsing very large archives.

What the assistant must never do without explicit human approval
-------------------------------------------------------------
- Change DB schema or IndexedDB versioning without a migration strategy and developer sign-off.
- Add or remove major dependencies (e.g., new heavy LLM libraries) without an explicit discussion in an issue/PR.
- Hardcode API keys, secrets, or tokens into source files. Use environment variables and document them in `.env.example`.

Review and PR guidelines
------------------------
- Create a short PR description explaining the problem and the change.
- Keep PRs small and focused; include screenshots or recordings for UI changes.
- Add unit tests for parsing or business-logic changes. For UI changes, add a manual QA checklist.

Security & privacy notes
------------------------
- The app is designed to keep imported chats local (IndexedDB). Do not add server-side telemetry that sends chat contents out-of-band.
- If adding analytics or error reporting, anonymize or obtain explicit approval.

Graph & analysis
----------------
- The project stores a `graphify-out/` directory produced by `graphify update .`. Re-run locally with the `graphify` commands above. To enable semantic extraction, set `GEMINI_API_KEY` or another supported backend key.

When you are unsure
-------------------
If a change could affect user data, persistence, or core UX (importing, saving, scrolling), stop and ask for clarification. Provide a short list of options and the expected trade-offs.

Maintainer contacts
-------------------
- Primary maintainer: please refer to the repo owner or open an issue describing the question.

Revision history
----------------
- 2026-05-21: Initial CLAUDE.md created.

---


