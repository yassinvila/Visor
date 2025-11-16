# Backend status — electron-main (concise)

Quick snapshot of what’s implemented and what still needs work.

- Completed
  - `services/stepController.js`: core orchestration (414 lines); main loop, off‑task detection, substep recovery.
  - `llm/parser.js`: robust parser and validator for LLM JSON responses (150+ lines).
  - `services/screenCapture.js`: production-first (real capture by default; mock fallback); platform delegation.
  - `services/screenCapture/win32.js`: Windows capture with actionable error messages (76 lines).
  - `services/screenCapture/darwin.js`: macOS capture with Screen Recording permission detection (77 lines).
  - `services/storage.js`: JSON persistence with atomic writes; 12 public methods (155 lines).
  - `electron-main/main.js`: Services initialized and wired; IPC callbacks connected to stepController and storage.
  - `electron-main/ipc/chatIPC.js`: Verified clean; callback names aligned with main.js.

- Not yet done / needs fixes
  - LLM client: `electron-main/llm/client.js` requires `OPENROUTER_API_KEY` in env; set for live calls.

## 🧪 Testing

### Test Scripts Available
- `scripts/diagnoseTLM.js` — Checks environment and imports; identifies missing API key
- `scripts/testServices.js` — Tests individual services (capture, parser, storage, stepController) without requiring API key
- `scripts/testLLM.js` — Full integration test with LLM (requires `OPENROUTER_API_KEY`)

### Running Tests
```bash
# 1. Diagnose environment and setup
node scripts/diagnoseTLM.js

# 2. Test services in isolation (uses mock capture)
export VISOR_USE_REAL_CAPTURE=false
node scripts/testServices.js

# 3. Full integration test (requires API key)
export OPENROUTER_API_KEY="sk-..."
node scripts/testLLM.js
```

## 📋 Immediate next actions
1. Run diagnostic test to verify all services load correctly
2. Set `OPENROUTER_API_KEY` to enable full integration test
3. Validate end-to-end workflow: capture → LLM → parse → storage
