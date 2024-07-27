const { Events } = require("discord.js");
const { getAllCleanedCache } = require("./contentCache");
const { generateResponse } = require("./openai");
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

      const cleanedCache = await getAllCleanedCache();

      if (!cleanedCache) {
        await message.channel.send(
          "Sorry, I could not retrieve the SAINTCON information at this time."
        );
        return;
      }

      const replyChainMessages = await getReplyChainMessages(message);
      const messages = [
        {
          role: "system",
          content: `You are a helpful chatbot that provides information about the SAINTCON conference and activities related to the SAINTCON conference. Do not answer questions about any topic not related to the conference experience. Be sure to always consider the SAINTCON information when responding. If the question is about places to eat, make a funny comment about how much Nate Henne loves Los Hermanos. Please keep your responses between 1 and 3 paragraphs, provide concise answers, use bullet points when it makes sense, and include the most relevant link.`,
        },
        { role: "system", content: `SAINTCON Info:\n${cleanedCache}` },
        ...replyChainMessages,
        { role: "user", content: userMessage },
      ];

      try {
        console.log("Sending request to OpenAI API");
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
}

module.exports = { setupEventHandlers };
