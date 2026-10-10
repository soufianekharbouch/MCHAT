import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppLanguage } from "../context/LanguageContext";

const API_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile/app-version";
const DISMISS_KEY = "maison_chat_update_dismissed_v1";
const REMIND_AFTER_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const DEBUG_UPDATE_CHECK = __DEV__;

interface VersionResponse {
  success?: boolean;
  latest_version?: string;
  minimum_version?: string;
  force_update?: boolean;
  play_store_url?: string;
  message_en?: string;
  message_ar?: string;
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  minimumVersion: string;
  required: boolean;
  url: string;
  messageEn?: string;
  messageAr?: string;
}

interface DismissRecord {
  version: string;
  dismissedAt: number;
}

function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    value.split(".").map((part) => {
      const number = Number.parseInt(part, 10);
      return Number.isFinite(number) ? number : 0;
    });
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
}

function isValidStoreUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/[^\s]+$/i.test(value);
}

export default function AppUpdateChecker() {
  const { isArabic } = useAppLanguage();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const checkingRef = useRef(false);
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    if (Platform.OS !== "android") return;
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      if (DEBUG_UPDATE_CHECK) console.log("[AppUpdate] Skipped: Expo Go");
      return;
    }
    if (checkingRef.current) return;

    checkingRef.current = true;
    try {
      // Native app version, not the version from a potentially updated JS manifest.
      const currentVersion = Application.nativeApplicationVersion || Constants.expoConfig?.version;
      if (!currentVersion) {
        console.warn("[AppUpdate] No installed app version available");
        return;
      }
      if (DEBUG_UPDATE_CHECK) console.log("[AppUpdate] Installed version:", currentVersion);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let response: Response;
      try {
        response = await fetch(API_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: "android",
            current_version: currentVersion,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        console.warn("[AppUpdate] Laravel HTTP status:", response.status);
        return;
      }
      const data: VersionResponse = await response.json();
      if (DEBUG_UPDATE_CHECK) console.log("[AppUpdate] Laravel response:", data);
      if (data.success === false || !data.latest_version) {
        console.warn("[AppUpdate] Missing latest_version or unsuccessful response");
        return;
      }

      const latestVersion = data.latest_version;
      const minimumVersion = data.minimum_version || "0.0.0";
      const outdated = compareVersions(currentVersion, latestVersion) < 0;
      const required = outdated && (
        data.force_update === true ||
        compareVersions(currentVersion, minimumVersion) < 0
      );
      if (DEBUG_UPDATE_CHECK) console.log("[AppUpdate] Decision:", { currentVersion, latestVersion, minimumVersion, outdated, required });

      if (!mountedRef.current) return;
      if (!outdated && !required) {
        setVisible(false);
        setUpdate(null);
        return;
      }

      if (!required) {
        let saved: string | null = null;
        try {
          saved = await AsyncStorage.getItem(DISMISS_KEY);
        } catch (storageError) {
          console.warn("[AppUpdate] Unable to read reminder; showing popup:", storageError);
        }
        if (saved) {
          try {
            const record: DismissRecord = JSON.parse(saved);
            if (
              record.version === latestVersion &&
              typeof record.dismissedAt === "number" &&
              Date.now() - record.dismissedAt < REMIND_AFTER_MS &&
              Date.now() >= record.dismissedAt
            ) {
              if (DEBUG_UPDATE_CHECK) console.log("[AppUpdate] Reminder postponed until 24h after dismissal");
              if (mountedRef.current) setVisible(false);
              return;
            }
          } catch {
            // Ignore invalid local storage and show the update prompt.
          }
        }
      }

      if (!mountedRef.current) return;
      setUpdate({
        currentVersion,
        latestVersion,
        minimumVersion,
        required,
        url: isValidStoreUrl(data.play_store_url) ? data.play_store_url : "",
        messageEn: data.message_en,
        messageAr: data.message_ar,
      });
      if (DEBUG_UPDATE_CHECK) console.log("[AppUpdate] Showing popup");
      setVisible(true);
    } catch (error) {
      console.warn("App update check unavailable:", error);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      if (Platform.OS !== "android" ||
          Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
      void check();
      interval = setInterval(() => {
        if (AppState.currentState === "active") void check();
      }, CHECK_INTERVAL_MS);
    };

    if (AppState.currentState === "active") startPolling();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") startPolling();
      else stopPolling();
    });

    return () => {
      mountedRef.current = false;
      stopPolling();
      subscription.remove();
    };
  }, [check]);

  const dismiss = async () => {
    if (!update || update.required) return;
    // Hide immediately, then persist the 24-hour snooze for this latest version.
    setVisible(false);
    try {
      const record: DismissRecord = {
        version: update.latestVersion,
        dismissedAt: Date.now(),
      };
      await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(record));
    } catch (error) {
      console.warn("Could not save update reminder:", error);
    }
  };

  const openStore = async () => {
    if (!update || opening) return;
    if (!update.url) {
      console.warn("Missing or invalid play_store_url in Laravel response");
      return;
    }
    setOpening(true);
    try {
      await Linking.openURL(update.url);
    } catch (error) {
      console.warn("Unable to open Google Play:", error);
    } finally {
      setOpening(false);
    }
  };

  const defaultMessage = isArabic
    ? "يتوفر إصدار جديد من Maison Chat. حدّث التطبيق للاستفادة من أحدث التحسينات."
    : "A new version of Maison Chat is available. Update now for the latest improvements.";
  const description =
    (isArabic ? update?.messageAr : update?.messageEn) || defaultMessage;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (update && !update.required) void dismiss();
      }}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>↻</Text>
          </View>
          <Text style={[styles.title, isArabic && styles.rtl]}>
            {isArabic ? "تحديث جديد متاح" : "New Update Available!"}
          </Text>
          <Text style={[styles.description, isArabic && styles.rtl]}>
            {description}
          </Text>

          <View style={styles.versionBox}>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>
                {isArabic ? "الإصدار الحالي" : "Current Version"}
              </Text>
              <Text style={styles.versionValue}>{update?.currentVersion ?? "—"}</Text>
            </View>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>
                {isArabic ? "أحدث إصدار" : "Latest Version"}
              </Text>
              <Text style={styles.versionValue}>{update?.latestVersion ?? "—"}</Text>
            </View>
            <View style={[styles.versionRow, styles.lastRow]}>
              <Text style={styles.versionLabel}>
                {isArabic ? "الحد الأدنى المطلوب" : "Minimum Required Version"}
              </Text>
              <Text style={styles.versionValue}>{update?.minimumVersion ?? "—"}</Text>
            </View>
          </View>

          {update?.required && (
            <Text style={[styles.requiredText, isArabic && styles.rtl]}>
              {isArabic
                ? "هذا التحديث إلزامي لمتابعة استخدام التطبيق."
                : "This update is required to continue using the app."}
            </Text>
          )}

          <Pressable
            style={[styles.updateButton, (!update?.url || opening) && styles.disabledButton]}
            onPress={() => void openStore()}
            disabled={!update?.url || opening}
          >
            {opening ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.updateText}>
                {isArabic ? "تحديث الآن" : "Update Now"}
              </Text>
            )}
          </Pressable>
          {!update?.url && (
            <Text style={styles.linkWarning}>
              {isArabic
                ? "رابط المتجر غير متوفر حالياً."
                : "Store link is currently unavailable."}
            </Text>
          )}
          {!update?.required && (
            <Pressable style={styles.laterButton} onPress={() => void dismiss()}>
              <Text style={styles.laterText}>
                {isArabic ? "ربما لاحقاً" : "Maybe Later"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 18,
    backgroundColor: "#F4F1EC",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: "center",
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#E5EEEA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  icon: { fontSize: 42, color: "#249B97", lineHeight: 55 },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
    lineHeight: 36,
    color: "#272727",
    textAlign: "center",
  },
  description: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    lineHeight: 24,
    color: "#77736D",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  rtl: { writingDirection: "rtl" },
  versionBox: {
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 18,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E0D9",
  },
  lastRow: { borderBottomWidth: 0 },
  versionLabel: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#77736D",
  },
  versionValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#272727",
    marginLeft: 12,
  },
  requiredText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#B45309",
    textAlign: "center",
    marginBottom: 12,
  },
  updateButton: {
    width: "100%",
    height: 55,
    borderRadius: 9,
    backgroundColor: "#292929",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: { opacity: 0.55 },
  updateText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  linkWarning: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#B45309",
    textAlign: "center",
    marginTop: 8,
  },
  laterButton: { padding: 15, marginTop: 3 },
  laterText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#77736D",
  },
});
