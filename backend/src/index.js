require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const { FEED_CATALOGUE } = require("./feedCatalogue");
const { embed, classifyInterestToFeeds } = require("./ai");
const { saveUser, getUser } = require("./store");
const { runCronJob } = require("./cron");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/**
 * POST /register
 * Body: { deviceId: "ExponentPushToken[...]", interestStatement: "I'm interested in Ukraine war news" }
 *
 * 1. Classifies the interest statement into BBC feed IDs using OpenAI
 * 2. Embeds the interest statement for later semantic matching
 * 3. Saves user preferences as a JSON file
 */
app.post("/register", async (req, res) => {
  const { deviceId, interestStatement } = req.body;

  if (!deviceId || !interestStatement) {
    return res.status(400).json({ error: "deviceId and interestStatement are required" });
  }

  console.log(`[register] Device: ${deviceId} | Interest: "${interestStatement}"`);

  try {
    // 1. Classify interest → relevant BBC feeds
    const feedIds = await classifyInterestToFeeds(interestStatement, FEED_CATALOGUE);
    const feeds = FEED_CATALOGUE.filter((f) => feedIds.includes(f.id)).map((f) => ({
      id: f.id,
      label: f.label,
      url: f.url,
    }));

    // Fallback: if classification returns nothing, default to BBC World
    if (feeds.length === 0) {
      feeds.push({ id: "bbc-world", label: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" });
    }

    // 2. Embed the interest statement
    const interestVector = await embed(interestStatement);

    // 3. Build and save user record
    const userData = {
      deviceId,
      preferences: {
        interestStatement,
        interestVector,
        similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || "0.75"),
        feeds,
      },
      registeredAt: new Date().toISOString(),
      lastNotifiedAt: null,
    };

    saveUser(userData);

    console.log(`[register] Saved user. Matched feeds: ${feeds.map((f) => f.id).join(", ")}`);

    return res.status(201).json({
      message: "Registered successfully",
      deviceId,
      matchedFeeds: feeds.map((f) => ({ id: f.id, label: f.label })),
    });
  } catch (err) {
    console.error("[register] Error:", err.message);
    return res.status(500).json({ error: "Registration failed. Check server logs." });
  }
});

/**
 * GET /user/:deviceId
 * Returns stored preferences for a device (without the embedding vector).
 */
app.get("/user/:deviceId", (req, res) => {
  const user = getUser(req.params.deviceId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Strip the large vector from the response
  const { interestVector, ...prefsWithoutVector } = user.preferences;
  return res.json({ ...user, preferences: prefsWithoutVector });
});

/**
 * GET /feeds
 * Returns the full BBC feed catalogue so the mobile app can display it.
 */
app.get("/feeds", (req, res) => {
  res.json(FEED_CATALOGUE.map(({ id, label, topics }) => ({ id, label, topics })));
});

/**
 * POST /run-cron (dev/test helper — manually trigger the cron job)
 */
app.post("/run-cron", async (req, res) => {
  res.json({ message: "Cron job triggered. Check server logs." });
  await runCronJob();
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Schedule cron: every 30 minutes
cron.schedule("*/30 * * * *", () => {
  runCronJob().catch((err) => console.error("[cron] Unhandled error:", err));
});

app.listen(PORT, () => {
  console.log(`[server] News Alert backend running on http://localhost:${PORT}`);
  console.log(`[server] Cron job scheduled every 30 minutes`);
});
