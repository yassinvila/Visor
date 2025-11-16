/**
 * testOpenRouter.js - Debug OpenRouter API calls
 */

require('dotenv').config();
const { OpenRouter } = require('@openrouter/sdk');
model_choice = 'openai/gpt-4o-mini';

async function testBasicCall() {
  console.log('Testing OpenRouter API...\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set');
    process.exit(1);
  }
  
  console.log('✓ API Key found:', apiKey.substring(0, 15) + '...');
  
  try {
    const client = new OpenRouter({ apiKey });
    
    // Test 1: Simple text-only request
    console.log('\nTest 1: Simple text completion...');
    const response1 = await client.chat.send({
      model: model_choice,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: [{ type: 'text', text: 'Say "Hello from OpenRouter!" and nothing else.' }] }
      ],
      provider: { order: ['OpenAI'], allow_fallbacks: false },
      stream: false
    });
    
    console.log('✓ Response:', response1?.choices?.[0]?.message?.content);
    
    // Test 2: Vision check (valid schemas only)
    console.log('\nTest 2: Vision check (valid schemas only)...');

    // Load a larger, real image from repo for data URL testing
    const fs = require('fs');
    const path = require('path');
    const appIconPath = path.resolve(__dirname, '..', 'assets', 'icons', 'appIcon.png');
    let appIconBase64 = null;
    let appIconMime = 'png';
    function detectImageMime(buf) {
      if (!buf || buf.length < 4) return null;
      // PNG signature: 89 50 4E 47
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
      // JPEG signature: FF D8 FF
      if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
      // GIF87a/89a
      if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
      // BMP: 42 4D
      if (buf[0] === 0x42 && buf[1] === 0x4d) return 'bmp';
      return null;
    }
    try {
      const buf = fs.readFileSync(appIconPath);
      appIconBase64 = buf.toString('base64');
      appIconMime = detectImageMime(buf) || 'png';
      console.log(`✓ Loaded appIcon.png for base64 test (detected mime: ${appIconMime})`);
    } catch (e) {
      console.log('! Could not load appIcon.png for base64 test:', e.message);
    }

    async function tryVariant(name, { useDataUrl = false, base64 = null }) {
      try {
        const messages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this image briefly.' },
              { type: 'image_url', imageUrl: { url: useDataUrl ? `data:image/${appIconMime};base64,${base64 || appIconBase64 || ''}` : 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/June_odd-eyed-cat.jpg/320px-June_odd-eyed-cat.jpg' } }
            ]
          }
        ];
        const resp = await client.chat.send({ model: model_choice, temperature: 0.2, messages, provider: { order: ['OpenAI'], allow_fallbacks: false }, stream: false });
        console.log(`  ✓ ${name} →`, resp?.choices?.[0]?.message?.content?.slice?.(0, 120) || '(no content)');
        return true;
      } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        console.log(`  ✗ ${name} — error:`, err?.message, status ? `(status ${status})` : '');
        if (data) {
          try { console.log('    provider data:', JSON.stringify(data, null, 2).slice(0, 800)); } catch {}
        }
        return false;
      }
    }

    // A: Data URL (from local appIcon, avoids 1x1 placeholder)
    if (appIconBase64) {
      await tryVariant('A: text + image_url.imageUrl (data URL from appIcon)', { useDataUrl: true, base64: appIconBase64 });
    } else {
      console.log('  ! Skipping A: no local image loaded');
    }

    // E: Try with a public HTTPS image URL (rules out base64/data URL rejection)
    async function tryHttpsVariant(name) {
      try {
        const messages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is in this picture?' },
              { type: 'image_url', imageUrl: { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/June_odd-eyed-cat.jpg/320px-June_odd-eyed-cat.jpg' } }
            ]
          }
        ];
        const resp = await client.chat.send({ model: model_choice, temperature: 0.2, messages, provider: { order: ['OpenAI'], allow_fallbacks: false }, stream: false });
        console.log(`  ✓ ${name} →`, resp?.choices?.[0]?.message?.content?.slice?.(0, 120) || '(no content)');
        return true;
      } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        console.log(`  ✗ ${name} — error:`, err?.message, status ? `(status ${status})` : '');
        if (data) {
          try { console.log('    provider data:', JSON.stringify(data, null, 2).slice(0, 800)); } catch {}
        }
        return false;
      }
    }

    await tryHttpsVariant('E: text + image_url.imageUrl (https URL)');

    // F: Try with repo PNG as a larger data URL (if available)
    async function tryDataFromFileVariant(name) {
      if (!appIconBase64) return console.log('  ! Skipping', name, '- no base64 loaded');
      try {
        const messages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this app icon.' },
              { type: 'image_url', imageUrl: { url: `data:image/${appIconMime};base64,${appIconBase64}` } }
            ]
          }
        ];
        const resp = await client.chat.send({ model: model_choice, temperature: 0.2, messages, provider: { order: ['OpenAI'], allow_fallbacks: false }, stream: false });
        console.log(`  ✓ ${name} →`, resp?.choices?.[0]?.message?.content?.slice?.(0, 120) || '(no content)');
        return true;
      } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        console.log(`  ✗ ${name} — error:`, err?.message, status ? `(status ${status})` : '');
        if (data) {
          try { console.log('    provider data:', JSON.stringify(data, null, 2).slice(0, 800)); } catch {}
        }
        return false;
      }
    }

    await tryDataFromFileVariant('F: text + image_url.imageUrl (data: appIcon.png)');
    
    // Test 3: Check for the exact structure we use
    console.log('\nTest 3: Using our exact message format...');
    const response3 = await client.chat.send({
      model: model_choice,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Test system prompt' },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: 'User goal: Test goal' },
            { type: 'text', text: 'Context: {"test":true}' },
            // Use HTTPS JPG to avoid provider data: URL rejection
            { type: 'image_url', imageUrl: { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/June_odd-eyed-cat.jpg/320px-June_odd-eyed-cat.jpg' } }
          ]
        }
      ],
      provider: { order: ['OpenAI'], allow_fallbacks: false },
      stream: false
    });
    console.log('✓ Response:', response3?.choices?.[0]?.message?.content);
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    console.error('\nFull error:', error);
  }
}

testBasicCall();
