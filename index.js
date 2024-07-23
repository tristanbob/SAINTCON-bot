const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');
require('dotenv').config();

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

client.once('ready', () => {
  console.log('Ready!');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userMessage = message.content;

  if (userMessage.toLowerCase().startsWith('!cybersecurity') || userMessage.toLowerCase().startsWith('!saintcon')) {
    const prompt = `You are an expert in cybersecurity and the SAINTCON conference. Answer the following query: ${userMessage}`;
    
    try {
      const response = await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: prompt,
        max_tokens: 150,
      });

      const botResponse = response.choices[0].text.trim();
      message.channel.send(botResponse);
    } catch (error) {
      console.error('Error interacting with OpenAI:', error);
      message.channel.send('Sorry, I encountered an error while processing your request.');
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);