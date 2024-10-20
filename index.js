// Remove dotenv import
// require("dotenv").config(); // Not needed with Bun

// Replace require with import for Bun compatibility
import { client } from "./bot"; // Use import instead of require
import { setupEventHandlers } from "./messageProcessor"; // Use import instead of require
import { runDailyTasks } from "./crawler"; // Use import instead of require
import config from "./config"; // Use import instead of require
import {
  generateResponse,
  extractRelevantInfo,
  extractFAQInfo,
} from "./aiUtils";
import fs from "fs/promises";
import path from "path";
import {
  fetchAndCacheURL,
  cacheCleanedContent,
  getAllCleanedCache,
  getCleanedCache,
} from "./cacheManager";

// Infer AI provider from model name
const inferProvider = (model) => {
  if (model.startsWith("gpt-")) return "openai";
  if (model.startsWith("gemini-")) return "gemini15flash";
  return null;
};

// Validate AI model and infer provider
const validModels = {
  openai: ["gpt-4o-mini"],
  gemini15flash: ["gemini-1.5-flash"],
};

const inferredProvider = inferProvider(config.aiModel);

if (!inferredProvider) {
  console.error(`Unable to infer AI provider for model: ${config.aiModel}`);
  process.exit(1);
}

if (!validModels[inferredProvider].includes(config.aiModel)) {
  console.error(`Invalid AI model: ${config.aiModel}`);
  process.exit(1);
}

// Use inferredProvider instead of config.aiProvider in the rest of your code
console.log(`Using AI provider: ${inferredProvider}`);

async function ensureCacheDirectories() {
  const cacheDir = path.join(process.cwd(), "cache"); // Use current working directory
  const rawHtmlCacheDir = path.join(cacheDir, "raw-html");
  const extractedDataCacheDir = path.join(cacheDir, "extracted-data");

  try {
    await fs.mkdir(rawHtmlCacheDir, { recursive: true });
    await fs.mkdir(extractedDataCacheDir, { recursive: true });
    console.log("Cache directories created successfully");
  } catch (error) {
    console.error("Error creating cache directories:", error);
  }
}

// Call this function before starting your application
ensureCacheDirectories().then(() => {
  setupEventHandlers(client);

  const botToken = process.env.MY_BOT_TOKEN; // Still using process.env for Bun

  if (!botToken) {
    console.error(
      "Discord bot token not found. Please set MY_BOT_TOKEN in the environment."
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
      const channel = client.channels.cache.find(
        (ch) => ch.name === channelName
      );
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
});

async function debugCacheSetup() {
  console.log("Current working directory:", process.cwd());
  const cacheDir = path.join(process.cwd(), "cache"); // Define cacheDir
  try {
    const cacheContents = await fs.readdir(cacheDir); // Use cacheDir instead of "/cache"
    console.log("Contents of cache directory:", cacheContents);
  } catch (error) {
    console.error("Error reading cache directory:", error);
  }
}
// Call this function after ensureCacheDirectories
debugCacheSetup();
