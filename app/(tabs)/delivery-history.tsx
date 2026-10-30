import React, { useCallback, useState } from "react";
import { LayoutAnimation, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, UIManager, View } from "react-native";
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

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/*
|--------------------------------------------------------------------------
| DELIVERY HISTORY
|--------------------------------------------------------------------------
|
| Params: animalId? (one pet, otherwise all pets)
|
| One line per delivery (date, meals, status). Tap: the recipes and the
| address, read only (changes are made in "Manage delivery").
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
        recipes: "الوصفات",
      }
    : {
        title: "Delivery History",
        receivedAt: "Received at",
        planned: "Planned to",
        choosePlan: "Choose a plan",
        recipes: "Recipes",
      };

  const [deliveries, setDeliveries] = useState<DeliveryWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIds(current => ({ ...current, [id]: !current[id] }));
  };

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

          const open = !!openIds[delivery.id];

          return (
            <View key={delivery.id} style={[styles.item, index < deliveries.length - 1 && styles.itemBorder]}>
              {/* CLOSED: one line */}
              <Pressable onPress={() => toggle(delivery.id)} style={[styles.itemRow, isArabic && styles.rowRtl]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemDate, rtl]} numberOfLines={1}>
                    {delivered ? formatDate(delivery.date, isArabic) : formatLongDate(delivery.date, isArabic)}
                  </Text>
                  <Text style={[styles.itemMeta, rtl]} numberOfLines={1}>
                    #{delivery.number} · {delivery.recipes_count} {base.meals}
                    {petName ? ` · ${petName}` : ""}
                  </Text>
                </View>

                <StatusDot
                  color={markerColor(marker)}
                  label={marker === "delayed" ? base.delayed : delivery.status_label}
                  isArabic={isArabic}
                />
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={PCOLORS.muted} />
              </Pressable>

              {/* OPEN: recipes + address, read only */}
              {open && (
                <View style={styles.details}>
                  <View style={styles.readOnly}>
                  <Text style={[styles.detailsTitle, rtl]}>{t.recipes}</Text>
                  {delivery.items.map((item, itemIndex) => (
                    <View key={`${item.name}-${itemIndex}`} style={[styles.recipeRow, isArabic && styles.rowRtl]}>
                      <Text style={[styles.recipeName, rtl]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.recipeQty}>× {item.quantity}</Text>
                    </View>
                  ))}

                  {!!place && (
                    <View style={[styles.placeRow, isArabic && styles.rowRtl]}>
                      <Ionicons name="location-outline" size={16} color={PCOLORS.muted} />
                      <Text style={[styles.itemText, { flex: 1, marginTop: 0 }, rtl]}>
                        {delivered ? t.receivedAt : t.planned} {place}
                        {delivery.delivery_slot ? ` · ${slotLabel(delivery.delivery_slot)}` : ""}
                      </Text>
                    </View>
                  )}
                  </View>

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

  item: { paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: PCOLORS.border },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemDate: { fontFamily: FONTS.bold, fontSize: 16, lineHeight: 24, color: PCOLORS.text },
  itemMeta: { fontFamily: FONTS.regular, fontSize: 12.5, color: PCOLORS.muted },
  itemText: { marginTop: 8, fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.muted },

  // Read only details (greyed)
  details: {
    marginTop: 12,
    padding: 12,
    borderRadius: 9,
    backgroundColor: PCOLORS.card,
  },
  readOnly: { opacity: 0.6 },
  detailsTitle: { marginBottom: 6, fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 0.5, color: PCOLORS.muted },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
  recipeName: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.muted },
  recipeQty: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.muted },
  placeRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10 },
  manage: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  manageText: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
});