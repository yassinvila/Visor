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
const llmClient = require('../llm/client');
const parseStepResponse = require('../llm/parser');
const storage = require('./storage');

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

    // Step 2: Build prompt with goal and history
    const prompt = buildPrompt(state.currentGoal, state.stepHistory, screenshot);

    // Step 3: Call LLM client
    const llmResponse = await llmClient(prompt);
    if (!llmResponse) {
      throw new Error('LLM returned empty response');
    }

    // Step 4: Parse LLM response into structured step object
    const parsedStep = await parseStepResponse(llmResponse);
    if (!parsedStep) {
      throw new Error('Parser returned null step object');
    }

    // Handle parser errors (e.g., malformed JSON)
    if (parsedStep.error) {
      throw new Error(`Parser error: ${parsedStep.reason}`);
    }

    // Assign a unique ID if not present
    if (!parsedStep.id) {
      parsedStep.id = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Step 5: Update internal state
    if (state.currentStep) {
      state.stepHistory.push(state.currentStep);
    }
    state.currentStep = parsedStep;

    // Step 6: Notify via callback
    callbacks.onStep?.(parsedStep);

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
 * Build a prompt for the LLM, incorporating goal, history, and screenshot.
 * 
 * @param {string} goal
 * @param {Array} history - Previous steps
 * @param {Object} screenshot - From screenCapture
 * @returns {string} Formatted prompt
 */
function buildPrompt(goal, history, screenshot) {
  // Start with the base prompt from prompts.js (or inline a simpler version)
  const basePrompt = `You are Visor, an AI assistant guiding a user through a task step-by-step.

Goal: ${goal}

Current screenshot: [Image data to follow]

${history.length > 0 ? `Previous steps taken:\n${history.map(s => `- ${s.step_description}`).join('\n')}\n` : ''}

Analyze the screenshot and provide the NEXT single step to move toward the goal.

Return valid JSON:
{
  "step_description": "string describing what to do",
  "shape": "circle" | "arrow" | "box",
  "bbox": {
    "x": 0.0,
    "y": 0.0,
    "width": 0.0,
    "height": 0.0
  },
  "label": "short hint text",
  "is_final_step": false
}

Coordinates are normalized (0-1 relative to screen size).
`;

  // In a real implementation, you might attach the screenshot as base64
  // For now, this is a text-based prompt
  return basePrompt;
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

    const offTaskResponse = await llmClient(offTaskPrompt);
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

    const substepResponse = await llmClient(refocusPrompt);
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
  getState
};
