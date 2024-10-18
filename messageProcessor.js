const { Events } = require("discord.js");
const {
  getAllCleanedCache,
  fetchAndCacheSessionizeData,
} = require("./cacheManager");
const { generateResponse, getAIPrompt } = require("./aiUtils");
const { logMessageData } = require("./logger");
const config = require("./config");

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

function setupEventHandlers(client) {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // Check if the message is in an allowed channel
    if (!client.allowedChannelIDs.includes(message.channel.id)) {
      console.log(
        `Message received in disallowed channel: "${message.content}" from ${message.author.tag} in channel ${message.channel.name}`
      );
      return;
    }

    console.log(
      `Received message: "${message.content}" from ${message.author.tag}`
    );

    const botUsername = client.user.username.toLowerCase();
    const botMention = `<@${client.user.id}>`;
    const isMentioned = message.content.includes(botMention);
    const isReplyToBot =
      message.reference &&
      message.reference.messageId &&
      (await message.channel.messages.fetch(message.reference.messageId)).author
        .id === client.user.id;

    console.log(
      `Bot mentioned: ${isMentioned}, Is reply to bot: ${isReplyToBot}`
    );

    if (isMentioned || isReplyToBot) {
      console.log("Bot was mentioned or this is a reply to the bot");
      let userMessage = message.content;

      // Remove the bot's mention from the message if present
      if (isMentioned) {
        userMessage = userMessage.replace(botMention, "").trim();
      }

      console.log(`Processed user message: "${userMessage}"`);

      const cleanedCache = await getAllCleanedCache();

      const sessionizeData = await fetchAndCacheSessionizeData(
        config.sessionizeApiUrl
      );

      const replyChainMessages = await getReplyChainMessages(message);
      const messages = getAIPrompt(cleanedCache, sessionizeData, userMessage);
      messages.push(...replyChainMessages);

      try {
        console.log("Sending typing indicator");
        await message.channel.sendTyping();

        console.log("Generating AI response");
        const aiResponse = await generateResponse(messages);
        console.log("AI response received:", aiResponse);

        const botResponse = aiResponse.content;
        console.log("Bot response content:", botResponse);

        if (!botResponse || botResponse.trim() === "") {
          console.error("Empty bot response received");
          throw new Error("Empty bot response");
        }

        // Log token usage for OpenAI (console only)
        if (config.aiProvider === "openai" && aiResponse.usage) {
          const inputTokens = aiResponse.usage.prompt_tokens;
          const outputTokens = aiResponse.usage.completion_tokens;
          const totalTokens = aiResponse.usage.total_tokens;
          console.log(`Input tokens: ${inputTokens}`);
          console.log(`Output tokens: ${outputTokens}`);
          console.log(`Total tokens: ${totalTokens}`);

          // Calculate and log cost (if needed)
          const costPerToken = 0.00002; // Adjust this based on your OpenAI plan
          const totalCost = totalTokens * costPerToken;
          console.log(`Estimated cost: $${totalCost.toFixed(6)}`);
        }

        console.log("Sending response to Discord");
        await message.reply(botResponse);

        console.log("Logging interaction");
        const logData = {
          user: message.author.tag,
          message: userMessage,
          response: botResponse,
          timestamp: new Date().toISOString(),
        };
        logMessageData(logData);
      } catch (error) {
        console.error("Error in handleMessage:", error);

        // Instead of immediately replying with an error message,
        // we'll check if the error is due to an empty response
        if (error.message === "Empty bot response") {
          await message.reply(
            "I'm sorry, I couldn't retrieve the SAINTCON information at this time. Please try again later."
          );
        } else {
          await message.reply(
            "I'm sorry, I encountered an error while processing your request. Please try again later."
          );
        }
      }
    } else {
      console.log(
        "Message was not addressed to the bot and not a reply to the bot"
      );
    }
  });
}

module.exports = { setupEventHandlers };
