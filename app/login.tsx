import React, { useState } from "react";

import * as SecureStore from "expo-secure-store";

import { router } from "expo-router";

import * as Application from "expo-application";

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
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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

import { useAppLanguage } from "../context/LanguageContext";
import { associateDeviceWithCustomer } from "../services/pushNotifications";

export default function LoginScreen() {
  const {
    language,
    setLanguage,
  } = useAppLanguage();

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

  const appVersion =
    Application.nativeApplicationVersion
      || "1.0.0";

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
        isArabic
          ? "يرجى إدخال رقم الهاتف"
          : "Please enter your phone number.",
      );

      return;
    }

    /*
     * Password validation
     */

    if (!password) {
      setError(
        isArabic
          ? "يرجى إدخال كلمة المرور"
          : "Please enter your password.",
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
            (isArabic
              ? "تعذر تسجيل الدخول"
              : "Unable to sign in."),
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

      await SecureStore.setItemAsync(
        "access_token",
        data.access_token,
      );

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

        await SecureStore.deleteItemAsync(
          "access_token_expires_at",
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Save selected language
      |--------------------------------------------------------------------------
      */

      await SecureStore.setItemAsync(
        "locale",
        language,
      );

      /*
      |--------------------------------------------------------------------------
      | SYNCHRONIZE LANGUAGE WITH CUSTOMER SETTINGS
      |--------------------------------------------------------------------------
      */

      try {
        const languageResponse = await fetch(
          "https://animal-care2.kharbouch-soufiane.com/api/mobile/settings/language",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${data.access_token}`,
            },

            body: JSON.stringify({
              language,
              access_token: data.access_token,
            }),
          },
        );

        if (!languageResponse.ok) {
          console.warn(
            "Customer language could not be synchronized with server settings.",
          );
        }
      } catch (languageError) {
        console.error(
          "Customer language synchronization error:",
          languageError,
        );
      }

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
          : "0",
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
        const deviceResult =
          await associateDeviceWithCustomer();

        if (!deviceResult.success) {
          console.warn(
            "Device could not be associated with customer.",
          );
        }
      } catch (deviceError) {
        console.error(
          "Device association error:",
          deviceError,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Go to application
      |--------------------------------------------------------------------------
      */

      if (mustChangePassword) {
        router.replace(
          "/change-password",
        );
      } else {
        router.replace(
          "/(tabs)",
        );
      }
    } catch (exception) {
      console.error(
        "Login error:",
        exception,
      );

      setError(
        isArabic
          ? "حدث خطأ في الاتصال بالخادم. حاول مرة أخرى."
          : "Unable to connect to the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const screenText = {
    signIn: isArabic
      ? "تسجيل الدخول"
      : "Sign In",

    subtitle: isArabic
      ? "تغذية طازجة ومخصصة تصل مباشرة إلى وعاء قطتك."
      : "Tailored fresh culinary nutrition delivered to your cat’s bowl.",

    phoneLabel: isArabic
      ? "رقم الهاتف المحمول"
      : "Mobile Phone Number",

    phonePlaceholder:
      "+965 50 123 4567",

    passwordLabel: isArabic
      ? "كلمة المرور"
      : "Password",

    forgotPassword: isArabic
      ? "نسيت كلمة المرور؟"
      : "Forgot Password?",

    signingIn: isArabic
      ? "جاري تسجيل الدخول..."
      : "Signing in...",

    notice: isArabic
      ? "التسجيل الذاتي قيد انتظار الموافقة النهائية. إنشاء الحسابات يتم حالياً يدوياً عند إتمام الطلب الأولي على Shopify."
      : "Self-service registration is pending final business approval. Account creation is currently managed upon initial Shopify checkout.",

    languageButton: isArabic
      ? "EN"
      : "العربية",
  };

  const handleForgotPassword = () => {
    // OTP Forgot Password screen will be connected later.
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.page}>
          <Pressable
            style={styles.languageButton}
            onPress={() =>
              setLanguage(
                isArabic
                  ? "en"
                  : "ar",
              )
            }
          >
            <Text style={styles.languageButtonText}>
              {screenText.languageButton}
            </Text>
          </Pressable>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Image
                source={require("../assets/images/maison-chat-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />

              <View style={styles.intro}>
                <Text
                  style={[
                    styles.title,
                    isArabic
                      ? styles.textArabic
                      : styles.textEnglish,
                  ]}
                >
                  {screenText.signIn}
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    isArabic
                      ? styles.textArabic
                      : styles.textEnglish,
                  ]}
                >
                  {screenText.subtitle}
                </Text>
              </View>

              {error !== "" && (
                <View style={styles.errorBox}>
                  <Text
                    style={[
                      styles.errorText,
                      isArabic
                        ? styles.textArabic
                        : styles.textEnglish,
                    ]}
                  >
                    {error}
                  </Text>
                </View>
              )}

              <View style={styles.field}>
                <Text
                  style={[
                    styles.label,
                    isArabic
                      ? styles.textArabic
                      : styles.textEnglish,
                  ]}
                >
                  {screenText.phoneLabel}
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    isArabic &&
                      styles.inputContainerArabic,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={21}
                    color={COLORS.icon}
                  />

                  <TextInput
                    style={[
                      styles.input,
                      isArabic
                        ? styles.inputArabic
                        : styles.inputEnglish,
                    ]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={
                      screenText.phonePlaceholder
                    }
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    textContentType="telephoneNumber"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <View
                  style={[
                    styles.passwordLabelRow,
                    isArabic &&
                      styles.passwordLabelRowArabic,
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      styles.passwordLabel,
                      isArabic
                        ? styles.textArabic
                        : styles.textEnglish,
                    ]}
                  >
                    {screenText.passwordLabel}
                  </Text>

                  <Pressable
                    onPress={handleForgotPassword}
                    hitSlop={8}
                  >
                    <Text
                      style={
                        styles.forgotPassword
                      }
                    >
                      {screenText.forgotPassword}
                    </Text>
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.inputContainer,
                    isArabic &&
                      styles.inputContainerArabic,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={21}
                    color={COLORS.icon}
                  />

                  <TextInput
                    style={[
                      styles.input,
                      isArabic
                        ? styles.inputArabic
                        : styles.inputEnglish,
                    ]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    secureTextEntry={
                      !showPassword
                    }
                    textContentType="password"
                  />

                  <Pressable
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowPassword(
                        !showPassword,
                      )
                    }
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={
                        showPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={21}
                      color={COLORS.icon}
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.loginButton,

                  pressed &&
                    !loading &&
                    styles.loginButtonPressed,

                  loading &&
                    styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text
                  style={
                    styles.loginButtonText
                  }
                >
                  {loading
                    ? screenText.signingIn
                    : screenText.signIn}
                </Text>
              </Pressable>

              <Text
                style={[
                  styles.notice,
                  isArabic &&
                    styles.noticeArabic,
                ]}
              >
                {screenText.notice}
              </Text>

              <Text style={styles.appVersion}>
                v{appVersion}
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const COLORS = {
  background: "#F4F1EC",
  card: "#FFFFFF",
  primary: "#249B97",
  text: "#252525",
  muted: "#716D68",
  white: "#FFFFFF",
  border: "#D9CEC2",
  placeholder: "#77736D",
  icon: "#A9A9A9",
  errorBackground: "#FFF0F0",
  errorBorder: "#FFD8D8",
  errorText: "#C0392B",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  page: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scroll: {
    flex: 1,
  },

  /*
   * IMPORTANT:
   * No flexGrow here.
   *
   * The ScrollView content height will now be based
   * on the actual content.
   */
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 24,
  },

  languageButton: {
    position: "absolute",
    top: 6,
    right: 8,
    zIndex: 20,

    minWidth: 72,
    height: 34,

    paddingHorizontal: 14,

    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    alignItems: "center",
    justifyContent: "center",
  },

  languageButtonText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },

  /*
   * CARD
   *
   * flexGrow: 1 has been REMOVED.
   * height: "auto" has also been REMOVED.
   *
   * React Native automatically calculates the
   * height according to its content.
   */
  card: {
    width: "90%",

    alignSelf: "center",

    marginTop: 60,

    paddingTop: 15,
    paddingHorizontal: 12,
    paddingBottom: 8,

    backgroundColor: COLORS.card,

    borderTopLeftRadius: 30,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,

    borderWidth: 1,
    borderColor: "#E8E1DA",
    borderStyle: "solid",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,

    elevation: 4,
  },

  logo: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 10,
  },

  intro: {
    width: "100%",
    marginBottom: 24,
  },

  title: {
    width: "100%",
    fontFamily: "Cairo_800ExtraBold",
    fontSize: 25,
    lineHeight: 36,
    color: COLORS.text,
    marginBottom: 3,
  },

  subtitle: {
    width: "100%",
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.muted,
  },

  textArabic: {
    textAlign: "right",
    writingDirection: "rtl",
  },

  textEnglish: {
    textAlign: "left",
    writingDirection: "ltr",
  },

  errorBox: {
    width: "100%",
    backgroundColor: COLORS.errorBackground,
    borderRadius: 12,

    paddingHorizontal: 14,
    paddingVertical: 10,

    marginBottom: 16,

    borderWidth: 1,
    borderColor: COLORS.errorBorder,
  },

  errorText: {
    fontFamily: "Cairo_500Medium",
    color: COLORS.errorText,
    fontSize: 13,
    lineHeight: 21,
  },

  field: {
    width: "100%",
    marginBottom: 18,
  },

  label: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
  },

  passwordLabel: {
    flexShrink: 1,
  },

  passwordLabelRow: {
    width: "100%",
    minHeight: 25,

    marginBottom: 7,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  passwordLabelRowArabic: {
    flexDirection: "row-reverse",
  },

  forgotPassword: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.primary,
  },

  inputContainer: {
    width: "100%",
    height: 48,

    paddingHorizontal: 14,

    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,

    backgroundColor: COLORS.white,

    flexDirection: "row",
    alignItems: "center",

    gap: 10,
  },

  inputContainerArabic: {
    flexDirection: "row-reverse",
  },

  input: {
    flex: 1,
    height: "100%",

    paddingVertical: 0,

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

  eyeButton: {
    width: 30,
    height: "100%",

    alignItems: "center",
    justifyContent: "center",
  },

  loginButton: {
    width: "100%",
    height: 51,

    marginTop: 12,
    marginBottom: 24,

    borderRadius: 19,

    backgroundColor: COLORS.primary,

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 7,

    elevation: 3,
  },

  loginButtonPressed: {
    opacity: 0.88,

    transform: [
      {
        scale: 0.995,
      },
    ],
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    fontFamily: "Cairo_700Bold",
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 22,
  },

  notice: {
    width: "100%",

    paddingHorizontal: 10,

    fontFamily: "Cairo_400Regular",

    fontSize: 11.5,
    lineHeight: 16,

    color: "#817B75",

    textAlign: "center",
  },

  noticeArabic: {
    writingDirection: "rtl",
  },

  appVersion: {
    marginTop: 10,

    alignSelf: "center",

    fontFamily: "Cairo_500Medium",

    fontSize: 10,

    color: "#AAA39C",

    letterSpacing: 0.3,
  },
});