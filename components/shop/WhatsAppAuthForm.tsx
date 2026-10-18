import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { router, useLocalSearchParams } from "expo-router";
import { deleteStoredItem, getStoredItem, setStoredItem } from "../../services/storage";
import * as Application from "expo-application";
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/cairo";

import { useAppLanguage } from "../../context/LanguageContext";
import { associateDeviceWithCustomer } from "../../services/pushNotifications";
import { saveSession } from "../../services/session";
import { sendAuthCode, ShopApiError, verifyAuthCode } from "../../services/shopApi";

/*
|--------------------------------------------------------------------------
| WHATSAPP SIGN IN / SIGN UP (shared by login.tsx and register.tsx)
|--------------------------------------------------------------------------
|
| mode "login"  : phone -> code (name asked only for a new number)
| mode "signup" : full name + phone -> code
|
| Route params (optional):
|   redirect  : route to open after sign in (default: the shop)
|   productId : product to buy (redirect = checkout)
|
*/

const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

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
  whatsapp: "#25D366",
  errorBackground: "#FFF0F0",
  errorBorder: "#FFD8D8",
  errorText: "#C0392B",
};

type Step = "phone" | "code";

export default function WhatsAppAuthForm({ mode }: { mode: "login" | "signup" }) {
  const { language, setLanguage } = useAppLanguage();
  const isArabic = language === "ar";
  const lang = isArabic ? "ar" : "en";

  const params = useLocalSearchParams<{ redirect?: string; productId?: string; phone?: string }>();

  const [step, setStep] = useState<Step>("phone");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(params.phone ?? "");
  const [code, setCode] = useState("");

  // Name field: always in sign up, in sign in only for a new number
  const [needsName, setNeedsName] = useState(mode === "signup");
  const [accountStatus, setAccountStatus] = useState<"account" | "legacy" | "new" | null>(null);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const codeRef = useRef<TextInput>(null);

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

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
        titleLogin: "تسجيل الدخول",
        titleSignup: "إنشاء حساب",
        subtitleLogin: "أدخل رقم هاتفك وسنرسل لك رمز تحقق عبر واتساب.",
        subtitleSignup: "اسمك ورقم هاتفك فقط، وسنرسل لك رمز تحقق عبر واتساب.",
        fullName: "الاسم الكامل",
        fullNamePlaceholder: "مثال: سارة أحمد",
        phone: "رقم الهاتف المحمول (واتساب)",
        code: "رمز التحقق",
        codeSentTo: "أرسلنا رمزاً مكوّناً من 6 أرقام إلى واتساب على الرقم",
        sendCode: "إرسال الرمز عبر واتساب",
        verify: "تأكيد",
        verifyCreate: "تأكيد وإنشاء الحساب",
        resend: "إعادة إرسال الرمز",
        resendIn: "إعادة الإرسال بعد",
        seconds: "ث",
        changeNumber: "تغيير الرقم",
        newNumber: "رقم جديد! أدخل اسمك لإنشاء حسابك.",
        existingAccount: "لديك حساب بالفعل بهذا الرقم. أدخل الرمز لتسجيل الدخول.",
        noAccount: "ليس لديك حساب؟",
        signUp: "إنشاء حساب",
        haveAccount: "لديك حساب بالفعل؟",
        signIn: "تسجيل الدخول",
        continueGuest: "تصفح المنتجات بدون حساب",
        errName: "يرجى إدخال اسمك الكامل.",
        errPhone: "يرجى إدخال رقم هاتف صحيح.",
        errCode: "يرجى إدخال الرمز المكوّن من 6 أرقام.",
        resent: "تم إرسال رمز جديد.",
      }
    : {
        languageButton: "العربية",
        titleLogin: "Sign In",
        titleSignup: "Create Account",
        subtitleLogin: "Enter your phone number and we will send you a code on WhatsApp.",
        subtitleSignup: "Just your name and phone number, we will send you a code on WhatsApp.",
        fullName: "Full name",
        fullNamePlaceholder: "e.g. Sara Ahmad",
        phone: "Mobile number (WhatsApp)",
        code: "Verification code",
        codeSentTo: "We sent a 6-digit code on WhatsApp to",
        sendCode: "Send code on WhatsApp",
        verify: "Confirm",
        verifyCreate: "Confirm & create account",
        resend: "Resend code",
        resendIn: "Resend in",
        seconds: "s",
        changeNumber: "Change number",
        newNumber: "New number! Enter your name to create your account.",
        existingAccount: "You already have an account with this number. Enter the code to sign in.",
        noAccount: "Don't have an account yet?",
        signUp: "Sign Up",
        haveAccount: "Already have an account?",
        signIn: "Sign In",
        continueGuest: "Browse products without an account",
        errName: "Please enter your full name.",
        errPhone: "Please enter a valid phone number.",
        errCode: "Please enter the 6-digit code.",
        resent: "A new code has been sent.",
      };

  const textDir = isArabic ? styles.textArabic : styles.textEnglish;
  const digits = phone.replace(/[^0-9]/g, "");

  /*
  |--------------------------------------------------------------------------
  | SEND CODE
  |--------------------------------------------------------------------------
  */

  const sendCode = async (isResend = false) => {
    if (sending || verifying) return;

    setError("");
    setInfo("");

    if (mode === "signup" && fullName.trim().length < 2) {
      setError(t.errName);
      return;
    }

    if (digits.length < 8) {
      setError(t.errPhone);
      return;
    }

    try {
      setSending(true);

      const data = await sendAuthCode(lang, phone.trim());

      setAccountStatus(data.account_status);
      setResendIn(Number(data.resend_in ?? 60));
      setCode("");
      setStep("code");

      if (data.requires_name) {
        setNeedsName(true);
        if (mode === "login") setInfo(t.newNumber);
      } else {
        setNeedsName(false);
        if (mode === "signup") setInfo(t.existingAccount);
      }

      if (isResend) setInfo(t.resent);

      setTimeout(() => codeRef.current?.focus(), 300);
    } catch (e: any) {
      const data = e instanceof ShopApiError ? e.data : null;

      // A code was sent less than a minute ago: go to the code step
      if (data?.reason === "cooldown" && !isResend) {
        setAccountStatus(data.account_status ?? null);
        setNeedsName(mode === "signup" || !!data.requires_name);
        setResendIn(Number(data.retry_after ?? 60));
        setStep("code");
        setInfo(data.message);
        return;
      }

      setError(e?.message || "Error");
    } finally {
      setSending(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | VERIFY CODE -> SESSION
  |--------------------------------------------------------------------------
  */

  const verify = async () => {
    if (verifying) return;

    setError("");

    const cleanCode = code.replace(/[^0-9]/g, "");

    if (needsName && accountStatus === "new" && fullName.trim().length < 2) {
      setError(t.errName);
      return;
    }

    if (cleanCode.length !== 6) {
      setError(t.errCode);
      return;
    }

    try {
      setVerifying(true);

      const data = await verifyAuthCode(lang, phone.trim(), cleanCode, fullName.trim() || null);

      await saveSession({ access_token: data.access_token, expires_at: data.expires_at ?? null, locale: lang });
      await setStoredItem("locale", language);

      // Language of the customer settings (never blocks the sign in)
      fetch(`${API_BASE_URL}/settings/language`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${data.access_token}`,
        },
        body: JSON.stringify({ language, access_token: data.access_token }),
      }).catch(() => undefined);

      try {
        await associateDeviceWithCustomer();
      } catch (deviceError) {
        console.warn("Device association error:", deviceError);
      }

      goNext();
    } catch (e: any) {
      const data = e instanceof ShopApiError ? e.data : null;

      if (data?.requires_name) {
        setNeedsName(true);
        setAccountStatus("new");
      }

      if (data?.otp_error) {
        setCode("");
      }

      setError(e?.message || "Error");
    } finally {
      setVerifying(false);
    }
  };

  const goNext = () => {
    if (params.redirect === "checkout" && params.productId) {
      router.replace({ pathname: "/checkout", params: { productId: params.productId } } as any);
      return;
    }

    if (params.redirect) {
      router.replace(params.redirect as any);
      return;
    }

    router.replace("/(tabs)" as any);
  };

  const backToPhone = () => {
    setStep("phone");
    setCode("");
    setError("");
    setInfo("");
  };

  const switchMode = () => {
    const nextParams: Record<string, string> = {};
    if (params.redirect) nextParams.redirect = params.redirect;
    if (params.productId) nextParams.productId = params.productId;
    if (phone.trim()) nextParams.phone = phone.trim();

    router.replace({ pathname: mode === "login" ? "/register" : "/login", params: nextParams } as any);
  };

  const continueAsGuest = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as any);
    }
  };

  const showNameField = mode === "signup" || (step === "code" && needsName && accountStatus === "new");
  const busy = sending || verifying;
  const appVersion = Application.nativeApplicationVersion || "1.0.0";

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.topBar, isArabic && styles.rowReverse]}>
          <Pressable onPress={continueAsGuest} hitSlop={10} style={[styles.closeButton, isArabic && styles.rowReverse]}>
            <Ionicons name="close" size={24} color={COLORS.text} />
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
          <View style={styles.logoSection}>
            <Image
              source={require("../../assets/images/maison-chat-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, textDir]}>{mode === "login" ? t.titleLogin : t.titleSignup}</Text>
          <Text style={[styles.subtitle, textDir]}>{mode === "login" ? t.subtitleLogin : t.subtitleSignup}</Text>

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

          {/* FULL NAME */}
          {showNameField && (
            <View style={styles.field}>
              <Text style={[styles.label, textDir]}>{t.fullName}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={t.fullNamePlaceholder}
                  placeholderTextColor={COLORS.placeholder}
                  autoCapitalize="words"
                  textContentType="name"
                  editable={!busy}
                  style={[styles.input, textDir]}
                />
              </View>
            </View>
          )}

          {step === "phone" ? (
            <>
              {/* PHONE */}
              <View style={styles.field}>
                <Text style={[styles.label, textDir]}>{t.phone}</Text>
                <View style={[styles.inputContainer, isArabic && styles.rowReverse]}>
                  <MaterialCommunityIcons name="whatsapp" size={22} color={COLORS.whatsapp} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+965 5000 0000"
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    editable={!busy}
                    style={[styles.input, styles.inputLtr]}
                    onSubmitEditing={() => void sendCode()}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => void sendCode()}
                disabled={busy}
                style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.disabled]}
              >
                {sending ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <View style={[styles.buttonRow, isArabic && styles.rowReverse]}>
                    <MaterialCommunityIcons name="whatsapp" size={22} color={COLORS.white} />
                    <Text style={styles.buttonText}>{t.sendCode}</Text>
                  </View>
                )}
              </Pressable>
            </>
          ) : (
            <>
              {/* CODE */}
              <Text style={[styles.codeSentText, textDir]}>{t.codeSentTo}</Text>
              <Text style={[styles.codePhone, textDir]}>{phone.trim()}</Text>

              <View style={styles.field}>
                <Text style={[styles.label, textDir]}>{t.code}</Text>
                <TextInput
                  ref={codeRef}
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
                  editable={!verifying}
                  style={styles.codeInput}
                  onSubmitEditing={() => void verify()}
                />
              </View>

              <Pressable
                onPress={() => void verify()}
                disabled={verifying || code.length !== 6}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                  (verifying || code.length !== 6) && styles.disabled,
                ]}
              >
                {verifying ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>
                    {accountStatus === "new" ? t.verifyCreate : t.verify}
                  </Text>
                )}
              </Pressable>

              <View style={[styles.linksRow, isArabic && styles.rowReverse]}>
                <Pressable onPress={backToPhone} disabled={busy} hitSlop={8}>
                  <Text style={styles.link}>{t.changeNumber}</Text>
                </Pressable>

                {resendIn > 0 ? (
                  <Text style={styles.mutedText}>
                    {t.resendIn} {resendIn}
                    {t.seconds}
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

          {/* SWITCH LOGIN / SIGN UP */}
          <View style={[styles.switchRow, isArabic && styles.rowReverse]}>
            <Text style={styles.mutedText}>{mode === "login" ? t.noAccount : t.haveAccount}</Text>
            <Pressable onPress={switchMode} disabled={busy} hitSlop={10}>
              <Text style={styles.switchLink}>{mode === "login" ? t.signUp : t.signIn}</Text>
            </Pressable>
          </View>

          <Pressable onPress={continueAsGuest} style={styles.guestLink} hitSlop={8}>
            <Text style={styles.guestText}>{t.continueGuest}</Text>
          </Pressable>

          <Text style={styles.appVersion}>v{appVersion}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  textArabic: { textAlign: "right", writingDirection: "rtl" },
  textEnglish: { textAlign: "left", writingDirection: "ltr" },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    minHeight: 44,
  },
  closeButton: { width: 40, height: 40, justifyContent: "center" },
  languageButtonText: { fontFamily: "Cairo_500Medium", fontSize: 12, color: COLORS.text },

  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 },

  logoSection: { alignItems: "center", marginTop: 4, marginBottom: 14 },
  logo: { width: 130, height: 90 },

  title: { fontFamily: "Cairo_800ExtraBold", fontSize: 36, lineHeight: 48, color: COLORS.text },
  subtitle: { marginTop: 4, marginBottom: 24, fontFamily: "Cairo_400Regular", fontSize: 16, lineHeight: 27, color: COLORS.muted },

  errorBox: {
    backgroundColor: COLORS.errorBackground,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  errorText: { fontFamily: "Cairo_500Medium", fontSize: 13, lineHeight: 21, color: COLORS.errorText },
  infoBox: { backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 18 },
  infoText: { fontFamily: "Cairo_500Medium", fontSize: 13, lineHeight: 21, color: COLORS.primary },

  field: { marginBottom: 22 },
  label: { fontFamily: "Cairo_600SemiBold", fontSize: 15, lineHeight: 23, color: COLORS.text, marginBottom: 8 },
  inputContainer: {
    height: 62,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: { flex: 1, height: "100%", paddingVertical: 0, fontFamily: "Cairo_400Regular", fontSize: 16, color: COLORS.text },
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
  codeSentText: { fontFamily: "Cairo_400Regular", fontSize: 14, color: COLORS.muted },
  codePhone: { marginBottom: 16, fontFamily: "Cairo_700Bold", fontSize: 17, color: COLORS.text },

  button: {
    height: 60,
    borderRadius: 9,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  buttonText: { fontFamily: "Cairo_700Bold", fontSize: 15, color: COLORS.white },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.6 },

  linksRow: { marginTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { fontFamily: "Cairo_700Bold", fontSize: 14, color: COLORS.primary },
  mutedText: { fontFamily: "Cairo_400Regular", fontSize: 14, color: COLORS.muted },

  switchRow: { marginTop: 28, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "wrap" },
  switchLink: { fontFamily: "Cairo_700Bold", fontSize: 14, color: COLORS.text, textDecorationLine: "underline" },

  guestLink: { alignSelf: "center", marginTop: 16, padding: 6 },
  guestText: { fontFamily: "Cairo_600SemiBold", fontSize: 13, color: COLORS.primary },

  appVersion: { alignSelf: "center", marginTop: 18, fontFamily: "Cairo_400Regular", fontSize: 9, color: COLORS.muted, opacity: 0.45 },
});