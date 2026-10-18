import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { FONTS, PCOLORS } from "../purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| GUEST GATE
|--------------------------------------------------------------------------
|
| Shown instead of a private screen (Home, My Pets, Account...)
| when nobody is signed in.
|
|   const { isGuest } = useCustomerData();
|   if (isGuest) return <GuestGate redirect="/(tabs)/pets" />;
|
*/

export default function GuestGate({ redirect }: { redirect?: string }) {
  const { isArabic } = useAppLanguage();
  const textDir = isArabic ? styles.textRtl : null;

  const t = isArabic
    ? {
        title: "سجّل الدخول للمتابعة",
        text: "برقم هاتفك فقط، نرسل لك رمزاً عبر واتساب. بدون كلمة مرور.",
        signIn: "تسجيل الدخول عبر واتساب",
        signUp: "إنشاء حساب",
        shop: "تصفح الباقات",
      }
    : {
        title: "Sign in to continue",
        text: "Just your phone number, we send you a code on WhatsApp. No password.",
        signIn: "Sign in with WhatsApp",
        signUp: "Create an account",
        shop: "Browse plans",
      };

  const params = redirect ? { redirect } : {};

  return (
    <View style={styles.screen}>
      <View style={styles.iconCircle}>
        <Ionicons name="paw" size={40} color={PCOLORS.primary} />
      </View>

      <Text style={[styles.title, textDir]}>{t.title}</Text>
      <Text style={[styles.text, textDir]}>{t.text}</Text>

      <Pressable
        onPress={() => router.push({ pathname: "/login", params } as any)}
        style={({ pressed }) => [styles.primary, isArabic && styles.rowRtl, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="whatsapp" size={22} color={PCOLORS.white} />
        <Text style={styles.primaryText}>{t.signIn}</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push({ pathname: "/register", params } as any)}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t.signUp}</Text>
      </Pressable>

      <Pressable onPress={() => router.navigate("/(tabs)" as any)} hitSlop={8} style={styles.link}>
        <Text style={styles.linkText}>{t.shop}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PCOLORS.background, alignItems: "center", justifyContent: "center", padding: 28 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { writingDirection: "rtl" },
  pressed: { opacity: 0.88 },

  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: PCOLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: { fontFamily: FONTS.extraBold, fontSize: 22, color: PCOLORS.text, textAlign: "center" },
  text: { marginTop: 6, marginBottom: 24, fontFamily: FONTS.regular, fontSize: 14, lineHeight: 23, color: PCOLORS.muted, textAlign: "center" },

  primary: {
    alignSelf: "stretch",
    height: 56,
    borderRadius: 10,
    backgroundColor: PCOLORS.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryText: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.white },
  secondary: {
    alignSelf: "stretch",
    height: 52,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PCOLORS.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  link: { marginTop: 18 },
  linkText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.primary },
});