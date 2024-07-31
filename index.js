require("dotenv").config();
const { client } = require("./bot");
const { setupEventHandlers } = require("./messageProcessor");
const { runDailyTasks } = require("./crawler");
const config = require("./config");

setupEventHandlers(client);

const botToken = process.env.DISCORD_BOT_TOKEN;

if (!botToken) {
  console.error(
    "Discord bot token not found. Please set DISCORD_BOT_TOKEN in the environment."
  );
  process.exit(1);
}

client.login(botToken).catch((error) => {
  console.error("Failed to log in:", error);
  if (error.code === "TokenInvalid") {
    console.error(
      "The provided token is invalid. Please check your environment variable and Discord Developer Portal."
    );
  }
});

// Fetch channel IDs based on friendly names
client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const allowedChannelIDs = [];

  config.allowedChannels.forEach((channelName) => {
    const channel = client.channels.cache.find((ch) => ch.name === channelName);
    if (channel) {
      allowedChannelIDs.push(channel.id);
    } else {
      console.warn(`Channel with name "${channelName}" not found`);
    }
  });

  // Store the allowed channel IDs for use in the message processor
  client.allowedChannelIDs = allowedChannelIDs;

  // Run the daily tasks initially on startup
  runDailyTasks(config.urls, config.faqUrl);
});
