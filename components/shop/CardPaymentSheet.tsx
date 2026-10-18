import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FONTS, PCOLORS } from "../purchase/purchaseUtils";
import { formatPrice } from "../purchase/SubscriptionCard";

/*
|--------------------------------------------------------------------------
| CARD PAYMENT SHEET (KNET / VISA / MASTERCARD) - SIMULATION
|--------------------------------------------------------------------------
|
| No payment gateway yet: any card data is accepted.
| The card details stay on the phone: only the last 4 digits are
| given to onPay (sent to the server for the purchase history).
|
| Later the real KNET / card page (gateway WebView) replaces this sheet.
|
*/

export type CardMethod = "knet" | "card";

type Props = {
  visible: boolean;
  method: CardMethod;
  amount: number;
  currency: string;
  isArabic: boolean;
  onClose: () => void;
  /** Called after the fake processing time. Throws to show an error. */
  onPay: (cardLast4: string) => Promise<void>;
  /** false: the parent shows its own confirmation (sheet closed by the parent) */
  showSuccess?: boolean;
};

const KNET_BANKS = [
  "NBK", "KFH", "Gulf Bank", "Boubyan", "Burgan", "CBK", "ABK", "Warba", "KIB", "Al Ahli United",
];

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, "");

function formatCardNumber(value: string) {
  return digitsOnly(value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export default function CardPaymentSheet({
  visible,
  method,
  amount,
  currency,
  isArabic,
  onClose,
  onPay,
  showSuccess = true,
}: Props) {
  const [bank, setBank] = useState<string | null>(null);
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [secret, setSecret] = useState(""); // KNET: PIN, card: CVV
  const [step, setStep] = useState<"connecting" | "form" | "processing" | "success">("connecting");
  const [error, setError] = useState("");

  const successScale = useRef(new Animated.Value(0)).current;

  // New sheet: empty form
  useEffect(() => {
    if (visible) {
      setBank(null);
      setHolder("");
      setNumber("");
      setExpiry("");
      setSecret("");
      setStep("connecting");
      setError("");
      successScale.setValue(0);

      // "Opening the secure payment page..." (same feeling as a real gateway)
      const timer = setTimeout(() => setStep("form"), 1400);
      return () => clearTimeout(timer);
    }
  }, [visible, method, successScale]);

  const isKnet = method === "knet";
  const textDir = isArabic ? styles.textRtl : null;

  const t = isArabic
    ? {
        titleKnet: "الدفع عبر كي نت",
        titleCard: "الدفع بالبطاقة",
        testTitle: "وضع تجريبي",
        test: "لا تُدخل بيانات بطاقتك الحقيقية. أدخل أي أرقام: لن يتم خصم أي مبلغ.",
        connecting: "جارٍ فتح صفحة الدفع الآمن...",
        amount: "المبلغ",
        bank: "البنك",
        holder: "اسم حامل البطاقة",
        number: "رقم البطاقة",
        expiry: "تاريخ الانتهاء",
        pin: "الرقم السري (PIN)",
        cvv: "CVV",
        pay: "ادفع",
        cancel: "إلغاء",
        processing: "جارٍ معالجة الدفع...",
        doNotClose: "يرجى عدم إغلاق التطبيق.",
        success: "تم الدفع بنجاح",
        missing: "يرجى إكمال بيانات البطاقة.",
        secure: "دفع آمن",
      }
    : {
        titleKnet: "Pay with KNET",
        titleCard: "Pay by card",
        testTitle: "TEST MODE",
        test: "Do NOT enter your real card details. Type any numbers: no money is taken.",
        connecting: "Opening the secure payment page...",
        amount: "Amount",
        bank: "Bank",
        holder: "Card holder name",
        number: "Card number",
        expiry: "Expiry date",
        pin: "PIN",
        cvv: "CVV",
        pay: "Pay",
        cancel: "Cancel",
        processing: "Processing your payment...",
        doNotClose: "Please do not close the app.",
        success: "Payment successful",
        missing: "Please complete the card details.",
        secure: "Secure payment",
      };

  /*
  | Only "something typed" is checked (simulation).
  */
  const submit = async () => {
    setError("");

    const cardDigits = digitsOnly(number);
    const complete = isKnet
      ? !!bank && cardDigits.length >= 6 && expiry.length >= 4 && digitsOnly(secret).length >= 4
      : holder.trim().length >= 2 && cardDigits.length >= 12 && expiry.length >= 4 && digitsOnly(secret).length >= 3;

    if (!complete) {
      setError(t.missing);
      return;
    }

    setStep("processing");

    // Same feeling as a real gateway
    await new Promise(resolve => setTimeout(resolve, 1800));

    try {
      await onPay(cardDigits.slice(-4));

      if (showSuccess) {
        setStep("success");
        Animated.spring(successScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
      }
    } catch (e: any) {
      setStep("form");
      setError(e?.message || "Error");
    }
  };

  const close = () => {
    if (step === "processing") return;
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.overlay} onPress={close} />

        <View style={styles.sheet}>
          {/* HEADER */}
          <View style={[styles.header, isArabic && styles.rowRtl]}>
            <View style={[styles.brand, isKnet ? styles.brandKnet : styles.brandCard]}>
              {isKnet ? (
                <Text style={styles.brandKnetText}>KNET</Text>
              ) : (
                <Ionicons name="card" size={20} color={PCOLORS.white} />
              )}
            </View>
            <Text style={[styles.title, textDir]}>{isKnet ? t.titleKnet : t.titleCard}</Text>
            {step !== "processing" && (
              <Pressable onPress={close} hitSlop={10}>
                <Ionicons name="close" size={24} color={PCOLORS.text} />
              </Pressable>
            )}
          </View>

          {/* AMOUNT */}
          <View style={[styles.amountRow, isArabic && styles.rowRtl]}>
            <Text style={styles.amountLabel}>{t.amount}</Text>
            <Text style={styles.amountValue}>
              {formatPrice(amount)} <Text style={styles.amountCurrency}>{currency}</Text>
            </Text>
          </View>

          {step === "connecting" && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={PCOLORS.primary} />
              <Text style={styles.centerTitle}>{t.connecting}</Text>
            </View>
          )}

          {step === "processing" && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={PCOLORS.primary} />
              <Text style={styles.centerTitle}>{t.processing}</Text>
              <Text style={styles.centerText}>{t.doNotClose}</Text>
            </View>
          )}

          {step === "success" && (
            <View style={styles.center}>
              <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
                <Ionicons name="checkmark" size={44} color={PCOLORS.white} />
              </Animated.View>
              <Text style={styles.centerTitle}>{t.success}</Text>
            </View>
          )}

          {step === "form" && (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[styles.testBox, isArabic && styles.rowRtl]}>
                <Ionicons name="warning" size={20} color={PCOLORS.danger} />
                <View style={styles.flex}>
                  <Text style={[styles.testTitle, textDir]}>{t.testTitle}</Text>
                  <Text style={[styles.testText, textDir]}>{t.test}</Text>
                </View>
              </View>

              {isKnet ? (
                <>
                  <Text style={[styles.label, textDir]}>{t.bank}</Text>
                  <View style={[styles.banks, isArabic && styles.rowRtl]}>
                    {KNET_BANKS.map(name => (
                      <Pressable
                        key={name}
                        onPress={() => setBank(name)}
                        style={[styles.bankChip, bank === name && styles.bankChipActive]}
                      >
                        <Text style={[styles.bankText, bank === name && styles.bankTextActive]}>{name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.label, textDir]}>{t.holder}</Text>
                  <TextInput
                    value={holder}
                    onChangeText={setHolder}
                    autoCapitalize="characters"
                    placeholder="SARA AHMAD"
                    placeholderTextColor={PCOLORS.muted}
                    style={[styles.input, textDir]}
                  />
                </>
              )}

              <Text style={[styles.label, textDir]}>{t.number}</Text>
              <View style={[styles.input, styles.inputRow]}>
                <TextInput
                  value={number}
                  onChangeText={value => setNumber(formatCardNumber(value))}
                  keyboardType="number-pad"
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor={PCOLORS.muted}
                  style={styles.inputInner}
                  maxLength={19}
                />
                <Ionicons name="card-outline" size={20} color={PCOLORS.muted} />
              </View>

              <View style={[styles.twoCols, isArabic && styles.rowRtl]}>
                <View style={styles.flex}>
                  <Text style={[styles.label, textDir]}>{t.expiry}</Text>
                  <TextInput
                    value={expiry}
                    onChangeText={value => setExpiry(formatExpiry(value))}
                    keyboardType="number-pad"
                    placeholder="MM/YY"
                    placeholderTextColor={PCOLORS.muted}
                    style={[styles.input, styles.ltr]}
                    maxLength={5}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.label, textDir]}>{isKnet ? t.pin : t.cvv}</Text>
                  <TextInput
                    value={secret}
                    onChangeText={value => setSecret(digitsOnly(value).slice(0, 4))}
                    keyboardType="number-pad"
                    secureTextEntry
                    placeholder={isKnet ? "••••" : "•••"}
                    placeholderTextColor={PCOLORS.muted}
                    style={[styles.input, styles.ltr]}
                    maxLength={4}
                  />
                </View>
              </View>

              {error !== "" && <Text style={[styles.error, textDir]}>{error}</Text>}

              <Pressable onPress={() => void submit()} style={({ pressed }) => [styles.payButton, pressed && styles.pressed]}>
                <Ionicons name="lock-closed" size={18} color={PCOLORS.white} />
                <Text style={styles.payText}>
                  {t.pay} {formatPrice(amount)} {currency}
                </Text>
              </Pressable>

              <View style={[styles.secureRow, isArabic && styles.rowRtl]}>
                <Ionicons name="shield-checkmark-outline" size={14} color={PCOLORS.muted} />
                <Text style={styles.secureText}>{t.secure}</Text>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  ltr: { textAlign: "left", writingDirection: "ltr" },
  pressed: { opacity: 0.88 },

  overlay: { flex: 1, backgroundColor: PCOLORS.overlay },
  sheet: {
    backgroundColor: PCOLORS.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
    maxHeight: "88%",
  },

  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  brand: { height: 32, minWidth: 52, borderRadius: 6, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  brandKnet: { backgroundColor: "#0B4A8B" },
  brandCard: { backgroundColor: PCOLORS.dark },
  brandKnetText: { fontFamily: FONTS.extraBold, fontSize: 13, color: PCOLORS.white, letterSpacing: 1 },
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 18, color: PCOLORS.text },

  amountRow: {
    marginTop: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: PCOLORS.white,
    borderRadius: 12,
    padding: 12,
  },
  amountLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: PCOLORS.muted },
  amountValue: { fontFamily: FONTS.extraBold, fontSize: 20, color: PCOLORS.text },
  amountCurrency: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.muted },

  testBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: PCOLORS.dangerLight,
    borderWidth: 1,
    borderColor: PCOLORS.danger,
    borderRadius: 10,
    padding: 12,
  },
  testTitle: { fontFamily: FONTS.extraBold, fontSize: 13, color: PCOLORS.danger },
  testText: { fontFamily: FONTS.semiBold, fontSize: 12, lineHeight: 19, color: PCOLORS.danger },

  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text, marginTop: 12, marginBottom: 6 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    borderRadius: 10,
    backgroundColor: PCOLORS.white,
    paddingHorizontal: 12,
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: PCOLORS.text,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputInner: { flex: 1, minHeight: 48, fontFamily: FONTS.medium, fontSize: 15, color: PCOLORS.text, textAlign: "left", letterSpacing: 1 },
  twoCols: { flexDirection: "row", gap: 10 },

  banks: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bankChip: {
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    justifyContent: "center",
  },
  bankChipActive: { borderColor: "#0B4A8B", backgroundColor: "#0B4A8B" },
  bankText: { fontFamily: FONTS.semiBold, fontSize: 12, color: PCOLORS.text },
  bankTextActive: { color: PCOLORS.white },

  error: { marginTop: 12, fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.danger },

  payButton: {
    marginTop: 20,
    height: 56,
    borderRadius: 10,
    backgroundColor: PCOLORS.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payText: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.white },
  secureRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  secureText: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },

  center: { alignItems: "center", paddingVertical: 40, gap: 10 },
  centerTitle: { fontFamily: FONTS.bold, fontSize: 17, color: PCOLORS.text, textAlign: "center" },
  centerText: { fontFamily: FONTS.regular, fontSize: 13, color: PCOLORS.muted, textAlign: "center" },
  successCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: PCOLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});