# Chat Vault

A compact, privacy-first chat viewer and importer built with Next.js (App Router) and TypeScript. It supports importing chat transcripts (including ZIP archives with media), virtualized chat rendering for large conversations, and offline storage via IndexedDB.

**Key features:**

- **Import**: Upload plain text or ZIP archives containing chat exports and media.
- **Virtualized chat**: Smooth scrolling for large histories using `react-window`.
- **Offline storage**: Persist chats and media with an IndexedDB wrapper.
- **Media support**: Images, audio and video attachments are indexed and served from local storage.
- **Project graph**: `graphify` outputs are available under `graphify-out/`.

## Quick start

Prerequisites: Node.js 18+ and a package manager (`npm`, `pnpm`, or `yarn`).

1. Install dependencies:

```bash
npm install
# or
pnpm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open http://localhost:3000 in your browser.

## Scripts

- `npm run dev` — Start Next.js in development mode.
- `npm run build` — Build for production.
- `npm run start` — Run the production build.

## Project layout (high level)

- [app/](app/) — Next.js App Router entrypoints and global layout.
- [src/components/](src/components/) — React components (chat UI, layout, media viewers).
- [src/parser/](src/parser/) — Import and parsing utilities (`parser.ts`).
- [src/stores/](src/stores/) — Zustand store and actions for chats.
- [src/services/](src/services/) — IndexedDB and media helpers (`db.ts`, `audioManager.ts`).
- [graphify-out/](graphify-out/) — Generated code graph and `GRAPH_REPORT.md` (created by `graphify`).

## Importing chats

Use the Upload control in the sidebar to add chat exports. The importer will:

- Prefer `.txt` transcripts inside ZIPs, decode common encodings and strip BOMs.
- Extract referenced media files from ZIPs and persist them in IndexedDB.
- Skip saving empty or invalid imports and report parsing errors in the UI.

If an imported chat doesn't appear: inspect the browser DevTools console and check IndexedDB entries via the `dbService` helpers.

## Graph & analysis

This repository includes code-graph outputs produced by `graphify` in `graphify-out/` (see `GRAPH_REPORT.md`). To re-run locally:

```bash
pip install graphifyy
graphify update .
```

Set an LLM API key (e.g., `GEMINI_API_KEY`) to enable semantic extraction.

## Development notes

- UI virtualization fixes rely on container CSS (`min-h-0`) — see `src/components/layout/ChatLayout.tsx` and `src/components/chat/ChatContainer.tsx`.
- Mobile optimizations include responsive paddings and viewport meta in `app/layout.tsx`.

## Contributing

Contributions are welcome. Please open issues for bugs or feature requests, and submit PRs with focused changes. Keep changes small and include a brief description and testing notes.

## License

This project is provided without an explicit license. Add a `LICENSE` file to define terms for reuse.

---

The repository includes complete documentation, MIT License, CONTRIBUTING guidelines, CLAUDE.md, and AGENTS.md for structured development and AI-assisted workflows.