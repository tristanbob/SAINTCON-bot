// crawler.js
const {
  fetchAndCacheURL,
  cacheCleanedContent,
  getCleanedCache,
  shouldRunCrawler,
  storeLastRunTime,
  fetchAndCacheSessionizeData,
} = require("./cacheManager");
const { extractRelevantInfo, extractFAQInfo } = require("./openaiUtils");
const { logExtractionMetadata } = require("./logger");

const SESSIONIZE_API_URL = "https://sessionize.com/api/v2/fjfjo2d9/view/All";

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

async function runDailyTasks(urls, faqUrl) {
  const shouldRun = await shouldRunCrawler();
  if (shouldRun) {
    try {
      await crawlAndCacheURLs(urls);
      await processFAQ(faqUrl);
      await fetchAndCacheSessionizeData(SESSIONIZE_API_URL);
      await storeLastRunTime();
      console.log("Daily tasks have successfully completed.");
    } catch (error) {
      console.error("Error running the daily tasks:", error);
    }
  } else {
    console.log(
      "Daily tasks have already run in the last 24 hours. Skipping..."
    );
  }
}

module.exports = { crawlAndCacheURLs, processFAQ, runDailyTasks };
