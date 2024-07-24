const { Client, GatewayIntentBits, Events } = require('discord.js');
const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config();

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

async function fetchFAQText(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching FAQ text:', error);
    return null;
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  console.log(`Received message: "${message.content}" from ${message.author.tag}`);

  const botUsername = client.user.username.toLowerCase();
  const startsWithBotUsername = message.content.toLowerCase().startsWith(botUsername);
  const isReplyToBot = message.reference && message.reference.messageId && 
                       (await message.channel.messages.fetch(message.reference.messageId))
                       .author.id === client.user.id;

  console.log(`Starts with bot username: ${startsWithBotUsername}, Is reply to bot: ${isReplyToBot}`);

  if (startsWithBotUsername || isReplyToBot) {
    console.log('Bot was addressed or this is a reply to the bot');
    let userMessage = message.content;

    // Remove the bot's username from the start of the message if present
    if (startsWithBotUsername) {
      userMessage = userMessage.slice(botUsername.length).trim();
    }

    console.log(`Processed user message: "${userMessage}"`);

    const faqText = await fetchFAQText('https://saintcon.org/faq/');
    if (!faqText) {
      await message.channel.send('Sorry, I could not retrieve the FAQ information at this time.');
      return;
    }

    const messages = [
      { role: 'system', content: `You are an expert in cybersecurity and the SAINTCON conference. Use the information from the FAQ page to help respond to queries. If the query isn't related to cybersecurity or SAINTCON, politely inform the user that you're specifically designed to assist with those topics.` },
      { role: 'system', content: `FAQ:\n${faqText}` },
      { role: 'user', content: userMessage }
    ];

    try {
      console.log('Sending request to OpenAI API');
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 150,
      });

      const botResponse = response.choices[0].message.content.trim();
      console.log(`Bot response: "${botResponse}"`);
      await message.channel.send(botResponse);
    } catch (error) {
      console.error('Error interacting with OpenAI:', error);
      if (error.response) {
        console.error(error.response.status, error.response.data);
      } else {
        console.error(error.message);
      }
      await message.channel.send('Sorry, I encountered an error while processing your request. Please try again later.');
    }
  } else {
    console.log('Message was not addressed to the bot and not a reply to the bot');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
  console.error("Failed to log in:", error);
  if (error.code === 'TokenInvalid') {
    console.error("The provided token is invalid. Please check your .env file and Discord Developer Portal.");
  }
});