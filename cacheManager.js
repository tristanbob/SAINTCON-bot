import fs from "fs/promises";
import path from "path";
import axios from "axios";

const cacheDir = path.join("/cache", "raw-html");
const cleanedCacheDir = path.join("/cache", "extracted-data");
const sessionizeCachePath = path.join(cacheDir, "sessionize_cache.json");

const CACHE_EXPIRATION_HOURS = 24;

const isCacheExpired = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    const now = new Date();
    const cacheAge = (now - stats.mtime) / (1000 * 60 * 60); // Age in hours
    return cacheAge >= CACHE_EXPIRATION_HOURS;
  } catch (err) {
    return true; // If there's an error reading the file, assume it's expired
  }
};

async function fetchAndCacheURL(url) {
  const cacheFilePath = path.join(cacheDir, encodeURIComponent(url));

  if (!(await isCacheExpired(cacheFilePath))) {
    try {
      const cachedContent = await fs.readFile(cacheFilePath, "utf-8");
      console.log(`Using cached content for ${url}`);
      return cachedContent;
    } catch (err) {
      console.log(`Fetching content for ${url}`);
    }
  } else {
    console.log(`Cache expired for ${url}, fetching new content`);
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

  if (!(await isCacheExpired(cleanedCacheFilePath))) {
    try {
      const cleanedContent = await fs.readFile(cleanedCacheFilePath, "utf-8");
      console.log(`Using cleaned cached content for ${url}`);
      return cleanedContent;
    } catch (err) {
      return null;
    }
  } else {
    console.log(`Cleaned cache expired for ${url}`);
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

  return isCacheExpired(lastRunTimeFilePath);
}

async function storeLastRunTime() {
  const lastRunTimeFilePath = path.join(cacheDir, "last_run_time.txt");
  await fs.writeFile(lastRunTimeFilePath, new Date().toISOString(), "utf-8");
}

async function fetchAndCacheSessionizeData(url) {
  if (!(await isCacheExpired(sessionizeCachePath))) {
    try {
      const cachedData = await fs.readFile(sessionizeCachePath, "utf-8");
      console.log("Using cached Sessionize data");
      return JSON.parse(cachedData);
    } catch (err) {
      console.log("Fetching Sessionize data");
    }
  } else {
    console.log("Sessionize cache expired, fetching new data");
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

export {
  fetchAndCacheURL,
  cacheCleanedContent,
  getCleanedCache,
  getAllCleanedCache,
  shouldRunCrawler,
  storeLastRunTime,
  fetchAndCacheSessionizeData,
};
