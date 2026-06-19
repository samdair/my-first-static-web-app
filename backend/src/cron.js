const Parser = require("rss-parser");
const { embed, cosineSimilarity, summarizeArticle } = require("./ai");
const { getAllUsers, updateUserLastNotified } = require("./store");
const { sendPushNotification } = require("./notifications");

const parser = new Parser();

const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD || "0.75");

/**
 * Main cron task: for every registered user, fetch their feeds,
 * score each article semantically, summarize matches, and push notify.
 */
async function runCronJob() {
  console.log(`[cron] Starting run at ${new Date().toISOString()}`);
  const users = getAllUsers();

  if (users.length === 0) {
    console.log("[cron] No registered users. Skipping.");
    return;
  }

  for (const user of users) {
    const { deviceId, preferences } = user;
    const { interestStatement, interestVector, feeds } = preferences;

    if (!feeds || feeds.length === 0) {
      console.log(`[cron] User ${deviceId} has no feeds. Skipping.`);
      continue;
    }

    console.log(`[cron] Processing user ${deviceId} | interest: "${interestStatement}"`);

    for (const feed of feeds) {
      let feedItems;
      try {
        const parsed = await parser.parseURL(feed.url);
        feedItems = parsed.items || [];
      } catch (err) {
        console.error(`[cron] Failed to fetch feed ${feed.url}:`, err.message);
        continue;
      }

      console.log(`[cron]   Feed: ${feed.id} — ${feedItems.length} items`);

      for (const item of feedItems) {
        const articleText = `${item.title || ""} ${item.contentSnippet || item.content || ""}`.trim();
        if (!articleText) continue;

        // Embed the article and compute similarity to user's interest
        let articleVector;
        try {
          articleVector = await embed(articleText);
        } catch (err) {
          console.error("[cron] Embedding error:", err.message);
          continue;
        }

        const score = cosineSimilarity(interestVector, articleVector);
        console.log(`[cron]     "${item.title}" → similarity: ${score.toFixed(3)}`);

        if (score >= SIMILARITY_THRESHOLD) {
          let summary;
          try {
            summary = await summarizeArticle(
              item.title || "",
              item.contentSnippet || item.content || ""
            );
          } catch (err) {
            console.error("[cron] Summarization error:", err.message);
            summary = item.title;
          }

          try {
            await sendPushNotification(
              deviceId,
              "📰 News Alert",
              summary,
              { url: item.link, feedId: feed.id }
            );
            console.log(`[cron]     ✅ Sent notification for: "${item.title}"`);
          } catch (err) {
            console.error("[cron] Push error:", err.message);
          }

          updateUserLastNotified(deviceId, new Date().toISOString());

          // Only send one notification per feed per run to avoid spam
          break;
        }
      }
    }
  }

  console.log(`[cron] Run complete at ${new Date().toISOString()}`);
}

module.exports = { runCronJob };
