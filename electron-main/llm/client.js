/**
 * client.js — wraps calls to the LLM provider (OpenRouter)
 *
 * Responsibilities:
 *  - manage API key/model configuration
 *  - build multi-modal messages (goal text + screenshot)
 *  - expose a simple `sendCompletion` Promise API
 *  - keep helper exports for testing (similar to screenCapture structure)
 */

require('dotenv').config();
const fetch = require('node-fetch');

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const DEFAULT_TEMPERATURE = normalizeTemperature(process.env.OPENROUTER_TEMPERATURE);

function normalizeTemperature(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.2;
  return Math.min(Math.max(parsed, 0), 1);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Execute a chat completion against OpenRouter using raw HTTP.
 */
async function sendCompletion({
  systemPrompt = '',
  userGoal = '',
  screenshotBase64,
  extras = {}
} = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set in environment');
  }

  const messages = buildMessages({ systemPrompt, userGoal, screenshotBase64, extras });

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: DEFAULT_TEMPERATURE,
      messages
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${errorBody}`);
  }

  const completion = await response.json();
  return completion?.choices?.[0]?.message?.content ?? null;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function buildMessages({ systemPrompt, userGoal, screenshotBase64, extras }) {
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  const userParts = [];

  if (userGoal) {
    userParts.push({ type: 'text', text: `User goal: ${userGoal}` });
  }

  if (extras && Object.keys(extras).length > 0) {
    userParts.push({ type: 'text', text: `Context: ${JSON.stringify(extras)}` });
  }

  if (screenshotBase64) {
    const url = screenshotBase64.startsWith('data:')
      ? screenshotBase64
      : `data:image/png;base64,${screenshotBase64}`;
    userParts.push({
      type: 'image_url',
      image_url: { url }
    });
  }

  if (userParts.length === 0) {
    userParts.push({ type: 'text', text: 'No additional context provided.' });
  }

  messages.push({ role: 'user', content: userParts });
  return messages;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  sendCompletion,
  _buildMessages: buildMessages
};
