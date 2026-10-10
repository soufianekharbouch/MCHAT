import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAppLanguage } from "../../context/LanguageContext";

const API_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile/settings/password";
const COLORS = { background: "#F4F1EC", text: "#272727", muted: "#77736D", border: "#D9D1C6", primary: "#249B97", dark: "#292929" };

export default function ChangePasswordScreen() {
  const { isArabic } = useAppLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });

  const tr = isArabic ? {
    back: "رجوع", title: "تغيير كلمة المرور", current: "كلمة المرور الحالية", next: "كلمة المرور الجديدة",
    confirm: "تأكيد كلمة المرور الجديدة", hint: "8 أحرف على الأقل", save: "حفظ التغييرات",
    saving: "جارٍ الحفظ...", required: "يرجى ملء جميع الحقول.", short: "يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.",
    mismatch: "كلمتا المرور الجديدتان غير متطابقتين.", same: "يجب أن تختلف كلمة المرور الجديدة عن الحالية.",
    session: "انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مجدداً.", success: "تم تغيير كلمة المرور بنجاح.",
    error: "تعذر تغيير كلمة المرور. حاول مرة أخرى.", invalid: "استجابة غير صالحة من الخادم.",
  } : {
    back: "Back", title: "Change Password", current: "Current Password", next: "New Password",
    confirm: "Confirm New Password", hint: "At least 8 characters", save: "Save Changes",
    saving: "Saving...", required: "Please complete all password fields.", short: "Your new password must contain at least 8 characters.",
    mismatch: "The new passwords do not match.", same: "Your new password must be different from the current password.",
    session: "Your session has expired. Please log in again.", success: "Your password has been changed successfully.",
    error: "Unable to change your password. Please try again.", invalid: "Invalid server response.",
  };

  const save = async () => {
    if (saving) return;
    if (!currentPassword || !password || !confirmation) { Alert.alert("", tr.required); return; }
    if (password.length < 8) { Alert.alert("", tr.short); return; }
    if (password !== confirmation) { Alert.alert("", tr.mismatch); return; }
    if (password === currentPassword) { Alert.alert("", tr.same); return; }

    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) throw new Error(tr.session);
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ access_token: token, current_password: currentPassword, password, password_confirmation: confirmation }),
      });
      const result: any = await response.json().catch(() => null);
      if (!response.ok) {
        const firstError = result?.errors && Object.values(result.errors).flat().find((item) => typeof item === "string");
        throw new Error(typeof firstError === "string" ? firstError : result?.message || tr.error);
      }
      setCurrentPassword("");
      setPassword("");
      setConfirmation("");
      Alert.alert("", tr.success, [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert("", error instanceof Error ? error.message : tr.error);
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, onChangeText: (value: string) => void, key: "current" | "next" | "confirm", placeholder?: string) => (
    <View style={styles.field}>
      <Text style={[styles.label, isArabic && styles.right]}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A39A91"
          secureTextEntry={!visible[key]}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType={key === "current" ? "password" : "newPassword"}
          autoComplete={key === "current" ? "current-password" : "new-password"}
          style={[styles.input, isArabic && styles.right]}
          editable={!saving}
        />
        <Pressable
          style={styles.eye}
          onPress={() => setVisible((previous) => ({ ...previous, [key]: !previous[key] }))}
          accessibilityRole="button"
          accessibilityLabel={visible[key] ? "Hide password" : "Show password"}
        >
          <Ionicons name={visible[key] ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.muted} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable style={[styles.back, isArabic && styles.reverse]} onPress={() => router.back()}>
          <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={20} color={COLORS.primary} />
          <Text style={styles.backText}>{tr.back}</Text>
        </Pressable>
        <Text style={[styles.title, isArabic && styles.right]}>{tr.title}</Text>
        {field(tr.current, currentPassword, setCurrentPassword, "current")}
        {field(tr.next, password, setPassword, "next", tr.hint)}
        {field(tr.confirm, confirmation, setConfirmation, "confirm")}
        <Pressable style={[styles.saveButton, saving && styles.disabled]} disabled={saving} onPress={() => void save()}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : (
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark" size={23} color="#FFFFFF" />
              <Text style={styles.saveText}>{tr.save}</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 30, paddingTop: 32, paddingBottom: 65, flexGrow: 1 },
  back: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start" },
  reverse: { flexDirection: "row-reverse", alignSelf: "flex-end" },
  backText: { fontFamily: "Cairo_600SemiBold", fontSize: 15, color: COLORS.text },
  title: { fontFamily: "Cairo_700Bold", fontSize: 31, lineHeight: 48, color: COLORS.text, marginTop: 45, marginBottom: 25 },
  field: { marginBottom: 27 },
  label: { fontFamily: "Cairo_500Medium", fontSize: 15, color: COLORS.text, marginBottom: 10 },
  inputWrap: { position: "relative", justifyContent: "center" },
  input: { height: 62, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingLeft: 18, paddingRight: 52, fontFamily: "Cairo_400Regular", fontSize: 16, color: COLORS.text },
  eye: { position: "absolute", right: 8, width: 40, height: 48, alignItems: "center", justifyContent: "center" },
  right: { textAlign: "right", writingDirection: "rtl" },
  saveButton: { height: 60, backgroundColor: COLORS.dark, borderRadius: 9, justifyContent: "center", alignItems: "center", marginTop: 55 },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  disabled: { opacity: 0.6 },
  saveText: { fontFamily: "Cairo_700Bold", fontSize: 15, color: "#FFFFFF" },
});
