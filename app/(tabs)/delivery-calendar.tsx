import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { fetchAllDeliveries } from "../../services/purchaseApi";
import type { DeliveryWithPurchase, PurchaseDetail } from "../../types/purchase";

import MonthCalendar, { CalendarLegend } from "../../components/purchase/MonthCalendar";
import { BackRow, CenteredLoader, ErrorState, PageTitle, StatusDot } from "../../components/purchase/ScreenParts";
import {
  CalendarMarker,
  FONTS,
  PCOLORS,
  deliveryMarker,
  formatLongDate,
  markerColor,
  parseISODate,
  purchaseTexts,
  slotLabel,
  todayISO,
} from "../../components/purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| DELIVERY CALENDAR
|--------------------------------------------------------------------------
|
| Params: animalId? (one pet, otherwise all pets)
|
*/

export default function DeliveryCalendarScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const base = purchaseTexts(isArabic);

  const params = useLocalSearchParams<{ animalId?: string }>();
  const animalId = params.animalId ? Number(params.animalId) : null;

  const t = isArabic
    ? {
        title: "تقويم التوصيل",
        subtitle: "اطلع على مواعيد توصيل الطعام الطازج وعدّلها.",
        detailsFor: "تفاصيل التاريخ المحدد",
        noDelivery: "لا يوجد توصيل مجدول في هذا التاريخ.",
        available: "تاريخ متاح للتوصيل الطازج — جدولة توصيل",
        unavailable: "هذا التاريخ خارج فترة باقاتك النشطة.",
        noPack: "لا توجد باقة نشطة. اختر باقة لبدء التوصيلات.",
        choosePlan: "اختيار باقة",
        manage: "إدارة التوصيل",
        restDay: "الأحد يوم راحة: لا يوجد توصيل.",
      }
    : {
        title: "Delivery Calendar",
        subtitle: "View and adjust your scheduled fresh food drop-offs.",
        detailsFor: "DETAILS FOR SELECTED DATE",
        noDelivery: "No delivery scheduled for this date.",
        available: "Available fresh delivery date — plan a delivery",
        unavailable: "This date is outside the period of your active plans.",
        noPack: "No active plan. Choose a plan to start your deliveries.",
        choosePlan: "Choose a plan",
        manage: "Manage Delivery",
        restDay: "Sunday is a rest day: no delivery.",
      };

  const [purchases, setPurchases] = useState<PurchaseDetail[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await fetchAllDeliveries(lang, animalId);
      setPurchases(data.purchases);
      setDeliveries(data.deliveries);
    } catch (e: any) {
      setError(e?.message || base.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang, animalId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /*
  |--------------------------------------------------------------------------
  | DERIVED DATA
  |--------------------------------------------------------------------------
  */

  const markers = useMemo(() => {
    const result: Record<string, CalendarMarker> = {};
    deliveries.forEach(({ delivery }) => (result[delivery.date] = deliveryMarker(delivery)));
    return result;
  }, [deliveries]);

  const selectedDeliveries = deliveries.filter(({ delivery }) => delivery.date === selectedDate);

  const activePurchases = purchases.filter(p => p.is_active);

  // Active pack that can still receive a delivery on the selected date
  const selectedIsRestDay = (parseISODate(selectedDate)?.getDay() ?? -1) === 0;

  const plannablePurchase = selectedIsRestDay ? undefined : activePurchases.find(
    p =>
      p.can_schedule &&
      p.usage.remaining_recipes >= p.rules.min_recipes_per_delivery &&
      p.usage.deliveries_count < p.rules.max_deliveries &&
      selectedDate >= p.rules.earliest_date &&
      selectedDate <= p.rules.latest_date
  );

  const petName = deliveries[0]?.purchase.animal?.name ?? activePurchases[0]?.animal?.name;

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

  const rtl = isArabic ? styles.textRtl : null;

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
          right={animalId && petName ? <StatusDot color={PCOLORS.primary} label={petName} isArabic={isArabic} /> : null}
        />

        <PageTitle title={t.title} subtitle={t.subtitle} isArabic={isArabic} />

        {!!error && <ErrorState message={error} retryLabel={base.retry} onRetry={load} />}

        {!error && (
          <>
            <View style={styles.calendarBox}>
              <MonthCalendar
                month={month}
                onChangeMonth={setMonth}
                selectedDate={selectedDate}
                onSelectDate={iso => {
                  setSelectedDate(iso);
                  const date = parseISODate(iso);
                  if (date && date.getMonth() !== month.getMonth()) setMonth(date);
                }}
                markers={markers}
                isArabic={isArabic}
              />

              <CalendarLegend
                labels={{ scheduled: base.scheduled, delivered: base.delivered, delayed: base.delayed }}
                isArabic={isArabic}
              />
            </View>

            {/* SELECTED DATE */}
            <View style={[styles.details, isArabic && styles.detailsRtl]}>
              <Text style={[styles.detailsLabel, rtl]}>{t.detailsFor}</Text>
              <Text style={[styles.detailsDate, rtl]}>{formatLongDate(selectedDate, isArabic)}</Text>

              {selectedDeliveries.length > 0 ? (
                selectedDeliveries.map(({ purchase, delivery }) => {
                  const marker = deliveryMarker(delivery);

                  return (
                    <View key={delivery.id} style={styles.deliveryBlock}>
                      <View style={[styles.deliveryHeader, isArabic && styles.rowRtl]}>
                        <Text style={styles.deliveryTitle}>
                          {purchase.animal?.name ? `${purchase.animal.name} · ` : ""}
                          {delivery.recipes_count} {base.meals}
                        </Text>
                        <StatusDot
                          color={markerColor(marker)}
                          label={marker === "delayed" ? base.delayed : delivery.status_label}
                          isArabic={isArabic}
                        />
                      </View>

                      {delivery.items.map((item, index) => (
                        <Text key={index} style={[styles.itemText, rtl]}>
                          {item.quantity} × {item.name}
                        </Text>
                      ))}

                      <Text style={[styles.metaText, rtl]}>
                        {slotLabel(delivery.delivery_slot)}
                        {delivery.address ? ` · ${delivery.address.label || delivery.address.address}` : ""}
                      </Text>

                      {delivery.is_editable && (
                        <Pressable
                          style={[styles.link, isArabic && styles.rowRtl]}
                          onPress={() =>
                            router.push({
                              pathname: "/manage-delivery",
                              params: { purchaseId: String(purchase.id), deliveryId: String(delivery.id) },
                            })
                          }
                        >
                          <Ionicons name={isArabic ? "arrow-back" : "arrow-forward"} size={18} color={PCOLORS.primary} />
                          <Text style={styles.linkText}>{t.manage}</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })
              ) : (
                <>
                  <Text style={[styles.noDelivery, rtl]}>{t.noDelivery}</Text>

                  {selectedIsRestDay ? (
                    <Text style={[styles.metaText, rtl]}>{t.restDay}</Text>
                  ) : plannablePurchase ? (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/distribute-package",
                          params: { id: String(plannablePurchase.id), date: selectedDate },
                        })
                      }
                    >
                      <Text style={[styles.availableText, rtl]}>{t.available}</Text>
                    </Pressable>
                  ) : activePurchases.length === 0 ? (
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: "/plans", params: animalId ? { animalId: String(animalId) } : {} })
                      }
                    >
                      <Text style={[styles.availableText, rtl]}>
                        {t.noPack} {t.choosePlan}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.metaText, rtl]}>{t.unavailable}</Text>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 60 },

  calendarBox: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: PCOLORS.border,
  },

  details: {
    marginTop: 30,
    paddingLeft: 22,
    paddingVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: PCOLORS.primary,
  },
  detailsRtl: {
    paddingLeft: 0,
    paddingRight: 22,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderRightColor: PCOLORS.primary,
  },
  detailsLabel: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1.2, color: PCOLORS.muted },
  detailsDate: { marginTop: 8, fontFamily: FONTS.bold, fontSize: 26, lineHeight: 34, color: PCOLORS.text },

  deliveryBlock: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: PCOLORS.border,
  },
  deliveryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  deliveryTitle: { fontFamily: FONTS.bold, fontSize: 16, color: PCOLORS.text },
  itemText: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 22, color: PCOLORS.text },
  metaText: { marginTop: 6, fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.muted },
  link: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  linkText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },

  noDelivery: { marginTop: 18, fontFamily: FONTS.regular, fontSize: 15, lineHeight: 23, color: PCOLORS.muted },
  availableText: { marginTop: 4, fontFamily: FONTS.medium, fontSize: 15, lineHeight: 23, color: PCOLORS.primary },
});