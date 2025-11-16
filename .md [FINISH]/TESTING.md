# Backend Services Test Suite

## Overview

Comprehensive unit tests for all backend services:
- **screenCapture** — Mock image capture with resolution validation
- **parser** — LLM JSON response parsing and validation
- **storage** — JSON persistence operations
- **stepController** — Orchestration logic and state management

## Running the Tests

```bash
# Run all unit tests
node scripts/testServicesUnit.js

# Expected output:
# ✓ screenCapture tests (5 tests)
# ✓ parser tests (7 tests)
# ✓ storage tests (8 tests)
# ✓ stepController tests (4 tests)
# Total: ~24 tests, all passing
```

## Test Coverage

### screenCapture Tests
- ✓ Returns image buffer
- ✓ Includes proper dimensions
- ✓ Includes format and timestamp
- ✓ Respects LAPTOP_VERSION environment variable
- ✓ Includes mockData flag in mock mode

### parser Tests
- ✓ Parses valid JSON step responses
- ✓ Extracts JSON from markdown code blocks
- ✓ Validates bbox normalization (0-1 range)
- ✓ Rejects invalid bbox coordinates
- ✓ Validates shape types (circle, arrow, box)
- ✓ Requires step_description field
- ✓ Detects LLM error responses

### storage Tests
- ✓ Saves and retrieves sessions
- ✓ Lists all sessions
- ✓ Logs steps to append-only log
- ✓ Saves and retrieves chat messages
- ✓ Loads chat history with limit
- ✓ Saves and loads settings
- ✓ Records error logs
- ✓ Supports clearAll() for cleanup

### stepController Tests
- ✓ Initializes with callbacks
- ✓ Sets goal and creates session
- ✓ Returns current state
- ✓ Prevents concurrent requests

## Environment Variables

```bash
# Force mock capture (no real screenshot)
export VISOR_USE_REAL_CAPTURE=false

# Set resolution for mock (default: 1920x1080)
export LAPTOP_VERSION=surface-laptop  # 2256x1504
# or: macbook-pro-14 (3024x1964), surface-laptop, etc.
```

## Notes

- Tests use **mock capture** by default (no real screenshot needed)
- Storage tests use actual JSON files in the temp directory
- Tests are **isolated** — each test can run independently
- No API key required (tests don't call OpenRouter)
- Total runtime: ~1-2 seconds

## Troubleshooting

**Tests fail with "module not found":**
```bash
npm install
```

**Tests fail with permission errors:**
```bash
# Ensure storage directory is writable
chmod 755 ~/.visor
```

**Parser tests fail:**
- Check that parser.js exports `parseStepResponse`
- Verify JSON validation logic in parser.js

**Storage tests fail:**
- Ensure `app.getPath('userData')` or `~/.visor` is writable
- Check that storage.js exports all 12 methods

## Diagnosing LLM & Capture (`diagnoseTLM.js`)

For quick diagnostics related to the LLM client and screen capture, run the lightweight checker:

```bash
# Run from repository root (zsh / macOS / Linux)
node scripts/diagnoseTLM.js
```

PowerShell (Windows):

```powershell
# From repo root
node .\scripts\diagnoseTLM.js
```

What it checks:
- Environment variables (`OPENROUTER_API_KEY`, `VISOR_USE_REAL_CAPTURE`, `LAPTOP_VERSION`)
- Imports for `screenCapture`, `llm/client`, `llm/prompts`, and `llm/parser`
- Optional live LLM smoke test (only if `OPENROUTER_API_KEY` is set)

Common issues and fixes:
- `LAPTOP_VERSION` prints `undefined` — the script reads `process.env.LAPTOP_VERSION`. Ensure your Node process loads `.env` (see below) or export it in your shell before running. Example:

  - zsh:
    ```bash
    export LAPTOP_VERSION=surface-laptop
    node scripts/diagnoseTLM.js
    ```

  - PowerShell:
    ```powershell
    $env:LAPTOP_VERSION = 'surface-laptop'; node .\scripts\diagnoseTLM.js
    ```

- `Invalid image data` from the LLM provider — the diagnostic now sends a tiny valid 1x1 PNG when exercising the API. If you still see image errors, ensure the provider accepts inline base64 images and your key/usage is configured correctly.

- Image dimension detection falls back to `LAPTOP_VERSION` when the capture path cannot determine actual image dimensions. To enable automatic dimension detection, install `image-size`:

```bash
npm install --save image-size
```

This allows `screenCapture` to probe buffers and avoid using the `LAPTOP_VERSION` fallback.

- If your scripts sometimes don't pick up `.env`, make loading explicit at the top of scripts (e.g., `scripts/diagnoseTLM.js`) so the repo `.env` is read regardless of current working directory:

```javascript
// Top of script
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
```

- For accurate runtime display dimensions (when running as an Electron app), prefer querying Electron's `screen` API from the main process:

```javascript
const { screen } = require('electron');
const { width, height } = screen.getPrimaryDisplay().size;
```

## Overlay Rendering Preview (`testOverlay.js`)

Use the JSON-driven overlay harness to validate annotation geometry from LLM output (or handcrafted payloads).

```bash
# From repo root
node scripts/testOverlay.js scripts/sampleOverlayStep.json \
  --width=1920 \
  --height=1080 \
  --output=/tmp/overlay-preview.html
```

What it does:
- Loads the provided JSON payload (must include `step_description`, `shape`, and normalized `bbox`).
- Converts normalized coordinates into pixels for the specified viewport dimensions.
- Invokes `renderer/overlay/drawing/circle.ts` to generate the circular highlight styling.
- Produces a standalone HTML file that visualizes the bounding box plus annotation ring.

Arguments:
- `path/to/json` (required): step payload file.
- `--width` / `--height` (optional): viewport size (defaults 1920x1080).
- `--output` (optional): destination HTML (defaults to `overlay-preview.html` in cwd).

Sample payload: `scripts/sampleOverlayStep.json` mirrors the Spotify dock example described in the LLM instructions.

Need a quick ad-hoc payload? Create one inline:

```bash
cat <<'JSON' > /tmp/step.json
{
  "step_description": "Click the green Spotify icon in the dock at the bottom of the screen to open the Spotify app.",
  "shape": "circle",
  "bbox": { "x": 0.458, "y": 0.935, "width": 0.034, "height": 0.056 },
  "label": "Open Spotify",
  "is_final_step": false
}
JSON

node scripts/testOverlay.js /tmp/step.json --width=2560 --height=1600
```

## Full Test Run Example

```bash
$ node scripts/testServicesUnit.js

============================================================
  🧪 BACKEND SERVICES UNIT TEST SUITE
============================================================

📸 Testing screenCapture service:

  ✓ captureCurrentScreen returns buffer
  ✓ captureCurrentScreen includes dimensions
  ✓ captureCurrentScreen includes format and timestamp
  ✓ captureCurrentScreen respects LAPTOP_VERSION
  ✓ mock capture includes mockData flag

🔍 Testing parser service:

  ✓ parseStepResponse parses valid JSON
  ✓ parseStepResponse extracts JSON from markdown
  ✓ parseStepResponse validates bbox normalization
  ✓ parseStepResponse rejects invalid bbox
  ✓ parseStepResponse rejects invalid shape
  ✓ parseStepResponse requires step_description
  ✓ parseStepResponse detects LLM error responses

💾 Testing storage service:

  ℹ Storage initialized
  ✓ storage.saveSession persists session
  ✓ storage.loadSession retrieves saved session
  ✓ storage.listSessions returns all sessions
  ✓ storage.logStep appends step to log
  ✓ storage.saveChatMessage stores message
  ✓ storage.loadChatHistory retrieves messages
  ✓ storage.saveSettings persists settings
  ✓ storage.loadSettings retrieves settings
  ✓ storage.logError records errors

🔄 Testing stepController service:

  ✓ stepController.init registers callbacks
  ✓ stepController.setGoal sets goal and creates session
  ✓ stepController.getState returns current state
  ✓ stepController prevents concurrent requests

============================================================
  📊 Test Results: 24/24 passed
============================================================

✓ All tests passed!
```

## Next Steps

1. Run the unit tests to verify all services work
2. Once tests pass, run integration test with API key (testLLM.js)
3. Deploy to Electron app and validate end-to-end workflow
