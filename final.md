# Visor — Consolidated Documentation (final.md)

Last updated: auto-generated from workspace documentation.

## 1. Executive Summary
Visor is an Electron-based AI co‑pilot that guides users through desktop workflows by capturing the screen, querying an LLM for the single next actionable step, parsing structured JSON responses, and rendering visual guidance overlays (circle/arrow/box) plus short hints. Users drive tasks via a chatbox and confirm progress with a "Done" action. Core goals: clarity, safety (do not invent UI), and fidelity of visual annotations.

Primary entry points:
- Main process: `electron-main/main.js` (wires services and IPC)
- Renderer overlay: `renderer/overlay/index.html` + React app
- Chat renderer: `renderer/chatbox/*`

Referenced docs: `README.md`, `CODEBASE_ANALYSIS.md`, `TESTING.md`.

## 2. Architecture & High-Level Flow
User goal → chat → IPC → `stepController.setGoal()` → screen capture → LLM call → parser → overlay step emit → user action → `markDone()` → repeat.

Components:
- Orchestration: `electron-main/services/stepController.js`
- Capture: `electron-main/services/screenCapture.js` plus platform modules (`win32.js`, `darwin.js`)
- LLM: `electron-main/llm/client.js`, system prompt templates in `electron-main/llm/prompts.js`
- Parser/validator: `electron-main/llm/parser.js`
- Storage: `electron-main/services/storage.js` (dual-mode legacy JSON / structured JSONL)
- IPC: `ipc/overlayIPC.js`, `ipc/chatIPC.js`
- Renderer: `renderer/overlay/*`, `renderer/chatbox/*`

Key constraints: normalized bbox coordinates (0–1), JSON-only LLM output, must reference visible UI elements or return an error object.

## 3. Key Modules & Responsibilities
- stepController
  - State machine for sessions (goal, currentStep, stepHistory, substeps, isFetching, isInSubstepMode).
  - Public API: `init`, `setGoal`, `requestNextStep`, `markDone`, `markSubstepDone`, `detectAndHandleOffTask`, `generateSubstepsToRefocus`, `getState`.
  - Emits callbacks: `onStep`, `onComplete`, `onError`. See `electron-main/services/stepController.js`.
- LLM client & prompts
  - `sendCompletion()` builds multimodal message (system + goal + screenshot) and invokes OpenRouter. See `electron-main/llm/client.js`.
  - Prompt enforces strict JSON output and UI-grounding. See `electron-main/llm/prompts.js`.
- Parser
  - Extracts JSON from plain or markdown-wrapped responses and validates schema (`step_description`, `shape`, `bbox`, `label`, `is_final_step`). See `electron-main/llm/parser.js`.
- Screen capture
  - Platform-specific implementations with fallback to `screenshot-desktop` or mock 1×1 image in test mode. See `electron-main/services/screenCapture.js`.
- Storage
  - Atomic writes, structured logging mode (JSONL with rotation), session/step/chat logs. See `electron-main/services/storage.js`.

## 4. Renderer & UX
- Overlay: highlights and hints rendered by `renderer/overlay` React app; drawing utilities in `renderer/overlay/drawing/` (circle.ts, arrow.ts).
- Chatbox: `renderer/chatbox/ChatApp.tsx` — sends goals via `window.visor.chat.sendMessage()` and receives messages.
- Preload exposes safe APIs via `window.visor` (see `electron-main/preload.js`).

## 5. Testing & Diagnostics
- Multiple scripts: `scripts/diagnoseTLM.js`, `scripts/testLLM.js`, `scripts/testServices.js`, `scripts/testServicesUnit.js`.
- Unit/integration tests: see `scripts/testServicesUnit.js` and `electron-mainTEST.js` for harnesses.
- Utilities for demo logs and cleanup: `demo-structured-logs.js`, `removeTestData.js`.
- Overlay preview harness: `scripts/testOverlay.js` (generate HTML preview from step JSON).

See `TESTING.md`, `TEST_PLAN.md` for run instructions.

## 6. Configuration & Environment
Key environment variables:
- `OPENROUTER_API_KEY` — required for live LLM calls
- `OPENROUTER_MODEL`, `OPENROUTER_TEMPERATURE`
- `VISOR_USE_REAL_CAPTURE` — force mock capture if 'false'
- `VISOR_DATA_PATH`, `VISOR_STRUCTURED_LOGS`, `LAPTOP_VERSION`
See `config/default.json` and `config/modelSettings.json` for defaults.

## 7. Known Issues & Limitations
From `ISSUES_FOUND.md` and `CODEBASE_ANALYSIS.md`:
- Race condition: overlay ready → `requestNextStep()` invoked before goal set.
- Concurrent request guard: `state.isFetching` exists but enforcement missing in `requestNextStep()`.
- No retry logic for transient LLM errors.
- Multi-monitor and Linux real-capture not implemented.
- Some renderer legacy code present (`renderer/src/`).

Specific files to inspect for fixes:
- `electron-main/services/stepController.js`
- `electron-main/llm/parser.js`
- IPC handlers: `ipc/overlayIPC.js`, `ipc/chatIPC.js`

## 8. Splash & Branding
Splash implemented with `electron-main/windows/splashWindow.js` and renderer assets under `renderer/splash/` (HTML, CSS, JS). See `SPLASH_IMPLEMENTATION.md` and `renderer/splash/README.md`.

## 9. Recommendations & Next Steps
- Prioritize fixes: enforce `isFetching` guard, protect against overlay→goal race, add LLM retry/backoff, route parser errors to overlay UI.
- Add tests to cover race/concurrency cases and LLM transient failures.
- Verify environment variable ordering in test scripts (see diagnostic notes).
- Clean up legacy renderer code and confirm build inputs (Vite config).

## 10. Source documents merged into this file
This summary merges content from the repository documentation:
- `README.md`
- `CODEBASE_ANALYSIS.md`
- `TESTING.md`
- `TEST_PLAN.md`
- `ISSUES_FOUND.md`
- `SPLASH_IMPLEMENTATION.md`
- `backendStep.md`
- `electron-main/instruction.md`
- `electron-main/step.md`
- `renderer/splash/README.md`

For implementation-level follow-ups reference:
- `electron-main/services/stepController.js`
- `electron-main/llm/parser.js`
- `electron-main/llm/prompts.js`
- `electron-main/llm/client.js`
- `electron-main/services/screenCapture.js`
- `electron-main/services/storage.js`

---

End of merged summary.
