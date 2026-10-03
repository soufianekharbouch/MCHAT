import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import * as SecureStore from "expo-secure-store";

import {
  router,
  usePathname,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import {
  detachCustomerFromDevice,
} from "../services/pushNotifications";

import {
  getUnreadNotificationCount,
} from "../services/notificationApi";

import {
  useAppLanguage,
} from "../context/LanguageContext";

const COLORS = {
  background: "#F7F5F1",
  drawer: "#FFFEFA",
  primary: "#2E7464",
  primaryLight: "#E3F1EB",
  text: "#55534F",
  textStrong: "#292825",
  muted: "#89857E",
  border: "#E8E3DC",
  white: "#FFFFFF",
  coral: "#D96767",
  overlay: "rgba(45, 49, 45, 0.53)",
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.80, 300);

type DrawerRoute = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelEn: string;
  labelAr: string;
  route?: string;
  badge?: number;
};

export default function MchatHeader() {
  const { isArabic, setLanguage } = useAppLanguage();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

  useEffect(() => {
    loadUnreadNotifications();
  }, [loadUnreadNotifications, pathname]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadUnreadNotifications();
      }
    });

    return () => subscription.remove();
  }, [loadUnreadNotifications]);

  useEffect(() => {
    if (!drawerVisible) {
      drawerTranslate.setValue(
        isArabic ? DRAWER_WIDTH : -DRAWER_WIDTH
      );
    }
  }, [isArabic, drawerTranslate, drawerVisible]);

  const openDrawer = () => {
    drawerTranslate.setValue(
      isArabic ? DRAWER_WIDTH : -DRAWER_WIDTH
    );
    overlayOpacity.setValue(0);
    setDrawerVisible(true);

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
          await fetch(
            "https://animal-care2.kharbouch-soufiane.com/api/mobile/logout",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                access_token: token,
              }),
            }
          );
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
      isArabic ? "تسجيل الخروج" : "Sign out",
      isArabic
        ? "هل أنت متأكد أنك تريد تسجيل الخروج؟"
        : "Are you sure you want to sign out?",
      [
        {
          text: isArabic ? "إلغاء" : "Cancel",
          style: "cancel",
        },
        {
          text: isArabic ? "تسجيل الخروج" : "Sign out",
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
      labelEn: "My pets",
      labelAr: "حيواناتي",
      route: "/(tabs)/pets",
    },
    {
      key: "deliveries",
      icon: "car-outline",
      labelEn: "Deliveries",
      labelAr: "التوصيلات",
      route: "/(tabs)/orders",
      badge: 2,
    },
    {
      key: "transition",
      icon: "book-outline",
      labelEn: "Transition guide",
      labelAr: "دليل الانتقال",
    },
  ];

  const secondaryItems: DrawerRoute[] = [
    {
      key: "help",
      icon: "chatbubble-outline",
      labelEn: "Help & support",
      labelAr: "المساعدة والدعم",
    },
    {
      key: "account",
      icon: "person-outline",
      labelEn: "My account",
      labelAr: "حسابي",
      route: "/(tabs)/settings",
    },
  ];

  const isItemActive = (item: DrawerRoute) => {
    if (item.key === "home") {
      return pathname === "/" || pathname === "/(tabs)" || pathname === "/index";
    }

    if (item.key === "pets") return pathname.includes("pets");
    if (item.key === "deliveries") return pathname.includes("orders");
    if (item.key === "account") return pathname.includes("settings");

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
          size={23}
          color={active ? COLORS.primary : "#67645F"}
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

        {!!item.badge && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>
              {item.badge}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <>
      <SafeAreaView
        edges={["top"]}
        style={styles.safeArea}
      >
        <View
          style={[
            styles.header,
            isArabic && styles.rowReverse,
          ]}
        >
          <View
            style={[
              styles.headerLeft,
              isArabic && styles.rowReverse,
            ]}
          >
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

          <View
            style={[
              styles.headerActions,
              isArabic && styles.rowReverse,
            ]}
          >
            <Pressable
              hitSlop={8}
              style={({ pressed }) => [
                styles.smallAction,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="download-outline"
                size={20}
                color={COLORS.textStrong}
              />
            </Pressable>

            <Pressable
              hitSlop={8}
              onPress={() => setLanguage(isArabic ? "en" : "ar")}
              style={({ pressed }) => [
                styles.languageAction,
                isArabic && styles.rowReverse,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="globe-outline"
                size={19}
                color={COLORS.textStrong}
              />
              <Text style={styles.languageText}>
                {isArabic ? "EN" : "العربية"}
              </Text>
            </Pressable>

            <Pressable
              hitSlop={8}
              onPress={() => router.push("/notifications")}
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
            style={[
              styles.overlay,
              { opacity: overlayOpacity },
            ]}
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
                paddingTop: Math.max(insets.top, 14),
                paddingBottom: Math.max(insets.bottom, 14),
                transform: [
                  {
                    translateX: drawerTranslate,
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.drawerTop,
                isArabic && styles.rowReverse,
              ]}
            >
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
                <Ionicons
                  name="close"
                  size={28}
                  color={COLORS.textStrong}
                />
              </Pressable>
            </View>

            <Text
              style={[
                styles.drawerTagline,
                isArabic && styles.textRtl,
              ]}
            >
              FRESH FOOD. HAPPY CATS.
            </Text>

            <Text
              style={[
                styles.sectionLabel,
                isArabic && styles.textRtl,
              ]}
            >
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

            <View style={styles.loveBlock}>
              <Ionicons
                name="heart-outline"
                size={30}
                color="#8EB9AC"
              />

              <Text style={styles.loveText}>
                A little French savoir-faire.
              </Text>

              <Text style={styles.loveText}>
                A lot of feline love.
              </Text>

              <Text style={styles.loveSignature}>
                FAIT AVEC AMOUR ♡
              </Text>
            </View>

            <View style={styles.divider} />

            <Pressable
              onPress={confirmLogout}
              disabled={loggingOut}
              style={({ pressed }) => [
                styles.profileFooter,
                isArabic && styles.rowReverse,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.avatar}>
                {loggingOut ? (
                  <ActivityIndicator
                    size="small"
                    color="#9C744B"
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    S
                  </Text>
                )}
              </View>

              <View style={styles.profileText}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.profileName,
                    isArabic && styles.textRtl,
                  ]}
                >
                  Sarah & the little ones
                </Text>

                <Text
                  style={[
                    styles.profileRole,
                    isArabic && styles.textRtl,
                  ]}
                >
                  {isArabic ? "عضو Maison" : "Maison member"}
                </Text>
              </View>

              <Ionicons
                name="chevron-down"
                size={18}
                color={COLORS.textStrong}
              />
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.drawer,
  },

  header: {
    height: 70,
    paddingHorizontal: 20,
    backgroundColor: COLORS.drawer,
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
    gap: 8,
  },

  smallAction: {
    width: 28,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  languageAction: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  languageText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 10,
    color: COLORS.textStrong,
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
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {
      width: 4,
      height: 0,
    },
    elevation: 18,
  },

  drawerLeft: {
    left: 0,
  },

  drawerRight: {
    right: 0,
  },

  drawerTop: {
    minHeight: 91,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  drawerLogo: {
    width: 143,
    height: 84,
    marginLeft: 6,
  },

  closeButton: {
    width: 36,
    height: 44,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  drawerTagline: {
    marginTop: -5,
    marginLeft: 12,
    fontFamily: "Cairo_500Medium",
    fontSize: 7,
    letterSpacing: 2.1,
    color: COLORS.muted,
  },

  sectionLabel: {
    marginTop: 28,
    marginBottom: 12,
    marginHorizontal: 12,
    fontFamily: "Cairo_500Medium",
    fontSize: 9,
    letterSpacing: 2,
    color: "#9A958E",
  },

  menuBlock: {
    gap: 2,
  },

  drawerItem: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
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
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
  },

  drawerItemTextActive: {
    fontFamily: "Cairo_700Bold",
    color: COLORS.primary,
  },

  menuBadge: {
    minWidth: 21,
    height: 21,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: "#D9E9E4",
    alignItems: "center",
    justifyContent: "center",
  },

  menuBadgeText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 10,
    color: COLORS.primary,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  drawerSpacer: {
    flex: 1,
    minHeight: 20,
  },

  loveBlock: {
    alignItems: "center",
    paddingVertical: 8,
  },

  loveText: {
    marginTop: 5,
    fontFamily: "Cairo_400Regular",
    fontSize: 10.5,
    color: "#6F6B65",
    textAlign: "center",
  },

  loveSignature: {
    marginTop: 14,
    fontFamily: "Cairo_500Medium",
    fontSize: 7,
    letterSpacing: 2,
    color: "#A78F7B",
  },

  profileFooter: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2E6D8",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#9C744B",
  },

  profileText: {
    flex: 1,
  },

  profileName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textStrong,
  },

  profileRole: {
    fontFamily: "Cairo_400Regular",
    fontSize: 9.5,
    lineHeight: 15,
    color: COLORS.muted,
  },
});
