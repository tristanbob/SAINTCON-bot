const { Events } = require("discord.js");
const {
  getAllCleanedCache,
  fetchAndCacheSessionizeData,
} = require("./cacheManager");
const { generateResponse, getAIPrompt } = require("./openaiUtils");
const { logMessageData } = require("./logger");

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
      if (!cleanedCache) {
        await message.channel.send(
          "Sorry, I could not retrieve the SAINTCON information at this time."
        );
        return;
      }

      const sessionizeData = await fetchAndCacheSessionizeData(
        "https://sessionize.com/api/v2/fjfjo2d9/view/All"
      );

      const replyChainMessages = await getReplyChainMessages(message);
      const messages = getAIPrompt(cleanedCache, sessionizeData, userMessage);
      messages.push(...replyChainMessages);

      try {
        console.log("Sending request to OpenAI API");
        await message.channel.sendTyping(); // Show typing indicator
        const response = await generateResponse(messages);

        const botResponse = response.choices[0].message.content.trim();

        const inputTokens = response.usage.prompt_tokens;
        const outputTokens = response.usage.completion_tokens;
        const totalTokens = response.usage.total_tokens;

        const inputCost = (inputTokens / 1_000_000) * 0.15;
        const outputCost = (outputTokens / 1_000_000) * 0.6;
        const totalCost = inputCost + outputCost;

        const logData = {
          userId: message.author.id,
          username: message.author.tag,
          userMessage: userMessage,
          botResponse: botResponse,
          inputTokens: inputTokens,
          outputTokens: outputTokens,
          totalTokens: totalTokens,
          totalCost: totalCost.toFixed(6),
        };
        logMessageData(logData);

        console.log(`Bot response: "${botResponse}"`);
        await message.reply(
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
}

module.exports = { setupEventHandlers };
