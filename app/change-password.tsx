import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  router,
} from "expo-router";

import * as SecureStore
  from "expo-secure-store";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/cairo";


const API_URL =
  "https://animal-care2.kharbouch-soufiane.com/api/mobile";


type Language =
  "en"
  | "ar";


export default function ChangePasswordScreen() {

  const [
    language,
    setLanguage,
  ] = useState<Language>(
    "ar"
  );

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  const [
    fontsLoaded,
  ] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });


  useEffect(() => {

    SecureStore
      .getItemAsync(
        "locale"
      )
      .then(
        (
          savedLocale
        ) => {

          if (
            savedLocale === "en"
            ||
            savedLocale === "ar"
          ) {

            setLanguage(
              savedLocale
            );
          }
        }
      )
      .catch(
        (
          localeError
        ) => {

          console.warn(
            "Unable to load locale:",
            localeError
          );
        }
      );

  }, []);


  if (!fontsLoaded) {

    return null;
  }


  const isArabic =
    language === "ar";


  const text =
    isArabic
      ? {
          title:
            "أنشئ كلمة المرور الخاصة بك",

          subtitle:
            "لأمان حسابك، يجب تغيير كلمة المرور الأولية قبل متابعة استخدام التطبيق.",

          password:
            "كلمة المرور الجديدة",

          passwordPlaceholder:
            "6 أحرف على الأقل",

          confirmation:
            "تأكيد كلمة المرور",

          confirmationPlaceholder:
            "أعد إدخال كلمة المرور",

          submit:
            "حفظ كلمة المرور",

          saving:
            "جاري الحفظ...",

          minimum:
            "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",

          mismatch:
            "كلمتا المرور غير متطابقتين.",

          session:
            "انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.",

          failed:
            "تعذر تغيير كلمة المرور. حاول مرة أخرى.",

          security:
            "بعد الحفظ، لن تتمكن من استخدام كلمة المرور الأولية مرة أخرى.",
        }
      : {
          title:
            "Create your own password",

          subtitle:
            "For your account security, you must replace the initial password before continuing.",

          password:
            "New password",

          passwordPlaceholder:
            "At least 6 characters",

          confirmation:
            "Confirm password",

          confirmationPlaceholder:
            "Enter the password again",

          submit:
            "Save password",

          saving:
            "Saving...",

          minimum:
            "Password must contain at least 6 characters.",

          mismatch:
            "The passwords do not match.",

          session:
            "Your login session has expired. Please sign in again.",

          failed:
            "Unable to change password. Please try again.",

          security:
            "After saving, the initial password can no longer be used.",
        };


  const handleSubmit =
    async () => {

      setError("");


      if (
        password.length < 6
      ) {

        setError(
          text.minimum
        );

        return;
      }


      if (
        password
        !==
        passwordConfirmation
      ) {

        setError(
          text.mismatch
        );

        return;
      }


      try {

        setLoading(
          true
        );


        const accessToken =
          await SecureStore.getItemAsync(
            "access_token"
          );


        if (!accessToken) {

          setError(
            text.session
          );

          await SecureStore.deleteItemAsync(
            "must_change_password"
          );

          router.replace(
            "/login"
          );

          return;
        }


        const response =
          await fetch(
            `${API_URL}/change-password`,
            {
              method:
                "POST",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  access_token:
                    accessToken,

                  password:
                    password,

                  password_confirmation:
                    passwordConfirmation,
                }),
            }
          );


        let data:
          any = null;


        try {

          data =
            await response.json();

        } catch {

          data =
            null;
        }


        if (
          !response.ok
          ||
          data?.success !== true
        ) {

          setError(
            data?.message
            ||
            text.failed
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | PASSWORD IS NOW PERSONAL
        |--------------------------------------------------------------------------
        */

        await SecureStore.setItemAsync(
          "must_change_password",
          "0"
        );


        router.replace(
          "/(tabs)"
        );


      } catch (
        exception
      ) {

        console.error(
          "Change password error:",
          exception
        );

        setError(
          text.failed
        );

      } finally {

        setLoading(
          false
        );
      }
    };


  return (

    <SafeAreaView
      style={
        styles.safeArea
      }
    >

      <KeyboardAvoidingView
        style={
          styles.keyboardContainer
        }
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >

        <View
          style={
            styles.page
          }
        >

          <View
            style={
              styles.iconWrap
            }
          >

            <Ionicons
              name="lock-closed-outline"
              size={34}
              color={
                COLORS.primary
              }
            />

          </View>


          <Text
            style={[
              styles.title,
              isArabic
                ? styles.textArabic
                : styles.textEnglish,
            ]}
          >

            {text.title}

          </Text>


          <Text
            style={[
              styles.subtitle,
              isArabic
                ? styles.textArabic
                : styles.textEnglish,
            ]}
          >

            {text.subtitle}

          </Text>


          <View
            style={
              styles.card
            }
          >

            {error !== "" && (

              <View
                style={
                  styles.errorBox
                }
              >

                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={
                    COLORS.danger
                  }
                />

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


            <View
              style={
                styles.field
              }
            >

              <Text
                style={[
                  styles.label,
                  isArabic
                    ? styles.textArabic
                    : styles.textEnglish,
                ]}
              >

                {text.password}

              </Text>


              <View
                style={
                  styles.passwordContainer
                }
              >

                <TextInput
                  style={[
                    styles.passwordInput,
                    isArabic
                      ? styles.inputArabic
                      : styles.inputEnglish,
                  ]}
                  value={
                    password
                  }
                  onChangeText={
                    setPassword
                  }
                  placeholder={
                    text.passwordPlaceholder
                  }
                  placeholderTextColor="#A19D96"
                  secureTextEntry={
                    !showPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                />


                <Pressable
                  style={
                    styles.eyeButton
                  }
                  onPress={
                    () =>
                      setShowPassword(
                        !showPassword
                      )
                  }
                >

                  <Ionicons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={21}
                    color={
                      COLORS.muted
                    }
                  />

                </Pressable>

              </View>

            </View>


            <View
              style={
                styles.field
              }
            >

              <Text
                style={[
                  styles.label,
                  isArabic
                    ? styles.textArabic
                    : styles.textEnglish,
                ]}
              >

                {text.confirmation}

              </Text>


              <View
                style={
                  styles.passwordContainer
                }
              >

                <TextInput
                  style={[
                    styles.passwordInput,
                    isArabic
                      ? styles.inputArabic
                      : styles.inputEnglish,
                  ]}
                  value={
                    passwordConfirmation
                  }
                  onChangeText={
                    setPasswordConfirmation
                  }
                  placeholder={
                    text.confirmationPlaceholder
                  }
                  placeholderTextColor="#A19D96"
                  secureTextEntry={
                    !showConfirmation
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                />


                <Pressable
                  style={
                    styles.eyeButton
                  }
                  onPress={
                    () =>
                      setShowConfirmation(
                        !showConfirmation
                      )
                  }
                >

                  <Ionicons
                    name={
                      showConfirmation
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={21}
                    color={
                      COLORS.muted
                    }
                  />

                </Pressable>

              </View>

            </View>


            <View
              style={
                styles.infoBox
              }
            >

              <Ionicons
                name="information-circle-outline"
                size={20}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={[
                  styles.infoText,
                  isArabic
                    ? styles.textArabic
                    : styles.textEnglish,
                ]}
              >

                {text.security}

              </Text>

            </View>


            <Pressable
              style={({
                pressed,
              }) => [
                styles.button,
                pressed
                &&
                !loading
                  ? styles.buttonPressed
                  : null,
                loading
                  ? styles.buttonDisabled
                  : null,
              ]}
              disabled={
                loading
              }
              onPress={
                handleSubmit
              }
            >

              {loading ? (

                <ActivityIndicator
                  color={
                    COLORS.white
                  }
                />

              ) : (

                <Text
                  style={
                    styles.buttonText
                  }
                >

                  {text.submit}

                </Text>
              )}

            </Pressable>

          </View>

        </View>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}


const COLORS = {
  background:
    "#F7F4EF",

  primary:
    "#249B97",

  coral:
    "#EB6268",

  text:
    "#272727",

  muted:
    "#77736D",

  white:
    "#FFFFFF",

  border:
    "#E5E0D9",

  danger:
    "#B42318",
};


const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    keyboardContainer: {
      flex: 1,
    },

    page: {
      flex: 1,
      justifyContent:
        "center",
      paddingHorizontal: 22,
      paddingVertical: 28,
      maxWidth: 480,
      width: "100%",
      alignSelf: "center",
    },

    iconWrap: {
      width: 68,
      height: 68,
      borderRadius: 24,
      backgroundColor:
        "#E7F5F4",
      alignItems:
        "center",
      justifyContent:
        "center",
      alignSelf:
        "center",
      marginBottom: 18,
    },

    title: {
      fontFamily:
        "Cairo_800ExtraBold",
      fontSize: 26,
      lineHeight: 39,
      color:
        COLORS.text,
      textAlign:
        "center",
    },

    subtitle: {
      marginTop: 6,
      marginBottom: 22,
      fontFamily:
        "Cairo_400Regular",
      fontSize: 14,
      lineHeight: 24,
      color:
        COLORS.muted,
      textAlign:
        "center",
    },

    card: {
      backgroundColor:
        COLORS.white,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      shadowColor:
        "#000",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },

    errorBox: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      padding: 11,
      marginBottom: 15,
      borderRadius: 12,
      backgroundColor:
        "#FFF0F0",
      borderWidth: 1,
      borderColor:
        "#FFD8D8",
    },

    errorText: {
      flex: 1,
      fontFamily:
        "Cairo_500Medium",
      fontSize: 12,
      lineHeight: 20,
      color:
        COLORS.danger,
    },

    field: {
      marginBottom: 16,
    },

    label: {
      fontFamily:
        "Cairo_600SemiBold",
      fontSize: 14,
      lineHeight: 23,
      color:
        COLORS.text,
      marginBottom: 6,
    },

    passwordContainer: {
      height: 54,
      flexDirection:
        "row",
      alignItems:
        "center",
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 14,
      backgroundColor:
        "#FCFBF9",
      overflow:
        "hidden",
    },

    passwordInput: {
      flex: 1,
      height: "100%",
      paddingHorizontal: 16,
      fontFamily:
        "Cairo_400Regular",
      fontSize: 14,
      color:
        COLORS.text,
    },

    eyeButton: {
      height: "100%",
      width: 50,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    inputArabic: {
      textAlign:
        "right",
      writingDirection:
        "rtl",
    },

    inputEnglish: {
      textAlign:
        "left",
      writingDirection:
        "ltr",
    },

    infoBox: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor:
        "#ECF8F7",
      marginBottom: 18,
    },

    infoText: {
      flex: 1,
      fontFamily:
        "Cairo_400Regular",
      fontSize: 12,
      lineHeight: 20,
      color:
        COLORS.muted,
    },

    button: {
      minHeight: 54,
      borderRadius: 14,
      backgroundColor:
        COLORS.coral,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 16,
    },

    buttonPressed: {
      opacity: 0.86,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    buttonText: {
      fontFamily:
        "Cairo_700Bold",
      fontSize: 15,
      color:
        COLORS.white,
    },

    textArabic: {
      textAlign:
        "right",
      writingDirection:
        "rtl",
    },

    textEnglish: {
      textAlign:
        "left",
      writingDirection:
        "ltr",
    },
  });
