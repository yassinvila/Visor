// Connects to the LLM provider
const { OpenRouter } = require('@openrouter/sdk');

async function llmClient(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set in environment');
  }

  const openRouter = new OpenRouter({ apiKey });

  const completion = await openRouter.chat.send({
    model: 'openai/gpt-4o',
    messages: [
      {
        role: 'user',
        content: prompt || ''
      }
    ],
    stream: false
  });

  return completion?.choices?.[0]?.message?.content ?? null;
}

module.exports = llmClient;