import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppLanguage } from "../context/LanguageContext";
import { clearSession, logoutCustomer, useSession } from "../services/session";
import { deleteMyAccount, fetchAccountSummary, type AccountSummary } from "../services/shopApi";
import { fetchLoyalty, type LoyaltyResponse } from "../services/loyaltyApi";
import { FONTS } from "./purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| SIDE MENU (drawer) - replaces the "Account" tab
|--------------------------------------------------------------------------
|
| Opened with <DrawerMenuButton /> (header). Slides from the left (from the
| right in Arabic).
|  - signed in : name + phone, loyalty points, account pages, support,
|                log out, and at the bottom "Delete my account"
|  - visitor   : sign in + help
|
*/

const COLORS = {
  primary: "#249B97",
  primaryLight: "#E5F3F2",
  coral: "#EB6268",
  text: "#272727",
  muted: "#77736D",
  border: "#E5E0D9",
  background: "#F4F1EC",
  white: "#FFFFFF",
  gold: "#D4A017",
};

type DrawerContextValue = { open: () => void; close: () => void };

const DrawerContext = createContext<DrawerContextValue>({ open: () => undefined, close: () => undefined });

export const useAppDrawer = () => useContext(DrawerContext);

/** Wraps the tabs: gives open() / close() to every screen. */
export function AppDrawerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const value = useMemo<DrawerContextValue>(
    () => ({ open: () => setVisible(true), close: () => setVisible(false) }),
    []
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <AppDrawer visible={visible} onClose={() => setVisible(false)} />
    </DrawerContext.Provider>
  );
}

/** ☰ button of the header. */
export function DrawerMenuButton({ color = COLORS.text, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  const { open } = useAppDrawer();

  return (
    <Pressable onPress={open} hitSlop={12} style={({ pressed }) => [styles.menuButton, style, pressed && { opacity: 0.6 }]}>
      <Ionicons name="menu" size={26} color={color} />
    </Pressable>
  );
}

/*
|--------------------------------------------------------------------------
| THE DRAWER
|--------------------------------------------------------------------------
*/

function AppDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const { signedIn } = useSession();
  const insets = useSafeAreaInsets();

  const width = Math.min(330, Math.round(Dimensions.get("window").width * 0.84));
  const slide = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyResponse | null>(null);
  const [busy, setBusy] = useState<"logout" | "delete" | null>(null);

  // Open / close animation
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(slide, { toValue: 1, duration: 230, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(slide, { toValue: 0, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Data of the customer when the menu opens
  useEffect(() => {
    if (!visible || !signedIn) return;

    fetchAccountSummary(lang).then(setAccount).catch(() => undefined);
    fetchLoyalty(lang).then(setLoyalty).catch(() => undefined);
  }, [visible, signedIn, lang]);

  useEffect(() => {
    if (!signedIn) {
      setAccount(null);
      setLoyalty(null);
    }
  }, [signedIn]);

  const go = useCallback(
    (path: string) => {
      onClose();
      setTimeout(() => router.push(path as any), 120);
    },
    [onClose]
  );

  const t = isArabic
    ? {
        hello: "مرحباً",
        guest: "زائر",
        guestText: "سجّل الدخول لمتابعة حيواناتك واشتراكاتك.",
        signIn: "تسجيل الدخول",
        points: "نقاط الولاء",
        pts: "نقطة",
        account: "حسابي",
        help: "المساعدة",
        myPets: "حيواناتي واشتراكاتي",
        deliveries: "توصيلاتي",
        loyalty: "نقاط الولاء",
        addresses: "العناوين المحفوظة",
        personal: "المعلومات الشخصية",
        support: "الدعم",
        knowledge: "المساعدة وقاعدة المعرفة",
        shop: "المتجر",
        logout: "تسجيل الخروج",
        logoutConfirm: "هل أنت متأكد أنك تريد تسجيل الخروج؟",
        cancel: "إلغاء",
        deleteLink: "حذف حسابي",
        deleteTitle: "حذف الحساب",
        deleteText:
          "سيتم حذف حسابك وبياناتك الشخصية نهائياً وتسجيل خروجك من جميع الأجهزة.\n\n• الباقات غير المدفوعة ستُلغى.\n• التوصيلات المدفوعة مسبقاً ستصلك كما هو مخطط.\n\nلا يمكن التراجع عن هذا الإجراء.",
        continue: "متابعة",
        deleteSure: "تأكيد الحذف النهائي؟",
        deleteSureText: "سيتم حذف حسابك الآن.",
        deleteNow: "حذف الحساب",
        deleted: "تم حذف حسابك. شكراً لثقتك بـ Maison Chat.",
        error: "خطأ",
        version: "إصدار التطبيق",
      }
    : {
        hello: "Hello",
        guest: "Guest",
        guestText: "Sign in to follow your pets and plans.",
        signIn: "Sign in",
        points: "Loyalty points",
        pts: "pts",
        account: "My account",
        help: "Help",
        myPets: "My pets & plans",
        deliveries: "My deliveries",
        loyalty: "Loyalty points",
        addresses: "Saved addresses",
        personal: "Personal information",
        support: "Support",
        knowledge: "Help & knowledge base",
        shop: "Shop",
        logout: "Log out",
        logoutConfirm: "Are you sure you want to log out?",
        cancel: "Cancel",
        deleteLink: "Delete my account",
        deleteTitle: "Delete account",
        deleteText:
          "Your account and personal data will be permanently deleted and you will be signed out on every device.\n\n• Unpaid plans will be cancelled.\n• Deliveries already paid will arrive as planned.\n\nThis cannot be undone.",
        continue: "Continue",
        deleteSure: "Delete permanently?",
        deleteSureText: "Your account will be deleted now.",
        deleteNow: "Delete account",
        deleted: "Your account has been deleted. Thank you for trusting Maison Chat.",
        error: "Error",
        version: "App version",
      };

  /*
  | LOG OUT / DELETE
  */

  const confirmLogout = () =>
    Alert.alert(t.logout, t.logoutConfirm, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.logout,
        style: "destructive",
        onPress: async () => {
          setBusy("logout");
          try {
            await logoutCustomer();
            onClose();
            router.replace("/(tabs)" as any);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  const deleteAccount = async () => {
    setBusy("delete");

    try {
      await deleteMyAccount(lang);
      await clearSession();
      onClose();
      router.replace("/(tabs)" as any);
      setTimeout(() => Alert.alert("", t.deleted), 300);
    } catch (e: any) {
      Alert.alert(t.error, e?.message || "Error");
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () =>
    Alert.alert(t.deleteTitle, t.deleteText, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.continue,
        style: "destructive",
        onPress: () =>
          Alert.alert(t.deleteSure, t.deleteSureText, [
            { text: t.cancel, style: "cancel" },
            { text: t.deleteNow, style: "destructive", onPress: () => void deleteAccount() },
          ]),
      },
    ]);

  if (!mounted) return null;

  /*
  | RENDER
  */

  const firstName = account?.customer.first_name?.trim() || "";
  const lastName = account?.customer.last_name?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const phone = account?.customer.phone?.trim() || "";
  const initial = (firstName || fullName || "M").charAt(0).toUpperCase();
  const supportUnread = Math.max(0, account?.counters?.support_unread ?? 0);
  const addresses = account?.counters?.addresses ?? 0;

  const loyaltyOn = !!loyalty?.program?.enabled;
  const totalPoints = loyalty?.total_points ?? 0;

  const offset = isArabic ? width : -width;
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });
  const rtl = isArabic ? styles.rowRtl : null;
  const dir = isArabic ? styles.textRtl : null;
  const appVersion = Constants.expoConfig?.version || "";

  return (
    // Android: the menu starts UNDER the system status bar (never over it)
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent={false}>
      <Animated.View style={[styles.overlay, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          { width, paddingBottom: Math.max(insets.bottom, 12), transform: [{ translateX }] },
          isArabic ? { right: 0 } : { left: 0 },
        ]}
      >
        {/* iPhone: safe area of the top (notch) in black. Android: nothing, the
            system status bar stays above the menu */}
        {Platform.OS === "ios" && (
          <>
            <View style={[styles.safeTop, { height: insets.top }]} />
            <StatusBar barStyle="light-content" />
          </>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* PROFILE */}
          <View style={[styles.profile, rtl]}>
            <View style={styles.avatar}>
              {signedIn ? <Text style={styles.avatarText}>{initial}</Text> : <Ionicons name="person-outline" size={24} color={COLORS.primary} />}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.hello, dir]}>{t.hello}</Text>
              <Text style={[styles.name, dir]} numberOfLines={1}>
                {signedIn ? fullName || "…" : t.guest}
              </Text>
              {signedIn && !!phone && (
                <Text style={[styles.phone, dir]} numberOfLines={1}>
                  {phone.startsWith("+") ? phone : `+${phone}`}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={COLORS.muted} />
            </Pressable>
          </View>

          {!signedIn ? (
            <View style={styles.guestBox}>
              <Text style={[styles.guestText, dir]}>{t.guestText}</Text>
              <Pressable style={({ pressed }) => [styles.signIn, pressed && { opacity: 0.85 }]} onPress={() => go("/login")}>
                <Text style={styles.signInText}>{t.signIn}</Text>
              </Pressable>
            </View>
          ) : (
            loyaltyOn && (
              <Pressable style={[styles.points, rtl]} onPress={() => go("/(tabs)/loyalty")}>
                <Ionicons name="star" size={20} color={COLORS.gold} />
                <Text style={[styles.pointsLabel, dir]}>{t.points}</Text>
                <Text style={styles.pointsValue}>
                  {totalPoints} {t.pts}
                </Text>
              </Pressable>
            )
          )}

          {/* ACCOUNT */}
          {signedIn && (
            <>
              <Text style={[styles.section, dir]}>{t.account}</Text>
              <Item icon="paw-outline" label={t.myPets} rtl={isArabic} onPress={() => go("/(tabs)/pets")} />
              <Item icon="cube-outline" label={t.deliveries} rtl={isArabic} onPress={() => go("/(tabs)/orders")} />
              {loyaltyOn && <Item icon="star-outline" label={t.loyalty} rtl={isArabic} onPress={() => go("/(tabs)/loyalty")} />}
              <Item icon="location-outline" label={t.addresses} value={addresses ? String(addresses) : undefined} rtl={isArabic} onPress={() => go("/(tabs)/saved-addresses")} />
              <Item icon="person-outline" label={t.personal} rtl={isArabic} onPress={() => go("/(tabs)/personal-information")} />
            </>
          )}

          {/* HELP */}
          <Text style={[styles.section, dir]}>{t.help}</Text>
          {signedIn && <Item icon="headset-outline" label={t.support} badge={supportUnread} rtl={isArabic} onPress={() => go("/(tabs)/support-tickets")} />}
          <Item icon="document-text-outline" label={t.knowledge} rtl={isArabic} onPress={() => go("/(tabs)/help_knowledge-base")} />
          <Item icon="bag-handle-outline" label={t.shop} rtl={isArabic} onPress={() => go("/(tabs)/shop")} />

          {/* LOG OUT */}
          {signedIn && (
            <Pressable style={[styles.logout, rtl]} onPress={confirmLogout} disabled={!!busy}>
              {busy === "logout" ? <ActivityIndicator size="small" color={COLORS.coral} /> : <Ionicons name="exit-outline" size={22} color={COLORS.coral} />}
              <Text style={styles.logoutText}>{t.logout}</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* BOTTOM: delete account + version */}
        <View style={styles.bottom}>
          {signedIn && (
            <Pressable onPress={confirmDelete} disabled={!!busy} hitSlop={8} style={[styles.deleteRow, rtl]}>
              {busy === "delete" ? (
                <ActivityIndicator size="small" color={COLORS.coral} />
              ) : (
                <Ionicons name="trash-outline" size={15} color={COLORS.coral} />
              )}
              <Text style={styles.deleteText}>{t.deleteLink}</Text>
            </Pressable>
          )}
          {!!appVersion && (
            <Text style={styles.version}>
              Maison Chat · {t.version} {appVersion}
            </Text>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

function Item({
  icon,
  label,
  value,
  badge = 0,
  rtl,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value?: string;
  badge?: number;
  rtl: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, rtl && styles.rowRtl, pressed && styles.itemPressed]}>
      <Ionicons name={icon} size={21} color={COLORS.primary} />
      <Text style={[styles.itemLabel, rtl && styles.textRtl]} numberOfLines={1}>
        {label}
      </Text>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
      {!!value && <Text style={styles.itemValue}>{value}</Text>}
      <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={16} color={COLORS.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  menuButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  safeTop: { backgroundColor: "#000000" },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },

  profile: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },
  hello: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  name: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  phone: { fontFamily: FONTS.regular, fontSize: 12.5, color: COLORS.muted },

  guestBox: { padding: 14, borderRadius: 12, backgroundColor: COLORS.white, marginBottom: 6, gap: 10 },
  guestText: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: COLORS.text },
  signIn: { height: 44, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  signInText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },

  points: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8C66A",
    backgroundColor: "#FFF8E5",
    marginBottom: 4,
  },
  pointsLabel: { flex: 1, fontFamily: FONTS.medium, fontSize: 13.5, color: COLORS.text },
  pointsValue: { fontFamily: FONTS.bold, fontSize: 15, color: "#9A6B00" },

  section: { marginTop: 16, marginBottom: 6, fontFamily: FONTS.bold, fontSize: 12, color: COLORS.muted, letterSpacing: 0.3 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  itemPressed: { opacity: 0.75 },
  itemLabel: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  itemValue: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.muted },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.white },

  logout: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 12, marginTop: 14 },
  logoutText: { fontFamily: FONTS.bold, fontSize: 14.5, color: COLORS.coral },

  bottom: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: "center", gap: 6 },
  deleteRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  deleteText: { fontFamily: FONTS.medium, fontSize: 12.5, color: COLORS.coral, textDecorationLine: "underline" },
  version: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
});