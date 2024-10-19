import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "./config.js";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Gemini client
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getAiProvider = (modelName) => {
  if (modelName === "gpt-4o-mini") {
    return "openai";
  } else if (modelName === "gemini-1.5-flash") {
    return "gemini";
  } else {
    throw new Error(`Unknown AI model: ${modelName}`);
  }
};

// Add a new function for retrying API calls
const retryApiCall = async (apiCall, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retrying... (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Read the AI prompt from the text file and generate messages
const getAIPrompt = (cleanedCache, sessionizeData, userMessage) => {
  const promptPath = path.join(__dirname, "ai_prompt.txt");
  let systemMessage = "";

  try {
    systemMessage = fs.readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Error reading AI prompt file:", error);
    systemMessage = `You are a helpful chatbot that provides information about the SAINTCON conference and activities related to the SAINTCON conference. Do not answer questions about any topic not related to the conference experience. Be sure to always consider the SAINTCON information when responding. If the question is about food options or eating, provide a recommendation for some local restaurants near the convention center, mention that there is an option to purchase lunch meals during SAINTCON registration, and make a funny comment about how much Nate Henne loves Los Hermanos. Please keep your responses between 1 and 3 paragraphs, provide concise answers, use bullet points when it makes sense, and include the most relevant link.`;
  }

  const messages = [
    { role: "system", content: systemMessage },
    { role: "system", content: `SAINTCON Info:\n${cleanedCache}` },
    {
      role: "system",
      content: `Schedule and Speakers:\n${JSON.stringify(sessionizeData)}`,
    },
    { role: "user", content: userMessage },
  ];

  return messages;
};

const generateResponse = async (messages) => {
  const aiProvider = getAiProvider(config.aiModel);

  // Extract the system message
  const systemMessages = messages
    .filter((msg) => msg.role === "system")
    .map((msg) => msg.content);
  const systemMessageLog = systemMessages.join("\n");

  // Log only the first 1000 characters of the system message
  // console.log(
  //   "AI System Message (first 1000 characters):\n",
  //   systemMessageLog.substring(0, 1000)
  // );

  // Calculate the total context size (number of tokens or words)
  const totalContextSize = messages.reduce(
    (total, msg) => total + msg.content.split(/\s+/).length,
    0
  );
  console.log(`Total context size (tokens): ${totalContextSize}`);

  const apiCall = async () => {
    if (aiProvider === "gemini") {
      const model = gemini.getGenerativeModel({ model: config.aiModel });
      const prompt = messages.map((msg) => msg.content).join("\n");
      const result = await model.generateContent(prompt);
      const content = result.response.text().trim();

      if (!content) {
        throw new Error("Empty response from Gemini");
      }

      // Estimate token usage (this is an approximation)
      const estimatedTokens = content.split(/\s+/).length;

      return {
        content: content,
        usage: { total_tokens: estimatedTokens },
      };
    } else if (aiProvider === "openai") {
      const response = await openai.chat.completions.create({
        model: config.aiModel,
        messages: messages,
        max_tokens: config.maxTokens,
      });
      return {
        content: response.choices[0].message.content,
        usage: response.usage,
      };
    } else {
      throw new Error(`Unsupported AI provider: ${aiProvider}`);
    }
  };

  return retryApiCall(apiCall);
};

const extractRelevantInfo = async (content, options) => {
  const aiProvider = getAiProvider(config.aiModel);
  const apiCall = async () => {
    if (aiProvider === "openai") {
      const response = await openai.chat.completions.create({
        model: config.aiModel,
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
    } else if (aiProvider === "gemini") {
      const model = gemini.getGenerativeModel({ model: config.aiModel });
      const prompt = `Extract relevant information from the following content, removing ${options.exclude.join(
        ", "
      )}:\n\n${content}`;
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    }
  };

  return retryApiCall(apiCall);
};

const extractFAQInfo = async (content) => {
  const aiProvider = getAiProvider(config.aiModel);
  const apiCall = async () => {
    if (aiProvider === "openai") {
      const response = await openai.chat.completions.create({
        model: config.aiModel,
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
    } else if (aiProvider === "gemini") {
      const model = gemini.getGenerativeModel({ model: config.aiModel });
      const prompt = `Extract all questions and answers from the following FAQ content:\n\n${content}`;
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    }
  };

  return retryApiCall(apiCall);
};

export { getAIPrompt, generateResponse, extractRelevantInfo, extractFAQInfo };
