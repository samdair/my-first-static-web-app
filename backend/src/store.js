const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getUserFilePath(deviceId) {
  // Sanitize deviceId to a safe filename
  const safe = deviceId.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return path.join(DATA_DIR, `${safe}.json`);
}

function saveUser(userData) {
  const filePath = getUserFilePath(userData.deviceId);
  fs.writeFileSync(filePath, JSON.stringify(userData, null, 2), "utf8");
}

function getUser(deviceId) {
  const filePath = getUserFilePath(deviceId);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getAllUsers() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")));
}

function updateUserLastNotified(deviceId, iso) {
  const user = getUser(deviceId);
  if (user) {
    user.lastNotifiedAt = iso;
    saveUser(user);
  }
}

module.exports = { saveUser, getUser, getAllUsers, updateUserLastNotified };
