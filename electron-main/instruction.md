# electron-main — Instruction Template

Use this file to write the authoritative instructions for changes inside `electron-main/`.

Suggested sections (delete or edit as needed):

- **Goal**: Short sentence summarizing what the change should achieve.
- **Files to modify**: list specific files under `electron-main/`.
- **API surface changes**: describe new or updated `window.visor` APIs (name, args, event names).
- **IPC contract**: list ipc channels (`'overlay:XYZ'`, `'chat:ABC'`) and payload shapes.
- **LLM / prompt requirements**: if relevant, specify prompt template names and expected responses.
- **Dev & test steps**: commands to run and how to validate behavior (include env var requirements like `VISOR_DEV_SERVER`).

Example (minimal):

Goal: Add an overlay toggle that mutes auto-advance.
Files to modify:
- `preload.js` — add `overlay.setAutoAdvance(enabled)`
- `ipc/overlayIPC.js` — register `'overlay:autoAdvance'`
- `main.js` — wire register function and forward to stepController
IPC contract:
- `'overlay:autoAdvance'` payload: `{ enabled: boolean }`

Once you edit this file with your instruction, tell me and I'll compare it to the code under `electron-main/` and report any mismatches or missing implementations.


<!-- Guidance for AI coding agents working on Visor -->
# Copilot / AI Agent Instructions for Visor

Purpose: short, actionable instructions to help an AI agent be productive in this Electron-based repo.

- Big picture:
  - **Architecture**: This is an Electron app. The main process entry is `electron-main/main.js` (referenced by `package.json` `main` field). UI code lives under `renderer/`. Platform glue and message handlers live in `ipc/`. LLM integration and related services live under `llm/`.
  - **Data & flow**: Renderer ⇄ Main IPC is the main cross-boundary flow (see files in `ipc/` like `chatIPC.js` and `overlayIPC.js`). The `llm/` folder contains client, parser and prompt definitions used to interact with LLMs; services under `llm/services/` implement features such as screen capture and step orchestration.

- Key locations (use these as touch points when searching or making changes):
  - `package.json` — `main` points at `electron-main/main.js`; start script is `npm start` which runs `electron .`.
  - `electron-main/` — Electron main-process code and window lifecycle.
  - `ipc/` — IPC channel handlers. Files are organized by domain (e.g. `chatIPC.js`, `overlayIPC.js`).
  - `llm/` — LLM client, `parser.js`, `prompts.js`, and `services/` (screen capture, stepController, storage).
  - `windows/` — helpers for creating windows: `chatWindow.js`, `overlayWindow.js`.
  - `renderer/` — front-end app code; see `chatbox/` and `overlay/` subfolders for examples of DOM/renderer patterns.
  - `scripts/` — build and packaging helpers (e.g. `build.js`, `packageApp.js`).

- Common project patterns discovered here (follow these):
  - One file per IPC domain under `ipc/` — add new channels by creating a new `*IPC.js` file and follow existing naming.
  - LLM-related code is centralized under `llm/` — update `prompts.js` and `parser.js` together when adjusting prompt behaviour.
  - Renderer UI is static files (`*.html`, `*.css`, `*.js`) under `renderer/` — prefer minimal DOM/CSS changes and test via `npm start`.

- Developer workflows (how to run and smoke-test):
  - Install deps and run: `npm install` then `npm start` (runs `electron .`).
  - Quick smoke test: make a small change to a renderer file (e.g. `renderer/chatbox/chat.js`), run `npm start`, open devtools in app windows.
  - Packaging: see `scripts/packageApp.js` and `scripts/build.js` for packaging/build helpers — read those scripts before modifying packaging.

- Guidance for changes and PRs (practical constraints):
  - Keep changes small and focused: prefer single-feature PRs that touch one area (`electron-main/`, `ipc/`, `llm/`, or `renderer/`).
  - When changing IPC channels, update both the handler in `ipc/` and the corresponding caller in `renderer/` or other main code.
  - For LLM changes, update `llm/prompts.js` and `llm/parser.js` together and validate behavior end-to-end via the running app.

- Debugging tips for agents:
  - To trace cross-process issues, add console logs in both `electron-main/main.js` and the corresponding `ipc/*` handler, then run `npm start` and open DevTools for renderer windows.
  - Use the `windows/` folder to locate where windows are created and which preload/renderer files they load.

- Files to reference for examples when coding:
  - `electron-main/main.js` — app entry (window lifecycle).
  - `ipc/chatIPC.js`, `ipc/overlayIPC.js` — IPC handler naming and organization.
  - `llm/client.js`, `llm/parser.js`, `llm/prompts.js` — LLM integration pattern.
  - `renderer/chatbox/chat.js`, `renderer/overlay/overlay.js` — renderer code style and DOM patterns.

If anything here is unclear or you want me to expand a specific section (for instance: concrete IPC registration patterns, packaging steps, or examples of LLM message flow), tell me which part and I will iterate.
