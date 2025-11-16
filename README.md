# Visor

Visor is an Electron-based AI co‑pilot that overlays live, step‑by‑step guidance on your desktop. It captures your screen (or a mock image in dev), sends context to an LLM, and renders pointers (arrows, circles, tooltips) to guide you through tasks.

## Prerequisites
- Node.js 18+ and npm
- macOS, Windows, or Linux
- An LLM API key (OpenRouter recommended)

## Quick Start (Beginner Friendly)
```bash
# 1) Clone and enter the project
git clone https://github.com/yassinvila/Visor.git
cd Visor

# 2) Install dependencies
npm install

# 3) Create your OWN .env (do not use ours)
#    See the template below; keep it private and never commit it.

# 4) Start the app
npm start
```

### Create your own .env
Do NOT use or share any .env that ships with this repo. Create a fresh `.env` file at the project root with your own values. You can start from the template:

```bash
cp .env.example .env
# then open .env and fill in your values
```

Use this template as a guide:

```ini
# Required for live LLM calls
OPENROUTER_API_KEY=your_api_key_here

# Optional model/tuning (defaults shown)
OPENROUTER_MODEL=openai/gpt-4o
OPENROUTER_TEMPERATURE=0.2

# Screen capture controls
# Set to 'false' to use mock screenshots (no native capture required)
VISOR_USE_REAL_CAPTURE=true

# If using mock or capture fails, this maps to a default resolution
# Options: macbook-pro-14 | macbook-pro-13 | macbook-air-13 | surface-laptop | default
LAPTOP_VERSION=default

# Storage & logs (optional)
# VISOR_DATA_PATH=/absolute/path/to/visor-data
# VISOR_STRUCTURED_LOGS=true
# VISOR_MAX_LOG_SIZE_MB=10
# VISOR_MAX_LOG_FILES=30
```

Important:
- Keep your `.env` local and private. `.env` is in `.gitignore` — do not commit secrets.
- If you previously pulled someone else’s `.env`, delete it and create your own.

## Run Modes
- `npm start`: Launch Electron (main + windows). This is the normal way to run Visor.
- `npm run renderer:dev`: Start Vite HMR for the renderer (overlay + chatbox) during UI work.
- `npm run renderer:build`: Build production assets to `dist/`.
- `npm run renderer:preview`: Preview the built renderer.

You can also test the splash animation alone:
```bash
npx electron test-splash.js
```

## What You’ll See
1. Splash screen with a liquid‑glass panel and logo.
2. Overlay window (transparent) and Chat window.
3. Type a goal in chat — Visor captures a screenshot and asks the LLM for the next step.
4. Overlay draws an arrow/circle/tooltip to guide your action.
5. Mark steps done; Visor advances until finished.

## Configuration Reference
- `OPENROUTER_API_KEY` (required): Your OpenRouter API key.
- `OPENROUTER_MODEL` (optional): e.g., `openai/gpt-4o` (defaults inside code).
- `OPENROUTER_TEMPERATURE` (optional): 0.0–1.0, default `0.2`.
- `VISOR_USE_REAL_CAPTURE` (optional): Set to `'false'` to use mock screenshots.
- `LAPTOP_VERSION` (optional): A resolution hint for mocks or when dimensions can’t be detected.
- `VISOR_DATA_PATH` (optional): Where logs/sessions are stored (else app userData).
- `VISOR_STRUCTURED_LOGS` (optional): `'true'` to enable JSONL structured logs.

## Troubleshooting
- Missing API key: `OPENROUTER_API_KEY not set in environment` → Create `.env` with your key.
- Can’t capture screen: set `VISOR_USE_REAL_CAPTURE=false` to use mock images.
- Non‑fast‑forward push to main: update local `main` then merge your branch (see Git tips below).

## Project Layout (short)
- `electron-main/`: Electron main process (windows, IPC, services)
	- `windows/`: overlay, chat, splash
	- `services/`: `screenCapture`, `storage`, step controller
	- `llm/`: OpenRouter client wrapper
- `renderer/`: Overlay + Chat (React + TS + Vite)
- `config/`: Defaults and schema
- `scripts/`: Utilities and dev tests

## Git Tips (optional)
```bash
# Update main, merge your branch, push
git fetch origin
git switch main && git pull --rebase origin main
git merge --no-ff <your-branch>
git push origin main
```

---

Questions or stuck? Open an issue with your OS, Node version, and a redacted `.env` template (without secrets).
