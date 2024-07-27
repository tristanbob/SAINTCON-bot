require("dotenv").config();
const { client } = require("./bot");
const { setupEventHandlers } = require("./messageProcessor");

setupEventHandlers(client);

const botToken = process.env.MY_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;

if (!botToken) {
  console.error(
    "Discord bot token not found. Please set MY_BOT_TOKEN in the environment or DISCORD_BOT_TOKEN in the .env file."
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
