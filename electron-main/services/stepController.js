/**
 * stepController.js — Orchestrates the multi-step task guidance workflow.
 * 
 * This service manages the state machine for a single user session:
 * - Accepts a goal from the chat layer
 * - Iteratively captures screenshots, queries the LLM, and returns structured steps
 * - Waits for user confirmation before advancing to the next step
 * - Terminates when the LLM marks the task complete
 */

const screenCapture = require('./screenCapture');
const fs = require('fs');
const path = require('path');
const { sendCompletion } = require('../llm/client');
const { parseStepResponse } = require('../llm/parser');
const storage = require('./storage');
const { existsSync } = require('fs');

// Optional click executor module (if present in repo/environment)
let clickExecutor = null;
try {
  const executorPath = path.join(__dirname, 'clickExecutor.js');
  if (fs.existsSync(executorPath)) {
    clickExecutor = require(executorPath);
  }
} catch (_) {
  clickExecutor = null;
}

// Helper: convert normalized bbox {x,y,width,height} to pixel bbox {x,y,width,height}
function toPixels(normBBox, { width, height }) {
  const x = Math.max(0, Math.min(1, Number(normBBox.x || 0)));
  const y = Math.max(0, Math.min(1, Number(normBBox.y || 0)));
  const w = Math.max(0, Math.min(1 - x, Number(normBBox.width || 0)));
  const h = Math.max(0, Math.min(1 - y, Number(normBBox.height || 0)));
  return {
    x: Math.round(x * width),
    y: Math.round(y * height),
    width: Math.max(1, Math.round(w * width)),
    height: Math.max(1, Math.round(h * height))
  };
}

// Helper: naive crop using pngjs/jpeg-js when available; returns pixel array {data, width, height}
function crop(imageBuffer, pixelBbox) {
  try {
    // Try PNG
    const PNG = require('pngjs').PNG;
    const png = PNG.sync.read(imageBuffer);
    const { width: imgW, height: imgH, data } = png;
    const sx = Math.max(0, Math.min(imgW - 1, pixelBbox.x));
    const sy = Math.max(0, Math.min(imgH - 1, pixelBbox.y));
    const sw = Math.max(1, Math.min(imgW - sx, pixelBbox.width));
    const sh = Math.max(1, Math.min(imgH - sy, pixelBbox.height));
    const out = Buffer.alloc(sw * sh * 4);
    let idx = 0;
    for (let row = 0; row < sh; row++) {
      const srcRow = sy + row;
      for (let col = 0; col < sw; col++) {
        const srcCol = sx + col;
        const srcIdx = (srcRow * imgW + srcCol) * 4;
        out[idx++] = data[srcIdx];
        out[idx++] = data[srcIdx + 1];
        out[idx++] = data[srcIdx + 2];
        out[idx++] = data[srcIdx + 3];
      }
    }
    return { data: out, width: sw, height: sh, channels: 4 };
  } catch (e) {
    // Try JPEG
    try {
      const jpeg = require('jpeg-js');
      const decoded = jpeg.decode(imageBuffer, { useTArray: true });
      const imgW = decoded.width, imgH = decoded.height, data = decoded.data;
      const sx = Math.max(0, Math.min(imgW - 1, pixelBbox.x));
      const sy = Math.max(0, Math.min(imgH - 1, pixelBbox.y));
      const sw = Math.max(1, Math.min(imgW - sx, pixelBbox.width));
      const sh = Math.max(1, Math.min(imgH - sy, pixelBbox.height));
      const out = Buffer.alloc(sw * sh * 4);
      let idx = 0;
      for (let row = 0; row < sh; row++) {
        const srcRow = sy + row;
        for (let col = 0; col < sw; col++) {
          const srcCol = sx + col;
          const srcIdx = (srcRow * imgW + srcCol) * 4;
          out[idx++] = data[srcIdx];
          out[idx++] = data[srcIdx + 1];
          out[idx++] = data[srcIdx + 2];
          out[idx++] = data[srcIdx + 3] ?? 255;
        }
      }
      return { data: out, width: sw, height: sh, channels: 4 };
    } catch (err) {
      // Fallback: cannot crop, return null
      return null;
    }
  }
}

// Helper: compute mean absolute per-channel diff between two cropped buffers
function pixelDelta(cropA, cropB) {
  try {
    if (!cropA || !cropB) return Number.MAX_VALUE;
    if (cropA.width !== cropB.width || cropA.height !== cropB.height) return Number.MAX_VALUE;
    const a = cropA.data;
    const b = cropB.data;
    if (!a || !b || a.length !== b.length) return Number.MAX_VALUE;
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    const mean = sum / a.length; // 0..255
    return mean / 255; // normalize to 0..1
  } catch (e) {
    return Number.MAX_VALUE;
  }
}

// Helper: compute snap point (center with optional small contrast-based nudge)
function snapPoint(pixelBbox, imageBuffer) {
  const cx = Math.round(pixelBbox.x + pixelBbox.width / 2);
  const cy = Math.round(pixelBbox.y + pixelBbox.height / 2);
  // Best-effort: if we can decode the image, look for the highest local contrast within a 9x9 patch
  try {
    const cropBox = {
      x: Math.max(0, cx - 4),
      y: Math.max(0, cy - 4),
      width: Math.min(pixelBbox.width, 9),
      height: Math.min(pixelBbox.height, 9)
    };
    const patch = crop(imageBuffer, cropBox);
    if (!patch) return { x: cx, y: cy };
    // Find pixel with max local gradient (rough heuristic)
    let best = { x: cx, y: cy, score: -1 };
    const { width: pw, height: ph, data } = patch;
    for (let ry = 0; ry < ph; ry++) {
      for (let rx = 0; rx < pw; rx++) {
        const idx = (ry * pw + rx) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        // brightness
        const bright = 0.299 * r + 0.587 * g + 0.114 * b;
        // compute simple local contrast compared to center
        const centerIdx = Math.floor((ph / 2) * pw + Math.floor(pw / 2)) * 4;
        const cr = data[centerIdx], cg = data[centerIdx + 1], cb = data[centerIdx + 2];
        const cbright = 0.299 * cr + 0.587 * cg + 0.114 * cb;
        const score = Math.abs(bright - cbright);
        if (score > best.score) {
          best = { x: cropBox.x + rx, y: cropBox.y + ry, score };
        }
      }
    }
    return { x: best.x, y: best.y };
  } catch (e) {
    return { x: cx, y: cy };
  }
}

// Internal state for the current session
const state = {
  currentGoal: null,
  currentStep: null,
  stepHistory: [],
  substeps: [], // substeps to guide user back on-task if they go off-task
  isInSubstepMode: false, // true when user is off-task and in recovery mode
  offTaskDetectedAt: null, // timestamp when off-task behavior was detected
  status: 'idle', // 'idle' | 'in-progress' | 'finished' | 'error'
  sessionStartTime: null,
  isFetching: false // guard against concurrent requestNextStep calls
};

// Callbacks registered by main.js
let callbacks = {
  onStep: null,
  onComplete: null,
  onError: null
};

/**
 * Initialize the stepController with callbacks.
 * 
 * @param {Object} options
 * @param {Function} options.onStep - Called when a new step is ready: (step) => void
 * @param {Function} options.onComplete - Called when the session ends: (sessionSummary) => void
 * @param {Function} options.onError - Called on errors: (error) => void
 */
function init(options = {}) {
  callbacks = {
    onStep: options.onStep || null,
    onComplete: options.onComplete || null,
    onError: options.onError || null
  };
}

/**
 * Start a new session with a user goal.
 * 
 * @param {string} goal - The user's task description (e.g., "Upload a file to Google Drive")
 */
function setGoal(goal) {
  if (!goal || typeof goal !== 'string') {
    const error = new Error('Goal must be a non-empty string');
    callbacks.onError?.(error);
    return;
  }

  // Reset state for a new session
  state.currentGoal = goal;
  state.currentStep = null;
  state.stepHistory = [];
  // Create a session id for persistence/debugging
  state.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
  state.status = 'ready';
  state.sessionStartTime = Date.now();
  state.isFetching = false;

  // Persist session record (best-effort)
  try {
    storage.saveSession({
      id: state.currentSessionId,
      goal: goal,
      startedAt: state.sessionStartTime,
      status: 'ready'
    }).catch(() => {});
  } catch (e) {
    // Ignore storage errors here
  }
}

/**
 * Request the next step in the workflow.
 * 
 * Performs:
 * 1. Screen capture
 * 2. LLM query with goal + history
 * 3. Response parsing
 * 4. State update and callback invocation
 */
async function requestNextStep() {
  // Guard against concurrent execution
  if (state.isFetching) {
    console.warn('requestNextStep already in progress; ignoring duplicate call');
    return;
  }

  // Validate preconditions
  if (!state.currentGoal) {
    const error = new Error('No goal set. Call setGoal() first.');
    callbacks.onError?.(error);
    return;
  }

  if (state.status === 'finished' || state.status === 'error') {
    console.log(`Cannot request step in '${state.status}' state`);
    return;
  }

  state.isFetching = true;

  try {
    // Step 1: Capture current screen
    const screenshot = await screenCapture.captureCurrentScreen();
    if (!screenshot) {
      throw new Error('Failed to capture screen: returned null');
    }

    // Save screenshot to screenshots/ directory for debugging/traceability
    try {
      const screenshotsDir = path.resolve(__dirname, '..', '..', '..', 'visor/screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(screenshotsDir, `screenshot-${timestamp}.png`);
      fs.writeFileSync(filePath, screenshot.imageBuffer);
      console.log(`[StepController] Saved screenshot to ${filePath}`);
    } catch (e) {
      console.warn('[StepController] Failed to save screenshot:', e?.message || e);
    }

    // Step 2: Build prompt with goal and history
    const prompt = buildPrompt(state.currentGoal, state.stepHistory, screenshot);
    const screenshotBase64 = screenshot.imageBuffer?.toString('base64');
    if (!screenshotBase64) {
      throw new Error('Screenshot capture did not return an image buffer');
    }

    // Step 3: Call LLM client
    const llmResponse = await sendCompletion({
      systemPrompt: prompt.systemPrompt,
      userGoal: prompt.userGoal,
      screenshotBase64,
      extras: prompt.extras
    });
    if (!llmResponse) {
      throw new Error('LLM returned empty response');
    }

    // Print raw LLM response before parsing
    try {
      console.log('[StepController] LLM raw response:', llmResponse);
    } catch (_) {}

    // Step 4: Parse LLM response into structured step object
    const parsedStep = parseStepResponse(llmResponse);
    if (!parsedStep) {
      throw new Error('Parser returned null step object');
    }

    // Handle parser errors (e.g., malformed JSON)
    if (parsedStep.error) {
      throw new Error(`Parser error: ${parsedStep.reason}`);
    }

    // SMALL ACCURACY UPGRADE: Convert normalized bbox -> pixels, snap, click and verify by comparing
    // a tight crop before/after. Retry once with expanded bbox if change is below threshold.
    try {
      if (parsedStep.bbox && screenshot && screenshot.imageBuffer) {
        const viewport = { width: Number(screenshot.width) || 1, height: Number(screenshot.height) || 1 };
        const pixelBbox = toPixels(parsedStep.bbox, viewport);

        // Compute initial crop and target point
        const beforeCrop = crop(screenshot.imageBuffer, pixelBbox);
        const target = snapPoint(pixelBbox, screenshot.imageBuffer);

        // Execute click via optional executor if available
        try {
          if (clickExecutor && typeof clickExecutor.clickAt === 'function') {
            await clickExecutor.clickAt(target.x, target.y);
          } else {
            // No executor available; log intent for manual verification
            console.log('[StepController] No click executor available; would click at', target);
          }
        } catch (clickErr) {
          console.warn('Click executor failed:', clickErr?.message || clickErr);
        }

        // Re-capture and compute delta
        const reCapture = await screenCapture.captureCurrentScreen();
        const afterCrop = reCapture ? crop(reCapture.imageBuffer, pixelBbox) : null;
        const delta = pixelDelta(beforeCrop, afterCrop);
        const PIXEL_DELTA_THRESHOLD = 0.012; // mean abs diff per channel (0..1)

        if (delta !== Number.MAX_VALUE && delta < PIXEL_DELTA_THRESHOLD) {
          // Retry once with ~12% expansion of bbox
          const expandFactor = 1.12;
          const ex = Math.round(pixelBbox.width * (expandFactor - 1) / 2);
          const ey = Math.round(pixelBbox.height * (expandFactor - 1) / 2);
          const expanded = {
            x: Math.max(0, pixelBbox.x - ex),
            y: Math.max(0, pixelBbox.y - ey),
            width: Math.min(viewport.width, pixelBbox.width + ex * 2),
            height: Math.min(viewport.height, pixelBbox.height + ey * 2)
          };

          const target2 = snapPoint(expanded, reCapture?.imageBuffer || screenshot.imageBuffer);
          try {
            if (clickExecutor && typeof clickExecutor.clickAt === 'function') {
              await clickExecutor.clickAt(target2.x, target2.y);
            } else {
              console.log('[StepController] Retry click (no executor):', target2);
            }
          } catch (clickErr) {
            console.warn('Retry click executor failed:', clickErr?.message || clickErr);
          }

          const reCapture2 = await screenCapture.captureCurrentScreen();
          const afterCrop2 = reCapture2 ? crop(reCapture2.imageBuffer, pixelBbox) : null;
          const delta2 = pixelDelta(beforeCrop, afterCrop2);

          if (delta2 === Number.MAX_VALUE || delta2 < PIXEL_DELTA_THRESHOLD) {
            // Failed to observe meaningful change — emit structured error and abort flow for this step
            const err = new Error('Click did not produce a detectable change in the target region');
            err.code = 'CLICK_NO_DELTA';
            err.delta = delta2 === Number.MAX_VALUE ? null : delta2;
            // Send to onError and discontinue advancing this step
            state.status = 'error';
            callbacks.onError?.(err);
            state.isFetching = false;
            return;
          }
        }
      }
    } catch (verifyErr) {
      console.warn('Verification flow failed (non-fatal):', verifyErr?.message || verifyErr);
      // Do not abort the whole step on verification helper errors — continue to normal flow
    }

    // Assign a unique ID if not present
    if (!parsedStep.id) {
      parsedStep.id = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Step 5: Update internal state
    if (state.currentStep) {
      state.stepHistory.push(state.currentStep);
    }
    const decoratedStep = attachScreenshotMetadata(parsedStep, screenshot);
    state.currentStep = decoratedStep;

    // Step 6: Notify via callback
    callbacks.onStep?.(decoratedStep);

    // Step 7: Check if this is the final step
    if (parsedStep.is_final_step) {
      state.status = 'finished';
      const sessionSummary = buildSessionSummary();
      callbacks.onComplete?.(sessionSummary);
    }

  } catch (error) {
    console.error('Error in requestNextStep:', error);
    state.status = 'error';
    state.isFetching = false;
    callbacks.onError?.(error);
    return;
  }

  state.isFetching = false;
}

/**
 * Mark the current step as completed by the user.
 * 
 * @param {string} stepId - The ID of the step to mark as done
 */
async function markDone(stepId) {
  // Validate that this is the active step
  if (!state.currentStep || state.currentStep.id !== stepId) {
    const error = new Error(
      `Step ID mismatch. Expected '${state.currentStep?.id}', got '${stepId}'`
    );
    callbacks.onError?.(error);
    return;
  }

  // If already finished, do nothing
  if (state.status === 'finished') {
    console.log('Session already finished; ignoring markDone');
    return;
  }

  // Log the completed step (optional, for analytics/storage)
  try {
    await storage.logStep({
      step: state.currentStep,
      completedAt: Date.now(),
      goal: state.currentGoal
    });
  } catch (logError) {
    console.warn('Failed to log step completion:', logError);
    // Don't fail the workflow if logging fails
  }

  // Request the next step, or finish if we're on the final step
  if (state.currentStep.is_final_step) {
    state.status = 'finished';
    const sessionSummary = buildSessionSummary();
    callbacks.onComplete?.(sessionSummary);
  } else {
    // Continue the workflow
    await requestNextStep();
  }
}

/**
 * Get the current state (useful for debugging or IPC introspection).
 * 
 * @returns {Object} A copy of the current state
 */
function getState() {
  return {
    goal: state.currentGoal,
    currentSessionId: state.currentSessionId || null,
    stepNumber: state.stepHistory.length + (state.currentStep ? 1 : 0),
    status: state.status,
    sessionDuration: state.sessionStartTime ? Date.now() - state.sessionStartTime : null
  };
}

/**
 * Build structured prompt parameters for the LLM call.
 * 
 * @param {string} goal
 * @param {Array} history - Previous steps
 * @param {Object} screenshot - From screenCapture
 * @returns {{systemPrompt: string, userGoal: string, extras: object}}
 */
function buildPrompt(goal, history, screenshot) {
  const systemPrompt = `You are Visor, an AI assistant guiding desktop users through multi-step workflows.

You must:
- Inspect the screenshot to understand exactly which UI the user currently sees.
- Provide only the single next actionable instruction toward the goal.
- Reference actual on-screen labels/icons in your description.
- Output valid JSON with normalized coordinates between 0 and 1.

Important rule about unopened apps:
- If the target application or UI is not currently open, DO NOT return an error if there is a visible affordance to open it (e.g., a dock icon, launcher icon, menu bar item, or shortcut on screen). In that case, instruct the user to click the visible affordance to open the app, with a tight bbox over that icon/button.
- Only return {"error": true, "reason": "..."} when there is truly no visible path on the screen to proceed (no dock/launcher/menu affordance).

Shape policy:
- Use "circle" for standalone icons/buttons, "box" for rectangular UI regions, and "arrow" for pointing from one element to another.
`;

  const serializedHistory = history.map((step, index) => ({
    index: index + 1,
    description: step.step_description,
    label: step.label,
    shape: step.shape,
    bbox: step.bbox
  }));

  return {
    systemPrompt,
    userGoal: goal,
    extras: {
      instructions: 'Return JSON with step_description, shape, bbox, label, is_final_step (boolean).',
      previous_steps: serializedHistory,
      screenshot_meta: {
        width: screenshot?.width ?? null,
        height: screenshot?.height ?? null,
        mock_capture: Boolean(screenshot?.mockData)
      }
    }
  };
}

function attachScreenshotMetadata(step, screenshot) {
  if (!step || !screenshot) {
    return step;
  }

  // Physical image dimensions (pixels)
  const rawWidth = Number(screenshot.width) || 1;
  const rawHeight = Number(screenshot.height) || 1;
  // Device pixel ratio reported by capture (or fallback to 1)
  const dpr = Number(screenshot.devicePixelRatio || screenshot.scale || 1) || 1;

  // Convert to CSS viewport dimensions so renderer's window.innerWidth/innerHeight
  // (which are in CSS pixels) can be used to map annotations accurately.
  const cssWidth = Math.max(1, Math.round(rawWidth / dpr));
  const cssHeight = Math.max(1, Math.round(rawHeight / dpr));

  const toPixels = (value, size) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, numeric) * size;
  };

  // bboxPixels are expressed in CSS pixels (not raw physical pixels)
  const bboxPixels = step.bbox
    ? {
        x: toPixels(step.bbox.x, cssWidth),
        y: toPixels(step.bbox.y, cssHeight),
        width: toPixels(step.bbox.width, cssWidth),
        height: toPixels(step.bbox.height, cssHeight)
      }
    : null;

  return {
    ...step,
    bboxPixels,
    viewport: {
      width: cssWidth,
      height: cssHeight,
      devicePixelRatio: dpr,
      rawWidth,
      rawHeight
    },
    screenshotMeta: {
      width: rawWidth,
      height: rawHeight,
      timestamp: screenshot.timestamp,
      mock: Boolean(screenshot.mockData)
    }
  };
}

/**
 * Build a summary of the completed session.
 * 
 * @returns {Object} Session summary
 */
function buildSessionSummary() {
  const totalSteps = state.stepHistory.length + (state.currentStep ? 1 : 0);
  const duration = state.sessionStartTime ? Date.now() - state.sessionStartTime : 0;

  return {
    goal: state.currentGoal,
    totalSteps,
    duration,
    completedAt: Date.now(),
    steps: [...state.stepHistory, ...(state.currentStep ? [state.currentStep] : [])]
  };
}

/**
 * Detect if the user has gone off-task and create substeps to guide them back.
 * 
 * @param {Object} screenshot - Current screenshot
 * @returns {Promise<boolean>} True if off-task behavior was detected
 */
async function detectAndHandleOffTask(screenshot) {
  try {
    // Query LLM to detect if user is off-task
    const offTaskPrompt = `You are monitoring a user trying to complete this task: "${state.currentGoal}"

Current step hint: "${state.currentStep?.step_description || 'No active step'}"

Based on the current screenshot, is the user currently ON-TASK (following the instructions) or OFF-TASK (doing something unrelated)?

Respond with JSON:
{
  "is_off_task": boolean,
  "reason": "explanation of why user is off-task or confirming they are on-task",
  "needs_substeps": boolean
}`;

    const offTaskResponse = await sendCompletion({
      systemPrompt: 'You are monitoring task progress.',
      userGoal: offTaskPrompt,
      screenshotBase64: screenshot.imageBuffer?.toString('base64') || ''
    });
    const offTaskAnalysis = JSON.parse(offTaskResponse.match(/\{[\s\S]*\}/)[0]);

    if (offTaskAnalysis.is_off_task && offTaskAnalysis.needs_substeps) {
      // Generate substeps to get user back on-task
      await generateSubstepsToRefocus(screenshot);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Off-task detection failed, continuing normally:', error);
    return false;
  }
}

/**
 * Generate substeps to guide the user back to the main task.
 * 
 * @param {Object} screenshot - Current screenshot
 */
async function generateSubstepsToRefocus(screenshot) {
  try {
    state.isInSubstepMode = true;
    state.offTaskDetectedAt = Date.now();
    state.substeps = [];

    // Query LLM to generate recovery substeps
    const refocusPrompt = `The user has gone off-task. The goal is: "${state.currentGoal}"

They should be: "${state.currentStep?.step_description || 'Following the task'}"

Create 2-3 SHORT substeps to gently guide them back on-task. Be concise and encouraging.

Respond with JSON array:
[
  {
    "step_description": "string",
    "shape": "circle" | "arrow" | "box",
    "bbox": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 },
    "label": "short hint",
    "is_substep": true
  }
]`;

    const substepResponse = await sendCompletion({
      systemPrompt: 'You are generating recovery substeps.',
      userGoal: refocusPrompt,
      screenshotBase64: screenshot.imageBuffer?.toString('base64') || ''
    });
    const substepMatches = substepResponse.match(/\[[\s\S]*\]/);
    
    if (substepMatches) {
      state.substeps = JSON.parse(substepMatches[0]);
      
      // Assign IDs to substeps
      state.substeps.forEach((substep, index) => {
        substep.id = `substep_${Date.now()}_${index}`;
        substep.isSubstep = true;
      });

      // Send the first substep to the UI
      if (state.substeps.length > 0) {
        callbacks.onStep?.(state.substeps[0]);
      }
    }
  } catch (error) {
    console.error('Failed to generate refocus substeps:', error);
    state.isInSubstepMode = false;
  }
}

/**
 * Mark a substep as done and move to the next substep or back to main flow.
 * 
 * @param {string} stepId - The substep ID
 */
async function markSubstepDone(stepId) {
  if (!state.isInSubstepMode || !state.substeps.length) {
    return;
  }

  // Find which substep was completed
  const completedIndex = state.substeps.findIndex(s => s.id === stepId);
  
  if (completedIndex === -1) {
    return;
  }

  // Check if there are more substeps
  if (completedIndex < state.substeps.length - 1) {
    // Move to next substep
    const nextSubstep = state.substeps[completedIndex + 1];
    callbacks.onStep?.(nextSubstep);
  } else {
    // All substeps completed, return to main flow
    state.isInSubstepMode = false;
    state.substeps = [];
    state.offTaskDetectedAt = null;
    
    // Request the next main step
    await requestNextStep();
  }
}

// Export the public API
module.exports = {
  init,
  setGoal,
  requestNextStep,
  markDone,
  markSubstepDone,
  detectAndHandleOffTask,
  getState,
  _attachScreenshotMetadata: attachScreenshotMetadata
};
