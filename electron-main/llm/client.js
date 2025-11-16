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

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';
//const PREFERRED_PROVIDER = process.env.OPENROUTER_PREFERRED_PROVIDER || 'OpenAI';
const DEFAULT_TEMPERATURE = normalizeTemperature(process.env.OPENROUTER_TEMPERATURE);
let openRouterClient;

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
  const client = await getOpenRouterClient();
  const messages = buildMessages({ systemPrompt, userGoal, screenshotBase64, extras });
  const response = await client.chat.send({
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    messages,
    //provider: { order: [PREFERRED_PROVIDER], include: [PREFERRED_PROVIDER], allow_fallbacks: false },
    stream: false
  });

  return response?.choices?.[0]?.message?.content ?? null;
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

  // Local photos: allow data URLs and raw base64 (converted to data URL)
  if (screenshotBase64) {
    let url = null;
    const input = String(screenshotBase64).trim();
    if (/^https?:\/\//i.test(input)) {
      url = input;
    } else if (/^data:image\/(png|jpeg);base64,/i.test(input)) {
      url = input;
    } else if (/^[A-Za-z0-9+/=]+$/i.test(input)) {
      url = `data:image/png;base64,${input}`;
    }

    if (url) {
      userParts.push({ type: 'image_url', imageUrl: { url } });
    }
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

async function getOpenRouterClient() {
  if (!openRouterClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not set in environment');
    }
    // Dynamic import for ESM-only packages when running under CommonJS
    const mod = await import('@openrouter/sdk');
    const OpenRouter = mod?.OpenRouter || mod?.default || mod;
    openRouterClient = new OpenRouter({ apiKey });
  }
  return openRouterClient;
}
