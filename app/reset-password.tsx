import React, { useState } from "react";

import { router, useLocalSearchParams } from "expo-router";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/cairo";

import { useAppLanguage } from "../context/LanguageContext";

const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

/*
|--------------------------------------------------------------------------
| RESET PASSWORD (after the WhatsApp code)
|--------------------------------------------------------------------------
|
| Params: phone, token (reset_token from /password/verify-otp, 15 min)
| POST /password/reset -> back to /login with the phone filled in.
|
*/

export default function ResetPasswordScreen() {
  const { language } = useAppLanguage();
  const isArabic = language === "ar";

  const params = useLocalSearchParams<{ phone?: string; token?: string }>();
  const phone = params.phone ?? "";
  const token = params.token ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(!phone || !token);

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

  const t = isArabic
    ? {
        title: "كلمة مرور جديدة",
        subtitle: "تم التحقق من رقمك. اختر كلمة مرور جديدة لحسابك.",
        password: "كلمة المرور الجديدة",
        passwordPlaceholder: "8 أحرف على الأقل",
        confirmation: "تأكيد كلمة المرور",
        confirmationPlaceholder: "أعد إدخال كلمة المرور",
        submit: "حفظ كلمة المرور",
        saving: "جاري الحفظ...",
        minimum: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
        mismatch: "كلمتا المرور غير متطابقتين.",
        failed: "تعذر تغيير كلمة المرور. حاول مرة أخرى.",
        connection: "حدث خطأ في الاتصال بالخادم. حاول مرة أخرى.",
        expired: "انتهت صلاحية الطلب. يرجى طلب رمز جديد.",
        restart: "طلب رمز جديد",
        backToLogin: "العودة لتسجيل الدخول",
        security: "سيتم تسجيل خروجك من الأجهزة الأخرى بعد تغيير كلمة المرور.",
      }
    : {
        title: "New password",
        subtitle: "Your number has been verified. Choose a new password for your account.",
        password: "New password",
        passwordPlaceholder: "At least 8 characters",
        confirmation: "Confirm password",
        confirmationPlaceholder: "Enter the password again",
        submit: "Save password",
        saving: "Saving...",
        minimum: "Password must be at least 8 characters.",
        mismatch: "The passwords do not match.",
        failed: "Unable to change the password. Please try again.",
        connection: "Unable to connect to the server. Please try again.",
        expired: "This request has expired. Please request a new code.",
        restart: "Request a new code",
        backToLogin: "Back to sign in",
        security: "You will be signed out of your other devices after the change.",
      };

  const textDir = isArabic ? styles.textArabic : styles.textEnglish;

  const handleSubmit = async () => {
    if (loading) return;

    setError("");

    if (password.length < 8) {
      setError(t.minimum);
      return;
    }

    if (password !== passwordConfirmation) {
      setError(t.mismatch);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/password/reset`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          reset_token: token,
          password,
          password_confirmation: passwordConfirmation,
          lang: language,
        }),
      });

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || data?.success !== true) {
        if (data?.token_expired) {
          setExpired(true);
        }

        setError(data?.message || t.failed);
        return;
      }

      // Back to the login screen, phone filled in + success message
      router.replace({
        pathname: "/login",
        params: { phone, reset: "1" },
      });
    } catch (exception) {
      console.error("Reset password error:", exception);
      setError(t.connection);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={34} color={COLORS.primary} />
          </View>

          <Text style={[styles.title, textDir]}>{t.title}</Text>
          <Text style={[styles.subtitle, textDir]}>{expired ? t.expired : t.subtitle}</Text>

          {error !== "" && !expired && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={19} color={COLORS.errorText} />
              <Text style={[styles.errorText, textDir]}>{error}</Text>
            </View>
          )}

          {expired ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={() => router.replace({ pathname: "/forgot-password", params: { phone } })}
              >
                <Text style={styles.buttonText}>{t.restart}</Text>
              </Pressable>

              <Pressable style={styles.secondaryLink} onPress={() => router.replace("/login")}>
                <Text style={styles.link}>{t.backToLogin}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <PasswordField
                label={t.password}
                value={password}
                onChangeText={setPassword}
                placeholder={t.passwordPlaceholder}
                visible={showPassword}
                onToggle={() => setShowPassword(value => !value)}
                isArabic={isArabic}
                editable={!loading}
              />

              <PasswordField
                label={t.confirmation}
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                placeholder={t.confirmationPlaceholder}
                visible={showConfirmation}
                onToggle={() => setShowConfirmation(value => !value)}
                isArabic={isArabic}
                editable={!loading}
              />

              <View style={[styles.infoBox, isArabic && styles.rowReverse]}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                <Text style={[styles.infoText, textDir]}>{t.security}</Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && !loading && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
                onPress={() => void handleSubmit()}
                disabled={loading}
              >
                {loading ? (
                  <View style={[styles.loadingRow, isArabic && styles.rowReverse]}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={styles.buttonText}>{t.saving}</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>{t.submit}</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  visible,
  onToggle,
  isArabic,
  editable,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  isArabic: boolean;
  editable: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, isArabic ? styles.textArabic : styles.textEnglish]}>{label}</Text>

      <View style={[styles.inputContainer, isArabic && styles.rowReverse]}>
        <TextInput
          style={[styles.input, isArabic ? styles.textArabic : styles.textEnglish]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry={!visible}
          textContentType="newPassword"
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />

        <Pressable style={styles.eyeButton} onPress={onToggle} hitSlop={10}>
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={COLORS.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const COLORS = {
  background: "#F4F1EC",
  primary: "#249B97",
  primaryLight: "#E7F0ED",
  text: "#292929",
  muted: "#85817D",
  white: "#FFFFFF",
  border: "#D8CFC5",
  placeholder: "#9A958F",
  button: "#292929",
  errorBackground: "#FFF0F0",
  errorBorder: "#FFD8D8",
  errorText: "#C0392B",
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  textArabic: { textAlign: "right", writingDirection: "rtl" },
  textEnglish: { textAlign: "left", writingDirection: "ltr" },

  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 30 },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  title: { fontFamily: "Cairo_800ExtraBold", fontSize: 34, lineHeight: 46, color: COLORS.text, marginBottom: 8 },
  subtitle: { fontFamily: "Cairo_400Regular", fontSize: 16, lineHeight: 27, color: COLORS.muted, marginBottom: 24 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.errorBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  errorText: { flex: 1, fontFamily: "Cairo_500Medium", fontSize: 13, lineHeight: 21, color: COLORS.errorText },

  field: { marginBottom: 22 },
  label: { fontFamily: "Cairo_600SemiBold", fontSize: 16, lineHeight: 24, color: COLORS.text, marginBottom: 10 },
  inputContainer: {
    height: 64,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  input: { flex: 1, height: "100%", paddingVertical: 0, fontFamily: "Cairo_400Regular", fontSize: 16, color: COLORS.text },
  eyeButton: { width: 42, height: "100%", alignItems: "center", justifyContent: "center" },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    marginBottom: 22,
  },
  infoText: { flex: 1, fontFamily: "Cairo_400Regular", fontSize: 13, lineHeight: 21, color: COLORS.muted },

  button: {
    height: 61,
    borderRadius: 9,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontFamily: "Cairo_700Bold", fontSize: 15, color: COLORS.white },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  secondaryLink: { alignSelf: "center", marginTop: 22, padding: 6 },
  link: { fontFamily: "Cairo_700Bold", fontSize: 14, color: COLORS.primary },
});