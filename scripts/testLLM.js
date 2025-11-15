const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const { captureCurrentScreen } = require(path.join(ROOT, 'electron-main/services/screenCapture'));
const { sendCompletion } = require(path.join(ROOT, 'electron-main/llm/client'));
const { initial_prompt } = require(path.join(ROOT, 'electron-main/llm/prompts'));

(async () => {
  const capture = await captureCurrentScreen();
  const base64 = capture.imageBuffer.toString('base64');
  const response = await sendCompletion({
    systemPrompt: initial_prompt,
    userGoal: 'Create a new Google Calendar event',
    screenshotBase64: base64,
    extras: { mockData: capture.mockData }
  });
  console.log(response);
})();