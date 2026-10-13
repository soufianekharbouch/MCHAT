import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { fetchAllDeliveries } from "../../services/purchaseApi";
import type { DeliveryWithPurchase } from "../../types/purchase";

import { BackRow, CenteredLoader, ErrorState, PageTitle, StatusDot } from "../../components/purchase/ScreenParts";
import {
  FONTS,
  PCOLORS,
  deliveryMarker,
  formatDate,
  formatLongDate,
  markerColor,
  purchaseTexts,
  slotLabel,
} from "../../components/purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| DELIVERY HISTORY
|--------------------------------------------------------------------------
|
| Params: animalId? (one pet, otherwise all pets)
|
*/

export default function DeliveryHistoryScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const base = purchaseTexts(isArabic);

  const params = useLocalSearchParams<{ animalId?: string }>();
  const animalId = params.animalId ? Number(params.animalId) : null;

  const t = isArabic
    ? {
        title: "سجل التوصيل",
        receivedAt: "تم الاستلام في",
        planned: "مجدول إلى",
        choosePlan: "اختيار باقة",
      }
    : {
        title: "Delivery History",
        receivedAt: "Received at",
        planned: "Planned to",
        choosePlan: "Choose a plan",
      };

  const [deliveries, setDeliveries] = useState<DeliveryWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await fetchAllDeliveries(lang, animalId);
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
        <BackRow label={base.back} isArabic={isArabic} />
        <PageTitle title={t.title} isArabic={isArabic} />

        <View style={styles.topDivider} />

        {!!error && <ErrorState message={error} retryLabel={base.retry} onRetry={load} />}

        {!error && deliveries.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={38} color={PCOLORS.muted} />
            <Text style={styles.emptyText}>{base.noDeliveries}</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/plans", params: animalId ? { animalId: String(animalId) } : {} })}
            >
              <Text style={styles.emptyLink}>{t.choosePlan}</Text>
            </Pressable>
          </View>
        )}

        {deliveries.map(({ purchase, delivery }, index) => {
          const marker = deliveryMarker(delivery);
          const delivered = delivery.status === "delivered";
          const petName = purchase.animal?.name;
          const place = delivery.address ? delivery.address.label || delivery.address.address : null;

          return (
            <View key={delivery.id} style={[styles.item, index < deliveries.length - 1 && styles.itemBorder]}>
              <View style={[styles.itemHeader, isArabic && styles.rowRtl]}>
                <Text style={styles.itemNumber}>
                  {base.delivery.toUpperCase()} #{delivery.number} • {delivery.recipes_count} {base.meals.toUpperCase()}
                </Text>
                <StatusDot
                  color={markerColor(marker)}
                  label={marker === "delayed" ? base.delayed : delivery.status_label}
                  isArabic={isArabic}
                />
              </View>

              <Text style={[styles.itemDate, rtl]}>
                {delivered ? formatDate(delivery.date, isArabic) : formatLongDate(delivery.date, isArabic)}
                {delivered && petName ? ` · ${petName}` : ""}
              </Text>

              <Text style={[styles.itemText, rtl]}>
                {delivery.items.map(item => `${item.quantity} × ${item.name}`).join(" · ")}
              </Text>

              {!!place && (
                <Text style={[styles.itemText, rtl]}>
                  {delivered ? t.receivedAt : t.planned} {place} · {slotLabel(delivery.delivery_slot)}
                </Text>
              )}

              {delivery.is_editable && (
                <Pressable
                  style={[styles.manage, isArabic && styles.rowRtl]}
                  onPress={() =>
                    router.push({
                      pathname: "/manage-delivery",
                      params: { purchaseId: String(purchase.id), deliveryId: String(delivery.id) },
                    })
                  }
                >
                  <Ionicons name={isArabic ? "arrow-back" : "arrow-forward"} size={19} color={PCOLORS.primary} />
                  <Text style={styles.manageText}>{base.manageDelivery}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 60 },

  topDivider: { height: 1, backgroundColor: PCOLORS.border },

  empty: { alignItems: "center", gap: 12, paddingVertical: 50 },
  emptyText: { fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.muted },
  emptyLink: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.primary },

  item: { paddingVertical: 28 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: PCOLORS.border },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemNumber: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, color: PCOLORS.text },
  itemDate: { marginTop: 14, fontFamily: FONTS.bold, fontSize: 24, lineHeight: 32, color: PCOLORS.text },
  itemText: { marginTop: 8, fontFamily: FONTS.regular, fontSize: 14, lineHeight: 22, color: PCOLORS.muted },
  manage: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  manageText: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
});