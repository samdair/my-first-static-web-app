# NewsAlert

AI-powered news alerts. Tell the app what you care about in plain English — it monitors BBC RSS feeds semantically and pushes you a summary when something relevant happens.

---

## Architecture

```
[Expo Go App]
  POST /register  →  { deviceId (Expo push token), interestStatement }
         │
         ▼
[Node.js Backend]
  1. OpenAI classifies interest → selects BBC RSS feed(s)
  2. Embeds interest statement as a vector (stored in JSON)
  3. Cron job (every 30 min):
       - Fetches each user's feeds
       - Embeds each article (title + description)
       - Computes cosine similarity vs user's interest vector
       - If similarity ≥ 0.75 → summarizes with OpenAI → sends Expo push notification
```

---

## Project Structure

```
backend/        Node.js/Express backend
  src/
    index.js          Express server + cron scheduler
    ai.js             OpenAI helpers (embed, classify, summarize)
    cron.js           Cron job logic
    feedCatalogue.js  BBC RSS feed definitions
    notifications.js  Expo push notification sender
    store.js          JSON file-based user storage
  data/           User preference JSON files (git-ignored)
  .env.example    Environment variable template

mobile/         Expo Go React Native app
  App.js          Main app (3 screens: input → loading → registered)
  config.js       Backend URL config
  app.json        Expo configuration
```

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY
npm run dev
```

### 2. Mobile App

```bash
cd mobile
npx expo start
```

Open **Expo Go** on your phone and scan the QR code.

> ⚠️ In `mobile/config.js`, replace `YOUR_LOCAL_IP` with your computer's local network IP  
> (e.g. `192.168.1.42`). Your phone and computer must be on the same Wi-Fi network.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Register device + interest statement |
| `GET` | `/user/:deviceId` | Get stored preferences |
| `GET` | `/feeds` | List available BBC feed catalogue |
| `POST` | `/run-cron` | Manually trigger cron (dev only) |
| `GET` | `/health` | Health check |

### POST /register — example body
```json
{
  "deviceId": "ExponentPushToken[xxxxxx]",
  "interestStatement": "I am interested in Ukraine war news"
}
```

### Response
```json
{
  "message": "Registered successfully",
  "deviceId": "ExponentPushToken[xxxxxx]",
  "matchedFeeds": [
    { "id": "bbc-world", "label": "BBC World" },
    { "id": "bbc-politics", "label": "BBC Politics" }
  ]
}
```
