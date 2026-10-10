import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAppLanguage } from "../../context/LanguageContext";

const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";
const COLORS = { background: "#F4F1EC", text: "#272727", muted: "#77736D", border: "#D9D1C6", primary: "#249B97", dark: "#292929", danger: "#EB6268" };

type Customer = { first_name?: string | null; last_name?: string | null; phone?: string | null; email?: string | null };

export default function PersonalInformationScreen() {
  const { isArabic } = useAppLanguage();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tr = isArabic ? {
    back: "رجوع", title: "المعلومات الشخصية", fullName: "الاسم الكامل", phone: "رقم الهاتف", email: "البريد الإلكتروني",
    save: "حفظ التغييرات", saving: "جارٍ الحفظ...", success: "تم حفظ التغييرات بنجاح.", error: "تعذر حفظ المعلومات.",
    loadError: "تعذر تحميل المعلومات الشخصية.", retry: "إعادة المحاولة", session: "انتهت جلسة تسجيل الدخول.",
    phoneRequired: "يرجى إدخال رقم الهاتف.", invalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
    nameInfo: "لتعديل الاسم الكامل، يجب أولاً إضافة واجهة تعديل الاسم في Laravel.",
  } : {
    back: "Back", title: "Personal Information", fullName: "Full Name", phone: "Mobile Phone Number", email: "Email",
    save: "Save Changes", saving: "Saving...", success: "Your changes have been saved.", error: "Unable to save your information.",
    loadError: "Unable to load personal information.", retry: "Try Again", session: "Your session has expired.",
    phoneRequired: "Please enter your phone number.", invalidEmail: "Please enter a valid email address.",
    nameInfo: "Changing your full name requires an additional Laravel endpoint.",
  };

  const request = useCallback(async (endpoint: string, payload: Record<string, unknown> = {}) => {
    const token = await SecureStore.getItemAsync("access_token");
    if (!token) throw new Error(isArabic ? "انتهت جلسة تسجيل الدخول." : "Your session has expired.");
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ access_token: token, ...payload }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const validationMessage = result?.errors && Object.values(result.errors).flat().find(value => typeof value === "string");
      throw new Error(typeof validationMessage === "string" ? validationMessage : result?.message || `HTTP ${response.status}`);
    }
    return result;
  }, [isArabic]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await request("/settings");
      const profile: Customer = result?.customer || {};
      setCustomer(profile);
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : (isArabic ? "تعذر تحميل المعلومات الشخصية." : "Unable to load personal information."));
    } finally {
      setLoading(false);
    }
  }, [request, isArabic]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (saving || !customer) return;
    const nextPhone = phone.trim();
    const nextEmail = email.trim();
    if (!nextPhone) { Alert.alert("", tr.phoneRequired); return; }
    if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) { Alert.alert("", tr.invalidEmail); return; }
    const phoneChanged = nextPhone !== (customer.phone || "");
    const emailChanged = nextEmail !== (customer.email || "");
    if (!phoneChanged && !emailChanged) { router.back(); return; }
    setSaving(true);
    try {
      if (phoneChanged) {
        await request("/settings/phone", { phone: nextPhone });
        setCustomer(previous => previous ? { ...previous, phone: nextPhone } : previous);
      }
      if (emailChanged) {
        await request("/settings/email", { email: nextEmail || null });
        setCustomer(previous => previous ? { ...previous, email: nextEmail || null } : previous);
      }
      Alert.alert("", tr.success, [{ text: "OK", onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert("", err instanceof Error ? err.message : tr.error);
    } finally {
      setSaving(false);
    }
  };

  const fullName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ");
  if (loading && !customer) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (error && !customer) return <View style={styles.center}><Text style={styles.error}>{error || tr.loadError}</Text><Pressable onPress={() => void load()} style={styles.retry}><Text style={styles.retryText}>{tr.retry}</Text></Pressable></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={[styles.back, isArabic && styles.rtl]}>
          <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={20} color={COLORS.primary} />
          <Text style={styles.backText}>{tr.back}</Text>
        </Pressable>
        <Text style={[styles.title, isArabic && styles.right]}>{tr.title}</Text>
        <Text style={[styles.label, isArabic && styles.right]}>{tr.fullName}</Text>
        <TextInput value={fullName} editable={false} style={[styles.input, styles.readOnly, isArabic && styles.right]} />
        <Text style={[styles.label, isArabic && styles.right]}>{tr.phone}</Text>
        <TextInput editable={false} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" style={[styles.input,styles.readOnly, isArabic && styles.right]} />
        <Text style={[styles.label, isArabic && styles.right]}>{tr.email}</Text>
        <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={[styles.input, isArabic && styles.right]} />
        <Pressable onPress={() => void save()} disabled={saving} style={[styles.saveButton, saving && styles.disabled]}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>{tr.save}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 30, paddingTop: 32, paddingBottom: 45 },
  back: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start" },
  rtl: { flexDirection: "row-reverse", alignSelf: "flex-end" },
  backText: { fontFamily: "Cairo_600SemiBold", fontSize: 15, color: COLORS.text },
  title: { fontFamily: "Cairo_700Bold", fontSize: 31, lineHeight: 48, color: COLORS.text, marginTop: 45, marginBottom: 25 },
  label: { fontFamily: "Cairo_500Medium", fontSize: 15, color: COLORS.text, marginBottom: 10 },
  input: { minHeight: 60, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 18, fontFamily: "Cairo_400Regular", fontSize: 16, color: COLORS.text, marginBottom: 27 },
  readOnly: { opacity: 0.75 },
  right: { textAlign: "right", writingDirection: "rtl" },
  saveButton: { height: 60, backgroundColor: COLORS.dark, borderRadius: 9, justifyContent: "center", alignItems: "center", marginTop: 8 },
  disabled: { opacity: 0.6 },
  saveText: { fontFamily: "Cairo_700Bold", fontSize: 15, color: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, padding: 30 },
  error: { fontFamily: "Cairo_400Regular", fontSize: 15, color: COLORS.danger, textAlign: "center" },
  retry: { backgroundColor: COLORS.dark, borderRadius: 8, paddingHorizontal: 22, paddingVertical: 12, marginTop: 20 },
  retryText: { fontFamily: "Cairo_600SemiBold", color: "#FFFFFF" },
});
