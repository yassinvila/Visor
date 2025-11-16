const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT, 'screenshots');
const OVERLAY_TEST_SCRIPT = path.join(ROOT, 'scripts', 'testOverlay.js');
const LLM_STEP_JSON = path.join(ROOT, 'screenshots', 'llm-step.json');

const { captureCurrentScreen } = require(path.join(ROOT, 'electron-main/services/screenCapture'));
const { sendCompletion } = require(path.join(ROOT, 'electron-main/llm/client'));
const { parseStepResponse } = require(path.join(ROOT, 'electron-main/llm/parser'));
const stepController = require(path.join(ROOT, 'electron-main/services/stepController'));
const { initial_prompt } = require(path.join(ROOT, 'electron-main/llm/prompts'));

function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

function saveScreenshot(imageBuffer) {
  ensureScreenshotDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshot-${timestamp}.png`;
  const filePath = path.join(SCREENSHOT_DIR, filename);
  fs.writeFileSync(filePath, imageBuffer);
  console.log(`Saved screenshot to ${filePath}`);
  return filePath;
}

(async () => {
  const capture = await captureCurrentScreen();
  saveScreenshot(capture.imageBuffer);

  let response;
  try {
    const base64 = capture.imageBuffer.toString('base64');
    // Hardcode image sending for now (avoid env flag confusion)
    const shouldSendImage = true;

    const payload = {
      systemPrompt: initial_prompt,
      userGoal: 'Create a new Google Calendar event',
      extras: { mockData: capture.mockData }
    };

    if (shouldSendImage) {
      payload.screenshotBase64 = base64;
      console.log('Including screenshot in LLM request (base64 length:', base64.length, ').');
    } else {
      console.log('Sending text-only request to LLM (no screenshot).');
    }

    response = await sendCompletion(payload);
    console.log('Raw response:', response);
  } catch (err) {
    console.error('LLM request failed:', err.message || err);
    return;
  }

  const parsed = parseStepResponse(response);
  if (!parsed || parsed.error) {
    console.error('Failed to parse response:', parsed?.reason ?? 'Unknown parser error');
    return;
  }

  const enriched = stepController._attachScreenshotMetadata(parsed, capture);
  console.log('Enriched step payload:');
  console.dir(enriched, { depth: null });

  try {
    ensureScreenshotDir();
    fs.writeFileSync(LLM_STEP_JSON, JSON.stringify(enriched, null, 2), 'utf8');
    console.log(`Saved LLM step JSON to ${LLM_STEP_JSON}`);

    if (fs.existsSync(OVERLAY_TEST_SCRIPT)) {
      console.log('Launching overlay preview for LLM step...');
      const child = spawn(
        process.execPath,
        [OVERLAY_TEST_SCRIPT, LLM_STEP_JSON, '--launch-overlay'],
        {
          cwd: ROOT,
          stdio: 'inherit',
          env: process.env
        }
      );

      child.on('exit', (code, signal) => {
        if (signal) {
          console.log(`Overlay preview (from testLLM) exited via signal ${signal}`);
        } else {
          console.log(`Overlay preview (from testLLM) exited with code ${code}`);
        }
      });
    } else {
      console.warn('Overlay test script not found; skipping visual preview.');
    }
  } catch (err) {
    console.warn('Failed to launch overlay preview from testLLM:', err.message);
  }
