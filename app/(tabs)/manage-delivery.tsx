import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { fetchPurchase } from "../../services/purchaseApi";
import type { PurchaseDelivery, PurchaseDetail } from "../../types/purchase";

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
| ONE DELIVERY (read only)
|--------------------------------------------------------------------------
|
| Params: purchaseId, deliveryId
|
| Shows the delivery as cards: date, time slot, address, recipes.
| Nothing is changed here: "Re-distribute Package Deliveries" opens the
| planning screen of the pack (all the deliveries of the pack together).
|
*/

export default function ManageDeliveryScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const base = purchaseTexts(isArabic);

  const params = useLocalSearchParams<{ purchaseId?: string; deliveryId?: string }>();
  const purchaseId = Number(params.purchaseId);
  const deliveryId = Number(params.deliveryId);

  const t = isArabic
    ? {
        cutoff: (hour: number) => `يمكن تغيير هذا التوصيل حتى الساعة ${hour}:00 في اليوم السابق.`,
        lockedMessage: "لم يعد بالإمكان تغيير هذا التوصيل (تجاوز آخر موعد أو قيد التحضير).",
        date: "تاريخ التوصيل",
        slot: "وقت التوصيل",
        addressSlot: "حسب العنوان",
        address: "عنوان التوصيل",
        noAddress: "لا يوجد عنوان",
        recipes: "الوصفات",
        pet: "الحيوان",
        packaging: "عبوة طازجة مبردة ومفرغة من الهواء",
        distributeText: (n: number, max: number) =>
          `لتغيير التاريخ أو الوصفات، أعد توزيع باقة ${n} وجبة (حتى ${max} توصيلات).`,
        redistribute: "إعادة توزيع توصيلات الباقة",
        support: "الدعم",
        notFound: "التوصيل غير موجود.",
      }
    : {
        cutoff: (hour: number) =>
          `This delivery can be changed until ${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"} the day before.`,
        lockedMessage: "This delivery can no longer be changed (past the cutoff or being prepared).",
        date: "Delivery date",
        slot: "Delivery time",
        addressSlot: "Slot of the address",
        address: "Delivery address",
        noAddress: "No address",
        recipes: "Recipes",
        pet: "Pet",
        packaging: "Fresh Vacuum Chilled Pouch",
        distributeText: (n: number, max: number) =>
          `To change the date or the recipes, re-distribute your ${n}-meal package (up to ${max} deliveries).`,
        redistribute: "Re-distribute Package Deliveries",
        support: "Support",
        notFound: "Delivery not found.",
      };

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setPurchase(await fetchPurchase(purchaseId, lang));
    } catch (e: any) {
      setError(e?.message || base.error);
    } finally {
      setLoading(false);
    }
  }, [purchaseId, lang]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const delivery = useMemo<PurchaseDelivery | null>(
    () => purchase?.deliveries.find(d => d.id === deliveryId) ?? null,
    [purchase, deliveryId]
  );

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <CenteredLoader />
      </SafeAreaView>
    );
  }

  if (error || !purchase || !delivery) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <View style={styles.page}>
          <BackRow label={base.back} isArabic={isArabic} />
          <ErrorState message={error || t.notFound} retryLabel={base.retry} onRetry={load} />
        </View>
      </SafeAreaView>
    );
  }

  const rules = purchase.rules;
  const rtl = isArabic ? styles.textRtl : null;
  const row = isArabic ? styles.rowRtl : null;
  const marker = deliveryMarker(delivery);
  const address = delivery.address;
  const petName = purchase.animal?.name ?? null;

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <BackRow
          label={base.back}
          isArabic={isArabic}
          right={
            <StatusDot
              color={markerColor(marker)}
              label={marker === "delayed" ? base.delayed : delivery.status_label}
              isArabic={isArabic}
            />
          }
        />

        {/* HEADER */}
        <Text style={[styles.deliveryLabel, rtl]}>
          {base.delivery.toUpperCase()} #{delivery.number}
          {petName ? ` · ${petName}` : ""}
        </Text>
        <View style={[styles.countRow, row]}>
          <Text style={styles.count}>{delivery.recipes_count}</Text>
          <Text style={styles.countSuffix}>{base.meals}</Text>
        </View>

        {/* DATE + TIME */}
        <View style={[styles.twoCards, row]}>
          <InfoCard
            icon="calendar-outline"
            label={t.date}
            value={formatLongDate(delivery.date, isArabic)}
            isArabic={isArabic}
          />
          <InfoCard
            icon="time-outline"
            label={t.slot}
            value={delivery.delivery_slot ? slotLabel(delivery.delivery_slot) : t.addressSlot}
            isArabic={isArabic}
          />
        </View>

        {/* ADDRESS */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, row]}>
            <Ionicons name="location-outline" size={18} color={PCOLORS.primary} />
            <Text style={[styles.cardLabel, rtl]}>{t.address}</Text>
          </View>
          {address ? (
            <>
              {!!address.label && <Text style={[styles.cardValue, rtl]}>{address.label}</Text>}
              <Text style={[styles.cardText, rtl]}>{address.address}</Text>
            </>
          ) : (
            <Text style={[styles.cardText, rtl]}>{t.noAddress}</Text>
          )}
        </View>

        {/* RECIPES */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, row]}>
            <MaterialCommunityIcons name="food-variant" size={18} color={PCOLORS.primary} />
            <Text style={[styles.cardLabel, { flex: 1 }, rtl]}>{t.recipes}</Text>
            <Text style={styles.cardCount}>
              {delivery.recipes_count} {base.meals}
            </Text>
          </View>

          {delivery.items.map((item, index) => (
            <View
              key={`${item.name}-${index}`}
              style={[styles.recipeRow, index < delivery.items.length - 1 && styles.recipeBorder, row]}
            >
              <View style={styles.recipeQty}>
                <Text style={styles.recipeQtyText}>{item.quantity}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recipeName, rtl]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.recipeSub, rtl]}>{t.packaging}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CUTOFF / LOCKED */}
        <View style={[styles.notice, !delivery.is_editable && styles.noticeLocked, row]}>
          <Ionicons
            name={delivery.is_editable ? "information-circle-outline" : "lock-closed-outline"}
            size={18}
            color={delivery.is_editable ? PCOLORS.primary : PCOLORS.danger}
          />
          <Text style={[styles.noticeText, rtl]}>
            {delivery.is_editable ? t.cutoff(rules.edit_cutoff_hour) : t.lockedMessage}
          </Text>
        </View>

        {/* CHANGES: only on the planning screen of the pack */}
        {delivery.is_editable && (
          <>
            <Text style={[styles.sectionText, rtl]}>{t.distributeText(rules.total_recipes, rules.max_deliveries)}</Text>
            <PrimaryButton
              label={t.redistribute}
              icon="calendar-outline"
              onPress={() => router.push({ pathname: "/distribute-package", params: { id: String(purchase.id) } })}
            />
          </>
        )}

        <Pressable onPress={() => router.push("/support-tickets")} style={[styles.outlineButton, row]}>
          <Ionicons name="headset-outline" size={19} color={PCOLORS.text} />
          <Text style={styles.outlineText}>{t.support}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| SMALL INFO CARD (date, time)
|--------------------------------------------------------------------------
*/

function InfoCard({
  icon,
  label,
  value,
  isArabic,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  isArabic: boolean;
}) {
  const rtl = isArabic ? styles.textRtl : null;

  return (
    <View style={[styles.card, styles.halfCard]}>
      <View style={[styles.cardHeader, isArabic && styles.rowRtl]}>
        <Ionicons name={icon} size={18} color={PCOLORS.primary} />
        <Text style={[styles.cardLabel, rtl]}>{label}</Text>
      </View>
      <Text style={[styles.cardValue, rtl]}>{value}</Text>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 60 },

  deliveryLabel: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, color: PCOLORS.muted },
  countRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 4, marginBottom: 16 },
  count: { fontFamily: FONTS.extraBold, fontSize: 40, lineHeight: 50, color: PCOLORS.text },
  countSuffix: { fontFamily: FONTS.regular, fontSize: 18, color: PCOLORS.text },

  twoCards: { flexDirection: "row", gap: 12 },
  card: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  halfCard: { flex: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  cardLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: PCOLORS.muted },
  cardValue: { fontFamily: FONTS.bold, fontSize: 15, lineHeight: 22, color: PCOLORS.text },
  cardText: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.text },
  cardCount: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.primary },

  recipeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  recipeBorder: { borderBottomWidth: 1, borderBottomColor: PCOLORS.border },
  recipeQty: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PCOLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeQtyText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.primary },
  recipeName: { fontFamily: FONTS.semiBold, fontSize: 14, lineHeight: 20, color: PCOLORS.text },
  recipeSub: { fontFamily: FONTS.regular, fontSize: 11.5, color: PCOLORS.muted },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: PCOLORS.primaryLight,
  },
  noticeLocked: { backgroundColor: PCOLORS.dangerLight },
  noticeText: { flex: 1, fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.text },

  sectionText: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.muted, marginBottom: 12 },

  outlineButton: {
    minHeight: 50,
    marginTop: 14,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  outlineText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
});