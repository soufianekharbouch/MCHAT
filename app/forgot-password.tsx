import React, { useEffect, useRef, useState } from "react";

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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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
| FORGOT PASSWORD
|--------------------------------------------------------------------------
|
| Step "phone": the customer enters the phone number of the account
|               -> POST /otp/send (purpose reset_password)
| Step "code" : the 6-digit WhatsApp code
|               -> POST /password/verify-otp -> reset_token
|               -> /reset-password (new password)
|
*/

type Step = "phone" | "code";

export default function ForgotPasswordScreen() {
  const { language, setLanguage } = useAppLanguage();
  const isArabic = language === "ar";

  const params = useLocalSearchParams<{ phone?: string }>();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(params.phone ?? "");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const codeInputRef = useRef<TextInput>(null);

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  // Countdown before "Resend code"
  useEffect(() => {
    if (resendIn <= 0) return;

    const timer = setTimeout(() => setResendIn(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  if (!fontsLoaded) {
    return null;
  }

  const t = isArabic
    ? {
        languageButton: "EN",
        back: "رجوع",
        title: "نسيت كلمة المرور؟",
        subtitlePhone: "أدخل رقم الهاتف المرتبط بحسابك وسنرسل لك رمز تحقق عبر واتساب.",
        subtitleCode: "أدخل الرمز المكوّن من 6 أرقام الذي أرسلناه إلى واتساب على الرقم",
        phone: "رقم الهاتف المحمول",
        code: "رمز التحقق",
        sendCode: "إرسال الرمز عبر واتساب",
        sending: "جاري الإرسال...",
        verify: "تأكيد الرمز",
        verifying: "جاري التحقق...",
        resend: "إعادة إرسال الرمز",
        resendIn: "إعادة الإرسال بعد",
        seconds: "ث",
        changeNumber: "تغيير الرقم",
        resent: "تم إرسال رمز جديد.",
        errPhone: "يرجى إدخال رقم الهاتف.",
        errCode: "يرجى إدخال الرمز المكوّن من 6 أرقام.",
        errServer: "استجابة غير صالحة من الخادم.",
        errConnection: "حدث خطأ في الاتصال بالخادم. حاول مرة أخرى.",
        errTooMany: "محاولات كثيرة جداً. يرجى الانتظار ثم المحاولة مرة أخرى.",
      }
    : {
        languageButton: "العربية",
        back: "Back",
        title: "Forgot Password?",
        subtitlePhone: "Enter the phone number of your account and we will send you a verification code on WhatsApp.",
        subtitleCode: "Enter the 6-digit code we sent on WhatsApp to",
        phone: "Mobile Phone Number",
        code: "Verification code",
        sendCode: "Send code on WhatsApp",
        sending: "Sending...",
        verify: "Verify code",
        verifying: "Verifying...",
        resend: "Resend code",
        resendIn: "Resend in",
        seconds: "s",
        changeNumber: "Change number",
        resent: "A new code has been sent.",
        errPhone: "Please enter your phone number.",
        errCode: "Please enter the 6-digit code.",
        errServer: "Invalid response from server.",
        errConnection: "Unable to connect to the server. Please try again.",
        errTooMany: "Too many attempts. Please wait and try again.",
      };

  const textDir = isArabic ? styles.textArabic : styles.textEnglish;

  /*
  |--------------------------------------------------------------------------
  | API
  |--------------------------------------------------------------------------
  */

  const post = async (endpoint: string, body: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ ...body, lang: language }),
    });

    let data: any = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return { response, data };
  };

  /*
  |--------------------------------------------------------------------------
  | SEND CODE
  |--------------------------------------------------------------------------
  */

  const sendCode = async (isResend = false) => {
    if (sending || loading) return;

    setError("");
    setInfo("");

    if (!phone.trim()) {
      setError(t.errPhone);
      return;
    }

    try {
      setSending(true);

      const { response, data } = await post("/otp/send", {
        phone: phone.trim(),
        purpose: "reset_password",
      });

      if (!response.ok || !data?.success) {
        if (data?.retry_after) {
          setResendIn(Number(data.retry_after));
        }

        // A code was sent less than a minute ago: go to the code step
        if (data?.reason === "cooldown" && !isResend) {
          setStep("code");
          setInfo(data.message);
          return;
        }

        setError(data?.message || (response.status === 429 ? t.errTooMany : t.errServer));
        return;
      }

      setCode("");
      setResendIn(Number(data.resend_in ?? 60));
      setStep("code");

      if (isResend) {
        setInfo(t.resent);
      }

      setTimeout(() => codeInputRef.current?.focus(), 300);
    } catch (exception) {
      console.error("Forgot password send error:", exception);
      setError(t.errConnection);
    } finally {
      setSending(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | VERIFY CODE
  |--------------------------------------------------------------------------
  */

  const verifyCode = async () => {
    if (loading) return;

    setError("");
    setInfo("");

    const cleanCode = code.replace(/[^0-9]/g, "");

    if (cleanCode.length !== 6) {
      setError(t.errCode);
      return;
    }

    try {
      setLoading(true);

      const { response, data } = await post("/password/verify-otp", {
        phone: phone.trim(),
        code: cleanCode,
      });

      if (!response.ok || !data?.success || !data?.reset_token) {
        setCode("");
        setError(data?.message || (response.status === 429 ? t.errTooMany : t.errServer));
        return;
      }

      router.replace({
        pathname: "/reset-password",
        params: {
          phone: phone.trim(),
          token: data.reset_token,
        },
      });
    } catch (exception) {
      console.error("Forgot password verify error:", exception);
      setError(t.errConnection);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === "code") {
      setStep("phone");
      setCode("");
      setError("");
      setInfo("");
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  const busy = loading || sending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* TOP BAR */}

        <View style={[styles.topBar, isArabic && styles.rowReverse]}>
          <Pressable
            style={[styles.backButton, isArabic && styles.rowReverse]}
            onPress={goBack}
            disabled={busy}
            hitSlop={10}
          >
            <Ionicons
              name={isArabic ? "arrow-forward" : "arrow-back"}
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.backText}>{t.back}</Text>
          </Pressable>

          <Pressable onPress={() => setLanguage(isArabic ? "en" : "ar")} hitSlop={10}>
            <Text style={styles.languageButtonText}>{t.languageButton}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={step === "phone" ? "lock-reset" : "whatsapp"}
              size={36}
              color={COLORS.primary}
            />
          </View>

          <Text style={[styles.title, textDir]}>{t.title}</Text>

          <Text style={[styles.subtitle, textDir]}>
            {step === "phone" ? t.subtitlePhone : t.subtitleCode}
          </Text>

          {step === "code" && <Text style={[styles.phoneText, textDir]}>{phone.trim()}</Text>}

          {/* ERROR / INFO */}

          {error !== "" && (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, textDir]}>{error}</Text>
            </View>
          )}

          {error === "" && info !== "" && (
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, textDir]}>{info}</Text>
            </View>
          )}

          {step === "phone" ? (
            <>
              {/* PHONE */}

              <View style={styles.field}>
                <Text style={[styles.label, textDir]}>{t.phone}</Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, styles.inputLtr]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+965 5000 0000"
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    autoCapitalize="none"
                    textContentType="telephoneNumber"
                    editable={!busy}
                    onSubmitEditing={() => void sendCode()}
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && !busy && styles.buttonPressed,
                  busy && styles.buttonDisabled,
                ]}
                onPress={() => void sendCode()}
                disabled={busy}
              >
                {sending ? (
                  <View style={[styles.loadingRow, isArabic && styles.rowReverse]}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={styles.buttonText}>{t.sending}</Text>
                  </View>
                ) : (
                  <View style={[styles.loadingRow, isArabic && styles.rowReverse]}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color={COLORS.white} />
                    <Text style={styles.buttonText}>{t.sendCode}</Text>
                  </View>
                )}
              </Pressable>
            </>
          ) : (
            <>
              {/* CODE */}

              <View style={styles.field}>
                <Text style={[styles.label, textDir]}>{t.code}</Text>

                <TextInput
                  ref={codeInputRef}
                  value={code}
                  onChangeText={value => {
                    setCode(value.replace(/[^0-9]/g, "").slice(0, 6));
                    setError("");
                  }}
                  placeholder="000000"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  editable={!loading}
                  style={styles.codeInput}
                  onSubmitEditing={() => void verifyCode()}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && !loading && styles.buttonPressed,
                  (loading || code.length !== 6) && styles.buttonDisabled,
                ]}
                onPress={() => void verifyCode()}
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <View style={[styles.loadingRow, isArabic && styles.rowReverse]}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={styles.buttonText}>{t.verifying}</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>{t.verify}</Text>
                )}
              </Pressable>

              <View style={[styles.linksRow, isArabic && styles.rowReverse]}>
                <Pressable onPress={goBack} disabled={busy} hitSlop={8}>
                  <Text style={styles.link}>{t.changeNumber}</Text>
                </Pressable>

                {resendIn > 0 ? (
                  <Text style={styles.mutedText}>
                    {t.resendIn} {resendIn}{t.seconds}
                  </Text>
                ) : (
                  <Pressable onPress={() => void sendCode(true)} disabled={busy} hitSlop={8}>
                    {sending ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Text style={styles.link}>{t.resend}</Text>
                    )}
                  </Pressable>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES (same look as the login screen)
|--------------------------------------------------------------------------
*/

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

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 8,
    minHeight: 44,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { fontFamily: "Cairo_600SemiBold", fontSize: 15, color: COLORS.text },
  languageButtonText: { fontFamily: "Cairo_500Medium", fontSize: 12, color: COLORS.text },

  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 30 },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  title: {
    fontFamily: "Cairo_800ExtraBold",
    fontSize: 34,
    lineHeight: 46,
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 16,
    lineHeight: 27,
    color: COLORS.muted,
    marginBottom: 6,
  },
  phoneText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 17,
    color: COLORS.text,
    marginBottom: 6,
  },

  errorBox: {
    backgroundColor: COLORS.errorBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  errorText: { fontFamily: "Cairo_500Medium", fontSize: 13, lineHeight: 21, color: COLORS.errorText },
  infoBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  infoText: { fontFamily: "Cairo_500Medium", fontSize: 13, lineHeight: 21, color: COLORS.primary },

  field: { marginTop: 26, marginBottom: 26 },
  label: { fontFamily: "Cairo_600SemiBold", fontSize: 16, lineHeight: 24, color: COLORS.text, marginBottom: 10 },
  inputContainer: {
    height: 64,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  input: { height: "100%", paddingVertical: 0, fontFamily: "Cairo_400Regular", fontSize: 16, color: COLORS.text },
  inputLtr: { textAlign: "left", writingDirection: "ltr" },
  codeInput: {
    height: 66,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    fontFamily: "Cairo_700Bold",
    fontSize: 30,
    letterSpacing: 12,
    textAlign: "center",
    color: COLORS.text,
  },

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

  linksRow: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 28,
  },
  link: { fontFamily: "Cairo_700Bold", fontSize: 14, color: COLORS.primary },
  mutedText: { fontFamily: "Cairo_500Medium", fontSize: 13, color: COLORS.muted },
});