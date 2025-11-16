/**
 * testAutoStepping.js
 * 
 * Node-based test harness to validate auto-stepping behavior in stepController:
 * - Mocks screenCapture to return deterministic buffers
 * - Mocks llm/client sendCompletion to return two consecutive steps
 * - Verifies: requestNextStep → emits Step 1, markDone → emits Step 2
 * 
 * Run:
 *   node scripts/testAutoStepping.js
 */

/* eslint-disable no-console */
const path = require('path');

// ---------------------------------------------------------------------------
// Utilities to inject module mocks before requiring the system under test
function mockModule(modulePath, mockExports) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: mockExports
  };
}

function bufferOf(len, filler) {
  const b = Buffer.alloc(len);
  for (let i = 0; i < len; i++) b[i] = typeof filler === 'function' ? filler(i) : filler;
  return b;
}

// ---------------------------------------------------------------------------
// Create mocks
let sendCount = 0;
const mockClient = {
  sendCompletion: async () => {
    sendCount++;
    if (sendCount === 1) {
      // First step
      return JSON.stringify({
        step_description: 'Click the Spotify app icon in the dock.',
        shape: 'circle',
        bbox: { x: 0.12, y: 0.88, width: 0.03, height: 0.05 },
        label: 'Open Spotify',
        is_final_step: false,
        id: 'step_1'
      });
    }
    // Second step
    return JSON.stringify({
      step_description: 'Click “Search” in the sidebar.',
      shape: 'box',
      bbox: { x: 0.05, y: 0.18, width: 0.12, height: 0.08 },
      label: 'Open Search',
      is_final_step: false,
      id: 'step_2'
    });
  }
};

const mockCaptureSequence = [
  { // before click
    imageBuffer: bufferOf(10000, 0),
    width: 1920, height: 1080, format: 'png', timestamp: Date.now(), mockData: true
  },
  { // after click, slightly different
    imageBuffer: bufferOf(10000, (i) => (i % 50 === 0 ? 255 : 0)),
    width: 1920, height: 1080, format: 'png', timestamp: Date.now(), mockData: true
  },
  { // subsequent step capture
    imageBuffer: bufferOf(10000, 1),
    width: 1920, height: 1080, format: 'png', timestamp: Date.now(), mockData: true
  }
];
let captureIdx = 0;
const mockScreenCapture = {
  captureCurrentScreen: async () => {
    const res = mockCaptureSequence[Math.min(captureIdx, mockCaptureSequence.length - 1)];
    captureIdx++;
    return res;
  },
  loadDemoImage: async () => mockCaptureSequence[0],
  setOverlayWindow: () => {},
  clearOverlayWindow: () => {},
  captureRegion: async (x, y, w, h) => ({ ...mockCaptureSequence[0], region: { x, y, width: w, height: h } })
};

// Inject mocks BEFORE loading stepController (which imports these)
mockModule(path.resolve(__dirname, '..', 'electron-main', 'services', 'screenCapture.js'), mockScreenCapture);
mockModule(path.resolve(__dirname, '..', 'electron-main', 'llm', 'client.js'), mockClient);

// Now load the SUT
const stepController = require(path.resolve(__dirname, '..', 'electron-main', 'services', 'stepController.js'));

// ---------------------------------------------------------------------------
// Test Runner
async function run() {
  let steps = [];
  let errors = [];

  stepController.init({
    onStep: (s) => {
      steps.push(s);
      console.log('[onStep]', s?.id, s?.label);
    },
    onError: (e) => {
      console.error('[onError]', e?.message || e);
      errors.push(e);
    },
    onComplete: (summary) => {
      console.log('[onComplete]', summary?.totalSteps);
    }
  });

  stepController.setGoal('Open Spotify and go to Search');
  await stepController.requestNextStep();

  if (steps.length !== 1 || steps[0]?.label !== 'Open Spotify') {
    console.error('FAIL: Expected first emitted step label to be "Open Spotify", got:', steps[0]?.label);
    process.exit(1);
  } else {
    console.log('PASS: First step emitted as expected.');
  }

  // Simulate user clicking the bbox — we call markDone directly
  await stepController.markDone(steps[0].id);

  if (steps.length < 2 || steps[1]?.label !== 'Open Search') {
    console.error('FAIL: Expected second emitted step label to be "Open Search", got:', steps[1]?.label);
    process.exit(1);
  } else {
    console.log('PASS: Second step emitted after markDone.');
  }

  if (errors.length > 0) {
    console.error('FAIL: Encountered errors during test execution.');
    process.exit(1);
  }

  console.log('SUCCESS: Auto-stepping behavior validated.');
}

run().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});


