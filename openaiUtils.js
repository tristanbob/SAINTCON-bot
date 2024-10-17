const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Read the AI prompt from the text file and generate messages
const getAIPrompt = (cleanedCache, sessionizeData, userMessage) => {
  const promptPath = path.join(__dirname, "ai_prompt.txt");
  let systemMessage = "";

  try {
    systemMessage = fs.readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Error reading AI prompt file:", error);
    systemMessage = `You are a helpful chatbot that provides information about the SAINTCON conference and activities related to the SAINTCON conference. Do not answer questions about any topic not related to the conference experience. Be sure to always consider the SAINTCON information when responding. If the question is about food options, provide a recommendation for some local restaurants near the convention center, mention that there is an option to purchase lunch meals during SAINTCON registration, and then make a funny comment about how much Nate Henne loves Los Hermanos. Please keep your responses between 1 and 3 paragraphs, provide concise answers, use bullet points when it makes sense, and include the most relevant link.`;
  }

  const messages = [
    { role: "system", content: systemMessage },
    { role: "system", content: `SAINTCON Info:\n${cleanedCache}` },
    {
      role: "system",
      content: `Sessionize Data:\n${JSON.stringify(sessionizeData)}`,
    },
    { role: "user", content: userMessage },
  ];

  return messages;
};

const generateResponse = async (messages) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 500,
    });

    return response;
  } catch (error) {
    console.error("Error interacting with OpenAI:", error);
    throw error;
  }
};

const extractRelevantInfo = async (content, options, retries = 3) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that extracts relevant information from given content.",
        },
        {
          role: "user",
          content: `Extract relevant information from the following content, removing ${options.exclude.join(
            ", "
          )}:\n\n${content}`,
        },
      ],
      max_tokens: 1500,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error extracting information:`, error);
    if (retries > 0 && error.status === 502) {
      console.log(`Retrying... (${3 - retries + 1})`);
      return extractRelevantInfo(content, options, retries - 1); // Retry
    }
    throw error; // Rethrow if not retrying
  }
};

const extractFAQInfo = async (content) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that extracts FAQs from given content.",
        },
        {
          role: "user",
          content: `Extract all questions and answers from the following FAQ content:\n\n${content}`,
        },
      ],
      max_tokens: 1500,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error extracting FAQ information:`, error);
    throw error;
  }
};

module.exports = {
  getAIPrompt,
  generateResponse,
  extractRelevantInfo,
  extractFAQInfo,
};
