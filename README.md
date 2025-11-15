# Visor

Visor is an Electron-based AI co-pilot that guides users through complex desktop workflows by overlaying live instructions directly on the screen.

## Workflow Pipeline
1. Launch the Visor desktop app to spawn the transparent overlay window plus the chatbox side panel.
2. Describe the task in the chatbox; the Node/LLM backend interprets intent.
3. The overlay window captures a screenshot, decides the next best action, and highlights the UI target (arrow, circle, tooltip).
4. You follow the guidance and hit **Done** (⌘⇧D) to confirm the step.
5. Visor refreshes the screenshot, recalculates the next step, and repositions the guidance.
6. This loop repeats until completion; over time Visor can auto-advance when it detects the correct clicks without needing **Done**.

## UI Stack
- **Renderer tooling**: React + TypeScript + Vite (multi-entry for overlay & chatbox)
- **Styling**: Custom CSS with shared component styles for buttons, modals, and spinners
- **State/IPC integration**: `window.visor` bridge (provided by the Electron preload) emits guidance steps, chat messages, and command hooks
- **Hotkeys**: Overlay listens for ⌘⇧O (pause/resume) and ⌘⇧D (mark step done)

## Getting Started
```bash
# Install Node dependencies
npm install

# Optional: activate the Conda env that lives inside the repo
conda activate /Users/williamabraham/Desktop/Visor/visor

# Run the Electron shell (loads the built renderer assets)
npm start
```

## Renderer Development
The renderer lives in `renderer/` with two independent windows:
- `overlay/` → transparent guidance HUD
- `chatbox/` → task input + conversation UI

During UI development you can run Vite in watch mode:
```bash
npm run renderer:dev    # HMR for both overlay and chat windows
npm run renderer:build  # Production build (outputs to dist/)
npm run renderer:preview
```
The Electron windows should load the generated `dist/overlay/index.html` and `dist/chatbox/chat.html`. Until the backend is wired, both windows fall back to mock data so you can see the full UX loop.

## Next Steps
- Implement the Electron preload bridge that surfaces `window.visor.overlay` and `window.visor.chat` APIs.
- Wire the IPC flow from `electron-main` services (screen capture, hotkeys, LLM step planner) to the renderer bridge.
- Replace placeholder icons in `assets/icons/` and tune overlay styling for real displays (multi-monitor, retina, etc.).
