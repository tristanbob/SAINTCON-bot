const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResponse(messages) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    max_tokens: 200,
    temperature: 0.5,
    top_p: 0.9,
  });
  return response;
}

module.exports = { generateResponse };
