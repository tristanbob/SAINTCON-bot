// cacheManager.js
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const { logExtractionMetadata } = require("./logger");

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
const LAST_RUN_FILE = path.join(__dirname, "last_run_time.json");
const SESSIONIZE_CACHE_FILE = path.join(
  __dirname,
  "cache",
  "sessionize_cache.json"
);

async function fetchAndCacheURL(url, cacheDir = "cache") {
  const cacheFile = path.join(cacheDir, encodeURIComponent(url));
  try {
    const now = Date.now();
    const cacheStat = await fs.stat(cacheFile);
    if (now - cacheStat.mtimeMs < CACHE_DURATION_MS) {
      console.log(`Using cached content for ${url}`);
      return await fs.readFile(cacheFile, "utf-8");
    }
  } catch (err) {
    console.log(`Cache miss for ${url}`);
  }

  try {
    const response = await axios.get(url);
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cacheFile, response.data, "utf-8");
    return response.data;
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    return null;
  }
}

async function fetchAndCacheSessionizeData(sessionizeApiUrl) {
  try {
    await fs.mkdir(path.dirname(SESSIONIZE_CACHE_FILE), { recursive: true });
    const response = await axios.get(sessionizeApiUrl);
    const data = response.data;
    await fs.writeFile(SESSIONIZE_CACHE_FILE, JSON.stringify(data), "utf-8");
    return data;
  } catch (error) {
    console.error(`Error fetching Sessionize data:`, error);
    return null;
  }
}

async function getSessionizeData() {
  try {
    const data = await fs.readFile(SESSIONIZE_CACHE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading Sessionize cache:`, error);
    return {
      sessions: [],
      speakers: [],
      questions: [],
      categories: [],
      rooms: [],
    };
  }
}

async function cacheCleanedContent(
  url,
  cleanedContent,
  cacheDir = "cleaned_cache"
) {
  const cacheFile = path.join(cacheDir, encodeURIComponent(url));
  try {
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cacheFile, cleanedContent, "utf-8");
  } catch (error) {
    console.error(`Error saving cleaned content for ${url}:`, error);
  }
}

async function getAllCleanedCache(cacheDir = "cleaned_cache") {
  try {
    const files = await fs.readdir(cacheDir);
    const contents = await Promise.all(
      files.map((file) => fs.readFile(path.join(cacheDir, file), "utf-8"))
    );
    return contents.join("\n");
  } catch (error) {
    console.error(`Error reading cleaned cache:`, error);
    return "";
  }
}

async function getCleanedCache(url, cacheDir = "cleaned_cache") {
  const cacheFile = path.join(cacheDir, encodeURIComponent(url));
  try {
    const now = Date.now();
    const cacheStat = await fs.stat(cacheFile);
    if (now - cacheStat.mtimeMs < CACHE_DURATION_MS) {
      console.log(`Using cleaned cached content for ${url}`);
      return await fs.readFile(cacheFile, "utf-8");
    }
  } catch (err) {
    console.log(`Cleaned cache miss for ${url}`);
  }
  return null;
}

async function storeLastRunTime() {
  const now = Date.now();
  await fs.writeFile(LAST_RUN_FILE, JSON.stringify({ lastRun: now }), "utf-8");
}

async function shouldRunCrawler() {
  try {
    const data = await fs.readFile(LAST_RUN_FILE, "utf-8");
    const { lastRun } = JSON.parse(data);
    const now = Date.now();
    return now - lastRun > CACHE_DURATION_MS;
  } catch (error) {
    return true; // If there's an error reading the file, assume the crawler should run.
  }
}

module.exports = {
  fetchAndCacheURL,
  fetchAndCacheSessionizeData,
  getSessionizeData,
  cacheCleanedContent,
  getAllCleanedCache,
  getCleanedCache,
  storeLastRunTime,
  shouldRunCrawler,
};
