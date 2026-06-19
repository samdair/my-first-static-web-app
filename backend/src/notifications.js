const axios = require("axios");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send a push notification to an Expo Go device.
 * @param {string} expoPushToken - The ExponentPushToken[...] for the device
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional extra data payload
 */
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data,
  };

  const response = await axios.post(EXPO_PUSH_URL, message, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

module.exports = { sendPushNotification };
