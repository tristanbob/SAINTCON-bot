require("dotenv").config();
const { client } = require("./bot");
const { setupEventHandlers } = require("./messageProcessor");
const {
  crawlAndCacheURLs,
  processFAQ,
  shouldRunCrawler,
  storeLastRunTime,
} = require("./crawler");

const urls = [
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

async function runDailyCrawler() {
  const shouldRun = await shouldRunCrawler();
  if (shouldRun) {
    try {
      await crawlAndCacheURLs(urls);
      await processFAQ(faqUrl);
      await storeLastRunTime();
      console.log("Crawler has successfully updated the cache.");
    } catch (error) {
      console.error("Error running the crawler:", error);
    }
  } else {
    console.log("Crawler has already run in the last 24 hours. Skipping...");
  }
}

// Run the crawler initially on startup
runDailyCrawler();
