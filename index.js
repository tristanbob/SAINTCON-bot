require("dotenv").config();
const { client } = require("./bot");
const { setupEventHandlers } = require("./messageProcessor");
const { runDailyTasks } = require("./crawler");
const { allowedChannels } = require("./config");

const urls = [
  "https://saintcon.org/",
  "https://saintcon.org/keynotes/",
  "https://saintcon.org/presentations/",
  "https://saintcon.org/register/",
  "https://saintcon.org/reg-students/",
  "https://saintcon.org/reg-scholarships/",
  "https://saintcon.org/con-hackerschallenge/",
  "https://saintcon.org/con-appsec-challenge/",
  "https://saintcon.org/con-ctf-blue-team-style/",
  "https://saintcon.org/con-lan-cable/",
  "https://saintcon.org/con-foxhunt/",
  "https://saintcon.org/con-so-youve-been-hacked/",
  "https://saintcon.org/con-tamper-evident-challenge/",
  "https://saintcon.org/con-vault-challenge/",
  "https://saintcon.org/com-ai-community/",
  "https://saintcon.org/com-appsec-community/",
  "https://saintcon.org/com-badgelife-community/",
  "https://saintcon.org/com-blueteam-community/",
  "https://saintcon.org/com-hardware-community/",
  "https://saintcon.org/com-health-care-hacking-community/",
  "https://saintcon.org/com-id-iot-community/",
  "https://saintcon.org/com-lockpick-community/",
  "https://saintcon.org/com-rfid-nfc-community/",
  "https://saintcon.org/com-space-community/",
  "https://saintcon.org/com-tamper-evident-community/",
  "https://saintcon.org/com-thekeep-community/",
  "https://saintcon.org/com-v-e-n-d/",
  "https://saintcon.org/com-wic-advocates/",
  "https://saintcon.org/com-briefs-community/",
  "https://saintcon.org/com-education-security-community/",
  "https://saintcon.org/com-ham-radio-community/",
  "https://saintcon.org/com-homelabs-community/",
  "https://saintcon.org/evt-jeopardy/",
  "https://saintcon.org/evt-job-fair/",
  "https://saintcon.org/evt-family-night/",
  "https://saintcon.org/evt-golf-club/",
  "https://saintcon.org/evt-hackinthebox/",
  "https://saintcon.org/evt-lanparty/",
  "https://saintcon.org/coc/",
  "https://www.saintcon.org/tac/",
];

const faqUrl = "https://saintcon.org/faq/";

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

// Fetch channel IDs based on friendly names
client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const allowedChannelIDs = [];

  allowedChannels.forEach((channelName) => {
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
  runDailyTasks(urls, faqUrl);
});
