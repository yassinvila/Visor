# Backend Implementation Summary — electron-main/

## Overview
This document details all changes and implementations made to the `electron-main/` folder to establish the core workflow orchestration, services layer, and IPC integration.

---

## Services Layer — `electron-main/services/`

### 1. **stepController.js** ✓ IMPLEMENTED
**Purpose:** Orchestrates the multi-step task guidance workflow

**Key Features:**
- State management: tracks current goal, steps, history, status
- Workflow orchestration with LLM integration
- Off-task detection and recovery substeps system
- Graceful error handling with callback notifications

**Public API:**
```javascript
init(options)              // Initialize with callbacks: onStep, onComplete, onError
setGoal(goal)             // Start new session with user task
requestNextStep()         // Capture screen → query LLM → parse → callback
markDone(stepId)          // User confirms step; advances workflow
markSubstepDone(stepId)   // User completes recovery substep
detectAndHandleOffTask()  // Detect and recover from off-task behavior
getState()                // Debug introspection of session state
```

**State Structure:**
```javascript
{
  currentGoal,           // string | null
  currentStep,           // structured step object | null
  stepHistory,           // array of completed steps
  substeps,              // recovery substeps for off-task scenarios
  isInSubstepMode,       // boolean - true when recovering from off-task
  offTaskDetectedAt,     // timestamp when off-task detected
  status,                // 'idle' | 'in-progress' | 'finished' | 'error'
  sessionStartTime,      // timestamp of session start
  isFetching             // guard against concurrent requests
}
```

**Off-Task Recovery Flow:**
1. LLM analyzes screenshot and current task
2. If off-task detected → generates 2-3 substeps to refocus user
3. User completes substeps sequentially
4. After final substep → returns to main workflow

---

### 2. **screenCapture.js** ⏳ PLACEHOLDER (Ready for Implementation)
**Purpose:** Capture desktop screen as image for LLM analysis

**Current State:** Mock implementation with placeholder data

**Public API:**
```javascript
captureCurrentScreen()    // Returns mock screenshot object
loadDemoImage(path)       // Load test image from disk
```

**Return Format:**
```javascript
{
  imageBuffer,            // PNG/JPEG buffer data
  width,                  // screen width in pixels
  height,                 // screen height in pixels
  format,                 // 'png' | 'jpeg'
  timestamp,              // capture time
  mockData                // boolean flag
}
```

**TODO - Production Implementation:**
- Integrate Electron's `desktopCapturer` API from renderer
- Or use native screenshot library (screenshot-desktop)
- Convert image to base64 or buffer for LLM consumption
- Handle multi-monitor scenarios

---

### 3. **storage.js** ⏳ PLACEHOLDER (Ready for Implementation)
**Purpose:** Persistent storage for chat history, settings, and session logs

**Current State:** Full interface implemented with JSON file-based storage

**Public API:**
```javascript
// Chat History
loadChatHistory()         // Returns array of messages
saveChatMessage(msg)      // Save new message: { role, content }
clearChatHistory()        // Wipe all chat history

// Step Logs (for analytics)
loadStepLogs()           // Load completed steps with metadata
logStep(entry)           // Log: { step, completedAt, goal }

// Settings
loadSettings()           // Load user settings or defaults
saveSettings(settings)   // Persist settings object
```

**Storage Location:** `app.getPath('userData')`
- `chat-history.json` — chat messages with timestamps
- `step-logs.json` — completed steps for analytics
- `settings.json` — user preferences (autoAdvance, theme, etc.)

**Message Schema:**
```javascript
{
  id,          // unique message ID
  role,        // 'user' | 'assistant'
  content,     // message text
  timestamp    // when sent/received
}
```

---

## LLM Integration Layer — `electron-main/llm/`

### 4. **parser.js** ✓ IMPLEMENTED
**Purpose:** Parse and validate LLM responses into structured step objects

**Public API:**
```javascript
parseStepResponse(rawResponse)  // Async function returning step object
```

**Input:** Raw text from LLM (may contain JSON in code blocks)

**Output Schema - Success:**
```javascript
{
  step_description,   // string describing what to do
  shape,             // 'circle' | 'arrow' | 'box'
  bbox: {            // normalized coordinates (0-1)
    x,               // x position (0.0-1.0)
    y,               // y position (0.0-1.0)
    width,           // width (0.0-1.0)
    height           // height (0.0-1.0)
  },
  label,             // short hint text for UI
  is_final_step      // boolean - task complete flag
}
```

**Output Schema - Error:**
```javascript
{
  error: true,
  reason              // description of parsing failure
}
```

**Validation Rules:**
- Extracts JSON from markdown code blocks or plain JSON
- Validates all required fields present
- Validates bbox coordinates normalized (0-1)
- Validates shape is one of allowed types
- Detects explicit error responses from LLM

---

### 5. **client.js** (Pre-existing - No Changes)
**Status:** Already implemented with OpenRouter API integration
- Connects to `openai/gpt-4o` model
- Requires `OPENROUTER_API_KEY` environment variable
- Returns text response from LLM

---

### 6. **prompts.js** (Pre-existing - Partially Updated)
**Status:** Base prompt template exists; used by stepController
- Templates available for step planning
- Used in `buildPrompt()` within stepController
- Schema matches parser.js expectations

---

## IPC Layer — `electron-main/ipc/`

### 7. **overlayIPC.js** (Pre-existing - Ready for Integration)
**Purpose:** Handle overlay → main process communication

**Channels Registered:**
- `'overlay:ready'` — overlay bootstrap signal
- `'overlay:toggle'` — toggle overlay visibility
- `'overlay:done'` — step completion signal with stepId
- `'overlay:autoAdvance'` — auto-advance setting
- `'overlay:pointer-mode'` — pointer mode toggle

**TODO - Wire to stepController:**
- `onReady()` → call `stepController.requestNextStep()`
- `onMarkDone(stepId)` → call `stepController.markDone(stepId)`

---

### 8. **chatIPC.js** (Pre-existing - Ready for Integration)
**Purpose:** Handle chat UI ↔ main process communication

**Channels Registered:**
- `'chat:send'` — user sends message + goal
- `'chat:history'` — request persisted chat history

**TODO - Wire to Services:**
- `onMessageSend(message)` → extract goal, call `stepController.setGoal(goal)`
- `onLoadHistory()` → call `storage.loadChatHistory()`

---

## Main Process — `electron-main/`

### 9. **main.js** (Pre-existing - Ready for Full Integration)
**Status:** Window creation and basic IPC setup done; service wiring incomplete

**Current Setup:**
- Creates overlay and chat windows
- Registers IPC handlers with placeholder callbacks
- App lifecycle management (whenReady, window-all-closed)

**TODO - Integration Tasks:**
1. Import stepController, storage services
2. Call `stepController.init()` with callbacks:
   - `onStep` → send step to overlay via `overlayWindow.webContents.send('overlay:step', step)`
   - `onComplete` → send completion message to chat
   - `onError` → handle and display errors
3. Connect IPC handlers:
   - `overlay:ready` → `stepController.requestNextStep()`
   - `overlay:done` → `stepController.markDone(stepId)`
   - `chat:send` → `stepController.setGoal(message.goal)`
   - `chat:history` → `storage.loadChatHistory()`
4. Save messages to storage on `chat:send`

---

### 10. **preload.js** (Pre-existing - No Changes Needed)
**Status:** Already implements secure IPC bridge
- Exposes `window.visor.overlay.*` API
- Exposes `window.visor.chat.*` API
- Validates all renderer → main communication through this layer

---

## Windows Layer — `electron-main/windows/`

### 11. **overlayWindow.js** (Pre-existing - No Changes Needed)
**Status:** Creates transparent, full-screen overlay window
- Dev mode: loads from Vite dev server
- Production: loads from `dist/overlay/index.html`

---

### 12. **chatWindow.js** (Pre-existing - No Changes Needed)
**Status:** Creates chat UI window
- Dev mode: loads from Vite dev server
- Production: loads from `dist/chatbox/index.html`

---

## Data Flow Summary

### Complete Workflow:
```
1. Renderer: User types goal in chat UI
   ↓
2. IPC: 'chat:send' → main.js receives goal
   ↓
3. main.js: Calls stepController.setGoal(goal)
   ↓
4. IPC: Renderer overlay ready signal → 'overlay:ready'
   ↓
5. main.js: Calls stepController.requestNextStep()
   ↓
6. stepController:
   - screenCapture.captureCurrentScreen()
   - llmClient(prompt) with goal + history
   - parser.parseStepResponse(llmResponse)
   - Callback: onStep(step)
   ↓
7. main.js: Sends step to overlay
   overlayWindow.webContents.send('overlay:step', step)
   ↓
8. Renderer: Shows guidance hint, waits for user click
   ↓
9. User completes action, clicks "Done"
   ↓
10. IPC: 'overlay:done' → main.js receives stepId
    ↓
11. main.js: Calls stepController.markDone(stepId)
    ↓
12. stepController: Loop → requestNextStep() or finish
    (Repeats steps 6-11 until is_final_step = true)
```

### Off-Task Recovery:
```
During step → stepController.detectAndHandleOffTask()
  → LLM analyzes if user is deviating
  → If off-task:
     - generateSubstepsToRefocus()
     - Send substep 1 to overlay
     - User completes substeps sequentially
     - markSubstepDone() advances through substeps
     - After final substep → return to main workflow
```

---

## Environment Variables Required

```bash
OPENROUTER_API_KEY=<your-api-key>    # For LLM access
VISOR_DEV_SERVER=true                # (Optional) Use Vite dev server
```

---

## File Structure Summary

```
electron-main/
├── main.js                    [PRE-EXISTING] Main process entry
├── preload.js                 [PRE-EXISTING] IPC bridge
├── instruction.md             [PRE-EXISTING] Developer guide
├── ipc/
│   ├── overlayIPC.js         [PRE-EXISTING] Overlay channels
│   └── chatIPC.js            [PRE-EXISTING] Chat channels
├── llm/
│   ├── client.js             [PRE-EXISTING] OpenRouter integration
│   ├── prompts.js            [PRE-EXISTING] Prompt templates
│   └── parser.js             [✓ IMPLEMENTED] Response parser
├── services/
│   ├── stepController.js     [✓ IMPLEMENTED] Workflow orchestration
│   ├── screenCapture.js      [⏳ PLACEHOLDER] Screen capture
│   └── storage.js            [⏳ PLACEHOLDER] Persistence layer
└── windows/
    ├── overlayWindow.js      [PRE-EXISTING] Overlay window
    └── chatWindow.js         [PRE-EXISTING] Chat window
```

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| stepController.js | ✓ Complete | Includes off-task detection, substeps |
| parser.js | ✓ Complete | Validates LLM responses |
| screenCapture.js | ⏳ Placeholder | Mock data; ready for real capture impl |
| storage.js | ⏳ Placeholder | Full interface; ready for file I/O |
| main.js wiring | ⏳ Pending | Need to connect services to IPC |
| E2E Testing | ⏳ Pending | Test overlay → LLM → guidance flow |

---

## Next Steps

1. **Implement screenCapture.js** — Integrate real screen capture
2. **Implement storage.js** — Add file I/O for persistence
3. **Wire main.js** — Connect all services to IPC handlers
4. **Test integration** — Verify end-to-end data flow
5. **Polish UI** — Ensure substeps and hints display correctly

