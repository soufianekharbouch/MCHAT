import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { fetchPurchase, schedulePurchase, skipDelivery } from "../../services/purchaseApi";
import type { PurchaseDelivery, PurchaseDetail, ScheduleDeliveryInput } from "../../types/purchase";

import RecipeQuantityRow from "../../components/purchase/RecipeQuantityRow";
import { AddressField, DateField, SlotChips } from "../../components/purchase/DeliveryFields";
import { BackRow, CenteredLoader, ErrorState, PrimaryButton, StatusDot } from "../../components/purchase/ScreenParts";
import {
  CalendarMarker,
  FONTS,
  PCOLORS,
  deliveryMarker,
  formatLongDate,
  markerColor,
  purchaseTexts,
  todayISO,
} from "../../components/purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| MANAGE ONE DELIVERY
|--------------------------------------------------------------------------
|
| Params: purchaseId, deliveryId
|
| Changes are saved with /schedule (all editable deliveries are sent,
| this one with its changes) so the pack rules are checked together.
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
        cutoff: (hour: number) => `آخر موعد للتعديل: الساعة ${hour}:00 في اليوم السابق للتوصيل`,
        lockedMessage: "لم يعد بالإمكان تعديل هذا التوصيل (تجاوز آخر موعد أو قيد التحضير).",
        details: "تفاصيل التوصيل",
        date: "اختر تاريخ التوصيل الجديد",
        address: "عنوان التوصيل",
        slot: "وقت التوصيل",
        selectAddress: "اختر عنواناً",
        selectDate: "اختر تاريخاً",
        summary: "ملخص الوجبات",
        packaging: "عبوة طازجة مبردة ومفرغة من الهواء",
        distributeTitle: (n: number) => `توزيع باقة ${n} وجبة`,
        distributeText: (n: number, max: number) =>
          `يمكن تقسيم باقة ${n} وجبة على ${max} توصيلات كحد أقصى. لا يمكن أن يتجاوز المجموع ${n}.`,
        redistribute: "إعادة توزيع توصيلات الباقة",
        confirmUpdate: "تأكيد تعديل التوصيل",
        skip: "تخطي التاريخ",
        support: "الدعم",
        skipTitle: "تخطي هذا التوصيل",
        skipMessage: "سيتم إلغاء هذا التوصيل وتعود وجباته إلى رصيدك المتبقي.",
        skipConfirm: "تخطي",
        errCount: (min: number, max: number) => `يجب أن يحتوي التوصيل على ${min} إلى ${max} وجبات.`,
        notFound: "التوصيل غير موجود.",
      }
    : {
        cutoff: (hour: number) => `Edit cutoff: ${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"} on the day before delivery`,
        lockedMessage: "This delivery can no longer be changed (past the cutoff or being prepared).",
        details: "Delivery details",
        date: "Select New Delivery Date",
        address: "Delivery Address",
        slot: "Delivery Time Slot",
        selectAddress: "Select an address",
        selectDate: "Select a date",
        summary: "Meal Summary",
        packaging: "Fresh Vacuum Chilled Pouch",
        distributeTitle: (n: number) => `Distribute ${n}-Meal Package`,
        distributeText: (n: number, max: number) =>
          `A ${n}-meal package can be divided into a maximum of ${max} deliveries. Totals cannot exceed ${n}.`,
        redistribute: "Re-distribute Package Deliveries",
        confirmUpdate: "Confirm Delivery Update",
        skip: "Skip Date",
        support: "Support",
        skipTitle: "Skip this delivery",
        skipMessage: "This delivery will be cancelled and its meals go back to your remaining balance.",
        skipConfirm: "Skip",
        errCount: (min: number, max: number) => `The delivery must contain ${min} to ${max} meals.`,
        notFound: "Delivery not found.",
      };

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Editable copy of the delivery
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [items, setItems] = useState<Record<number, number>>({});

  const load = useCallback(async () => {
    try {
      setError("");
      const detail = await fetchPurchase(purchaseId, lang);
      setPurchase(detail);

      const delivery = detail.deliveries.find(d => d.id === deliveryId);

      if (delivery) {
        setDate(delivery.date);
        setSlot(delivery.delivery_slot ?? null);
        setAddressId(delivery.address?.id ?? null);

        const next: Record<number, number> = {};
        delivery.items.forEach(item => {
          if (item.recipe_id) next[item.recipe_id] = (next[item.recipe_id] ?? 0) + item.quantity;
        });
        setItems(next);
      }
    } catch (e: any) {
      setError(e?.message || base.error);
    } finally {
      setLoading(false);
    }
  }, [purchaseId, deliveryId, lang]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const delivery = useMemo<PurchaseDelivery | null>(
    () => purchase?.deliveries.find(d => d.id === deliveryId) ?? null,
    [purchase, deliveryId]
  );

  /*
  |--------------------------------------------------------------------------
  | TOTALS (other deliveries + this one)
  |--------------------------------------------------------------------------
  */

  const others = useMemo(() => purchase?.deliveries.filter(d => d.id !== deliveryId) ?? [], [purchase, deliveryId]);

  const count = Object.values(items).reduce((sum, q) => sum + q, 0);
  const othersTotal = others.reduce((sum, d) => sum + d.recipes_count, 0);

  const recipeTotalsOthers = useMemo(() => {
    const totals: Record<number, number> = {};
    others.forEach(d =>
      d.items.forEach(item => {
        if (item.recipe_id) totals[item.recipe_id] = (totals[item.recipe_id] ?? 0) + item.quantity;
      })
    );
    return totals;
  }, [others]);

  /*
  |--------------------------------------------------------------------------
  | ACTIONS
  |--------------------------------------------------------------------------
  */

  const changeQuantity = (recipeId: number, delta: number) => {
    setItems(current => {
      const next = { ...current, [recipeId]: Math.max(0, (current[recipeId] ?? 0) + delta) };
      if (next[recipeId] === 0) delete next[recipeId];
      return next;
    });
  };

  const confirmUpdate = async () => {
    if (!purchase || !delivery || !date || saving) return;

    const rules = purchase.rules;

    if (count < rules.min_recipes_per_delivery || count > rules.max_recipes_per_delivery) {
      Alert.alert("", t.errCount(rules.min_recipes_per_delivery, rules.max_recipes_per_delivery));
      return;
    }

    /*
     * All editable deliveries are sent: this one with the changes,
     * the others unchanged (locked ones are kept by the server).
     */
    const rows: ScheduleDeliveryInput[] = purchase.deliveries
      .filter(d => d.is_editable)
      .map(d =>
        d.id === delivery.id
          ? {
              id: d.id,
              date,
              delivery_slot: slot,
              address_id: addressId,
              items: Object.entries(items)
                .filter(([, quantity]) => quantity > 0)
                .map(([recipeId, quantity]) => ({ recipe_id: Number(recipeId), quantity })),
            }
          : {
              id: d.id,
              date: d.date,
              delivery_slot: d.delivery_slot ?? null,
              address_id: d.address?.id ?? null,
              items: d.items
                .filter(item => item.recipe_id)
                .map(item => ({ recipe_id: item.recipe_id as number, quantity: item.quantity })),
            }
      );

    try {
      setSaving(true);
      const result = await schedulePurchase(purchase.id, lang, { deliveries: rows });
      setPurchase(result.purchase);
      Alert.alert(base.success, result.message || "");
    } catch (e: any) {
      Alert.alert("", e?.message || base.error);
    } finally {
      setSaving(false);
    }
  };

  const confirmSkip = () => {
    if (!purchase || !delivery) return;

    Alert.alert(t.skipTitle, t.skipMessage, [
      { text: base.cancel, style: "cancel" },
      {
        text: t.skipConfirm,
        style: "destructive",
        onPress: async () => {
          try {
            const result = await skipDelivery(purchase.id, delivery.id, lang);
            Alert.alert(base.success, result.message || "");
            router.replace({ pathname: "/purchase", params: { id: String(purchase.id) } });
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
  const editable = delivery.is_editable;
  const rtl = isArabic ? styles.textRtl : null;
  const marker = deliveryMarker(delivery);

  const otherDates: Record<string, CalendarMarker> = {};
  others.forEach(d => (otherDates[d.date] = deliveryMarker(d)));

  const minDate = rules.earliest_date > todayISO() ? rules.earliest_date : todayISO();

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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

        <Text style={[styles.deliveryLabel, rtl]}>
          {base.delivery.toUpperCase()} #{delivery.number} · {formatLongDate(delivery.date, isArabic)}
        </Text>

        {/* MEALS COUNT */}
        <View style={[styles.bigCountRow, isArabic && styles.rowRtl]}>
          <Text style={styles.bigCount}>{count}</Text>
          <Text style={styles.bigCountSuffix}>{base.meals}</Text>
        </View>

        {/* CUTOFF */}
        <View style={[styles.notice, isArabic && styles.rowRtl]}>
          <Ionicons name="time-outline" size={20} color={PCOLORS.primary} />
          <Text style={[styles.noticeText, rtl]}>{t.cutoff(rules.edit_cutoff_hour)}</Text>
        </View>

        {!editable && (
          <View style={[styles.notice, styles.noticeDanger, isArabic && styles.rowRtl]}>
            <Ionicons name="lock-closed-outline" size={20} color={PCOLORS.danger} />
            <Text style={[styles.noticeText, rtl]}>{t.lockedMessage}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* DETAILS */}
        <Text style={[styles.sectionTitle, rtl]}>{t.details}</Text>

        <DateField
          label={t.date}
          value={date}
          onChange={setDate}
          minDate={minDate}
          maxDate={rules.latest_date}
          markers={otherDates}
          disabled={!editable}
          isArabic={isArabic}
          placeholder={t.selectDate}
        />

        <AddressField
          label={t.address}
          addresses={purchase.addresses}
          value={addressId}
          onChange={address => setAddressId(address.id)}
          disabled={!editable}
          isArabic={isArabic}
          placeholder={t.selectAddress}
        />

        <SlotChips
          label={t.slot}
          slots={purchase.delivery_slots}
          value={slot}
          onChange={setSlot}
          disabled={!editable}
          isArabic={isArabic}
        />

        {/* MEAL SUMMARY */}
        <View style={[styles.summaryHeader, isArabic && styles.rowRtl]}>
          <Text style={styles.sectionTitle}>{t.summary}</Text>
          <Text style={styles.summaryCount}>
            {count} {base.meals}
          </Text>
        </View>

        <View style={styles.summaryList}>
          {(editable ? purchase.recipes : purchase.recipes.filter(r => (items[r.id] ?? 0) > 0)).map((recipe, index, list) => {
            const quantity = items[recipe.id] ?? 0;
            const recipeTotal = (recipeTotalsOthers[recipe.id] ?? 0) + quantity;

            const canIncrement =
              count < rules.max_recipes_per_delivery &&
              othersTotal + count < rules.total_recipes &&
              (recipe.max_quantity === null || recipeTotal < recipe.max_quantity);

            return (
              <RecipeQuantityRow
                key={recipe.id}
                index={index + 1}
                name={recipe.name}
                subtitle={t.packaging}
                quantity={quantity}
                editable={editable}
                canIncrement={canIncrement}
                canDecrement={quantity > 0}
                onIncrement={() => changeQuantity(recipe.id, 1)}
                onDecrement={() => changeQuantity(recipe.id, -1)}
                isArabic={isArabic}
                isLast={index === list.length - 1}
              />
            );
          })}
        </View>

        {/* DISTRIBUTE */}
        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, rtl]}>{t.distributeTitle(rules.total_recipes)}</Text>
        <Text style={[styles.sectionText, rtl]}>{t.distributeText(rules.total_recipes, rules.max_deliveries)}</Text>

        <Pressable
          style={styles.redistributeButton}
          onPress={() => router.push({ pathname: "/distribute-package", params: { id: String(purchase.id) } })}
        >
          <Text style={styles.redistributeText}>{t.redistribute}</Text>
        </Pressable>

        <View style={styles.divider} />

        {/* ACTIONS */}
        <PrimaryButton label={t.confirmUpdate} onPress={confirmUpdate} loading={saving} disabled={!editable} />

        <View style={[styles.actionsRow, isArabic && styles.rowRtl]}>
          <Pressable
            disabled={!editable}
            onPress={confirmSkip}
            style={[styles.outlineButton, styles.skipButton, !editable && styles.disabled]}
          >
            <Text style={styles.outlineText}>{t.skip}</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/support-tickets")}
            style={[styles.outlineButton, isArabic && styles.rowRtl]}
          >
            <Ionicons name="headset-outline" size={19} color={PCOLORS.text} />
            <Text style={styles.outlineText}>{t.support}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 60 },

  deliveryLabel: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, color: PCOLORS.muted },

  bigCountRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 6, marginBottom: 18 },
  bigCount: { fontFamily: FONTS.extraBold, fontSize: 58, lineHeight: 70, color: PCOLORS.text },
  bigCountSuffix: { fontFamily: FONTS.regular, fontSize: 26, color: PCOLORS.text },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderLeftWidth: 2,
    borderLeftColor: PCOLORS.border,
  },
  noticeDanger: { borderLeftColor: PCOLORS.danger },
  noticeText: { flex: 1, fontFamily: FONTS.regular, fontSize: 13.5, lineHeight: 21, color: PCOLORS.text },

  divider: { height: 1, backgroundColor: PCOLORS.border, marginVertical: 24 },

  sectionTitle: { fontFamily: FONTS.bold, fontSize: 24, color: PCOLORS.text, marginBottom: 16 },
  sectionText: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 23, color: PCOLORS.muted, marginBottom: 18 },

  summaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 },
  summaryCount: { fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.primary },
  summaryList: { borderTopWidth: 1, borderTopColor: PCOLORS.border },

  redistributeButton: {
    minHeight: 58,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#B7DAD4",
    backgroundColor: "#E5ECE8",
    alignItems: "center",
    justifyContent: "center",
  },
  redistributeText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },

  actionsRow: { flexDirection: "row", gap: 14, marginTop: 14 },
  outlineButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  skipButton: { borderColor: "#F2C4C6" },
  outlineText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  disabled: { opacity: 0.45 },
});