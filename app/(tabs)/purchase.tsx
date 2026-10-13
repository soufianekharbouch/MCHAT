import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useAppLanguage } from "../../context/LanguageContext";
import { cancelPurchase, fetchPurchase, uploadPaymentProof } from "../../services/purchaseApi";
import type { PurchaseDetail } from "../../types/purchase";

import SubscriptionCard from "../../components/purchase/SubscriptionCard";
import { BackRow, CenteredLoader, ErrorState, PrimaryButton, StatusDot } from "../../components/purchase/ScreenParts";
import {
  FONTS,
  PCOLORS,
  deliveryMarker,
  formatLongDate,
  markerColor,
  purchaseTexts,
  slotLabel,
} from "../../components/purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| PURCHASE DETAIL
|--------------------------------------------------------------------------
|
| Params: id
|
*/

export default function PurchaseScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const base = purchaseTexts(isArabic);

  const params = useLocalSearchParams<{ id?: string }>();
  const purchaseId = Number(params.id);

  const t = isArabic
    ? {
        reference: "رقم الطلب",
        paymentTitle: "الدفع",
        transferTitle: "التحويل البنكي",
        transferText: "قم بالتحويل ثم أرسل صورة الإيصال. سنقوم بتفعيل باقتك بعد التحقق.",
        reference_placeholder: "رقم العملية (اختياري)",
        pickReceipt: "اختيار صورة الإيصال",
        sending: "جاري الإرسال...",
        cancelTitle: "إلغاء الطلب",
        cancelMessage: "هل تريد إلغاء هذا الطلب؟",
        yesCancel: "نعم، إلغاء",
        deliveriesTitle: "التوصيلات",
        planHint: "اختر تواريخ التوصيل ووزّع وجباتك.",
        photoPermission: "يجب السماح للتطبيق بالوصول إلى الصور.",
      }
    : {
        reference: "Order",
        paymentTitle: "Payment",
        transferTitle: "Bank transfer",
        transferText: "Make the transfer, then send a photo of the receipt. We activate your plan once it is verified.",
        reference_placeholder: "Transaction number (optional)",
        pickReceipt: "Choose receipt photo",
        sending: "Sending...",
        cancelTitle: "Cancel purchase",
        cancelMessage: "Do you want to cancel this purchase?",
        yesCancel: "Yes, cancel",
        deliveriesTitle: "Deliveries",
        planHint: "Choose your delivery dates and split your meals.",
        photoPermission: "Please allow access to your photos.",
      };

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [paymentReference, setPaymentReference] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!purchaseId) {
      setError(base.error);
      setLoading(false);
      return;
    }

    try {
      setError("");
      setPurchase(await fetchPurchase(purchaseId, lang));
    } catch (e: any) {
      setError(e?.message || base.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [purchaseId, lang]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /*
  |--------------------------------------------------------------------------
  | ACTIONS
  |--------------------------------------------------------------------------
  */

  const openPlanning = () =>
    router.push({ pathname: "/distribute-package", params: { id: String(purchaseId) } });

  const openRenew = () =>
    router.push({ pathname: "/plans", params: purchase?.animal ? { animalId: String(purchase.animal.id) } : {} });

  const sendReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("", t.photoPermission);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];

    try {
      setUploading(true);

      const response = await uploadPaymentProof(
        purchaseId,
        lang,
        { uri: asset.uri, name: asset.fileName ?? undefined, mimeType: asset.mimeType },
        paymentReference.trim() || undefined
      );

      setPurchase(response.purchase);
      setPaymentReference("");

      if (response.message) Alert.alert(base.success, response.message);
    } catch (e: any) {
      Alert.alert("", e?.message || base.error);
    } finally {
      setUploading(false);
    }
  };

  const confirmCancel = () => {
    Alert.alert(t.cancelTitle, t.cancelMessage, [
      { text: base.cancel, style: "cancel" },
      {
        text: t.yesCancel,
        style: "destructive",
        onPress: async () => {
          try {
            setPurchase(await cancelPurchase(purchaseId, lang));
          } catch (e: any) {
            Alert.alert("", e?.message || base.error);
          }
        },
      },
    ]);
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <CenteredLoader />
      </SafeAreaView>
    );
  }

  if (error || !purchase) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <View style={styles.page}>
          <BackRow label={base.back} isArabic={isArabic} />
          <ErrorState message={error || base.error} retryLabel={base.retry} onRetry={load} />
        </View>
      </SafeAreaView>
    );
  }

  const rtl = isArabic ? styles.textRtl : null;
  const deliveries = purchase.deliveries;

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={PCOLORS.primary}
          />
        }
      >
        <BackRow
          label={base.back}
          isArabic={isArabic}
          right={
            purchase.animal ? (
              <StatusDot color={PCOLORS.primary} label={purchase.animal.name} isArabic={isArabic} />
            ) : null
          }
        />

        <Text style={[styles.reference, rtl]}>
          {t.reference} {purchase.reference}
        </Text>

        <SubscriptionCard
          purchase={purchase}
          isArabic={isArabic}
          onPlan={openPlanning}
          onRenew={["completed", "expired", "active"].includes(purchase.status) ? openRenew : undefined}
          onCancel={confirmCancel}
        />

        {/* BANK TRANSFER RECEIPT */}
        {purchase.can_upload_payment_proof && purchase.payment.method === "bank_transfer" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, rtl]}>{t.transferTitle}</Text>
            <Text style={[styles.sectionText, rtl]}>{t.transferText}</Text>

            {purchase.payment.proof_uploaded && (
              <View style={[styles.okBox, isArabic && styles.rowRtl]}>
                <Ionicons name="checkmark-circle" size={19} color={PCOLORS.primary} />
                <Text style={[styles.okText, rtl]}>{base.receiptSent}</Text>
              </View>
            )}

            <TextInput
              value={paymentReference}
              onChangeText={setPaymentReference}
              placeholder={t.reference_placeholder}
              placeholderTextColor={PCOLORS.muted}
              style={[styles.input, isArabic && styles.textRtl]}
            />

            <PrimaryButton
              label={uploading ? t.sending : t.pickReceipt}
              icon="cloud-upload-outline"
              loading={uploading}
              onPress={sendReceipt}
            />
          </View>
        )}

        {/* DELIVERIES */}
        {purchase.is_active && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, rtl]}>{t.deliveriesTitle}</Text>

            {deliveries.length === 0 ? (
              <Text style={[styles.sectionText, rtl]}>{t.planHint}</Text>
            ) : (
              deliveries.map((delivery, index) => {
                const marker = deliveryMarker(delivery);

                return (
                  <Pressable
                    key={delivery.id}
                    style={[styles.deliveryRow, index < deliveries.length - 1 && styles.rowBorder]}
                    onPress={() =>
                      router.push({
                        pathname: "/manage-delivery",
                        params: { purchaseId: String(purchase.id), deliveryId: String(delivery.id) },
                      })
                    }
                  >
                    <View style={[styles.deliveryHeader, isArabic && styles.rowRtl]}>
                      <Text style={styles.deliveryNumber}>
                        {base.delivery.toUpperCase()} #{delivery.number} • {delivery.recipes_count} {base.meals.toUpperCase()}
                      </Text>
                      <StatusDot
                        color={markerColor(marker)}
                        label={marker === "delayed" ? base.delayed : delivery.status_label}
                        isArabic={isArabic}
                      />
                    </View>
                    <Text style={[styles.deliveryDate, rtl]}>{formatLongDate(delivery.date, isArabic)}</Text>
                    <Text style={[styles.deliveryMeta, rtl]}>
                      {slotLabel(delivery.delivery_slot)}
                      {delivery.address ? ` · ${delivery.address.label || delivery.address.address}` : ""}
                    </Text>
                  </Pressable>
                );
              })
            )}

            {/* LINKS */}
            <View style={styles.links}>
              <LinkRow
                icon="calendar-clear-outline"
                label={base.deliveryCalendar}
                isArabic={isArabic}
                onPress={() =>
                  router.push({
                    pathname: "/delivery-calendar",
                    params: purchase.animal ? { animalId: String(purchase.animal.id) } : {},
                  })
                }
              />
              <LinkRow
                icon="time-outline"
                label={base.deliveryHistory}
                isArabic={isArabic}
                onPress={() =>
                  router.push({
                    pathname: "/delivery-history",
                    params: purchase.animal ? { animalId: String(purchase.animal.id) } : {},
                  })
                }
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  isArabic,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  isArabic: boolean;
}) {
  return (
    <Pressable style={[styles.linkRow, isArabic && styles.rowRtl]} onPress={onPress}>
      <View style={[styles.linkLeft, isArabic && styles.rowRtl]}>
        <Ionicons name={icon} size={23} color={PCOLORS.primary} />
        <Text style={styles.linkText}>{label}</Text>
      </View>
      <Ionicons name={isArabic ? "arrow-back" : "arrow-forward"} size={19} color={PCOLORS.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 55 },

  reference: {
    marginBottom: 12,
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: PCOLORS.muted,
  },

  section: {
    marginTop: 34,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: PCOLORS.text,
    marginBottom: 8,
  },
  sectionText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: PCOLORS.muted,
    marginBottom: 16,
  },
  okBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginBottom: 14,
    borderRadius: 9,
    backgroundColor: PCOLORS.primaryLight,
  },
  okText: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.text },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    borderRadius: 8,
    backgroundColor: PCOLORS.inputBackground,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: PCOLORS.text,
  },

  deliveryRow: { paddingVertical: 20 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: PCOLORS.border },
  deliveryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deliveryNumber: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, color: PCOLORS.text },
  deliveryDate: { marginTop: 10, fontFamily: FONTS.bold, fontSize: 20, color: PCOLORS.text },
  deliveryMeta: { marginTop: 4, fontFamily: FONTS.regular, fontSize: 13, color: PCOLORS.muted },

  links: { marginTop: 16, borderTopWidth: 1, borderTopColor: PCOLORS.border },
  linkRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
  linkLeft: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  linkText: { fontFamily: FONTS.medium, fontSize: 15, color: PCOLORS.text },
});