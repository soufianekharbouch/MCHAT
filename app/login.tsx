import React, { useState } from "react";

import * as SecureStore from "expo-secure-store";

import { router } from "expo-router";

import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/cairo";

import en from "../translations/en";
import ar from "../translations/ar";

import { associateDeviceWithCustomer } from "../services/pushNotifications";

type Language = "en" | "ar";

export default function LoginScreen() {
  const [language, setLanguage] = useState<Language>("ar");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const isArabic = language === "ar";

  const t = isArabic ? ar : en;

  /*
  |--------------------------------------------------------------------------
  | Login
  |--------------------------------------------------------------------------
  */

  const handleLogin = async () => {
    setError("");

    /*
     * Phone validation
     */

    if (!phone.trim()) {
      setError(
        isArabic ? "يرجى إدخال رقم الهاتف" : "Please enter your phone number.",
      );

      return;
    }

    /*
     * Password validation
     */

    if (!password) {
      setError(
        isArabic ? "يرجى إدخال كلمة المرور" : "Please enter your password.",
      );

      return;
    }

    try {
      setLoading(true);

      /*
       * Login request
       */

      const response = await fetch(
        "https://animal-care2.kharbouch-soufiane.com/api/mobile/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Accept: "application/json",
          },

          body: JSON.stringify({
            phone: phone.trim(),

            password,

            locale: language,
          }),
        },
      );

      let data;

      try {
        data = await response.json();
      } catch {
        setError(
          isArabic
            ? "استجابة غير صالحة من الخادم"
            : "Invalid response from server.",
        );

        return;
      }

      /*
       * Login failed
       */

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            (isArabic ? "تعذر تسجيل الدخول" : "Unable to sign in."),
        );

        return;
      }

      /*
       * Make sure an access token
       * has actually been returned.
       */

      if (!data.access_token) {
        setError(
          isArabic
            ? "لم يتم استلام رمز الدخول"
            : "Access token was not returned.",
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Save access token
      |--------------------------------------------------------------------------
      */

      await SecureStore.setItemAsync("access_token", data.access_token);

      /*
      |--------------------------------------------------------------------------
      | Save expiration date
      |--------------------------------------------------------------------------
      */

      if (data.expires_at) {
        await SecureStore.setItemAsync(
          "access_token_expires_at",
          data.expires_at,
        );
      } else {
        /*
         * Remove an old expiration date
         * if backend doesn't return one.
         */

        await SecureStore.deleteItemAsync("access_token_expires_at");
      }

      /*
      |--------------------------------------------------------------------------
      | Save selected language
      |--------------------------------------------------------------------------
      */

      await SecureStore.setItemAsync("locale", language);

      /*
      |--------------------------------------------------------------------------
      | INITIAL PASSWORD STATUS
      |--------------------------------------------------------------------------
      |
      | Backend must return:
      |
      | must_change_password: true
      |
      | while password_changed_at is NULL.
      |
      */

      const mustChangePassword =
        data.must_change_password === true;


      await SecureStore.setItemAsync(
        "must_change_password",
        mustChangePassword
          ? "1"
          : "0"
      );

      /*
      |--------------------------------------------------------------------------
      | Associate device with customer
      |--------------------------------------------------------------------------
      |
      | The device may already have been registered anonymously
      | from app/_layout.tsx.
      |
      | Now that access_token exists, registerDevice() can tell
      | Laravel which customer owns this device.
      |
      | Push registration must NEVER prevent login.
      |
      */

      try {
        const deviceResult = await associateDeviceWithCustomer();

        if (!deviceResult.success) {
          console.warn("Device could not be associated with customer.");
        }
      } catch (deviceError) {
        console.error("Device association error:", deviceError);
      }

      /*
      |--------------------------------------------------------------------------
      | Go to application
      |--------------------------------------------------------------------------
      */

      if (mustChangePassword) {

        router.replace(
          "/change-password"
        );

      } else {

        router.replace(
          "/(tabs)"
        );
      }
    } catch (exception) {
      console.error("Login error:", exception);

      setError(
        isArabic
          ? "حدث خطأ في الاتصال بالخادم. حاول مرة أخرى."
          : "Unable to connect to the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.page}>
          {/* =====================================================
              MAIN CONTENT
          ====================================================== */}

          <View style={styles.content}>
            {/* =========================
                LOGO
            ========================== */}

            <Image
              source={require("../assets/images/maison-chat-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* =========================
                TITLE
            ========================== */}

            <Text
              style={[
                styles.title,
                isArabic ? styles.textArabic : styles.textEnglish,
              ]}
            >
              {t.login.welcome}
            </Text>

            {/* =========================
                SUBTITLE
            ========================== */}

            <Text
              style={[
                styles.subtitle,
                isArabic ? styles.textArabic : styles.textEnglish,
              ]}
            >
              {t.login.subtitle}
            </Text>

            {/* =========================
                LOGIN CARD
            ========================== */}

            <View style={styles.loginCard}>
              {/* LOGIN ERROR */}

              {error !== "" && (
                <View style={styles.errorBox}>
                  <Text
                    style={[
                      styles.errorText,
                      isArabic ? styles.textArabic : styles.textEnglish,
                    ]}
                  >
                    {error}
                  </Text>
                </View>
              )}

              {/* PHONE */}

              <View style={styles.field}>
                <Text style={[styles.label, isArabic && styles.textArabic]}>
                  {t.login.phone}
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    isArabic ? styles.inputArabic : styles.inputEnglish,
                  ]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t.login.phonePlaceholder}
                  placeholderTextColor="#A19D96"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  textContentType="telephoneNumber"
                />
              </View>

              {/* PASSWORD */}

              <View style={styles.field}>
                <Text style={[styles.label, isArabic && styles.textArabic]}>
                  {t.login.password}
                </Text>

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.passwordInput,
                      isArabic ? styles.inputArabic : styles.inputEnglish,
                    ]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t.login.passwordPlaceholder}
                    placeholderTextColor="#A19D96"
                    secureTextEntry={!showPassword}
                  />

                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeText}>
                      {showPassword ? "◉" : "○"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* FORGOT PASSWORD */}

              <Pressable
                style={[
                  styles.forgotContainer,
                  isArabic ? styles.alignStart : styles.alignEnd,
                ]}
              >
                <Text style={styles.forgotPassword}>
                  {t.login.forgotPassword}
                </Text>
              </Pressable>

              {/* LOGIN BUTTON */}

              <Pressable
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && !loading && styles.loginButtonPressed,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading
                    ? isArabic
                      ? "جاري تسجيل الدخول..."
                      : "Signing in..."
                    : t.login.signIn}
                </Text>
              </Pressable>
            </View>

            {/* =========================
                FOOTER
            ========================== */}

            <View style={[styles.footer, isArabic && styles.footerArabic]}>
              <Text style={styles.footerText}>{t.login.noAccount}</Text>

              <Pressable>
                <Text style={styles.contactText}>{t.login.contactUs}</Text>
              </Pressable>
            </View>
          </View>

          {/* =====================================================
              LANGUAGE SWITCHER - BOTTOM
          ====================================================== */}

          <View style={styles.languageSwitcher}>
            <Pressable
              style={[
                styles.languageOption,
                language === "ar" && styles.languageOptionActive,
              ]}
              onPress={() => setLanguage("ar")}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === "ar" && styles.languageOptionTextActive,
                ]}
              >
                عربي
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.languageOption,
                language === "en" && styles.languageOptionActive,
              ]}
              onPress={() => setLanguage("en")}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === "en" && styles.languageOptionTextActive,
                ]}
              >
                EN
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/

const COLORS = {
  background: "#F7F4EF",

  primary: "#249B97",

  primaryDark: "#168783",

  coral: "#EB6268",

  text: "#272727",

  muted: "#77736D",

  white: "#FFFFFF",

  border: "#E5E0D9",
};

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,

    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  page: {
    flex: 1,

    backgroundColor: COLORS.background,

    paddingHorizontal: 22,

    /*
     * Keep the main content vertically centered.
     * Extra bottom space is reserved for language switcher.
     */

    justifyContent: "center",

    paddingBottom: 70,

    position: "relative",
  },

  /*
  |--------------------------------------------------------------------------
  | MAIN CONTENT
  |--------------------------------------------------------------------------
  */

  content: {
    width: "100%",

    alignItems: "center",

    alignSelf: "center",

    maxWidth: 430,

    /*
     * Move login content slightly upward.
     */

    transform: [{ translateY: -25 }],
  },

  /*
  |--------------------------------------------------------------------------
  | LANGUAGE SWITCHER
  |--------------------------------------------------------------------------
  */

  languageSwitcher: {
    /*
     * Language selector stays at the bottom
     * independently from the login content.
     */

    position: "absolute",

    bottom: 15,

    alignSelf: "center",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: COLORS.white,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 30,

    padding: 4,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 2,
    },

    shadowOpacity: 0.04,

    shadowRadius: 5,

    elevation: 1,
  },

  languageOption: {
    minWidth: 58,

    height: 36,

    paddingHorizontal: 14,

    borderRadius: 22,

    alignItems: "center",

    justifyContent: "center",
  },

  languageOptionActive: {
    backgroundColor: COLORS.primary,
  },

  languageOptionText: {
    fontFamily: "Cairo_600SemiBold",

    fontSize: 13,

    color: COLORS.muted,
  },

  languageOptionTextActive: {
    color: COLORS.white,
  },

  /*
  |--------------------------------------------------------------------------
  | LOGO
  |--------------------------------------------------------------------------
  */

  logo: {
    width: 160,

    height: 90,

    marginBottom: 12,
  },

  /*
  |--------------------------------------------------------------------------
  | TITLE
  |--------------------------------------------------------------------------
  */

  title: {
    width: "100%",

    color: COLORS.text,

    fontFamily: "Cairo_800ExtraBold",

    fontSize: 30,

    lineHeight: 44,

    textAlign: "center",

    marginBottom: 3,
  },

  subtitle: {
    width: "100%",

    color: COLORS.muted,

    fontFamily: "Cairo_400Regular",

    fontSize: 14,

    lineHeight: 25,

    textAlign: "center",

    marginBottom: 19,

    paddingHorizontal: 15,
  },

  textArabic: {
    textAlign: "right",

    writingDirection: "rtl",
  },

  textEnglish: {
    textAlign: "left",

    writingDirection: "ltr",
  },

  /*
  |--------------------------------------------------------------------------
  | LOGIN CARD
  |--------------------------------------------------------------------------
  */

  loginCard: {
    width: "100%",

    backgroundColor: COLORS.white,

    paddingHorizontal: 20,

    paddingVertical: 22,

    borderRadius: 22,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 5,
    },

    shadowOpacity: 0.08,

    shadowRadius: 12,

    elevation: 4,
  },

  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  errorBox: {
    width: "100%",

    backgroundColor: "#FFF0F0",

    borderRadius: 12,

    paddingHorizontal: 14,

    paddingVertical: 11,

    marginBottom: 15,

    borderWidth: 1,

    borderColor: "#FFD8D8",
  },

  errorText: {
    fontFamily: "Cairo_500Medium",

    color: "#C0392B",

    fontSize: 13,

    lineHeight: 22,
  },

  /*
  |--------------------------------------------------------------------------
  | FIELDS
  |--------------------------------------------------------------------------
  */

  field: {
    marginBottom: 15,
  },

  label: {
    fontFamily: "Cairo_600SemiBold",

    fontSize: 14,

    lineHeight: 23,

    color: COLORS.text,

    marginBottom: 6,
  },

  input: {
    height: 54,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 14,

    backgroundColor: "#FCFBF9",

    paddingHorizontal: 16,

    fontFamily: "Cairo_400Regular",

    fontSize: 14,

    color: COLORS.text,
  },

  inputArabic: {
    textAlign: "right",

    writingDirection: "rtl",
  },

  inputEnglish: {
    textAlign: "left",

    writingDirection: "ltr",
  },

  /*
  |--------------------------------------------------------------------------
  | PASSWORD
  |--------------------------------------------------------------------------
  */

  passwordContainer: {
    height: 54,

    flexDirection: "row",

    alignItems: "center",

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 14,

    backgroundColor: "#FCFBF9",

    overflow: "hidden",
  },

  passwordInput: {
    flex: 1,

    height: "100%",

    paddingHorizontal: 16,

    fontFamily: "Cairo_400Regular",

    fontSize: 14,

    color: COLORS.text,
  },

  eyeButton: {
    height: "100%",

    width: 50,

    alignItems: "center",

    justifyContent: "center",
  },

  eyeText: {
    fontSize: 21,

    color: COLORS.muted,
  },

  /*
  |--------------------------------------------------------------------------
  | FORGOT PASSWORD
  |--------------------------------------------------------------------------
  */

  forgotContainer: {
    marginTop: -2,

    marginBottom: 18,
  },

  alignStart: {
    alignItems: "flex-start",
  },

  alignEnd: {
    alignItems: "flex-end",
  },

  forgotPassword: {
    fontFamily: "Cairo_600SemiBold",

    fontSize: 13,

    color: COLORS.primary,
  },

  /*
  |--------------------------------------------------------------------------
  | LOGIN BUTTON
  |--------------------------------------------------------------------------
  */

  loginButton: {
    height: 54,

    borderRadius: 14,

    backgroundColor: COLORS.coral,

    alignItems: "center",

    justifyContent: "center",
  },

  loginButtonPressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    fontFamily: "Cairo_700Bold",

    color: COLORS.white,

    fontSize: 16,
  },

  /*
  |--------------------------------------------------------------------------
  | FOOTER
  |--------------------------------------------------------------------------
  */

  footer: {
    marginTop: 18,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    flexWrap: "wrap",
  },

  footerArabic: {
    flexDirection: "row-reverse",
  },

  footerText: {
    fontFamily: "Cairo_400Regular",

    color: COLORS.muted,

    fontSize: 13,
  },

  contactText: {
    fontFamily: "Cairo_700Bold",

    color: COLORS.primary,

    fontSize: 13,
  },
});