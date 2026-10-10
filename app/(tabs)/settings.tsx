import React, { useCallback, useRef, useState } from "react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  useAppLanguage,
} from "../../context/LanguageContext";
import { detachCustomerFromDevice } from "../../services/pushNotifications";
/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/
const COLORS = {
  background: "#F4F1EC",
  primary: "#249B97",
  coral: "#EB6268",
  text: "#272727",
  muted: "#77736D",
  border: "#DCD4CA",
  inviteBackground: "#E5EEEA",
  gold: "#E7A52D",
  iconGray: "#7B7B76",
};
const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";
type AccountData = {
  customer: {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  counters: { addresses: number; support_unread: number };
  settings: { language?: string; [key: string]: unknown };
};
/*
|--------------------------------------------------------------------------
| ACCOUNT SCREEN
|--------------------------------------------------------------------------
*/
export default function SettingsScreen() {
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const { isArabic } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const requestId = useRef(0);
  const loadAccount = useCallback(async (signal?: AbortSignal) => {
    const currentRequest = ++requestId.current;
    try {
      setError(null);
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) throw new Error(isArabic ? "انتهت جلسة تسجيل الدخول." : "Your session has expired.");
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: "POST",
        signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ access_token: token }),
      });
      let result: any;
      try { result = await response.json(); } catch {
        throw new Error(isArabic ? "استجابة غير صالحة من الخادم." : "Invalid server response.");
      }
      if (!response.ok) throw new Error(result?.message || (isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."));
      if (signal?.aborted || currentRequest !== requestId.current) return;
      setData({
        customer: {
          id: Number(result?.customer?.id || 0),
          first_name: result?.customer?.first_name ?? null,
          last_name: result?.customer?.last_name ?? null,
          phone: result?.customer?.phone ?? null,
          email: result?.customer?.email ?? null,
        },
        counters: { addresses: Number(result?.counters?.addresses || 0), support_unread: Number(result?.counters?.support_unread || 0) },
        settings: result?.settings && typeof result.settings === "object" ? result.settings : {},
      });
    } catch (err) {
      if (signal?.aborted || currentRequest !== requestId.current) return;
      console.error("Settings load error:", err);
      setError(err instanceof Error ? err.message : (isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."));
    } finally {
      if (!signal?.aborted && currentRequest === requestId.current) setLoading(false);
    }
  }, [isArabic]);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    void loadAccount(controller.signal);
    return () => {
      controller.abort();
      requestId.current += 1;
    };
  }, [loadAccount]));
  const firstName = data?.customer.first_name?.trim() || "";
  const lastName = data?.customer.last_name?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || (isArabic ? "العميل" : "Customer");
  const initial = firstName.charAt(0).toUpperCase() || "?";
  const phone = data?.customer.phone?.trim() || "—";
  const email = data?.customer.email?.trim() || "—";
  const addressCount = data?.counters.addresses ?? 0;
  const supportUnread = Math.max(0, data?.counters.support_unread ?? 0);
  const languageValue = data?.settings?.language === "ar" ? (isArabic ? "العربية" : "Arabic") : (isArabic ? "الإنجليزية" : "English");
/*
  |--------------------------------------------------------------------------
  | TEMPORARY NAVIGATION
  |--------------------------------------------------------------------------
  |
  | Replace the Alerts/routes as the corresponding pages are implemented.
  |
  */
  const comingSoon = (
    title: string
  ) => {
    Alert.alert(
      title,
      isArabic
        ? "سيتم ربط هذه الصفحة لاحقاً."
        : "This page will be connected later."
    );
  };
  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/logout`, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ access_token: token }),
          });
        } catch (networkError) {
          console.warn("Server logout failed:", networkError);
        }
      }
      try {
        await detachCustomerFromDevice();
      } catch (deviceError) {
        console.warn("Device detach failed:", deviceError);
      }
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("access_token_expires_at");
      router.replace("/login");
    } catch (logoutError) {
      console.error("Logout error:", logoutError);
      Alert.alert(
        isArabic ? "خطأ" : "Error",
        isArabic
          ? "تعذر تسجيل الخروج. حاول مرة أخرى."
          : "Unable to sign out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  };
  const confirmLogout = () => {
    Alert.alert(
      isArabic ? "تسجيل الخروج" : "Log Out",
      isArabic
        ? "هل أنت متأكد أنك تريد تسجيل الخروج؟"
        : "Are you sure you want to log out?",
      [
        {
          text: isArabic ? "إلغاء" : "Cancel",
          style: "cancel",
        },
        {
          text: isArabic ? "تسجيل الخروج" : "Log Out",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };
  if (loading && !data) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.stateText}>{isArabic ? "جارٍ تحميل الحساب..." : "Loading account..."}</Text>
      </View>
    );
  }
  if (error && !data) {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="alert-circle-outline" size={38} color={COLORS.coral} />
        <Text style={[styles.stateText, isArabic && styles.textRight]}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => { void loadAccount(); }}>
          <Text style={styles.retryButtonText}>{isArabic ? "إعادة المحاولة" : "Try Again"}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View
      style={styles.safeArea}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Math.max(
                insets.bottom + 45,
                65
              ),
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        {/*
        |--------------------------------------------------------------------------
        | PROFILE
        |--------------------------------------------------------------------------
        */}
        <View
          style={[
            styles.profileSection,
            isArabic &&
              styles.rowReverse,
          ]}
        >
          <View
            style={
              styles.avatarColumn
            }
          >
            <Text
              style={
                styles.avatarLetter
              }
            >
              {initial}
            </Text>
            <View
              style={
                styles.avatarLine
              }
            />
          </View>
          <View
            style={
              styles.profileContent
            }
          >
            <Text
              style={[
                styles.eyebrow,
                isArabic &&
                  styles.textRight,
              ]}
            >
              {
                isArabic
                  ? "الحساب"
                  : "ACCOUNT"
              }
            </Text>
            <Text
              style={[
                styles.customerName,
                isArabic &&
                  styles.textRight,
              ]}
            >
              {fullName}
            </Text>
            <Text
              style={[
                styles.contactText,
                isArabic &&
                  styles.textRight,
              ]}
            >
              {phone}
            </Text>
            <Text
              style={[
                styles.contactText,
                isArabic &&
                  styles.textRight,
              ]}
            >
              {email}
            </Text>
          </View>
        </View>
        <View
          style={
            styles.divider
          }
        />
        {/*
        |--------------------------------------------------------------------------
        | INVITE FRIENDS
        |--------------------------------------------------------------------------
        */}
        <Pressable
          style={[
            styles.inviteCard,
            isArabic &&
              styles.rowReverse,
          ]}
          onPress={() =>
            comingSoon(
              "Invite Friends"
            )
          }
        >
          <View
            style={
              styles.inviteIcon
            }
          >
            <MaterialCommunityIcons
              name="paw"
              size={36}
              color={
                COLORS.primary
              }
            />
          </View>
          <View
            style={
              styles.inviteContent
            }
          >
            <Text
              style={[
                styles.inviteTitle,
                isArabic &&
                  styles.textRight,
              ]}
            >
              {
                isArabic
                  ? "ادعُ أصدقاءك واكسب المكافآت"
                  : "Invite Friends & Earn Rewards"
              }
            </Text>
            <Text
              style={[
                styles.inviteDescription,
                isArabic &&
                  styles.textRight,
              ]}
            >
              {
                isArabic
                  ? "امنح 30 درهماً خصماً، واكسب 150 نقطة"
                  : "Give 30 AED off, earn 150 points"
              }
            </Text>
          </View>
          <Ionicons
            name={
              isArabic
                ? "arrow-back-outline"
                : "arrow-forward-outline"
            }
            size={20}
            color={
              COLORS.primary
            }
          />
        </Pressable>
        {/*
        |--------------------------------------------------------------------------
        | MENU
        |--------------------------------------------------------------------------
        */}
        <View
          style={
            styles.menu
          }
        >
          <MenuItem
            icon="cube-outline"
            title={
              isArabic
                ? "إدارة الاشتراكات"
                : "Manage Subscriptions"
            }
            isArabic={
              isArabic
            }
           onPress={() =>
              router.push(
                "/(tabs)/pets"
              )
            }
          />
          <MenuItem
            icon="location-outline"
            title={
              isArabic
                ? "العناوين المحفوظة"
                : "Saved Addresses"
            }
            value={String(addressCount)}
            isArabic={
              isArabic
            }
            onPress={() =>
              router.push(
                "/(tabs)/saved-addresses"
              )
            }
          />
          <MenuItem
            icon="person-outline"
            title={
              isArabic
                ? "المعلومات الشخصية"
                : "Personal Information"
            }
            isArabic={
              isArabic
            }
            onPress={() =>
              router.push(
                "/(tabs)/personal-information"
              )
            }
          />
          <MenuItem
            icon="lock-closed-outline"
            title={
              isArabic
                ? "تغيير كلمة المرور"
                : "Change Password"
            }
            isArabic={
              isArabic
            }
            onPress={() =>
              router.push(
                "/(tabs)/change-password"
              )
            }
          />
          <MenuItem
            icon="headset-outline"
            title={
              isArabic
                ? "الدعم غير المتزامن"
                : "Asynchronous Support"
            }
            isArabic={
              isArabic
            }
            badgeCount={supportUnread}
              onPress={() => router.push("/(tabs)/support-tickets")}
          />
          <MenuItem
            icon="document-text-outline"
            title={
              isArabic
                ? "المساعدة وقاعدة المعرفة"
                : "Help & Knowledge Base"
            }
            isArabic={
              isArabic
            }
            onPress={() => router.push("/(tabs)/help_knowledge-base")}    
          />
          <MenuItem
            icon="globe-outline"
            title={
              isArabic
                ? "التفضيلات والنظام"
                : "Preferences & System"
            }
            value={languageValue}
            isArabic={
              isArabic
            }
            onPress={() =>
              comingSoon(
                "Preferences & System"
              )
            }
          />
        </View>
        {/*
        |--------------------------------------------------------------------------
        | LOGOUT
        |--------------------------------------------------------------------------
        */}
        <Pressable
          style={[
            styles.logoutButton,
            isArabic &&
              styles.rowReverse,
          ]}
          onPress={confirmLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
              <ActivityIndicator size="small" color={COLORS.coral} />
            ) : (
              <Ionicons
                name="exit-outline"
                size={22}
                color={COLORS.coral}
              />
            )}
          <Text
            style={
              styles.logoutText
            }
          >
            {
              isArabic
                ? "تسجيل الخروج"
                : "Log Out"
            }
          </Text>
        </Pressable>
        {/*
        |--------------------------------------------------------------------------
        | FOOTER
        |--------------------------------------------------------------------------
        */}
        <View
          style={
            styles.footer
          }
        >
          <Image
            source={require(
              "../../assets/images/maison-chat-logo.png"
            )}
            style={
              styles.footerLogo
            }
            resizeMode="contain"
          />
        <Text style={styles.footerText}>
          {
            isArabic
              ? `التغذية الواعية تبدأ من هنا • تطبيق العملاء v${appVersion}`
              : `Conscious Nutrition Begins Here • Customer App v${appVersion}`
          }
        </Text>
        </View>
      </ScrollView>
    </View>
  );
}
/*
|--------------------------------------------------------------------------
| MENU ITEM
|--------------------------------------------------------------------------
*/
type MenuItemProps = {
  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];
  title: string;
  value?: string;
  badgeCount?: number;
  isArabic: boolean;
  onPress: () => void;
};
function MenuItem({
  icon,
  title,
  value,
  badgeCount = 0,
  isArabic,
  onPress,
}: MenuItemProps) {
  return (
    <Pressable
      style={[
        styles.menuItem,
        isArabic &&
          styles.rowReverse,
      ]}
      onPress={
        onPress
      }
    >
      <Ionicons
        name={icon}
        size={22}
        color={
          COLORS.primary
        }
        style={
          styles.menuIcon
        }
      />
      <Text
        numberOfLines={1}
        style={[
          styles.menuTitle,
          isArabic &&
            styles.textRight,
        ]}
      >
        {title}
      </Text>
      <View
        style={[
          styles.menuRight,
          isArabic &&
            styles.rowReverse,
        ]}
      >
        {badgeCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
          </View>
        )}
        {
          value ? (
            <Text
              style={
                styles.menuValue
              }
            >
              {value}
            </Text>
          ) : null
        }
        <Ionicons
          name={
            isArabic
              ? "arrow-back-outline"
              : "arrow-forward-outline"
          }
          size={18}
          color={
            COLORS.iconGray
          }
        />
      </View>
    </Pressable>
  );
}
/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/
const styles =
  StyleSheet.create({
    stateContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, backgroundColor: COLORS.background },
    stateText: { marginTop: 14, fontFamily: "Cairo_400Regular", fontSize: 14, lineHeight: 22, textAlign: "center", color: COLORS.muted },
    retryButton: { minWidth: 140, minHeight: 46, marginTop: 20, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: COLORS.text },
    retryButtonText: { fontFamily: "Cairo_600SemiBold", fontSize: 14, color: COLORS.background },
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 38,
    },
    /*
    |--------------------------------------------------------------------------
    | COMMON
    |--------------------------------------------------------------------------
    */
    rowReverse: {
      flexDirection:
        "row-reverse",
    },
    textRight: {
      textAlign: "right",
      writingDirection:
        "rtl",
    },
    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
    },
    /*
    |--------------------------------------------------------------------------
    | PROFILE
    |--------------------------------------------------------------------------
    */
    profileSection: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      paddingBottom: 35,
    },
    avatarColumn: {
      width: 68,
      marginRight: 15,
      alignItems:
        "center",
    },
    avatarLetter: {
      marginTop: 3,
      fontFamily:
        "Cairo_500Medium",
      fontSize: 38,
      lineHeight: 48,
      color:
        COLORS.text,
    },
    avatarLine: {
      width: 68,
      height: 2,
      marginTop: 16,
      backgroundColor:
        COLORS.primary,
    },
    profileContent: {
      flex: 1,
    },
    eyebrow: {
      fontFamily:
        "Cairo_600SemiBold",
      fontSize: 11,
      lineHeight: 18,
      letterSpacing: 2,
      color:
        COLORS.muted,
    },
    customerName: {
      marginTop: 5,
      fontFamily:
        "Cairo_700Bold",
      fontSize: 29,
      lineHeight: 40,
      color:
        COLORS.text,
    },
    contactText: {
      marginTop: 8,
      fontFamily:
        "Cairo_400Regular",
      fontSize: 14,
      lineHeight: 20,
      color:
        COLORS.muted,
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 25,
    },
    memberDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 8,
      backgroundColor:
        COLORS.gold,
    },
    memberText: {
      fontFamily:
        "Cairo_500Medium",
      fontSize: 12,
      color:
        COLORS.text,
    },
    /*
    |--------------------------------------------------------------------------
    | POINTS
    |--------------------------------------------------------------------------
    */
    pointsSection: {
      paddingTop: 26,
      paddingBottom: 29,
    },
    sectionEyebrow: {
      fontFamily:
        "Cairo_600SemiBold",
      fontSize: 11,
      lineHeight: 18,
      letterSpacing: 2,
      color:
        COLORS.muted,
    },
    pointsRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      marginTop: 4,
    },
    pointsValueRow: {
      flexDirection: "row",
      alignItems:
        "baseline",
    },
    pointsValue: {
      fontFamily:
        "Cairo_400Regular",
      fontSize: 44,
      lineHeight: 55,
      color:
        COLORS.text,
    },
    pointsUnit: {
      marginLeft: 4,
      fontFamily:
        "Cairo_500Medium",
      fontSize: 18,
      color:
        COLORS.text,
    },
    pointsLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    pointsLinkText: {
      fontFamily:
        "Cairo_700Bold",
      fontSize: 13,
      color:
        COLORS.text,
    },
    /*
    |--------------------------------------------------------------------------
    | INVITE
    |--------------------------------------------------------------------------
    */
    inviteCard: {
      minHeight: 95,
      marginTop: 30,
      marginBottom: 31,
      paddingHorizontal: 20,
      borderRadius: 6,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        COLORS.inviteBackground,
    },
    inviteIcon: {
      width: 53,
      alignItems:
        "flex-start",
      justifyContent:
        "center",
    },
    inviteContent: {
      flex: 1,
      paddingHorizontal: 12,
    },
    inviteTitle: {
      fontFamily:
        "Cairo_700Bold",
      fontSize: 14,
      lineHeight: 21,
      color:
        COLORS.text,
    },
    inviteDescription: {
      marginTop: 2,
      fontFamily:
        "Cairo_400Regular",
      fontSize: 12,
      lineHeight: 19,
      color:
        COLORS.muted,
    },
    /*
    |--------------------------------------------------------------------------
    | MENU
    |--------------------------------------------------------------------------
    */
    menu: {
      width: "100%",
    },
    menuItem: {
      minHeight: 80,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },
    menuIcon: {
      width: 39,
    },
    menuTitle: {
      flex: 1,
      fontFamily:
        "Cairo_500Medium",
      fontSize: 16,
      lineHeight: 24,
      color:
        COLORS.text,
    },
    menuRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
      marginLeft: 10,
    },
    unreadBadge: { minWidth: 23, height: 23, borderRadius: 12, paddingHorizontal: 6, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" },
    unreadBadgeText: { color: "#FFFFFF", fontFamily: "Cairo_700Bold", fontSize: 11, lineHeight: 17, textAlign: "center" },
    menuValue: {
      fontFamily:
        "Cairo_400Regular",
      fontSize: 12,
      color:
        COLORS.muted,
    },
    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */
    logoutButton: {
      minHeight: 81,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    logoutText: {
      fontFamily:
        "Cairo_600SemiBold",
      fontSize: 15,
      color:
        COLORS.text,
    },
    /*
    |--------------------------------------------------------------------------
    | FOOTER
    |--------------------------------------------------------------------------
    */
    footer: {
      alignItems: "center",
      paddingTop: 51,
      paddingBottom: 10,
    },
    footerLogo: {
      width: 130,
      height: 90,
    },
    footerText: {
      marginTop: 17,
      fontFamily:
        "Cairo_400Regular",
      fontSize: 10,
      lineHeight: 17,
      textAlign: "center",
      color:
        COLORS.muted,
    },
  });
