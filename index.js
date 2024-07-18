const { Client, Intents } = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(openaiConfig);

client.once("ready", () => {
  console.log("Ready!");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userMessage = message.content;

  if (
    userMessage.toLowerCase().startsWith("!cybersecurity") ||
    userMessage.toLowerCase().startsWith("!saintcon")
  ) {
    const prompt = `You are an expert in cybersecurity and the SAINTCON conference. Answer the following query: ${userMessage}`;

    try {
      const response = await openai.createCompletion({
        model: "gpt-4o-mini",
        prompt: prompt,
        max_tokens: 150,
      });

      const botResponse = response.data.choices[0].text.trim();
      message.channel.send(botResponse);
    } catch (error) {
      console.error("Error interacting with OpenAI:", error);
      message.channel.send(
        "Sorry, I encountered an error while processing your request."
      );
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
