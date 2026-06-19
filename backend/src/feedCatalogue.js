/**
 * BBC RSS feed catalogue.
 * OpenAI classifies a user's free-text interest into one or more of these feeds.
 */
const FEED_CATALOGUE = [
  {
    id: "bbc-politics",
    label: "BBC Politics",
    url: "https://feeds.bbci.co.uk/news/politics/rss.xml",
    topics: ["politics", "government", "elections", "policy", "parliament"],
  },
  {
    id: "bbc-business",
    label: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    topics: ["finance", "economy", "markets", "business", "stocks", "interest rates", "banking"],
  },
  {
    id: "bbc-world",
    label: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    topics: ["world", "international", "war", "ukraine", "conflict", "russia", "geopolitics"],
  },
  {
    id: "bbc-technology",
    label: "BBC Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    topics: ["tech", "ai", "software", "startups", "cybersecurity"],
  },
  {
    id: "bbc-health",
    label: "BBC Health",
    url: "https://feeds.bbci.co.uk/news/health/rss.xml",
    topics: ["health", "medicine", "covid", "nhs", "mental health"],
  },
  {
    id: "bbc-science",
    label: "BBC Science",
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    topics: ["science", "environment", "climate", "space", "nature"],
  },
];

module.exports = { FEED_CATALOGUE };
