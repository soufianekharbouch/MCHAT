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
  ActivityIndicator,
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

  // Kept because your existing screen uses the translation files.
  // You can continue using them elsewhere without changing anything.
  const t = isArabic ? ar : en;

  const appVersion =
    Application.nativeApplicationVersion || "1.0.0";


  /*
  |--------------------------------------------------------------------------
  | LOGIN
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
          : "Please enter your phone number."
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
          : "Please enter your password."
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
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        setError(
          isArabic
            ? "استجابة غير صالحة من الخادم"
            : "Invalid response from server."
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
              : "Unable to sign in.")
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
            : "Access token was not returned."
        );

        return;
      }


      /*
      |--------------------------------------------------------------------------
      | SAVE ACCESS TOKEN
      |--------------------------------------------------------------------------
      */

      await SecureStore.setItemAsync(
        "access_token",
        data.access_token
      );


      /*
      |--------------------------------------------------------------------------
      | SAVE EXPIRATION DATE
      |--------------------------------------------------------------------------
      */

      if (data.expires_at) {
        await SecureStore.setItemAsync(
          "access_token_expires_at",
          data.expires_at
        );
      } else {
        await SecureStore.deleteItemAsync(
          "access_token_expires_at"
        );
      }


      /*
      |--------------------------------------------------------------------------
      | SAVE SELECTED LANGUAGE
      |--------------------------------------------------------------------------
      */

      await SecureStore.setItemAsync(
        "locale",
        language
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
          }
        );

        if (!languageResponse.ok) {
          console.warn(
            "Customer language could not be synchronized with server settings."
          );
        }
      } catch (languageError) {
        console.error(
          "Customer language synchronization error:",
          languageError
        );
      }


      /*
      |--------------------------------------------------------------------------
      | INITIAL PASSWORD STATUS
      |--------------------------------------------------------------------------
      */

      const mustChangePassword =
        data.must_change_password === true;

      await SecureStore.setItemAsync(
        "must_change_password",
        mustChangePassword ? "1" : "0"
      );


      /*
      |--------------------------------------------------------------------------
      | ASSOCIATE DEVICE WITH CUSTOMER
      |--------------------------------------------------------------------------
      */

      try {
        const deviceResult =
          await associateDeviceWithCustomer();

        if (!deviceResult.success) {
          console.warn(
            "Device could not be associated with customer."
          );
        }
      } catch (deviceError) {
        console.error(
          "Device association error:",
          deviceError
        );
      }


      /*
      |--------------------------------------------------------------------------
      | GO TO APPLICATION
      |--------------------------------------------------------------------------
      */

      if (mustChangePassword) {
        router.replace("/change-password");
      } else {
        router.replace("/(tabs)");
      }

    } catch (exception) {
      console.error(
        "Login error:",
        exception
      );

      setError(
        isArabic
          ? "حدث خطأ في الاتصال بالخادم. حاول مرة أخرى."
          : "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | SCREEN TEXT
  |--------------------------------------------------------------------------
  */

  const screenText = {
    signIn: isArabic
      ? "تسجيل الدخول"
      : "Sign In",

    subtitle: isArabic
      ? "تغذية طازجة ومخصصة تصل مباشرة إلى وعاء قطتك."
      : "Tailored fresh culinary nutrition delivered to your pet’s bowl.",

    phoneLabel: isArabic
      ? "رقم الهاتف المحمول"
      : "Mobile Phone Number",

    phonePlaceholder: "+971 50 123 4567",

    passwordLabel: isArabic
      ? "كلمة المرور"
      : "Password",

    forgotPassword: isArabic
      ? "نسيت كلمة المرور؟"
      : "Forgot Password?",

    signingIn: isArabic
      ? "جاري تسجيل الدخول..."
      : "Signing in...",

    noAccount: isArabic
      ? "ليس لديك حساب بعد؟"
      : "Don't have an account yet?",

    signUp: isArabic
      ? "إنشاء حساب"
      : "Sign Up",

    languageButton: isArabic
      ? "EN"
      : "العربية",
  };


  /*
  |--------------------------------------------------------------------------
  | FORGOT PASSWORD
  |--------------------------------------------------------------------------
  */

  const handleForgotPassword = () => {
    // Connect your forgot-password page here later.
    // Example:
    // router.push("/forgot-password");
  };


  /*
  |--------------------------------------------------------------------------
  | SIGN UP
  |--------------------------------------------------------------------------
  */

  const handleSignUp = () => {
    if (loading) {
      return;
    }

    setError("");

    router.push("/register");
  };


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

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

          {/* LANGUAGE */}

          <Pressable
            style={styles.languageButton}
            onPress={() =>
              setLanguage(
                isArabic
                  ? "en"
                  : "ar"
              )
            }
            hitSlop={10}
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

            {/* LOGO */}

            <View style={styles.logoSection}>
              <Image
                source={require("../assets/images/maison-chat-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>


            {/* INTRO */}

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


            {/* ERROR */}

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


            {/* PHONE */}

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


              <View style={styles.inputContainer}>

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
                  autoCapitalize="none"
                  textContentType="telephoneNumber"
                  editable={!loading}
                />

              </View>

            </View>


            {/* PASSWORD */}

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
                    isArabic
                      ? styles.textArabic
                      : styles.textEnglish,
                  ]}
                >
                  {screenText.passwordLabel}
                </Text>


                <Pressable
                  onPress={handleForgotPassword}
                  hitSlop={10}
                >
                  <Text style={styles.forgotPassword}>
                    {screenText.forgotPassword}
                  </Text>
                </Pressable>

              </View>


              <View
                style={[
                  styles.inputContainer,
                  styles.passwordInputContainer,
                ]}
              >

                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
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
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />


                <Pressable
                  style={styles.eyeButton}
                  onPress={() =>
                    setShowPassword(
                      current => !current
                    )
                  }
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={26}
                    color={COLORS.eye}
                  />
                </Pressable>

              </View>

            </View>


            {/* SIGN IN */}

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

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size="small"
                    color={COLORS.white}
                  />

                  <Text style={styles.loginButtonText}>
                    {screenText.signingIn}
                  </Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>
                  {screenText.signIn}
                </Text>
              )}

            </Pressable>


            {/* SIGN UP LINK */}

            <View
              style={[
                styles.signUpRow,
                isArabic &&
                  styles.signUpRowArabic,
              ]}
            >

              <Text style={styles.signUpText}>
                {screenText.noAccount}
              </Text>


              <Pressable
                onPress={handleSignUp}
                disabled={loading}
                hitSlop={10}
              >
                <Text style={styles.signUpLink}>
                  {screenText.signUp}
                </Text>
              </Pressable>

            </View>


            {/* BOTTOM LINE */}

            <View style={styles.bottomDivider} />


            {/* VERSION */}

            <Text style={styles.appVersion}>
              v{appVersion}
            </Text>

          </ScrollView>

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
  background: "#F4F1EC",

  text: "#292929",

  muted: "#85817D",

  white: "#FFFFFF",

  border: "#D8CFC5",

  placeholder: "#55514D",

  eye: "#7A7A78",

  button: "#292929",

  errorBackground: "#FFF0F0",

  errorBorder: "#FFD8D8",

  errorText: "#C0392B",
};


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({

  /*
  |--------------------------------------------------------------------------
  | SCREEN
  |--------------------------------------------------------------------------
  */

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


  scrollContent: {
    flexGrow: 1,

    paddingHorizontal: 28,

    paddingTop: 15,
    paddingBottom: 18,
  },


  /*
  |--------------------------------------------------------------------------
  | LANGUAGE
  |--------------------------------------------------------------------------
  */

  languageButton: {
    position: "absolute",

    top: 7,
    right: 28,

    zIndex: 20,

    paddingHorizontal: 3,
    paddingVertical: 3,
  },


  languageButtonText: {
    fontFamily: "Cairo_500Medium",

    fontSize: 12,

    lineHeight: 19,

    color: COLORS.text,
  },


  /*
  |--------------------------------------------------------------------------
  | LOGO
  |--------------------------------------------------------------------------
  */

  logoSection: {
    width: "100%",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 15,

    marginBottom: 15,
  },


  logo: {
    width: 140,
    height: 100,
  },


  /*
  |--------------------------------------------------------------------------
  | INTRO
  |--------------------------------------------------------------------------
  */

  intro: {
    width: "100%",

    marginBottom: 30,
  },


  title: {
    width: "100%",

    fontFamily: "Cairo_800ExtraBold",

    fontSize: 39,

    lineHeight: 52,

    color: COLORS.text,

    marginBottom: 10,
  },


  subtitle: {
    width: "100%",

    maxWidth: 390,

    fontFamily: "Cairo_400Regular",

    fontSize: 17,

    lineHeight: 29,

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


  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  errorBox: {
    width: "100%",

    backgroundColor: COLORS.errorBackground,

    borderRadius: 10,

    borderWidth: 1,

    borderColor: COLORS.errorBorder,

    paddingHorizontal: 14,

    paddingVertical: 10,

    marginBottom: 20,
  },


  errorText: {
    fontFamily: "Cairo_500Medium",

    color: COLORS.errorText,

    fontSize: 13,

    lineHeight: 21,
  },


  /*
  |--------------------------------------------------------------------------
  | FIELDS
  |--------------------------------------------------------------------------
  */

  field: {
    width: "100%",

    marginBottom: 29,
  },


  label: {
    fontFamily: "Cairo_600SemiBold",

    fontSize: 16,

    lineHeight: 24,

    color: COLORS.text,

    marginBottom: 10,
  },


  inputContainer: {
    width: "100%",

    height: 64,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 8,

    backgroundColor: COLORS.background,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 18,
  },


  input: {
    flex: 1,

    height: "100%",

    paddingVertical: 0,

    fontFamily: "Cairo_400Regular",

    fontSize: 16,

    color: COLORS.text,
  },


  inputEnglish: {
    textAlign: "left",

    writingDirection: "ltr",
  },


  inputArabic: {
    textAlign: "right",

    writingDirection: "rtl",
  },


  /*
  |--------------------------------------------------------------------------
  | PASSWORD
  |--------------------------------------------------------------------------
  */

  passwordLabelRow: {
    width: "100%",

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 10,
  },


  passwordLabelRowArabic: {
    flexDirection: "row-reverse",
  },


  passwordLabelRowText: {
    marginBottom: 0,
  },


  forgotPassword: {
    fontFamily: "Cairo_600SemiBold",

    fontSize: 14,

    lineHeight: 22,

    color: COLORS.text,
  },


  passwordInputContainer: {
    paddingRight: 12,
  },


  passwordInput: {
    paddingRight: 10,
  },


  eyeButton: {
    width: 42,

    height: "100%",

    alignItems: "center",

    justifyContent: "center",
  },


  /*
  |--------------------------------------------------------------------------
  | BUTTON
  |--------------------------------------------------------------------------
  */

  loginButton: {
    width: "100%",

    height: 61,

    borderRadius: 9,

    backgroundColor: COLORS.button,

    alignItems: "center",

    justifyContent: "center",

    marginTop: 1,

    marginBottom: 30,
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

    lineHeight: 23,
  },


  loadingContainer: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 10,
  },


  /*
  |--------------------------------------------------------------------------
  | SIGN UP
  |--------------------------------------------------------------------------
  */

  signUpRow: {
    width: "100%",

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    flexWrap: "wrap",

    gap: 6,

    marginTop: -12,

    marginBottom: 28,
  },


  signUpRowArabic: {
    flexDirection: "row-reverse",
  },


  signUpText: {
    fontFamily: "Cairo_400Regular",

    fontSize: 14,

    lineHeight: 22,

    color: COLORS.muted,
  },


  signUpLink: {
    fontFamily: "Cairo_700Bold",

    fontSize: 14,

    lineHeight: 22,

    color: COLORS.text,

    textDecorationLine: "underline",
  },


  /*
  |--------------------------------------------------------------------------
  | BOTTOM
  |--------------------------------------------------------------------------
  */

  bottomDivider: {
    width: "100%",

    height: 1,

    backgroundColor: COLORS.border,

    marginBottom: 8,
  },


  appVersion: {
    alignSelf: "center",

    fontFamily: "Cairo_400Regular",

    fontSize: 9,

    color: COLORS.muted,

    opacity: 0.45,
  },

});