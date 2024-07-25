const { Events } = require("discord.js");
const { fetchAndCacheURL } = require("./contentCache");
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

      const faqText = await fetchAndCacheURL("https://saintcon.org/faq/");
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
