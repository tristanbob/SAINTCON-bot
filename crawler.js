const {
  fetchAndCacheURL,
  cacheCleanedContent,
  getCleanedCache,
} = require("./contentCache");
const { extractRelevantInfo, extractFAQInfo } = require("./openai");
const { logExtractionMetadata } = require("./logger");

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

        // Log the metadata (not the content) including token usage
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

      // Log the metadata (not the content) including token usage
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

module.exports = { crawlAndCacheURLs, processFAQ };
