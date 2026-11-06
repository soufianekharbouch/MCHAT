import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cancelShopPurchase, payShopPurchase, ShopApiError } from "../../services/shopApi";
import { resultAfterPayPage } from "../../services/hesabePayment";
import { invalidateApiCache } from "../../services/apiCache";
import HesabePaymentWebView, { type PayPageResult } from "./HesabePaymentWebView";
import { FONTS, PCOLORS } from "../purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| ORDER WAITING FOR PAYMENT (Home "View order")
|--------------------------------------------------------------------------
|
| The customer finishes the payment or cancels the order himself,
| without contacting the support:
|  - Pay now      : secure Hesabe page inside the app (packs of the same
|                   order still pending paid together), result asked to the
|                   server
|  - Cancel order : 2 taps (confirmation). Already paid in the meantime:
|                   refused by the server, nothing is lost.
|
*/

type Props = {
  visible: boolean;
  purchase: any | null;
  isArabic: boolean;
  onClose: () => void;
  /** paid / cancelled: the Home reloads its data */
  onChanged: (result: "paid" | "cancelled") => void;
};

export default function PendingOrderSheet({ visible, purchase, isArabic, onClose, onChanged }: Props) {
  const insets = useSafeAreaInsets();
  const lang = isArabic ? "ar" : "en";

  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [message, setMessage] = useState("");
  const [payPage, setPayPage] = useState<{ url: string; transactionId: number } | null>(null);

  useEffect(() => {
    if (visible) {
      setMessage("");
      setBusy(null);
    }
  }, [visible, purchase?.id]);

  const t = isArabic
    ? {
        title: "طلب بانتظار الدفع",
        text: "لم يكتمل دفع هذا الطلب. يمكنك إتمام الدفع الآن أو إلغاء الطلب.",
        pet: "الحيوان",
        plan: "الباقة",
        amount: "المبلغ",
        reference: "رقم الطلب",
        pay: "إتمام الدفع",
        cancel: "إلغاء الطلب",
        close: "إغلاق",
        confirmTitle: "إلغاء الطلب",
        confirmText: "هل تريد إلغاء هذا الطلب؟ لن يتم خصم أي مبلغ.",
        keep: "الاحتفاظ بالطلب",
        yesCancel: "نعم، إلغاء",
        cancelled: "تم إلغاء طلبك.",
        paid: "تم الدفع بنجاح! تم تنظيم مواعيد التوصيل.",
        notPaid: "لم يكتمل الدفع. لم يتم خصم أي مبلغ، يمكنك المحاولة مرة أخرى.",
        checking: "لم نتلقَّ تأكيد البنك بعد. سيتم تفعيل اشتراكك تلقائياً فور التأكيد.",
      }
    : {
        title: "Order awaiting payment",
        text: "The payment of this order was not completed. You can pay now or cancel the order.",
        pet: "Pet",
        plan: "Plan",
        amount: "Amount",
        reference: "Order",
        pay: "Complete payment",
        cancel: "Cancel order",
        close: "Close",
        confirmTitle: "Cancel order",
        confirmText: "Do you want to cancel this order? No money will be taken.",
        keep: "Keep the order",
        yesCancel: "Yes, cancel",
        cancelled: "Your order has been cancelled.",
        paid: "Payment successful! Your deliveries are scheduled.",
        notPaid: "The payment was not completed. No money was taken, you can try again.",
        checking: "The bank has not confirmed yet. Your plan is activated automatically as soon as it does.",
      };

  if (!purchase) return null;

  const productName = purchase.product?.name ?? purchase.product_name ?? "";
  const petName = purchase.animal?.name ?? purchase.animal_name ?? "";
  const total = Number(purchase.price?.total ?? purchase.total_amount ?? 0);
  const currency = purchase.price?.currency ?? purchase.currency ?? "KWD";
  const dir = isArabic ? styles.textRtl : null;
  const rtl = isArabic ? styles.rowRtl : null;

  /*
  | PAY NOW
  */

  const finishPaid = () => {
    invalidateApiCache();
    Alert.alert("", t.paid);
    onChanged("paid");
  };

  const pay = async () => {
    if (busy) return;
    setBusy("pay");
    setMessage("");

    try {
      const result: any = await payShopPurchase(lang, purchase.id, (purchase.payment?.method as any) || "knet");

      // Paid at once (test mode) or already paid
      if (result.already_paid || result.paid || ["paid", "active"].includes(result?.purchase?.status)) {
        finishPaid();
        return;
      }

      if (result.payment?.url) {
        setPayPage({ url: result.payment.url, transactionId: result.payment.transaction_id });
        return; // continues in onPayPageClosed
      }

      setMessage(t.notPaid);
    } catch (e: any) {
      setMessage(e?.message || "Error");
    } finally {
      setBusy(current => (current === "pay" ? null : current));
    }
  };

  const onPayPageClosed = async (result: PayPageResult) => {
    const page = payPage;
    setPayPage(null);
    if (!page) return;

    setBusy("pay");

    try {
      // Result of the return page: no long waiting
      const outcome = await resultAfterPayPage(lang, page.transactionId, result);

      if (outcome.paid) {
        finishPaid();
      } else {
        setMessage(outcome.status === "initiated" ? t.checking : t.notPaid);
      }
    } finally {
      setBusy(null);
    }
  };

  /*
  | CANCEL
  */

  const cancel = () => {
    if (busy) return;

    Alert.alert(t.confirmTitle, t.confirmText, [
      { text: t.keep, style: "cancel" },
      {
        text: t.yesCancel,
        style: "destructive",
        onPress: async () => {
          setBusy("cancel");
          setMessage("");

          try {
            await cancelShopPurchase(lang, purchase.id);
            invalidateApiCache();
            Alert.alert("", t.cancelled);
            onChanged("cancelled");
          } catch (e: any) {
            // Paid in the meantime: the server refuses, the Home reloads
            if (e instanceof ShopApiError && e.data?.already_paid) {
              invalidateApiCache();
              Alert.alert("", e.message);
              onChanged("paid");
              return;
            }
            setMessage(e?.message || "Error");
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Modal visible={visible && !payPage} transparent animationType="slide" onRequestClose={() => !busy && onClose()}>
        <Pressable style={styles.overlay} onPress={() => !busy && onClose()} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />

          <View style={[styles.header, rtl]}>
            <View style={styles.headerIcon}>
              <Ionicons name="time-outline" size={22} color={PCOLORS.white} />
            </View>
            <Text style={[styles.title, dir]}>{t.title}</Text>
          </View>

          <Text style={[styles.text, dir]}>{t.text}</Text>

          <View style={styles.box}>
            {!!petName && <Row label={t.pet} value={petName} rtl={isArabic} />}
            {!!productName && <Row label={t.plan} value={productName} rtl={isArabic} />}
            <Row label={t.amount} value={`${total.toFixed(3)} ${currency}`} rtl={isArabic} strong />
            {!!purchase.reference && <Row label={t.reference} value={purchase.reference} rtl={isArabic} />}
          </View>

          {message !== "" && <Text style={[styles.message, dir]}>{message}</Text>}

          <Pressable
            onPress={() => void pay()}
            disabled={!!busy}
            style={({ pressed }) => [styles.primary, rtl, (pressed || !!busy) && styles.pressed]}
          >
            {busy === "pay" ? (
              <ActivityIndicator color={PCOLORS.white} />
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={18} color={PCOLORS.white} />
                <Text style={styles.primaryText}>{t.pay}</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={cancel}
            disabled={!!busy}
            style={({ pressed }) => [styles.cancel, rtl, (pressed || !!busy) && styles.pressed]}
          >
            {busy === "cancel" ? (
              <ActivityIndicator color={PCOLORS.danger} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={PCOLORS.danger} />
                <Text style={styles.cancelText}>{t.cancel}</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={() => !busy && onClose()} hitSlop={8} style={styles.closeLink}>
            <Text style={styles.closeText}>{t.close}</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Hesabe page inside the app */}
      <HesabePaymentWebView visible={!!payPage} url={payPage?.url ?? null} isArabic={isArabic} onFinish={result => void onPayPageClosed(result)} />
    </>
  );
}

function Row({ label, value, rtl, strong }: { label: string; value: string; rtl: boolean; strong?: boolean }) {
  return (
    <View style={[styles.row, rtl && styles.rowRtl]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.8 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: PCOLORS.white,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: PCOLORS.border, marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  headerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#E0A100", alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 17, color: PCOLORS.text },
  text: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.muted, marginBottom: 12 },

  box: { padding: 12, borderRadius: 12, backgroundColor: PCOLORS.primaryLight, gap: 6, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rowLabel: { fontFamily: FONTS.regular, fontSize: 13, color: PCOLORS.muted },
  rowValue: { flexShrink: 1, fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.text },
  rowStrong: { fontFamily: FONTS.bold, fontSize: 15 },

  message: { fontFamily: FONTS.medium, fontSize: 12.5, lineHeight: 19, color: PCOLORS.danger, marginBottom: 10 },

  primary: {
    height: 50,
    borderRadius: 12,
    backgroundColor: PCOLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.white },
  cancel: {
    height: 46,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PCOLORS.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.danger },
  closeLink: { alignSelf: "center", paddingVertical: 12 },
  closeText: { fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.muted },
});