import fs from "fs/promises";
import path from "path";
import axios from "axios";

const cacheDir = path.join(process.cwd(), "cache"); // Updated to use current working directory
const rawHtmlCacheDir = path.join(cacheDir, "raw-html");
const cleanedCacheDir = path.join(cacheDir, "extracted-data");
const sessionizeCachePath = path.join(cacheDir, "sessionize_cache.json");
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSCD0k93w4XrWgBqzNdqy8gwIv7rCdpEJjum3Y_LOw32JdYiFISZx86aGN05jT_p0cap9uU4DVfskPr/pub?output=csv";
const GOOGLE_SHEET_CACHE_PATH = path.join(cacheDir, "google_sheet_cache.csv");

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
  const cacheFilePath = path.join(rawHtmlCacheDir, encodeURIComponent(url));

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
    console.log(
      `Fetched and cached Sessionize data successfully at ${sessionizeCachePath}`
    ); // Added logging
    return sessionizeData;
  } catch (error) {
    console.error(`Error fetching Sessionize data:`, error);
    throw error;
  }
}

// Add constants for Google Doc caching
const GOOGLE_DOC_URL =
  "https://docs.google.com/document/d/e/2PACX-1vRvI27DZES9tZWgNdcF0YHrfsgXxAuzuvMIz01GZzUzI1NdyXA4gLco52w5yd9PaRcxwqXNmq9DdICZ/pub";
const GOOGLE_DOC_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Add a function to fetch and cache the Google document
async function fetchAndCacheGoogleDoc() {
  try {
    const now = Date.now();
    const cacheStat = await fs.stat(GOOGLE_DOC_CACHE_PATH);
    if (now - cacheStat.mtimeMs < GOOGLE_DOC_CACHE_DURATION_MS) {
      console.log("Using cached Google Doc content");
      return await fs.readFile(GOOGLE_DOC_CACHE_PATH, "utf-8");
    }
  } catch (err) {
    console.log("Google Doc cache miss or error:", err.message); // Added error message logging
  }

  try {
    const response = await axios.get(GOOGLE_DOC_URL);
    const content = response.data;
    await fs.writeFile(GOOGLE_DOC_CACHE_PATH, content, "utf-8");
    console.log("Fetched and cached Google Doc content successfully");
    return content;
  } catch (error) {
    console.error("Error fetching Google Doc:", error.message); // Added error message logging
    return "";
  }
}

async function fetchAndCacheGoogleSheet() {
  try {
    const now = Date.now();
    const cacheStat = await fs.stat(GOOGLE_SHEET_CACHE_PATH);
    if (now - cacheStat.mtimeMs < CACHE_EXPIRATION_HOURS * 60 * 60 * 1000) {
      console.log("Using cached Google Sheet content");
      return await fs.readFile(GOOGLE_SHEET_CACHE_PATH, "utf-8");
    }
  } catch (err) {
    console.log("Google Sheet cache miss or error:", err.message);
  }

  try {
    const response = await axios.get(GOOGLE_SHEET_CSV_URL);
    const content = response.data;
    await fs.writeFile(GOOGLE_SHEET_CACHE_PATH, content, "utf-8");
    console.log("Fetched and cached Google Sheet content successfully");
    return content;
  } catch (error) {
    console.error("Error fetching Google Sheet:", error.message);
    return "";
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
  fetchAndCacheGoogleSheet,
};
