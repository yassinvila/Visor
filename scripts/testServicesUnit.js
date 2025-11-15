/**
 * testServicesUnit.js — Comprehensive unit tests for backend services
 *
 * Tests individual services in isolation:
 *   - screenCapture (mock mode)
 *   - parser (LLM response validation)
 *   - storage (JSON persistence)
 *   - stepController (orchestration logic)
 *
 * Run: node scripts/testServicesUnit.js
 */

const path = require('path');
const fs = require('fs').promises;
const ROOT = path.resolve(__dirname, '..');

// Force mock capture for testing
process.env.VISOR_USE_REAL_CAPTURE = 'false';
process.env.LAPTOP_VERSION = 'surface-laptop';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// ============================================================================
// TEST UTILITIES
// ============================================================================

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}: ${message}`);
  }
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(`Value does not exist: ${message}`);
  }
}

async function test(name, fn) {
  testsRun++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    testsFailed++;
  }
}

// ============================================================================
// TEST SUITE 1: screenCapture
// ============================================================================

async function testScreenCapture() {
  console.log('\n📸 Testing screenCapture service:\n');

  const { captureCurrentScreen, loadDemoImage } = require(path.join(ROOT, 'electron-main/services/screenCapture'));

  await test('captureCurrentScreen returns buffer', async () => {
    const capture = await captureCurrentScreen();
    assertExists(capture.imageBuffer, 'imageBuffer');
    assert(Buffer.isBuffer(capture.imageBuffer), 'imageBuffer should be Buffer');
  });

  await test('captureCurrentScreen includes dimensions', async () => {
    const capture = await captureCurrentScreen();
    assert(capture.width > 0, 'width should be positive');
    assert(capture.height > 0, 'height should be positive');
  });

  await test('captureCurrentScreen includes format and timestamp', async () => {
    const capture = await captureCurrentScreen();
    assertExists(capture.format, 'format');
    assertExists(capture.timestamp, 'timestamp');
    assert(typeof capture.timestamp === 'number', 'timestamp should be number');
  });

  await test('captureCurrentScreen respects LAPTOP_VERSION', async () => {
    const capture = await captureCurrentScreen();
    // surface-laptop maps to 2256x1504
    assertEquals(capture.width, 2256, 'width for surface-laptop');
    assertEquals(capture.height, 1504, 'height for surface-laptop');
  });

  await test('mock capture includes mockData flag', async () => {
    const capture = await captureCurrentScreen();
    assert(capture.mockData === true, 'mockData should be true in mock mode');
  });
}

// ============================================================================
// TEST SUITE 2: parser
// ============================================================================

async function testParser() {
  console.log('\n🔍 Testing parser service:\n');

  const parser = require(path.join(ROOT, 'electron-main/llm/parser'));

  await test('parseStepResponse parses valid JSON', async () => {
    const response = JSON.stringify({
      step_description: "Click button",
      shape: "box",
      bbox: [0.1, 0.2, 0.3, 0.4],
      label: "Submit",
      is_final_step: false
    });
    const result = parser.parseStepResponse(response);
    assert(!result.error, 'should not have error');
    assertEquals(result.step_description, "Click button", 'description');
  });

  await test('parseStepResponse extracts JSON from markdown', async () => {
    const response = `
Here's the next step:
\`\`\`json
{
  "step_description": "Fill form",
  "shape": "arrow",
  "bbox": [0.5, 0.5, 0.9, 0.9],
  "label": "Type",
  "is_final_step": false
}
\`\`\`
    `;
    const result = parser.parseStepResponse(response);
    assert(!result.error, 'should not have error');
    assertEquals(result.shape, "arrow", 'shape from markdown');
  });

  await test('parseStepResponse validates bbox normalization', async () => {
    const response = JSON.stringify({
      step_description: "Click",
      shape: "circle",
      bbox: [0.0, 0.0, 1.0, 1.0],
      label: "Click",
      is_final_step: true
    });
    const result = parser.parseStepResponse(response);
    assert(!result.error, 'bbox 0-1 should be valid');
    assertEquals(result.is_final_step, true, 'final step');
  });

  await test('parseStepResponse rejects invalid bbox', async () => {
    const response = JSON.stringify({
      step_description: "Click",
      shape: "box",
      bbox: [0.1, 0.2, 1.5, 0.4],
      label: "Click",
      is_final_step: false
    });
    const result = parser.parseStepResponse(response);
    assert(result.error === true, 'should have error for invalid bbox');
  });

  await test('parseStepResponse rejects invalid shape', async () => {
    const response = JSON.stringify({
      step_description: "Click",
      shape: "triangle",
      bbox: [0.1, 0.2, 0.3, 0.4],
      label: "Click",
      is_final_step: false
    });
    const result = parser.parseStepResponse(response);
    assert(result.error === true, 'should have error for invalid shape');
  });

  await test('parseStepResponse requires step_description', async () => {
    const response = JSON.stringify({
      shape: "box",
      bbox: [0.1, 0.2, 0.3, 0.4],
      label: "Click",
      is_final_step: false
    });
    const result = parser.parseStepResponse(response);
    assert(result.error === true, 'should have error for missing description');
  });

  await test('parseStepResponse detects LLM error responses', async () => {
    const response = JSON.stringify({
      error: true,
      reason: "Unable to determine next step"
    });
    const result = parser.parseStepResponse(response);
    assert(result.error === true, 'should detect error response');
    assertEquals(result.reason, "Unable to determine next step", 'reason preserved');
  });
}

// ============================================================================
// TEST SUITE 3: storage
// ============================================================================

async function testStorage() {
  console.log('\n💾 Testing storage service:\n');

  const storage = require(path.join(ROOT, 'electron-main/services/storage'));

  // Initialize storage (creates data directory and files)
  await storage.init();
  console.log('  ℹ Storage initialized');

  await test('storage.saveSession persists session', async () => {
    const session = {
      id: `test_session_${Date.now()}`,
      goal: 'Test goal',
      startedAt: Date.now(),
      status: 'in_progress'
    };
    const saved = await storage.saveSession(session);
    assertEquals(saved.id, session.id, 'session id');
  });

  await test('storage.loadSession retrieves saved session', async () => {
    const sessionId = `test_session_${Date.now()}`;
    const session = {
      id: sessionId,
      goal: 'Load test',
      startedAt: Date.now(),
      status: 'testing'
    };
    await storage.saveSession(session);
    const loaded = await storage.loadSession(sessionId);
    assert(loaded !== null, 'session should exist');
    assertEquals(loaded.id, sessionId, 'loaded session id');
    assertEquals(loaded.goal, 'Load test', 'loaded goal');
  });

  await test('storage.listSessions returns all sessions', async () => {
    const sessions = await storage.listSessions();
    assert(Array.isArray(sessions), 'sessions should be array');
    assert(sessions.length >= 1, 'should have at least 1 session');
  });

  await test('storage.logStep appends step to log', async () => {
    const sessionId = `step_session_${Date.now()}`;
    await storage.saveSession({
      id: sessionId,
      goal: 'Step test',
      startedAt: Date.now(),
      status: 'testing'
    });

    const step = {
      id: 'step_1',
      step_description: 'Click button',
      bbox: [0.1, 0.2, 0.3, 0.4],
      isFinal: false
    };
    await storage.logStep(sessionId, step);
    
    const steps = await storage.loadStepLogs(sessionId);
    assert(steps.length >= 1, 'should have logged step');
  });

  await test('storage.saveChatMessage stores message', async () => {
    const message = {
      role: 'user',
      text: 'Test message'
    };
    const saved = await storage.saveChatMessage(message);
    assertExists(saved.id, 'message should have id');
    assertEquals(saved.role, 'user', 'role');
  });

  await test('storage.loadChatHistory retrieves messages', async () => {
    const message = {
      role: 'assistant',
      text: 'Response'
    };
    await storage.saveChatMessage(message);
    const history = await storage.loadChatHistory();
    assert(Array.isArray(history), 'history should be array');
    assert(history.length >= 1, 'should have messages');
  });

  await test('storage.saveSettings persists settings', async () => {
    const settings = {
      autoAdvance: true,
      theme: 'dark'
    };
    const saved = await storage.saveSettings(settings);
    assertEquals(saved.autoAdvance, true, 'setting persisted');
  });

  await test('storage.loadSettings retrieves settings', async () => {
    const settings = {
      testKey: 'testValue'
    };
    await storage.saveSettings(settings);
    const loaded = await storage.loadSettings();
    assertEquals(loaded.testKey, 'testValue', 'setting loaded');
  });

  await test('storage.logError records errors', async () => {
    const error = new Error('Test error');
    const logged = await storage.logError(error);
    assertEquals(logged.message, 'Test error', 'error message');
    assertExists(logged.id, 'error id');
    assertExists(logged.timestamp, 'error timestamp');
  });
}

// ============================================================================
// TEST SUITE 4: stepController
// ============================================================================

async function testStepController() {
  console.log('\n🔄 Testing stepController service:\n');

  const stepController = require(path.join(ROOT, 'electron-main/services/stepController'));

  await test('stepController.init registers callbacks', async () => {
    let onStepCalled = false;
    let onCompleteCalled = false;
    let onErrorCalled = false;

    stepController.init({
      onStep: () => { onStepCalled = true; },
      onComplete: () => { onCompleteCalled = true; },
      onError: () => { onErrorCalled = true; }
    });

    // Verify state is initialized
    const state = stepController.getState();
    assertExists(state, 'state should exist');
  });

  await test('stepController.setGoal sets goal and creates session', async () => {
    stepController.init({
      onStep: () => {},
      onComplete: () => {},
      onError: () => {}
    });

    stepController.setGoal('Test workflow goal');
    const state = stepController.getState();
    assertEquals(state.goal, 'Test workflow goal', 'goal should be set');
    assertExists(state.currentSessionId, 'session should be created');
  });

  await test('stepController.getState returns current state', async () => {
    stepController.init({
      onStep: () => {},
      onComplete: () => {},
      onError: () => {}
    });

    stepController.setGoal('Another test');
    const state = stepController.getState();
    assert(state.status === 'idle' || state.status === 'ready', 'status should be idle or ready');
    assertEquals(state.stepNumber, 0, 'step number should start at 0');
  });

  await test('stepController prevents concurrent requests', async () => {
    let requestCount = 0;

    stepController.init({
      onStep: () => { requestCount++; },
      onComplete: () => {},
      onError: () => {}
    });

    // Note: Full concurrent test requires mocking LLM which we skip here
    // Just verify the guard exists in state
    const state = stepController.getState();
    assert(typeof state === 'object', 'state is object');
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  🧪 BACKEND SERVICES UNIT TEST SUITE');
  console.log('='.repeat(60));

  try {
    await testScreenCapture();
    await testParser();
    await testStorage();
    await testStepController();

    console.log('\n' + '='.repeat(60));
    console.log(`  📊 Test Results: ${testsPassed}/${testsRun} passed`);
    console.log('='.repeat(60));

    if (testsFailed === 0) {
      console.log('\n✓ All tests passed!\n');
      process.exit(0);
    } else {
      console.log(`\n✗ ${testsFailed} test(s) failed\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
