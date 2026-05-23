# Chat Vault

A compact, privacy-first chat viewer and importer built with Next.js (App Router) and TypeScript. It supports importing chat transcripts (including ZIP archives with media), virtualized chat rendering for large conversations, and offline storage via IndexedDB.

**Key features:**

- **Import**: Upload plain text or ZIP archives containing chat exports and media.
- **Virtualized chat**: Smooth scrolling for large histories using `react-window`.
- **Offline storage**: Persist chats and media with an IndexedDB wrapper.
- **Media support**: Images, audio and video attachments are indexed and served from local storage.
- **Project graph**: `graphify` outputs are available under `graphify-out/`.
- **Android app**: The app is packaged with Capacitor and exported as a static web build for Android WebView.

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

- `npm run dev` - Start Next.js in development mode.
- `npm run build` - Build the app for production and refresh the static `out/` directory used by Capacitor.
- `npm run start` - Run the production build.

## Android / Capacitor

Chat Vault is configured as a static Capacitor app for Android. The WebView loads the exported files from `out/`, and all core features remain client-side: IndexedDB, ZIP parsing, local media playback, and virtualized rendering.

Android playback now prefers a native audio bridge when available on device, with HTMLAudio and WebAudio fallbacks kept for compatibility during development and debugging.

To update the Android app after web changes:

```bash
npm run build
npx cap copy android
```

To open the native project in Android Studio:

```bash
npx cap open android
```

Capacitor config:
- App name: `ChatVault`
- App ID: `com.ayan.chatvault`
- Web directory: `out/`

Notes for Android/WebView compatibility:
- Keep browser-only features inside client components.
- Avoid server actions and API routes; the app is designed to run fully offline.
- Media playback prefers a native Capacitor bridge on Android, with HTML5 Audio and WebAudio fallbacks for WebView compatibility.
- ZIP parsing and dynamic imports remain client-side and are compatible with Capacitor.
- If Android dev HMR is blocked by a WebView origin warning, add the host to `allowedDevOrigins` in `next.config.ts` and restart the dev server.

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

The sidebar add button always opens the upload landing, even when a chat is already selected.

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
- Capacitor Android assets are copied from `out/` into `android/app/src/main/assets/public/` during `npx cap copy android`.

## Contributing

Contributions are welcome. Please open issues for bugs or feature requests, and submit PRs with focused changes. Keep changes small and include a brief description and testing notes.

## License

This project is provided without an explicit license. Add a `LICENSE` file to define terms for reuse.

---

The repository includes complete documentation, MIT License, CONTRIBUTING guidelines, CLAUDE.md, and AGENTS.md for structured development and AI-assisted workflows.
