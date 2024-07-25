const { Client, GatewayIntentBits, Events } = require("discord.js");
const OpenAI = require("openai");
const axios = require("axios");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

let cachedFaqText = null;
let cacheTimestamp = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

async function fetchFAQText(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching FAQ text:", error);
    return null;
  }
}

async function getCachedFAQText(url) {
  const now = Date.now();
  if (
    !cachedFaqText ||
    !cacheTimestamp ||
    now - cacheTimestamp > CACHE_DURATION_MS
  ) {
    console.log("Fetching new FAQ text");
    cachedFaqText = await fetchFAQText(url);
    cacheTimestamp = now;
  } else {
    console.log("Using cached FAQ text");
  }
  return cachedFaqText;
}

async function getReplyChainMessages(message) {
  const messages = [];
  let currentMessage = message;

  while (currentMessage.reference && currentMessage.reference.messageId) {
    const parentMessage = await currentMessage.channel.messages.fetch(
      currentMessage.reference.messageId
    );
    messages.unshift({
      role: parentMessage.author.bot ? "assistant" : "user",
      content: parentMessage.content,
    });
    currentMessage = parentMessage;
  }

  return messages;
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  console.log(
    `Received message: "${message.content}" from ${message.author.tag}`
  );

  const botUsername = client.user.username.toLowerCase();
  const botMention = `<@${client.user.id}>`;
  const startsWithBotMention = message.content.startsWith(botMention);
  const isReplyToBot =
    message.reference &&
    message.reference.messageId &&
    (await message.channel.messages.fetch(message.reference.messageId)).author
      .id === client.user.id;

  console.log(
    `Starts with bot mention: ${startsWithBotMention}, Is reply to bot: ${isReplyToBot}`
  );

  if (startsWithBotMention || isReplyToBot) {
    console.log("Bot was addressed or this is a reply to the bot");
    let userMessage = message.content;

    // Remove the bot's mention from the start of the message if present
    if (startsWithBotMention) {
      userMessage = userMessage.slice(botMention.length).trim();
    }

    console.log(`Processed user message: "${userMessage}"`);

    const faqText = await getCachedFAQText("https://saintcon.org/faq/");
    if (!faqText) {
      await message.channel.send(
        "Sorry, I could not retrieve the FAQ information at this time."
      );
      return;
    }

    const replyChainMessages = await getReplyChainMessages(message);
    const messages = [
      {
        role: "system",
        content: `You are an expert in cybersecurity and the SAINTCON conference. Use the information from the FAQ page to help respond to queries. Please keep your responses between 1 and 3 paragraphs, provide concise answers, and use bullet points when it makes sense.`,
      },
      { role: "system", content: `FAQ:\n${faqText}` },
      ...replyChainMessages,
      { role: "user", content: userMessage },
    ];

    try {
      console.log("Sending request to OpenAI API");
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 200,
        temperature: 0.5,
        top_p: 0.9,
      });

      const botResponse = response.choices[0].message.content.trim();
      const inputTokens = response.usage.prompt_tokens;
      const outputTokens = response.usage.completion_tokens;
      const totalTokens = response.usage.total_tokens;

      const inputCost = (inputTokens / 1_000_000) * 0.15;
      const outputCost = (outputTokens / 1_000_000) * 0.6;
      const totalCost = inputCost + outputCost;

      console.log(`Bot response: "${botResponse}"`);
      await message.channel.send(
        `${botResponse}\n\n_Tokens used: ${totalTokens} (Input: ${inputTokens}, Output: ${outputTokens})_\n_Estimated cost: $${totalCost.toFixed(
          6
        )}_`
      );
    } catch (error) {
      console.error("Error interacting with OpenAI:", error);
      if (error.response) {
        console.error(error.response.status, error.response.data);
      } else {
        console.error(error.message);
      }
      await message.channel.send(
        "Sorry, I encountered an error while processing your request. Please try again later."
      );
    }
  } else {
    console.log(
      "Message was not addressed to the bot and not a reply to the bot"
    );
  }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  console.error("Failed to log in:", error);
  if (error.code === "TokenInvalid") {
    console.error(
      "The provided token is invalid. Please check your .env file and Discord Developer Portal."
    );
  }
});
