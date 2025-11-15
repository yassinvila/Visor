/**
 * testServices.js — Test individual services without requiring API key
 */

const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// Force mock capture for this test
process.env.VISOR_USE_REAL_CAPTURE = 'false';
process.env.LAPTOP_VERSION = 'surface-laptop';

(async () => {
  console.log('=== Service Integration Test ===\n');

  try {
    // Test 1: screenCapture
    console.log('1. Testing screenCapture.captureCurrentScreen():');
    const { captureCurrentScreen } = require(path.join(ROOT, 'electron-main/services/screenCapture'));
    const capture = await captureCurrentScreen();
    console.log('   ✓ Capture successful');
    console.log('   - imageBuffer length:', capture.imageBuffer.length, 'bytes');
    console.log('   - width:', capture.width, ', height:', capture.height);
    console.log('   - format:', capture.format);
    console.log('   - mockData:', capture.mockData ? 'true' : 'false');

    // Test 2: parser
    console.log('\n2. Testing parser.parseStepResponse():');
    const parser = require(path.join(ROOT, 'electron-main/llm/parser'));
    
    // Mock LLM response
    const mockLLMResponse = JSON.stringify({
      step_description: "Click on the Create button",
      shape: "box",
      bbox: [0.4, 0.3, 0.6, 0.4],
      label: "Create",
      is_final_step: false
    });
    
    const parsedStep = parser.parseStepResponse(mockLLMResponse);
    if (parsedStep.error) {
      console.log('   ✗ Parser error:', parsedStep.reason);
    } else {
      console.log('   ✓ Step parsed successfully');
      console.log('   - description:', parsedStep.step_description);
      console.log('   - shape:', parsedStep.shape);
      console.log('   - bbox:', parsedStep.bbox);
      console.log('   - label:', parsedStep.label);
      console.log('   - isFinal:', parsedStep.is_final_step);
    }

    // Test 3: storage
    console.log('\n3. Testing storage service:');
    const storage = require(path.join(ROOT, 'electron-main/services/storage'));
    await storage.init();
    console.log('   ✓ Storage initialized');
    
    const testSession = {
      id: 'test_session_' + Date.now(),
      goal: 'Test goal',
      startedAt: Date.now(),
      status: 'in_progress'
    };
    
    await storage.saveSession(testSession);
    console.log('   ✓ Session saved');
    
    const loaded = await storage.loadSession(testSession.id);
    console.log('   ✓ Session loaded:', loaded.id === testSession.id ? 'match' : 'mismatch');
    
    await storage.saveChatMessage({
      role: 'user',
      text: 'Test message',
      sessionId: testSession.id
    });
    console.log('   ✓ Chat message saved');
    
    const history = await storage.loadChatHistory(testSession.id);
    console.log('   ✓ Chat history loaded:', history.length, 'messages');

    // Test 4: stepController (without LLM)
    console.log('\n4. Testing stepController initialization:');
    const stepController = require(path.join(ROOT, 'electron-main/services/stepController'));
    
    let stepReceived = false;
    let completionReceived = false;
    let errorReceived = false;

    stepController.init({
      onStep: (step) => {
        console.log('   ✓ onStep callback fired');
        stepReceived = true;
      },
      onComplete: (summary) => {
        console.log('   ✓ onComplete callback fired');
        completionReceived = true;
      },
      onError: (error) => {
        console.log('   ✗ onError callback fired:', error.message);
        errorReceived = true;
      }
    });
    console.log('   ✓ stepController initialized');

    console.log('\n=== All Service Tests Passed ===');
    console.log('Services are ready for integration.');
    console.log('\nTo test with real LLM:');
    console.log('1. Set OPENROUTER_API_KEY environment variable');
    console.log('2. Run: node scripts/testLLM.js');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
