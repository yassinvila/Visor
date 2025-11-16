# Visor Services Testing Plan

## Current Environment Status

**Fixed Issues:**
- ✅ LAPTOP_VERSION changed from `L` to `macbook-pro-14` (valid)
- ✅ VISOR_USE_REAL_CAPTURE set to `false` for test mode (no screenshot needed)
- ✅ OPENROUTER_API_KEY present

---

## Test Execution Order

### Phase 1: Diagnostics (Already Complete ✅)
```bash
node scripts/diagnoseTLM.js
```
**Result:** All modules import successfully ✅

---

### Phase 2: Service Integration Tests (Recommended Next)
```bash
# Test individual services without API calls
VISOR_USE_REAL_CAPTURE=false node scripts/testServices.js
```

**What it tests:**
1. ✅ screenCapture with mock mode
2. ✅ parser JSON validation
3. ✅ storage persistence
4. ✅ stepController initialization

**Expected:** All pass without API key needed

---

### Phase 3: Unit Tests (Comprehensive)
```bash
node scripts/testServicesUnit.js
```

**Test Suites (24 total tests):**
- 📸 screenCapture (5 tests)
  - Returns image buffer
  - Includes dimensions
  - Includes format & timestamp
  - Respects LAPTOP_VERSION
  - Includes mockData flag
  
- 🔍 parser (7 tests)
  - Parses valid JSON
  - Extracts JSON from markdown
  - Validates bbox normalization (0-1)
  - Rejects invalid bbox
  - Validates shape types
  - Requires step_description
  - Detects LLM error responses
  
- 💾 storage (8 tests)
  - Session save/retrieve
  - List sessions
  - Log steps (append-only)
  - Save/load chat messages
  - Load chat history with limit
  - Save/load settings
  - Log errors
  - clearAll utility
  
- 🔄 stepController (4 tests)
  - Init with callbacks
  - setGoal creates session
  - getState returns state
  - Prevents concurrent requests


**What it tests:**
- Real screenshot capture
- Full LLM completion cycle
- Parser with real LLM response
- Storage of session

**Note:** Currently fails with "Provider returned error" — needs investigation

---

## Components Not Yet Tested

### IPC Communication Layer
- [ ] overlayIPC handlers (`overlay:ready`, `overlay:done`, etc.)
- [ ] chatIPC handlers (`chat:send`, `chat:history`)
- [ ] Message passing between windows

### Electron Windows
- [ ] Overlay window creation (transparent, fullscreen)
- [ ] Chat window creation (420×680, resizable)
- [ ] Dev server mode loading
- [ ] Production build loading

### React Components
- [ ] OverlayApp rendering
- [ ] ChatApp rendering
- [ ] Component interactions (button clicks, input)

### Full End-to-End
- [ ] User types goal → storage → stepController
- [ ] Screenshot captured → LLM → parsed step → IPC to overlay
- [ ] User clicks "Done" → next step requested
- [ ] Off-task detection & substeps

---

## Environment Variables Verified

| Variable | Value | Status |
|----------|-------|--------|
| `OPENROUTER_API_KEY` | sk-or-v1-... | ✅ Set |
| `VISOR_USE_REAL_CAPTURE` | false | ✅ Correct (mock mode) |
| `LAPTOP_VERSION` | macbook-pro-14 | ✅ Valid (3024×1964) |

---

## Quick Start Commands

```bash
# 1. Check setup
node scripts/diagnoseTLM.js

# 2. Test services (mock mode, no API calls)
node scripts/testServices.js

# 3. Comprehensive unit tests
node scripts/testServicesUnit.js

# 4. Full integration (if LLM issue is fixed)
node scripts/testLLM.js
```

---

## Known Issues to Investigate

1. **LLM API Error** in diagnoseTLM.js
   - Error: "Provider returned error"
   - May be API key/usage issue
   - Or model configuration issue

2. **LAPTOP_VERSION was invalid**
   - Was: `L` (not recognized)
   - Now: `macbook-pro-14` (3024×1964)
   - Fallback resolution: 1920×1080

---

## Next Actions

1. ✅ Run `testServices.js` to verify service isolation
2. ✅ Run `testServicesUnit.js` to verify all 24 unit tests pass
3. 🔍 Investigate LLM provider error in `testLLM.js`
4. 📝 Create tests for IPC communication layer
5. 🪟 Create tests for Electron window creation
6. ⚛️ Add React component tests
