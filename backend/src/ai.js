const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Embed a text string using OpenAI's small embedding model.
 * Returns a float array (1536 dimensions).
 */
async function embed(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Cosine similarity between two equal-length vectors.
 * Returns a value between -1 and 1 (higher = more similar).
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Use OpenAI to classify a free-text interest statement into BBC feed IDs.
 * Returns an array of feed IDs (max 2).
 */
async function classifyInterestToFeeds(interestStatement, feedCatalogue) {
  const feedList = feedCatalogue
    .map((f) => `- ${f.id}: ${f.label} (topics: ${f.topics.join(", ")})`)
    .join("\n");

  const prompt = `You are a news feed classifier. Given a user's interest statement, select the most relevant BBC RSS feeds from the list below.
Return ONLY a JSON array of feed IDs (max 2). Do not explain.

Available feeds:
${feedList}

User interest: "${interestStatement}"

Response (JSON array only):`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const content = response.choices[0].message.content.trim();
  // Parse the JSON array safely
  const match = content.match(/\[.*\]/s);
  if (!match) return [];
  return JSON.parse(match[0]);
}

/**
 * Summarize an article (title + description) in 2 sentences.
 */
async function summarizeArticle(title, description) {
  const prompt = `Summarize this news article in exactly 2 short sentences suitable for a push notification.

Title: ${title}
Description: ${description}

Summary:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 120,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { embed, cosineSimilarity, classifyInterestToFeeds, summarizeArticle };
