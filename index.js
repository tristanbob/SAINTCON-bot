require("dotenv").config();
const { client } = require("./bot");
const { setupEventHandlers } = require("./messageProcessor");

setupEventHandlers(client);

client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  console.error("Failed to log in:", error);
  if (error.code === "TokenInvalid") {
    console.error(
      "The provided token is invalid. Please check your .env file and Discord Developer Portal."
    );
  }
});
