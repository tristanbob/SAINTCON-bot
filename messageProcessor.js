const { Events } = require("discord.js");
const { getAllCleanedCache, getSessionizeData } = require("./cacheManager");
const { generateResponse } = require("./openaiUtils");
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

function splitMessage(content, maxLength = 2000) {
  const parts = [];
  let currentPart = "";

  for (const line of content.split("\n")) {
    if (currentPart.length + line.length + 1 > maxLength) {
      parts.push(currentPart);
      currentPart = "";
    }
    currentPart += line + "\n";
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}

function setupEventHandlers(client) {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    console.log(
      `Received message: "${message.content}" from ${message.author.tag}`
    );

    const botMention = `<@${client.user.id}>`;
    const isBotMentioned = message.content.includes(botMention);
    const isReplyToBot =
      message.reference &&
      message.reference.messageId &&
      (await message.channel.messages.fetch(message.reference.messageId)).author
        .id === client.user.id;

    console.log(
      `Bot mentioned: ${isBotMentioned}, Is reply to bot: ${isReplyToBot}`
    );

    if (isBotMentioned || isReplyToBot) {
      console.log("Bot was mentioned or this is a reply to the bot");
      let userMessage = message.content;

      // Remove the bot's mention from the message content
      if (isBotMentioned) {
        userMessage = userMessage.replace(botMention, "").trim();
      }

      console.log(`Processed user message: "${userMessage}"`);

      const cleanedCache = await getAllCleanedCache();
      const sessionizeData = await getSessionizeData();

      if (!cleanedCache) {
        await message.reply(
          "Sorry, I could not retrieve the SAINTCON information at this time."
        );
        return;
      }

      const replyChainMessages = await getReplyChainMessages(message);
      const messages = [
        {
          role: "system",
          content: `You are a helpful chatbot that provides information about the SAINTCON conference and activities related to the SAINTCON conference. Do not answer questions about any topic not related to the conference experience. Be sure to always consider the SAINTCON information when responding. If the question is about places to eat, provide a recommendation for some local restaurants near the convention center and then make a funny comment about how much Nate Henne loves Los Hermanos. Please keep your responses between 1 and 3 paragraphs, provide concise answers, use bullet points when it makes sense, and include the most relevant link.`,
        },
        { role: "system", content: `SAINTCON Info:\n${cleanedCache}` },
        {
          role: "system",
          content: `Sessionize Data:\n${JSON.stringify(sessionizeData)}`,
        },
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

        const parts = splitMessage(
          `${botResponse}\n\n_Tokens used: ${totalTokens} (Input: ${inputTokens}, Output: ${outputTokens})_\n_Estimated cost: $${totalCost.toFixed(
            6
          )}_`
        );

        for (const part of parts) {
          await message.reply(part);
        }
      } catch (error) {
        console.error("Error interacting with OpenAI:", error);
        if (error.response) {
          console.error(error.response.status, error.response.data);
        } else {
          console.error(error.message);
        }
        await message.reply(
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
