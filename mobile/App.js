import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { BACKEND_URL } from "./config";

// Show notifications while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert("Push notifications require a physical device.");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Permission denied", "Enable notifications in Settings to receive news alerts.");
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data; // "ExponentPushToken[...]"
}

export default function App() {
  const [step, setStep] = useState("input"); // "input" | "loading" | "registered"
  const [interest, setInterest] = useState("");
  const [pushToken, setPushToken] = useState(null);
  const [matchedFeeds, setMatchedFeeds] = useState([]);
  const [lastNotif, setLastNotif] = useState(null);

  const notifListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Get push token on mount
    registerForPushNotificationsAsync().then(setPushToken);

    // Listen for notifications received while app is open
    notifListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setLastNotif(notification.request.content);
    });

    // Listen for user tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      Notifications.removeNotificationSubscription(notifListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  async function handleRegister() {
    if (!interest.trim()) {
      Alert.alert("Please describe what news you're interested in.");
      return;
    }
    if (!pushToken) {
      Alert.alert("Push token not ready", "Please wait a moment and try again.");
      return;
    }

    setStep("loading");

    try {
      const response = await fetch(`${BACKEND_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: pushToken, interestStatement: interest.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setMatchedFeeds(data.matchedFeeds || []);
      setStep("registered");
    } catch (err) {
      Alert.alert("Error", err.message);
      setStep("input");
    }
  }

  if (step === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Setting up your news alerts…</Text>
        <Text style={styles.subText}>Analysing your interests with AI</Text>
      </View>
    );
  }

  if (step === "registered") {
    return (
      <ScrollView contentContainerStyle={styles.centered}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subText}>You'll receive push notifications when relevant articles are found.</Text>

        <View style={styles.feedBox}>
          <Text style={styles.feedTitle}>Monitoring these BBC feeds:</Text>
          {matchedFeeds.map((f) => (
            <Text key={f.id} style={styles.feedItem}>• {f.label}</Text>
          ))}
        </View>

        {lastNotif && (
          <View style={styles.notifBox}>
            <Text style={styles.notifTitle}>Latest alert:</Text>
            <Text style={styles.notifHeadline}>{lastNotif.title}</Text>
            <Text style={styles.notifBody}>{lastNotif.body}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setStep("input"); setInterest(""); }}>
          <Text style={styles.secondaryBtnText}>Change my interest</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Default: input step
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.emoji}>📰</Text>
        <Text style={styles.title}>NewsAlert</Text>
        <Text style={styles.subtitle}>
          Describe what news you care about in plain English. We'll monitor BBC RSS feeds and notify you when something relevant happens.
        </Text>

        <Text style={styles.label}>What are you interested in?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. I'm interested in Ukraine war news"
          placeholderTextColor="#999"
          value={interest}
          onChangeText={setInterest}
          multiline
          numberOfLines={3}
          returnKeyType="done"
        />

        <Text style={styles.hint}>
          You can be specific:{"\n"}
          "Ukraine war news" · "UK interest rate changes" · "AI and tech startups"
        </Text>

        <TouchableOpacity
          style={[styles.btn, !interest.trim() && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={!interest.trim()}
        >
          <Text style={styles.btnText}>Set up my alerts →</Text>
        </TouchableOpacity>

        {!pushToken && (
          <Text style={styles.tokenWarning}>⚠️ Waiting for notification permission…</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  inner: { padding: 28, paddingTop: 80, flexGrow: 1 },
  centered: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 28, backgroundColor: "#f0f4f8" },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a2e", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#555", lineHeight: 22, marginBottom: 32 },
  label: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#222",
    borderWidth: 1,
    borderColor: "#dde3ea",
    minHeight: 80,
    textAlignVertical: "top",
  },
  hint: { fontSize: 12, color: "#888", marginTop: 8, marginBottom: 28, lineHeight: 18 },
  btn: {
    backgroundColor: "#0066cc",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: { backgroundColor: "#aac4e8" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  tokenWarning: { marginTop: 16, fontSize: 13, color: "#e07b00", textAlign: "center" },
  loadingText: { marginTop: 16, fontSize: 18, fontWeight: "600", color: "#1a1a2e" },
  subText: { marginTop: 8, fontSize: 14, color: "#666", textAlign: "center" },
  feedBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#dde3ea",
  },
  feedTitle: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 8 },
  feedItem: { fontSize: 15, color: "#222", marginBottom: 4 },
  notifBox: {
    backgroundColor: "#e8f4fd",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: "100%",
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
  },
  notifTitle: { fontSize: 12, fontWeight: "600", color: "#0066cc", marginBottom: 4 },
  notifHeadline: { fontSize: 14, fontWeight: "700", color: "#1a1a2e", marginBottom: 4 },
  notifBody: { fontSize: 14, color: "#444", lineHeight: 20 },
  secondaryBtn: { marginTop: 24, padding: 12 },
  secondaryBtnText: { color: "#0066cc", fontSize: 14, fontWeight: "600" },
});

