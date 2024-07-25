const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

let cacheTimestamp = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

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

module.exports = { fetchAndCacheURL, cacheCleanedContent, getAllCleanedCache };
