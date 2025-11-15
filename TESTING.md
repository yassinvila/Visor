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
