Contributing to Chat Vault
==========================

Thank you for your interest in contributing. This document describes the preferred workflow, coding standards, and PR requirements for this repository.

Quick start
-----------
- Fork the repository and create a topic branch for your change: `git checkout -b fix/short-description`.
- Keep changes focused and limited to a single purpose per PR.
- Run the development server locally to validate UI changes:

```bash
npm install
npm run dev
```

Android / Capacitor workflow
----------------------------
- When changing UI, audio, or parsing code, rebuild the static export and refresh the Android app assets:

```bash
npm run build
npx cap copy android
```

- To inspect the native app shell locally, open the Android project in Android Studio:

```bash
npx cap open android
```
- Keep Android changes compatible with the offline architecture: client components only, no server actions, no API routes, and no backend dependencies for chat rendering or playback.
- Android playback currently prefers a native Capacitor bridge, then falls back to HTMLAudio and WebAudio. When modifying audio code, verify all three paths still behave correctly on device.
- If the WebView warns about blocked dev resources, add the device host to `allowedDevOrigins` in `next.config.ts` for local development and restart the dev server.

Reporting bugs
--------------
- Open an issue with a clear title and reproduction steps. Include console errors, screenshots, and the steps you followed.
- Tag the issue with `bug` or `enhancement` as appropriate.

Proposing changes (PR guide)
---------------------------
1. Start with an issue describing the problem and proposed solution (or link the issue in the PR).
2. Create a small, focused branch and implement the change.
3. Run linters and tests locally and document results in the PR description.
4. Include a short checklist in the PR description (see PR checklist below).

PR checklist
------------
- [ ] The PR has a clear title and description.
- [ ] Changes are small and scoped to a single concern.
- [ ] All new or existing tests pass.
- [ ] UI changes include screenshots or a short recording.
- [ ] `CLAUDE.md` and `AGENTS.md` were consulted for workflow rules if the change affects architecture, persistence, or CI.

Coding standards
----------------
- TypeScript: prefer explicit types for public interfaces and function return types.
- React: use functional components and hooks. Keep components small and composable.
- Styling: use Tailwind CSS utilities. Avoid adding global styles unless necessary.
- State: use Zustand for shared application state. Use provided actions rather than mutating state directly.
- Tests: add unit tests for parser logic and important business rules. Keep tests isolated.

Commit messages
---------------
- Use concise, imperative messages, e.g., `fix(upload): handle BOM in imported files`.
- Include a short body if additional context is required.

Testing and validation
----------------------
- Unit tests: `npm test` (project may not include a test runner by default; add coverage when modifying core logic).
- Manual QA: run `npm run dev`, exercise the Upload flow, import sample ZIPs, and validate chat rendering and persistence.
- Android QA: run `npm run build`, then `npx cap copy android`, and verify import, chat scrolling, audio playback switching, and fallback behavior in Android Studio or on-device WebView.

Running repository analysis
--------------------------
- To regenerate the code graph outputs (optional):

```bash
pip install graphifyy
graphify update .
```

Security and data handling
--------------------------
- Do not add telemetry that sends chat contents off-device without explicit consent.
- Never commit secrets or API keys. Use environment variables and document required keys in `.env.example`.

Areas that require maintainers' approval
--------------------------------------
- Changes to `src/services/db.ts` that alter the IndexedDB schema or version.
- Large dependency additions, CI pipeline changes, or anything that affects user data handling.

Getting help
------------
- Open an issue or mention `@maintainer` in PRs when you need clarifications.

Thank you for helping improve Chat Vault — small, well-documented contributions are especially welcome.
