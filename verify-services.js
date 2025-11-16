// Simple verification script for failed test items
require('dotenv').config();

// Set env vars BEFORE requiring modules
const path = require('path');
const TEST_PATH = path.join(__dirname, 'test-storage-verify');
process.env.VISOR_DATA_PATH = TEST_PATH;
process.env.VISOR_USE_REAL_CAPTURE = 'false';

async function verify() {
  console.log('=== VERIFYING SERVICES ===\n');

  // 1. Check screenCapture mockData flag
  console.log('1. Testing screenCapture mockData flag...');
  const screenCapture = require('./electron-main/services/screenCapture');
  
  try {
    const result = await screenCapture.captureCurrentScreen();
    console.log('   mockData:', result.mockData);
    console.log('   width:', result.width);
    console.log('   height:', result.height);
    console.log('   has buffer:', !!result.imageBuffer);
    console.log('   ✓ screenCapture working');
  } catch (e) {
    console.log('   ✗ Error:', e.message);
  }

  // 2. Check storage initialization
  console.log('\n2. Testing storage initialization...');
  const storage = require('./electron-main/services/storage');
  const fs = require('fs');
  
  try {
    await storage.init();
    console.log('   Storage path:', TEST_PATH);
    console.log('   Directory exists:', fs.existsSync(TEST_PATH));
    
    if (fs.existsSync(TEST_PATH)) {
      const files = fs.readdirSync(TEST_PATH);
      console.log('   Files created:', files);
      console.log('   ✓ Storage initialized');
    } else {
      console.log('   ✗ Directory not created');
    }
  } catch (e) {
    console.log('   ✗ Error:', e.message);
  }

  // 3. Check error logging
  console.log('\n3. Testing error logging...');
  try {
    const testError = new Error('Test error for verification');
    await storage.logError(testError);
    
    const errorFile = path.join(TEST_PATH, 'errors.json');
    console.log('   Error file path:', errorFile);
    console.log('   Error file exists:', fs.existsSync(errorFile));
    
    if (fs.existsSync(errorFile)) {
      const content = fs.readFileSync(errorFile, 'utf8');
      const errors = JSON.parse(content);
      console.log('   Logged errors count:', errors.length);
      console.log('   ✓ Error logging working');
    } else {
      console.log('   ✗ Error file not created');
    }
  } catch (e) {
    console.log('   ✗ Error:', e.message);
  }

  // 4. Check OpenRouter API key
  console.log('\n4. Checking OpenRouter API configuration...');
  console.log('   API key present:', !!process.env.OPENROUTER_API_KEY);
  console.log('   API key length:', process.env.OPENROUTER_API_KEY?.length || 0);
  
  if (process.env.OPENROUTER_API_KEY) {
    const client = require('./electron-main/llm/client');
    try {
      console.log('   Attempting API call...');
      const response = await client.sendCompletion({
        systemPrompt: 'Respond with only "OK"',
        userGoal: 'Say OK',
        screenshotBase64: null
      });
      console.log('   Response received:', response ? 'YES' : 'NO');
      console.log('   ✓ API connection working');
    } catch (e) {
      console.log('   ✗ API Error:', e.message);
    }
  } else {
    console.log('   ⚠ No API key set');
  }

  // Cleanup
  console.log('\n=== CLEANUP ===');
  if (fs.existsSync(TEST_PATH)) {
    fs.rmSync(TEST_PATH, { recursive: true, force: true });
    console.log('Test directory cleaned up');
  }
}

verify().catch(console.error);
