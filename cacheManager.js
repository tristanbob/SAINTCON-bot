const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

const cacheDir = path.join(__dirname, "cache");
const cleanedCacheDir = path.join(__dirname, "cleaned_cache");
const sessionizeCachePath = path.join(cacheDir, "sessionize_cache.json");

async function fetchAndCacheURL(url) {
  const cacheFilePath = path.join(cacheDir, encodeURIComponent(url));

  try {
    const cachedContent = await fs.readFile(cacheFilePath, "utf-8");
    console.log(`Using cached content for ${url}`);
    return cachedContent;
  } catch (err) {
    console.log(`Fetching content for ${url}`);
  }

  try {
    const response = await axios.get(url);
    const content = response.data;
    await fs.writeFile(cacheFilePath, content, "utf-8");
    return content;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

async function cacheCleanedContent(url, content) {
  const cleanedCacheFilePath = path.join(
    cleanedCacheDir,
    encodeURIComponent(url)
  );
  await fs.writeFile(cleanedCacheFilePath, content, "utf-8");
}

async function getCleanedCache(url) {
  const cleanedCacheFilePath = path.join(
    cleanedCacheDir,
    encodeURIComponent(url)
  );

  try {
    const cleanedContent = await fs.readFile(cleanedCacheFilePath, "utf-8");
    console.log(`Using cleaned cached content for ${url}`);
    return cleanedContent;
  } catch (err) {
    return null;
  }
}

async function getAllCleanedCache() {
  try {
    const files = await fs.readdir(cleanedCacheDir);
    const cacheContents = await Promise.all(
      files.map((file) =>
        fs.readFile(path.join(cleanedCacheDir, file), "utf-8")
      )
    );
    return cacheContents.join("\n");
  } catch (error) {
    console.error("Error reading all cleaned cache files:", error);
    return "";
  }
}

async function shouldRunCrawler() {
  const lastRunTimeFilePath = path.join(cacheDir, "last_run_time.txt");

  try {
    const lastRunTime = await fs.readFile(lastRunTimeFilePath, "utf-8");
    const lastRunDate = new Date(lastRunTime);
    const now = new Date();
    const timeDiff = now - lastRunDate;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    return hoursDiff >= 24;
  } catch (err) {
    return true; // If there's an error reading the file, assume it's time to run the crawler.
  }
}

async function storeLastRunTime() {
  const lastRunTimeFilePath = path.join(cacheDir, "last_run_time.txt");
  await fs.writeFile(lastRunTimeFilePath, new Date().toISOString(), "utf-8");
}

async function fetchAndCacheSessionizeData(url) {
  try {
    const cachedData = await fs.readFile(sessionizeCachePath, "utf-8");
    console.log("Using cached Sessionize data");
    return JSON.parse(cachedData);
  } catch (err) {
    console.log("Fetching Sessionize data");
  }

  try {
    const response = await axios.get(url);
    const sessionizeData = response.data;
    await fs.writeFile(
      sessionizeCachePath,
      JSON.stringify(sessionizeData),
      "utf-8"
    );
    return sessionizeData;
  } catch (error) {
    console.error(`Error fetching Sessionize data:`, error);
    throw error;
  }
}

module.exports = {
  fetchAndCacheURL,
  cacheCleanedContent,
  getCleanedCache,
  getAllCleanedCache,
  shouldRunCrawler,
  storeLastRunTime,
  fetchAndCacheSessionizeData,
};
