# Visor Codebase - Issues & Problems Found

**Analysis Date:** November 15, 2025  
**Reviewed By:** AI Expert - Full-Stack & AI Image Programs Specialist

---

## 🔴 CRITICAL ISSUES

### 1. **Missing LLM Response Parsing in Main Process**
**Location:** `electron-main/main.js` - Missing `stepController` callback setup  
**Severity:** CRITICAL  
**Description:**
The `stepController` is initialized in `main.js`, but there's no callback registered to actually **send parsed steps to the overlay window**. 

**Current Flow:**
```
User goal → stepController.setGoal()
    ↓
requestNextStep() (but then what?)
    ↓
LLM response parsed ✓
    ↓
❌ NO IPC MESSAGE SENT TO OVERLAY!
```

**Issue:** The parsed step from LLM never reaches the overlay renderer. The overlay window won't display any guidance.

**Fix Required:**
```javascript
stepController.init({
  onStep: (step) => {
    if (overlayWindow) {
      overlayWindow.webContents.send('overlay:step', step);
    }
  },
  onComplete: (summary) => {
    console.log('Session complete:', summary);
    // Send final notification to overlay
  },
  onError: (error) => {
    console.error('Step error:', error);
    // Send error to overlay
  }
});
```

---

### 2. **Window.visor Type Mismatch - Missing `loadHistory` Method**
**Location:** `renderer/global.d.ts` vs `electron-main/preload.js`  
**Severity:** CRITICAL (TypeScript) / HIGH (Runtime)  
**Description:**
The TypeScript definition declares `window.visor.chat.loadHistory`, but the preload.js **uses an `invoke`-based handler** which returns a Promise. However, the actual implementation in `chatIPC.js` correctly uses `ipcMain.handle()`, so this should work at runtime.

**BUT THERE'S A DISCONNECT:**
- `preload.js` line 19: `loadHistory: () => ipcRenderer.invoke('chat:history')`
- `global.d.ts` line 25: Declares the right return type ✓
- `ChatApp.tsx` line 35: `const history = await chatBridge.loadHistory()` ✓

**This works but is fragile.** The bridge between preload and TypeScript definitions is not clearly coupled.

---

### 3. **Race Condition: Overlay Ready Before Step Controller Is Ready**
**Location:** `electron-main/main.js` lines 40-45  
**Severity:** HIGH  
**Description:**
```javascript
onReady: () => {
  // Start requesting steps from stepController
  stepController.requestNextStep();  // ← Called immediately when overlay is ready
},
```

**Problem:** `stepController.requestNextStep()` is called but:
1. No goal has been set yet (goal comes from chat later)
2. The overlay window IPC messages haven't been connected yet
3. If called with null goal, it will fail silently

**Current State:** `stepController` will try to make LLM calls with `currentGoal = null`

---

### 4. **Missing Error Handling Chain in stepController**
**Location:** `electron-main/services/stepController.js` lines 100+  
**Severity:** HIGH  
**Description:**
The `requestNextStep()` function doesn't validate:
- Whether `currentGoal` exists
- Whether an LLM response was successfully parsed
- Whether to retry or fallback on parser errors

Looking at the code structure, if LLM returns invalid JSON or the parser fails, the error is logged but **no recovery mechanism** sends a user-friendly message to the overlay.

---

### 5. **Race Condition: Concurrent Step Requests Not Properly Guarded**
**Location:** `electron-main/services/stepController.js` line 24  
**Severity:** MEDIUM  
**Description:**
```javascript
isFetching: false // guard against concurrent requestNextStep calls
```

The guard exists in state but there's **no actual implementation** of the guard logic in `requestNextStep()`. Multiple rapid calls to `requestNextStep()` could spawn multiple LLM API calls simultaneously.

**Fix needed:**
```javascript
async function requestNextStep() {
  if (state.isFetching) {
    console.warn('Step request already in flight');
    return; // ← THIS IS MISSING
  }
  state.isFetching = true;
  try {
    // ... rest of logic
  } finally {
    state.isFetching = false;
  }
}
```

---

## 🟠 HIGH PRIORITY ISSUES

### 6. **Screenshot Size Inference Falls Back Silently**
**Location:** `electron-main/services/screenCapture.js` lines 99-105  
**Severity:** HIGH (Data Quality)  
**Description:**
When real screenshot capture doesn't report dimensions:
```javascript
if (!res.width || !res.height) {
  const inferred = inferResolutionFromLaptopVersion();
  res.width = res.width || inferred.width;
  res.height = res.height || inferred.height;
}
```

This means the **LLM receives wrong bounding box coordinates** if the captured image size differs from the inferred size. The LLM uses normalized bbox (0-1), so if it's trained on wrong dimensions, it will highlight the wrong screen regions.

**Example:** On macbook-pro-14 with actual 3024×1964, if capture returns null width/height:
- Falls back to 3024×1964 ✓ (correct)
- But if system is actually 2560×1600, it will be wrong ✗

---

### 7. **No Validation That Overlay Receives Steps Before User Interaction**
**Location:** `renderer/overlay/OverlayApp.tsx` lines 33-39  
**Severity:** HIGH (UX)  
**Description:**
```typescript
useEffect(() => {
  if (steps.length === 0) {
    setSteps(mockSteps);  // ← Falls back to mock data
  }
}, [steps.length]);
```

**Problem:** If the overlay window loads but receives no real steps from the backend:
1. User sees mock demo steps instead of real guidance
2. No error indicator to user
3. Clicking "Done" does nothing meaningful

---

### 8. **Message ID Generation Security Issue**
**Location:** `renderer/chatbox/ChatApp.tsx` line 61  
**Severity:** MEDIUM (Security/Data)  
**Description:**
```typescript
id: crypto.randomUUID(),  // ← OK in browser
```

But in Electron, `crypto.randomUUID()` may not be available in older Node versions. Should use a safer fallback.

---

### 9. **Storage Module Not Initialized in Main Process**
**Location:** `electron-main/main.js` - Line ~95  
**Severity:** MEDIUM (Data Persistence)  
**Description:**
Looking at main.js, there's no call to `storage.init()`. The storage module has:
```javascript
async function init() {
  await ensureDir();
  // ... create files
}
```

But it's never called, so:
- Data directory might not be created
- JSON files might not exist
- `saveSession()` calls will fail or create data in undefined locations

---

### 10. **Parser Comment Suggests Old Implementation**
**Location:** `electron-main/llm/parser.js` line 2  
**Severity:** LOW (Code Quality)  
**Description:**
```javascript
//module.exports = function parser() {};
// Parses and validates LLM responses into structured step objects
```

Old commented-out export still present. Should be removed.

---

## 🟡 MEDIUM PRIORITY ISSUES

### 11. **Model Choice in testOpenRouter.js Differs from Main Client**
**Location:** `scripts/testOpenRouter.js` line 6  
**Severity:** MEDIUM (Testing/Debugging)  
**Description:**
```javascript
model_choice = 'anthropic/claude-3.5-sonnet';
```

But `electron-main/llm/client.js` uses:
```javascript
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
```

Test script uses Claude, but app uses GPT-4o-mini. Different models = different response formats potentially.

---

### 12. **No Retry Logic for LLM API Failures**
**Location:** `electron-main/llm/client.js` lines 30-45  
**Severity:** MEDIUM (Resilience)  
**Description:**
If OpenRouter API returns an error, there's no retry mechanism:
- Network timeout → fails immediately
- Rate limit → fails immediately  
- Temporary provider error → fails immediately

User sees error but app could silently recover with exponential backoff.

---

### 13. **Preload Script Missing Error Boundary**
**Location:** `electron-main/preload.js`  
**Severity:** MEDIUM (Security)  
**Description:**
```javascript
contextBridge.exposeInMainWorld('visor', { ... });
```

No try-catch wrapper. If preload fails to execute, renderer has no `window.visor` but also no console warning about why.

---

### 14. **Chat History Load Has No Error Handling**
**Location:** `renderer/chatbox/ChatApp.tsx` lines 32-43  
**Severity:** MEDIUM (UX)  
**Description:**
```typescript
const history = await chatBridge.loadHistory();
if (history?.length) { setMessages(history); }
```

If `loadHistory()` throws or rejects, the promise is unhandled. Component silently uses seed messages instead.

---

### 15. **BoundingBox Coordinate Validation Missing**
**Location:** `renderer/overlay/OverlayApp.tsx` (via `OverlayApp` rendering)  
**Severity:** MEDIUM (UX/Bugs)  
**Description:**
When rendering annotations, if the LLM returns bbox outside screen (e.g., x=2.0 normalized), the drawing utilities clamp it but don't warn. Silent clamping can hide LLM coordinate errors.

In `renderer/overlay/drawing/arrow.ts`:
```javascript
const startX = clampToViewbox(start.x, viewbox.width);  // Silently clamps
```

Should log warning if clamping occurred.

---

## 🟢 LOW PRIORITY ISSUES

### 16. **Unused Legacy Renderer Code**
**Location:** `renderer/src/` directory  
**Severity:** LOW (Code Hygiene)  
**Description:**
The `renderer/src/` folder appears to be legacy code not used by the Vite build. Only `renderer/overlay/` and `renderer/chatbox/` are used.

**Cleanup needed:**
- Remove or document why `renderer/src/main/main.ts` and `renderer/src/preload.ts` exist

---

### 17. **Configuration Files Incomplete**
**Location:** `config/default.json`  
**Severity:** LOW  
**Description:**
```json
{
  "_comment": "Default runtime configuration",
  "name": "Visor"
}
```

Very minimal config. Missing settings for:
- LLM temperature ranges
- Screenshot capture settings
- Window positioning defaults
- Logging levels

---

### 18. **Inconsistent Error Response Formats**
**Location:** Various files  
**Severity:** LOW (Code Consistency)  
**Description:**
- Parser returns: `{ error: true, reason: "..." }`
- Other modules might throw exceptions or return null
- IPC handlers sometimes console.error, sometimes callback

No unified error contract across the codebase.

---

### 19. **Mock Data Always Loaded in OverlayApp**
**Location:** `renderer/overlay/OverlayApp.tsx` lines 33-39  
**Severity:** LOW (Development)  
**Description:**
```typescript
useEffect(() => {
  if (steps.length === 0) {
    setSteps(mockSteps);  // Always fallback to demo steps
  }
}, [steps.length]);
```

This means even with real backend, if first message is slow, user sees mock steps briefly. Should only show mock data if `isConnected === false`.

---

### 20. **Environment Variable Naming Inconsistency**
**Location:** Multiple files  
**Severity:** LOW (Documentation)  
**Description:**
- `OPENROUTER_API_KEY` ✓
- `OPENROUTER_MODEL` ✓
- `OPENROUTER_PREFERRED_PROVIDER` ✓
- `VISOR_USE_REAL_CAPTURE` ✓
- `VISOR_DEV_SERVER` ✓
- `VISOR_DATA_PATH` ✓
- `LAPTOP_VERSION` ✓ (but could be `VISOR_LAPTOP_VERSION` for consistency)

Minor inconsistency in naming convention.

---

## 📊 Summary Table

| Issue | Severity | Category | Impact |
|-------|----------|----------|--------|
| Missing overlay step IPC send | CRITICAL | Backend | App completely non-functional |
| Concurrent step guard not implemented | HIGH | Backend | Memory leaks, API abuse |
| Race condition: overlay ready before goal set | HIGH | Backend | Silent failures |
| Error handling chain missing | HIGH | Backend | User sees nothing on error |
| Screenshot size inference fallback | HIGH | Data Quality | Wrong UI highlighting |
| No validation before user interaction | HIGH | UX | User confusion |
| Storage not initialized | MEDIUM | Data | Data persistence broken |
| Message ID security | MEDIUM | Security | Potential collisions |
| No LLM retry logic | MEDIUM | Resilience | Bad UX on transient errors |
| Chat history unhandled rejection | MEDIUM | UX | Silent failures |
| Model choice inconsistency in tests | MEDIUM | Testing | Wrong test coverage |
| Legacy renderer code | LOW | Hygiene | Technical debt |
| Config incomplete | LOW | Config | Missing flexibility |

---

## 🎯 Recommended Fix Priority

### Phase 1 (MUST FIX - App Won't Work):
1. **Add step forwarding to overlay** (Issue #1)
2. **Implement concurrent guard** (Issue #5)
3. **Initialize storage** (Issue #9)
4. **Handle goal-not-set case** (Issue #3)

### Phase 2 (SHOULD FIX - Major UX Issues):
5. Screenshot size validation (Issue #6)
6. Error handling chain (Issue #4)
7. Overlay fallback detection (Issue #7)
8. Chat history error boundary (Issue #14)

### Phase 3 (NICE TO FIX - Polish):
9. Remove legacy code (Issue #16)
10. Add retry logic (Issue #12)
11. Improve logging (Issue #15)

---

**END OF ANALYSIS**
