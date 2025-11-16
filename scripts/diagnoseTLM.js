/**
 * diagnoseTLM.js — Simple diagnostic to check what's broken in testLLM.js
 */

require('dotenv').config();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

console.log('=== Diagnostic Test for testLLM.js ===\n');

// Step 1: Check environment
console.log('1. Checking environment variables:');
console.log('   OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '[SET]' : '[NOT SET - REQUIRED]');
console.log('   VISOR_USE_REAL_CAPTURE:', process.env.VISOR_USE_REAL_CAPTURE || 'undefined (defaults to true)');
console.log('   LAPTOP_VERSION:', process.env.LAPTOP_VERSION || 'undefined (defaults to 1920x1080)');

// Step 2: Test screenCapture import and basic functionality
console.log('\n2. Testing screenCapture import:');
try {
  const { captureCurrentScreen } = require(path.join(ROOT, 'electron-main/services/screenCapture'));
  console.log('   ✓ screenCapture imported successfully');
  console.log('   captureCurrentScreen type:', typeof captureCurrentScreen);
} catch (e) {
  console.log('   ✗ Error importing screenCapture:', e.message);
}

// Step 3: Test llm/client import
console.log('\n3. Testing llm/client import:');
try {
  const { sendCompletion } = require(path.join(ROOT, 'electron-main/llm/client'));
  console.log('   ✓ llm/client imported successfully');
  console.log('   sendCompletion type:', typeof sendCompletion);
} catch (e) {
  console.log('   ✗ Error importing llm/client:', e.message);
}

// Step 4: Test prompts import
console.log('\n4. Testing llm/prompts import:');
try {
  const promptsModule = require(path.join(ROOT, 'electron-main/llm/prompts'));
  // Support both CommonJS named exports and ES module default exports
  const initial_prompt = promptsModule.initial_prompt || promptsModule.default || promptsModule;
  console.log('   ✓ llm/prompts imported successfully');
  console.log('   initial_prompt length:', initial_prompt ? initial_prompt.length : 'undefined');
} catch (e) {
  console.log('   ✗ Error importing llm/prompts:', e.message);
}

// Step 5: Test parser import
console.log('\n5. Testing parser import:');
try {
  const parser = require(path.join(ROOT, 'electron-main/llm/parser'));
  console.log('   ✓ parser imported successfully');
  console.log('   parseStepResponse type:', typeof parser.parseStepResponse);
} catch (e) {
  console.log('   ✗ Error importing parser:', e.message);
}

// Step 6: Optional LLM smoke test (only runs if API key is set)
console.log('\n6. Optional LLM smoke test:');
try {
  const { sendCompletion } = require(path.join(ROOT, 'electron-main/llm/client'));
  const promptsModule = require(path.join(ROOT, 'electron-main/llm/prompts'));
  const initial_prompt = promptsModule.initial_prompt || promptsModule.default || promptsModule;

  if (!process.env.OPENROUTER_API_KEY) {
    console.log('   - OPENROUTER_API_KEY not set; skipping live LLM call.');
    console.log('     To run live test, set OPENROUTER_API_KEY and re-run this script.');
  } else {
    (async () => {
      try {
        console.log('   - Making a small test completion request (this will use your API key)');
        // Use a public HTTPS image URL (providers may reject data URLs)
        const httpsTestImage = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/June_odd-eyed-cat.jpg/320px-June_odd-eyed-cat.jpg';
        const resp = await sendCompletion({
          systemPrompt: initial_prompt,
          userGoal: 'Test: open a file menu',
          screenshotBase64: httpsTestImage,
          extras: { test: true }
        });
        console.log('   ✓ LLM call succeeded. Response preview:', String(resp).slice(0, 200));
      } catch (err) {
        console.log('   ✗ LLM call failed:', err.message || err);
      }
    })();
  }
} catch (e) {
  console.log('   ✗ Skipping LLM smoke test (client import failed):', e.message);
}

console.log('\n=== Recommendations ===');
if (!process.env.OPENROUTER_API_KEY) {
  console.log('1. SET OPENROUTER_API_KEY environment variable');
  console.log('   Example: export OPENROUTER_API_KEY="sk-..."');
}
console.log('2. For testing without real API, set VISOR_USE_REAL_CAPTURE=false');
console.log('3. Check that all dependencies are installed: npm install');

console.log('\n=== Next Steps ===');
console.log('Once API key is set, run: node scripts/testLLM.js');
