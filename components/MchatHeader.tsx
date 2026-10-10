import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { detachCustomerFromDevice } from "../services/pushNotifications";
import { getUnreadNotificationCount } from "../services/notificationApi";
import { useAppLanguage } from "../context/LanguageContext";

const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

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
    try {
      const count = await getUnreadNotificationCount();
      setUnreadNotifications(count);
    } catch (error) {
      console.warn("Unread notifications error:", error);
    }
  }, []);

  const loadCustomerProfile = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
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
      key: "transition",
      icon: "book-outline",
      labelEn: "Transition Guide",
      labelAr: "دليل الانتقال",
    },
  ];

  const secondaryItems: DrawerRoute[] = [
    {
      key: "help",
      icon: "chatbubble-outline",
      labelEn: "Help & Support",
      labelAr: "المساعدة والدعم",
    },
    {
      key: "account",
      icon: "person-outline",
      labelEn: "My Account",
      labelAr: "حسابي",
      route: "/(tabs)/settings",
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
    if (item.key === "account") {
      return (
        pathname.includes("settings") ||
        pathname.includes("saved-addresses")
      );
    }
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
          size={24}
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
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        statusBarTranslucent
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
                paddingTop: Math.max(insets.top, 18),
                paddingBottom: Math.max(insets.bottom, 18),
                transform: [{ translateX: drawerTranslate }],
              },
            ]}
          >
            <View style={[styles.drawerTop, isArabic && styles.rowReverse]}>
              <Image
                source={require("../assets/images/maison-chat-logo.png")}
                style={styles.drawerLogo}
                resizeMode="contain"
              />
              <Pressable
                onPress={() => closeDrawer()}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={28} color={COLORS.textStrong} />
              </Pressable>
            </View>

            <Text style={[styles.drawerTagline, isArabic && styles.textRtl]}>
              FRESH FOOD. HAPPY PETS.
            </Text>

            <Text style={[styles.sectionLabel, isArabic && styles.textRtl]}>
              {isArabic ? "منزلك الصغير" : "YOUR LITTLE MAISON"}
            </Text>

            <View style={styles.menuBlock}>
              {mainItems.map(renderDrawerItem)}
            </View>

            <View style={styles.divider} />

            <View style={styles.menuBlock}>
              {secondaryItems.map(renderDrawerItem)}
            </View>

            <View style={styles.drawerSpacer} />

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

            <Pressable
              onPress={confirmLogout}
              disabled={loggingOut}
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
    backgroundColor: COLORS.drawer,
    paddingHorizontal: 26,
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
    minHeight: 105,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  drawerLogo: {
    width: 150,
    height: 92,
    marginLeft: 10,
  },
  closeButton: {
    width: 36,
    height: 44,
    marginTop: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTagline: {
    marginTop: -3,
    marginLeft: 17,
    fontFamily: "Cairo_500Medium",
    fontSize: 7,
    letterSpacing: 2.4,
    color: COLORS.muted,
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 14,
    marginHorizontal: 17,
    fontFamily: "Cairo_500Medium",
    fontSize: 10,
    letterSpacing: 2.1,
    color: "#8F8A83",
  },
  menuBlock: {
    gap: 2,
  },
  drawerItem: {
    minHeight: 58,
    paddingHorizontal: 17,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
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
    fontSize: 16,
    lineHeight: 24,
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
  drawerSpacer: {
    flex: 1,
    minHeight: 20,
  },
  footerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  profileFooter: {
    minHeight: 67,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
