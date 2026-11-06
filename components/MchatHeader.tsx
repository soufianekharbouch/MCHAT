import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { detachCustomerFromDevice } from "../services/pushNotifications";
import {
  getUnreadNotificationCount,
  onPendingNotificationOpen,
  openNotificationDestination,
  takePendingNotificationOpen,
} from "../services/notificationApi";
import { useAppLanguage } from "../context/LanguageContext";
import { clearSession, getSessionToken, useSession } from "../services/session";

import { API_MOBILE_URL } from "../services/apiConfig";

const API_BASE_URL = API_MOBILE_URL;

const COLORS = {
  header: "#F4F1ECF5",
  drawer: "#F8F5EF",
  primary: "#249B97",
  primaryLight: "#E2ECE7",
  text: "#77736D",
  textStrong: "#292825",
  muted: "#89857E",
  border: "#D8D1C7",
  coral: "#EB6268",
  overlay: "rgba(45,49,45,0.53)",
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.86, 374);

type DrawerRoute = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelEn: string;
  labelAr: string;
  route?: string;
};

type CustomerProfile = {
  firstName: string;
  lastName: string;
};

export default function MchatHeader() {
  const { isArabic, setLanguage } = useAppLanguage();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { signedIn } = useSession();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [profile, setProfile] = useState<CustomerProfile>({
    firstName: "",
    lastName: "",
  });

  const drawerTranslate = useRef(
    new Animated.Value(isArabic ? DRAWER_WIDTH : -DRAWER_WIDTH)
  ).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const loadUnreadNotifications = useCallback(async () => {
    // Visitor: no bell, nothing to load
    if (!signedIn) {
      setUnreadNotifications(0);
      return;
    }

    try {
      const count = await getUnreadNotificationCount();
      setUnreadNotifications(count);
    } catch (error) {
      console.warn("Unread notifications error:", error);
    }
  }, [signedIn]);

  const loadCustomerProfile = useCallback(async () => {
    try {
      const token = await getSessionToken();
      if (!token) {
        setProfile({ firstName: "", lastName: "" });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ access_token: token }),
      });

      if (!response.ok) {
        console.warn("Unable to load drawer customer:", response.status);
        return;
      }

      const data = await response.json();
      setProfile({
        firstName: String(data?.customer?.first_name ?? "").trim(),
        lastName: String(data?.customer?.last_name ?? "").trim(),
      });
    } catch (error) {
      console.warn("Drawer customer error:", error);
    }
  }, []);

  useEffect(() => {
    loadUnreadNotifications();
    loadCustomerProfile();
  }, [loadUnreadNotifications, loadCustomerProfile, pathname]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") {
        loadUnreadNotifications();
        loadCustomerProfile();
      }
    });
    return () => subscription.remove();
  }, [loadUnreadNotifications, loadCustomerProfile]);

  /*
  |--------------------------------------------------------------------------
  | PUSH TAPPED -> SCREEN OF THE NOTIFICATION
  |--------------------------------------------------------------------------
  |
  | app/_layout.tsx records the tapped push (notificationApi). The header
  | opens its screen a moment later, once the start of the app is done
  | (otherwise the start would bring the app back to Home).
  |
  */

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const openPending = () => {
      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        const pending = takePendingNotificationOpen();

        if (pending) {
          openNotificationDestination(pending.destination, pending.params);
          void loadUnreadNotifications();
        }
      }, 900);
    };

    openPending();
    const unsubscribe = onPendingNotificationOpen(openPending);

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [loadUnreadNotifications]);

  useEffect(() => {
    if (!drawerVisible) {
      drawerTranslate.setValue(isArabic ? DRAWER_WIDTH : -DRAWER_WIDTH);
    }
  }, [isArabic, drawerTranslate, drawerVisible]);

  const openDrawer = () => {
    drawerTranslate.setValue(isArabic ? DRAWER_WIDTH : -DRAWER_WIDTH);
    overlayOpacity.setValue(0);
    setDrawerVisible(true);
    void loadCustomerProfile();

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(drawerTranslate, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeDrawer = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(drawerTranslate, {
        toValue: isArabic ? DRAWER_WIDTH : -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 190,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerVisible(false);
      callback?.();
    });
  };

  const navigate = (route: string) => {
    closeDrawer(() => router.push(route as any));
  };

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const token = await getSessionToken();

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

      await clearSession();
      setUnreadNotifications(0);
      setProfile({ firstName: "", lastName: "" });
      setDrawerVisible(false);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
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

  /*
  |--------------------------------------------------------------------------
  | DELETE MY ACCOUNT (Apple / Google): 2 confirmations, then the server
  | removes the personal data and signs the customer out everywhere
  |--------------------------------------------------------------------------
  */

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);

    try {
      const token = await getSessionToken();

      const response = await fetch(`${API_BASE_URL}/account/delete`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ access_token: token, confirm: "DELETE", lang: isArabic ? "ar" : "en" }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            (isArabic ? "تعذر حذف الحساب. حاول مرة أخرى." : "Unable to delete your account. Please try again.")
        );
      }

      try {
        await detachCustomerFromDevice();
      } catch {
        // already detached by the server
      }

      await clearSession();
      setUnreadNotifications(0);
      setProfile({ firstName: "", lastName: "" });
      setDrawerVisible(false);
      router.replace("/(tabs)" as any);

      setTimeout(
        () =>
          Alert.alert(
            "",
            isArabic
              ? "تم حذف حسابك. شكراً لثقتك بـ Maison Chat."
              : "Your account has been deleted. Thank you for trusting Maison Chat."
          ),
        350
      );
    } catch (error: any) {
      Alert.alert(isArabic ? "خطأ" : "Error", error?.message || "Error");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      isArabic ? "حذف الحساب" : "Delete account",
      isArabic
        ? "سيتم حذف حسابك وبياناتك الشخصية نهائياً وتسجيل خروجك من جميع الأجهزة.\n\n• الباقات غير المدفوعة ستُلغى.\n• التوصيلات المدفوعة مسبقاً ستصلك كما هو مخطط.\n\nلا يمكن التراجع عن هذا الإجراء."
        : "Your account and personal data will be permanently deleted and you will be signed out on every device.\n\n• Unpaid plans will be cancelled.\n• Deliveries already paid will arrive as planned.\n\nThis cannot be undone.",
      [
        { text: isArabic ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: isArabic ? "متابعة" : "Continue",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              isArabic ? "تأكيد الحذف النهائي؟" : "Delete permanently?",
              isArabic ? "سيتم حذف حسابك الآن." : "Your account will be deleted now.",
              [
                { text: isArabic ? "إلغاء" : "Cancel", style: "cancel" },
                {
                  text: isArabic ? "حذف الحساب" : "Delete account",
                  style: "destructive",
                  onPress: () => void deleteAccount(),
                },
              ]
            ),
        },
      ]
    );
  };

  const mainItems: DrawerRoute[] = [
    {
      key: "home",
      icon: "home-outline",
      labelEn: "Home",
      labelAr: "الرئيسية",
      route: "/(tabs)",
    },
    {
      key: "pets",
      icon: "paw-outline",
      labelEn: "My Pets",
      labelAr: "حيواناتي",
      route: "/(tabs)/pets",
    },
    {
      key: "deliveries",
      icon: "car-outline",
      labelEn: "Manage Delivery",
      labelAr: "إدارة التوصيل",
      route: "/(tabs)/orders",
    },
    {
      key: "loyalty",
      icon: "star-outline",
      labelEn: "Loyalty Points",
      labelAr: "نقاط الولاء",
      route: "/(tabs)/loyalty",
    },
    {
      key: "transition",
      icon: "book-outline",
      labelEn: "Transition Guide",
      labelAr: "دليل الانتقال",
    },
  ];

  const secondaryItems: DrawerRoute[] = [
    {
      key: "addresses",
      icon: "location-outline",
      labelEn: "Saved Addresses",
      labelAr: "العناوين المحفوظة",
      route: "/(tabs)/saved-addresses",
    },
    {
      key: "personal",
      icon: "person-outline",
      labelEn: "Personal Information",
      labelAr: "المعلومات الشخصية",
      route: "/(tabs)/personal-information",
    },
    {
      key: "help",
      icon: "chatbubble-outline",
      labelEn: "Help & Support",
      labelAr: "المساعدة والدعم",
      route: "/(tabs)/support-tickets",
    },
    {
      key: "knowledge",
      icon: "help-circle-outline",
      labelEn: "Help & Knowledge Base",
      labelAr: "المساعدة وقاعدة المعرفة",
      route: "/(tabs)/help_knowledge-base",
    },
  ];

  /** Menu in 3 groups: daily use / my account / help */
  const byKey = (key: string) => [...mainItems, ...secondaryItems].find(item => item.key === key)!;

  const menuSections = [
    {
      key: "maison",
      titleEn: "MY LITTLE MAISON",
      titleAr: "منزلك الصغير",
      items: ["home", "pets", "deliveries", "transition"].map(byKey),
    },
    {
      key: "account",
      titleEn: "MY ACCOUNT",
      titleAr: "حسابي",
      items: ["loyalty", "addresses", "personal"].map(byKey),
    },
    {
      key: "help",
      titleEn: "HELP",
      titleAr: "المساعدة",
      items: ["help", "knowledge"].map(byKey),
    },
  ];

  const isItemActive = (item: DrawerRoute) => {
    if (item.key === "home") {
      return (
        pathname === "/" ||
        pathname === "/(tabs)" ||
        pathname === "/index"
      );
    }
    if (item.key === "pets") return pathname.includes("pets");
    if (item.key === "deliveries") return pathname.includes("orders");
    if (item.key === "loyalty") return pathname.includes("loyalty");
    if (item.key === "addresses") return pathname.includes("saved-addresses");
    if (item.key === "personal") return pathname.includes("personal-information");
    if (item.key === "help") return pathname.includes("support-ticket");
    if (item.key === "knowledge") return pathname.includes("help_knowledge");
    return false;
  };

  const renderDrawerItem = (item: DrawerRoute) => {
    const active = isItemActive(item);

    return (
      <Pressable
        key={item.key}
        onPress={() => {
          if (item.route) navigate(item.route);
        }}
        style={({ pressed }) => [
          styles.drawerItem,
          isArabic && styles.rowReverse,
          active && styles.drawerItemActive,
          pressed && styles.drawerItemPressed,
        ]}
      >
        <Ionicons
          name={item.icon}
          size={22}
          color={active ? COLORS.primary : "#77736D"}
        />
        <Text
          style={[
            styles.drawerItemText,
            active && styles.drawerItemTextActive,
            isArabic && styles.textRtl,
          ]}
        >
          {isArabic ? item.labelAr : item.labelEn}
        </Text>
      </Pressable>
    );
  };

  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    (isArabic ? "العميل" : "Customer");
  const initial =
    profile.firstName.charAt(0).toUpperCase() ||
    profile.lastName.charAt(0).toUpperCase() ||
    "?";

  return (
    <>
      <SafeAreaView
        edges={["top"]}
        style={[styles.safeArea, { backgroundColor: "#000000" }]}
      >
        <View style={[styles.header, isArabic && styles.rowReverse]}>
          <View style={[styles.headerLeft, isArabic && styles.rowReverse]}>
            <Pressable
              onPress={openDrawer}
              hitSlop={10}
              style={({ pressed }) => [
                styles.headerIconButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="menu-outline"
                size={29}
                color={COLORS.textStrong}
              />
            </Pressable>
            <Image
              source={require("../assets/images/maison-chat-logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.headerActions, isArabic && styles.rowReverse]}>
            <Pressable
              hitSlop={8}
              onPress={() => setLanguage(isArabic ? "en" : "ar")}
              style={({ pressed }) => [
                styles.languageAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.languageText}>
                {isArabic ? "EN" : "العربية"}
              </Text>
            </Pressable>

            {/* Bell: only for a signed in customer */}
            {signedIn && (
            <Pressable
              hitSlop={8}
              onPress={() => router.push("/(tabs)/notifications" as any)}
              style={({ pressed }) => [
                styles.notificationButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={COLORS.textStrong}
              />
              {unreadNotifications > 0 && (
                <View style={styles.notificationDot} />
              )}
            </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        // Android: the menu starts UNDER the system status bar
        statusBarTranslucent={false}
        onRequestClose={() => closeDrawer()}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            pointerEvents="none"
            style={[styles.overlay, { opacity: overlayOpacity }]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => closeDrawer()}
          />

          <Animated.View
            style={[
              styles.drawer,
              isArabic ? styles.drawerRight : styles.drawerLeft,
              {
                width: DRAWER_WIDTH,
                // iPhone: black strip under the notch (below), Android: nothing
                paddingTop: 0,
                paddingBottom: Math.max(insets.bottom, 18),
                transform: [{ translateX: drawerTranslate }],
              },
            ]}
          >
            {Platform.OS === "ios" && insets.top > 0 && (
              <View style={[styles.safeTop, { height: insets.top }]} />
            )}

            {/* FIXED TOP: small logo + close */}
            <View style={[styles.drawerTop, isArabic && styles.rowReverse]}>
              <View style={[styles.brand, isArabic && styles.brandRtl]}>
                <Image
                  source={require("../assets/images/maison-chat-logo.png")}
                  style={styles.drawerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.drawerTagline}>FRESH FOOD. HAPPY PETS.</Text>
              </View>
              <Pressable
                onPress={() => closeDrawer()}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={26} color={COLORS.textStrong} />
              </Pressable>
            </View>

            {/* ONLY THE MENU SCROLLS */}
            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {menuSections.map(section => (
                <View key={section.key} style={styles.menuSection}>
                  <Text style={[styles.sectionLabel, isArabic && styles.textRtl, isArabic && { letterSpacing: 0 }]}>
                    {isArabic ? section.titleAr : section.titleEn}
                  </Text>
                  <View style={styles.menuBlock}>
                    {section.items.map(renderDrawerItem)}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footerDivider} />

            <Pressable
              onPress={() => navigate("/(tabs)/settings")}
              style={({ pressed }) => [
                styles.profileFooter,
                isArabic && styles.rowReverse,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>

              <View style={styles.profileText}>
                <Text
                  numberOfLines={1}
                  style={[styles.profileName, isArabic && styles.textRtl]}
                >
                  {fullName}
                </Text>
                <Text style={[styles.profileRole, isArabic && styles.textRtl]}>
                  {isArabic ? "عضو Maison" : "Maison member"}
                </Text>
              </View>

              <Ionicons
                name={isArabic ? "arrow-back" : "arrow-forward"}
                size={18}
                color="#77736D"
              />
            </Pressable>

            {signedIn && (
            <Pressable
              onPress={confirmLogout}
              disabled={loggingOut || deleting}
              style={({ pressed }) => [
                styles.logoutButton,
                isArabic && styles.rowReverse,
                pressed && styles.pressed,
              ]}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color={COLORS.coral} />
              ) : (
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={COLORS.coral}
                />
              )}
              <Text style={[styles.logoutText, isArabic && styles.textRtl]}>
                {isArabic ? "تسجيل الخروج" : "Log Out"}
              </Text>
            </Pressable>
            )}

            {/* Delete my account (small link at the very bottom) */}
            {signedIn && (
              <Pressable
                onPress={confirmDeleteAccount}
                disabled={deleting || loggingOut}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.deleteButton,
                  isArabic && styles.rowReverse,
                  pressed && styles.pressed,
                ]}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={COLORS.coral} />
                ) : (
                  <Ionicons name="trash-outline" size={14} color={COLORS.coral} />
                )}
                <Text style={[styles.deleteText, isArabic && styles.textRtl]}>
                  {isArabic ? "حذف حسابي" : "Delete my account"}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.header,
  },
  header: {
    height: 70,
    paddingHorizontal: 20,
    backgroundColor: COLORS.header,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  headerLogo: {
    width: 91,
    height: 49,
  },
  headerIconButton: {
    width: 35,
    height: 42,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  languageAction: {
    height: 40,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  languageText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 11,
    lineHeight: 18,
    color: COLORS.textStrong,
    textAlign: "center",
  },
  notificationButton: {
    width: 30,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 7,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.coral,
  },
  pressed: {
    opacity: 0.55,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  modalRoot: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    overflow: "hidden",
    backgroundColor: COLORS.drawer,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 18,
  },
  drawerLeft: {
    left: 0,
  },
  drawerRight: {
    right: 0,
  },
  drawerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brand: {
    alignItems: "flex-start",
  },
  brandRtl: {
    alignItems: "flex-end",
  },
  drawerLogo: {
    width: 104,
    height: 56,
  },
  closeButton: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTagline: {
    marginTop: 2,
    fontFamily: "Cairo_500Medium",
    fontSize: 7,
    letterSpacing: 2,
    color: COLORS.muted,
  },
  sectionLabel: {
    marginBottom: 6,
    marginHorizontal: 14,
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#A39E96",
  },
  menuSection: {
    marginBottom: 14,
  },
  menuBlock: {
    gap: 2,
  },
  drawerItem: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  drawerItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  drawerItemPressed: {
    opacity: 0.65,
  },
  drawerItemText: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  drawerItemTextActive: {
    fontFamily: "Cairo_700Bold",
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
    marginHorizontal: 17,
  },
  safeTop: {
    backgroundColor: "#000000",
    marginHorizontal: -18,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  deleteButton: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 5,
  },
  deleteText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: COLORS.coral,
    textDecorationLine: "underline",
  },
  footerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  profileFooter: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F2E6D8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: "#77736D",
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textStrong,
  },
  profileRole: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
  },
  logoutButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 5,
  },
  logoutText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: COLORS.text,
  },
});