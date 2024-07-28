const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const { extractRelevantInfo, extractFAQInfo } = require("./openai");
const { logExtractionMetadata } = require("./logger");

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day

const LAST_RUN_FILE = path.join(__dirname, "last_run_time.json");
const SESSIONIZE_API_URL = "https://sessionize.com/api/v2/fjfjo2d9/view/All";
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

async function fetchAndCacheSessionizeData() {
  try {
    const now = Date.now();
    const cacheStat = await fs.stat(SESSIONIZE_CACHE_FILE);
    if (now - cacheStat.mtimeMs < CACHE_DURATION_MS) {
      console.log(`Using cached Sessionize data`);
      return JSON.parse(await fs.readFile(SESSIONIZE_CACHE_FILE, "utf-8"));
    }
  } catch (err) {
    console.log(`Cache miss for Sessionize data`);
  }

  try {
    const response = await axios.get(SESSIONIZE_API_URL);
    const data = response.data;
    await fs.mkdir(path.dirname(SESSIONIZE_CACHE_FILE), { recursive: true });
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

async function crawlAndCacheURLs(urls) {
  for (const url of urls) {
    console.log(`Crawling ${url}`);
    const rawText = await fetchAndCacheURL(url);
    if (rawText) {
      const cleanedCache = await getCleanedCache(url);
      if (!cleanedCache) {
        const cleanedContent = await extractRelevantInfo(rawText, {
          exclude: ["footer", "footnote", "disclaimer"],
        });
        await cacheCleanedContent(url, cleanedContent);

        const inputTokens = rawText.length / 4; // Rough estimate: 1 token ≈ 4 chars
        const outputTokens = cleanedContent.length / 4; // Rough estimate
        const totalTokens = inputTokens + outputTokens;

        logExtractionMetadata({
          url,
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCost:
            (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.6,
        });

        console.log(`Cached cleaned content for ${url}`);
      } else {
        console.log(`Using existing cleaned content for ${url}`);
      }
    } else {
      console.log(`Failed to fetch or clean content for ${url}`);
    }
  }
}

async function processFAQ(url) {
  console.log(`Processing FAQ from ${url}`);
  const rawText = await fetchAndCacheURL(url);
  if (rawText) {
    const cleanedCache = await getCleanedCache(url);
    if (!cleanedCache) {
      const cleanedContent = await extractFAQInfo(rawText);
      await cacheCleanedContent(url, cleanedContent);

      const inputTokens = rawText.length / 4; // Rough estimate: 1 token ≈ 4 chars
      const outputTokens = cleanedContent.length / 4; // Rough estimate
      const totalTokens = inputTokens + outputTokens;

      logExtractionMetadata({
        url,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost:
          (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.6,
      });

      console.log(`Cached cleaned content for ${url}`);
    } else {
      console.log(`Using existing cleaned content for FAQ ${url}`);
    }
  } else {
    console.log(`Failed to fetch or clean FAQ content for ${url}`);
  }
}

module.exports = {
  fetchAndCacheURL,
  crawlAndCacheURLs,
  processFAQ,
  shouldRunCrawler,
  storeLastRunTime,
  fetchAndCacheSessionizeData,
  getSessionizeData,
  getAllCleanedCache,
};
