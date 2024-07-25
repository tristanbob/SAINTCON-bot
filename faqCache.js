const axios = require("axios");

let cachedFaqText = null;
let cacheTimestamp = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

async function fetchFAQText(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching FAQ text:", error);
    return null;
  }
}

async function getCachedFAQText(url) {
  const now = Date.now();
  if (
    !cachedFaqText ||
    !cacheTimestamp ||
    now - cacheTimestamp > CACHE_DURATION_MS
  ) {
    console.log("Fetching new FAQ text");
    cachedFaqText = await fetchFAQText(url);
    cacheTimestamp = now;
  } else {
    console.log("Using cached FAQ text");
  }
  return cachedFaqText;
}

module.exports = { getCachedFAQText };
