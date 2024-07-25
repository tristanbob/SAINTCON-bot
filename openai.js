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

async function extractRelevantInfo(text) {
  const messages = [
    {
      role: "system",
      content:
        "Extract all relevant information from the following text and present it concisely. Remove HTML markup and similar items.",
    },
    { role: "user", content: text },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { generateResponse, extractRelevantInfo };
