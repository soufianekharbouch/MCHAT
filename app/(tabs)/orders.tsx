import React, { useCallback, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { useCustomerData } from "../../context/CustomerDataContext";
import { fetchAllDeliveries } from "../../services/purchaseApi";
import type { DeliveryWithPurchase, PurchaseDetail } from "../../types/purchase";

import { BackRow, CenteredLoader, ErrorState, PageTitle, PrimaryButton } from "../../components/purchase/ScreenParts";
import { FONTS, PCOLORS, formatLongDate, purchaseTexts, slotLabel } from "../../components/purchase/purchaseUtils";
import GuestGate from "../../components/shop/GuestGate";

/*
|--------------------------------------------------------------------------
| DELIVERIES (orders)
|--------------------------------------------------------------------------
|
| All the deliveries of the customer's packs (purchases), every pet:
|   Upcoming  : scheduled / prepared, today or later
|   Delivered : delivered
|   Overdue   : planned date passed and not delivered
|
| Upcoming card -> manage-delivery (change recipes / date, skip)
| No upcoming   -> "Plan my deliveries" (pack with recipes left) or "Choose a plan"
|
*/

type Tab = "upcoming" | "delivered" | "overdue";

const todayISO = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_SHORT_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const shortMonth = (iso: string, isArabic: boolean) => {
  const month = Number(iso.slice(5, 7)) - 1;
  return (isArabic ? MONTHS_SHORT_AR : MONTHS_SHORT_EN)[month] ?? "";
};

export default function OrdersScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const base = purchaseTexts(isArabic);
  const { isGuest, loading: customerLoading } = useCustomerData();

  const t = isArabic
    ? {
        title: "التوصيلات",
        subtitle: "تابع توصيلات وجبات حيواناتك الأليفة.",
        back: "الرئيسية",
        upcoming: "القادمة",
        delivered: "تم التوصيل",
        overdue: "المتأخرة",
        all: "الكل",
        delivery: "التوصيلة",
        meals: "وجبة",
        statusScheduled: "مجدولة",
        statusPrepared: "قيد التحضير",
        statusOnTheWay: "في الطريق",
        statusDelivered: "تم التوصيل",
        statusOverdue: "متأخرة",
        editableUntil: "يمكن التعديل حتى",
        locked: "لا يمكن التعديل",
        manage: "إدارة",
        noUpcoming: "لا توجد توصيلات قادمة",
        noUpcomingPlan: "لديك وجبات متبقية في باقتك. اختر مواعيد التوصيل الآن.",
        noUpcomingBuy: "اختر باقة وجبات طازجة لحيوانك لبدء التوصيل.",
        noDelivered: "لا توجد توصيلات مكتملة بعد",
        noOverdue: "لا توجد توصيلات متأخرة",
        planDeliveries: "تنظيم مواعيد التوصيل",
        choosePlan: "اختيار باقة",
        recipesLeft: "وجبات متبقية للتخطيط",
      }
    : {
        title: "Deliveries",
        subtitle: "Follow the fresh meal deliveries of your pets.",
        back: "Home",
        upcoming: "Upcoming",
        delivered: "Delivered",
        overdue: "Overdue",
        all: "All",
        delivery: "Delivery",
        meals: "meals",
        statusScheduled: "Scheduled",
        statusPrepared: "Preparing",
        statusOnTheWay: "On the way",
        statusDelivered: "Delivered",
        statusOverdue: "Overdue",
        editableUntil: "Editable until",
        locked: "Can't be changed anymore",
        manage: "Manage",
        noUpcoming: "No upcoming deliveries",
        noUpcomingPlan: "You still have meals in your plan. Choose your delivery dates now.",
        noUpcomingBuy: "Choose a fresh meal plan for your pet to start the deliveries.",
        noDelivered: "No delivered orders yet",
        noOverdue: "No overdue deliveries",
        planDeliveries: "Plan my deliveries",
        choosePlan: "Choose a plan",
        recipesLeft: "meals left to plan",
      };

  const [rows, setRows] = useState<DeliveryWithPurchase[]>([]);
  const [purchases, setPurchases] = useState<PurchaseDetail[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [petId, setPetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD
  |--------------------------------------------------------------------------
  */

  const load = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }

    try {
      setError("");
      const data = await fetchAllDeliveries(lang);
      setRows(data.deliveries);
      setPurchases(data.purchases);
    } catch (e: any) {
      setError(e?.message || base.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /*
  |--------------------------------------------------------------------------
  | GROUPS
  |--------------------------------------------------------------------------
  */

  const today = todayISO();

  const pets = useMemo(() => {
    const map = new Map<number, { id: number; name: string; photo_url?: string | null; species: string }>();
    purchases.forEach(purchase => {
      if (purchase.animal) {
        map.set(purchase.animal.id, { ...purchase.animal, species: purchase.product.species });
      }
    });
    return Array.from(map.values());
  }, [purchases]);

  const groups = useMemo(() => {
    const visible = rows.filter(
      row => row.delivery.status !== "cancelled" && (!petId || row.purchase.animal?.id === petId)
    );

    const isOverdue = (row: DeliveryWithPurchase) =>
      row.delivery.status !== "delivered" && (!!row.delivery.is_delayed || row.delivery.date < today);

    return {
      upcoming: visible
        .filter(row => row.delivery.status !== "delivered" && !isOverdue(row))
        .sort((a, b) => a.delivery.date.localeCompare(b.delivery.date)),
      delivered: visible
        .filter(row => row.delivery.status === "delivered")
        .sort((a, b) => b.delivery.date.localeCompare(a.delivery.date)),
      overdue: visible.filter(isOverdue).sort((a, b) => b.delivery.date.localeCompare(a.delivery.date)),
    };
  }, [rows, petId, today]);

  const displayed = groups[tab];

  // Pack with meals still to plan (for the empty "Upcoming" tab)
  const packToPlan = useMemo(
    () =>
      purchases.find(
        purchase =>
          purchase.can_schedule &&
          purchase.usage.remaining_recipes > 0 &&
          (!petId || purchase.animal?.id === petId)
      ) ??
      purchases.find(purchase => purchase.can_schedule && (!petId || purchase.animal?.id === petId)) ??
      null,
    [purchases, petId]
  );

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  const statusOf = (row: DeliveryWithPurchase) => {
    const { delivery } = row;

    if (delivery.status === "delivered") {
      return { label: t.statusDelivered, color: PCOLORS.primary, background: PCOLORS.primaryLight, icon: "checkmark-circle" as const };
    }

    if (tab === "overdue" || delivery.is_delayed || delivery.date < today) {
      return { label: t.statusOverdue, color: PCOLORS.danger, background: PCOLORS.dangerLight, icon: "alert-circle" as const };
    }

    if (delivery.status === "prepared") {
      return delivery.date === today
        ? { label: t.statusOnTheWay, color: "#C77700", background: PCOLORS.warningLight, icon: "bicycle" as const }
        : { label: t.statusPrepared, color: "#C77700", background: PCOLORS.warningLight, icon: "restaurant" as const };
    }

    return { label: t.statusScheduled, color: PCOLORS.primary, background: PCOLORS.primaryLight, icon: "time" as const };
  };

  const formatCutoff = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return value;

    const day = formatLongDate(value.slice(0, 10), isArabic);
    const time = date.toLocaleTimeString(isArabic ? "ar" : "en", { hour: "2-digit", minute: "2-digit" });
    return `${day} · ${time}`;
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  if (isGuest && !customerLoading) {
    return <GuestGate redirect="/(tabs)/orders" />;
  }

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <CenteredLoader />
      </SafeAreaView>
    );
  }

  const rtl = isArabic ? styles.textRtl : null;

  const emptyText =
    tab === "upcoming"
      ? t.noUpcoming
      : tab === "delivered"
        ? t.noDelivered
        : t.noOverdue;

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
            colors={[PCOLORS.primary]}
          />
        }
      >
        <BackRow label={t.back} isArabic={isArabic} onBack={() => router.navigate("/(tabs)")} />
        <PageTitle title={t.title} subtitle={t.subtitle} isArabic={isArabic} />

        {!!error && <ErrorState message={error} retryLabel={base.retry} onRetry={load} />}

        {/* TABS */}
        <View style={[styles.tabs, isArabic && styles.rowRtl]}>
          <TabButton icon="time-outline" label={t.upcoming} count={groups.upcoming.length} active={tab === "upcoming"} onPress={() => setTab("upcoming")} />
          <TabButton icon="checkmark-circle-outline" label={t.delivered} count={groups.delivered.length} active={tab === "delivered"} onPress={() => setTab("delivered")} />
          <TabButton
            icon="alert-circle-outline"
            label={t.overdue}
            count={groups.overdue.length}
            active={tab === "overdue"}
            danger={groups.overdue.length > 0}
            onPress={() => setTab("overdue")}
          />
        </View>

        {/* PET FILTER */}
        {pets.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.petChips, isArabic && styles.rowRtl]}>
            <Pressable onPress={() => setPetId(null)} style={[styles.petChip, petId === null && styles.petChipActive]}>
              <Text style={[styles.petChipText, petId === null && styles.petChipTextActive]}>{t.all}</Text>
            </Pressable>
            {pets.map(pet => {
              const active = pet.id === petId;
              return (
                <Pressable key={pet.id} onPress={() => setPetId(pet.id)} style={[styles.petChip, active && styles.petChipActive, isArabic && styles.rowRtl]}>
                  {pet.photo_url ? (
                    <Image source={{ uri: pet.photo_url }} style={styles.petChipPhoto} />
                  ) : (
                    <MaterialCommunityIcons name={pet.species === "Dog" ? "dog" : "cat"} size={18} color={active ? PCOLORS.white : PCOLORS.primary} />
                  )}
                  <Text style={[styles.petChipText, active && styles.petChipTextActive]}>{pet.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* LIST */}
        {displayed.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name={tab === "overdue" ? "check-decagram-outline" : "truck-delivery-outline"}
              size={44}
              color={tab === "overdue" ? PCOLORS.primary : PCOLORS.muted}
            />
            <Text style={styles.emptyTitle}>{emptyText}</Text>

            {tab === "upcoming" && (
              <>
                <Text style={styles.emptyText}>{packToPlan ? t.noUpcomingPlan : t.noUpcomingBuy}</Text>
                <View style={styles.emptyButton}>
                  {packToPlan ? (
                    <PrimaryButton
                      label={t.planDeliveries}
                      icon="calendar-outline"
                      onPress={() => router.push({ pathname: "/distribute-package", params: { id: String(packToPlan.id) } })}
                    />
                  ) : (
                    <PrimaryButton
                      label={t.choosePlan}
                      icon="sparkles-outline"
                      onPress={() => router.push({ pathname: "/plans", params: petId ? { animalId: String(petId) } : {} })}
                    />
                  )}
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {displayed.map(row => {
              const { delivery, purchase } = row;
              const status = statusOf(row);
              const canManage = tab === "upcoming";
              const items = delivery.items.filter(item => item.quantity > 0);

              return (
                <Pressable
                  key={`${purchase.id}-${delivery.id}`}
                  disabled={!canManage}
                  onPress={() =>
                    router.push({
                      pathname: "/manage-delivery",
                      params: { purchaseId: String(purchase.id), deliveryId: String(delivery.id) },
                    })
                  }
                  style={({ pressed }) => [styles.card, pressed && canManage && styles.pressed]}
                >
                  {/* DATE + STATUS */}
                  <View style={[styles.cardTop, isArabic && styles.rowRtl]}>
                    <View style={[styles.dateBox, { backgroundColor: status.background }]}>
                      <Text style={[styles.dateDay, { color: status.color }]}>{Number(delivery.date.slice(8, 10))}</Text>
                      <Text style={[styles.dateMonth, { color: status.color }]} numberOfLines={1}>
                        {shortMonth(delivery.date, isArabic)}
                      </Text>
                    </View>

                    <View style={styles.flex}>
                      <Text style={[styles.cardDate, rtl]}>{formatLongDate(delivery.date, isArabic)}</Text>
                      <Text style={[styles.cardMeta, rtl]}>
                        {[delivery.delivery_slot ? slotLabel(delivery.delivery_slot) : null, `${t.delivery} ${delivery.number}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: status.background }, isArabic && styles.rowRtl]}>
                      <Ionicons name={status.icon} size={13} color={status.color} />
                      <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  {/* PET + PACK */}
                  <View style={[styles.petRow, isArabic && styles.rowRtl]}>
                    {purchase.animal?.photo_url ? (
                      <Image source={{ uri: purchase.animal.photo_url }} style={styles.petPhoto} />
                    ) : (
                      <View style={styles.petIcon}>
                        <MaterialCommunityIcons name={purchase.product.species === "Dog" ? "dog" : "cat"} size={18} color={PCOLORS.primary} />
                      </View>
                    )}
                    <Text style={[styles.petName, rtl]} numberOfLines={1}>
                      {purchase.animal?.name ?? "-"}
                      <Text style={styles.packName}>  ·  {purchase.product.name}</Text>
                    </Text>
                  </View>

                  {/* RECIPES */}
                  {items.length > 0 && (
                    <View style={[styles.recipes, isArabic && styles.rowRtl]}>
                      {items.map((item, index) => (
                        <View key={`${item.recipe_id}-${index}`} style={[styles.recipeChip, isArabic && styles.rowRtl]}>
                          <Text style={styles.recipeQty}>{item.quantity}×</Text>
                          <Text style={styles.recipeName} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* ADDRESS */}
                  {!!delivery.address && (
                    <View style={[styles.infoLine, isArabic && styles.rowRtl]}>
                      <Ionicons name="location-outline" size={15} color={PCOLORS.muted} />
                      <Text style={[styles.infoText, rtl]} numberOfLines={1}>
                        {delivery.address.label || delivery.address.address}
                      </Text>
                    </View>
                  )}

                  {/* EDIT CUTOFF + MANAGE */}
                  {canManage && (
                    <View style={[styles.cardFooter, isArabic && styles.rowRtl]}>
                      <View style={[styles.infoLine, styles.flex, isArabic && styles.rowRtl]}>
                        <Ionicons
                          name={delivery.is_editable ? "create-outline" : "lock-closed-outline"}
                          size={15}
                          color={delivery.is_editable ? PCOLORS.primary : PCOLORS.muted}
                        />
                        <Text style={[styles.infoText, delivery.is_editable && styles.editableText, rtl]} numberOfLines={1}>
                          {delivery.is_editable ? `${t.editableUntil} ${formatCutoff(delivery.edit_cutoff)}` : t.locked}
                        </Text>
                      </View>

                      <View style={[styles.manage, isArabic && styles.rowRtl]}>
                        <Text style={styles.manageText}>{t.manage}</Text>
                        <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={16} color={PCOLORS.primary} />
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Meals still to plan (upcoming tab with deliveries) */}
        {tab === "upcoming" && displayed.length > 0 && packToPlan && packToPlan.usage.remaining_recipes > 0 && (
          <Pressable
            onPress={() => router.push({ pathname: "/distribute-package", params: { id: String(packToPlan.id) } })}
            style={({ pressed }) => [styles.planBanner, isArabic && styles.rowRtl, pressed && styles.pressed]}
          >
            <Ionicons name="calendar" size={22} color={PCOLORS.white} />
            <View style={styles.flex}>
              <Text style={[styles.planBannerTitle, rtl]}>{t.planDeliveries}</Text>
              <Text style={[styles.planBannerText, rtl]}>
                {packToPlan.usage.remaining_recipes} {t.recipesLeft}
              </Text>
            </View>
            <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={20} color={PCOLORS.white} />
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| TAB BUTTON
|--------------------------------------------------------------------------
*/

function TabButton({
  icon,
  label,
  count,
  active,
  danger,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  count: number;
  active: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Ionicons name={icon} size={21} color={active ? PCOLORS.white : danger ? PCOLORS.danger : PCOLORS.primary} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {label}
      </Text>
      <View style={[styles.tabCount, active && styles.tabCountActive, !active && danger && styles.tabCountDanger]}>
        <Text style={[styles.tabCountText, (active || danger) && styles.tabCountTextActive]}>{count}</Text>
      </View>
    </Pressable>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  flex: { flex: 1 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.88 },

  tabs: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tabButton: {
    flex: 1,
    minHeight: 78,
    borderRadius: 16,
    backgroundColor: PCOLORS.white,
    borderWidth: 1,
    borderColor: "#E5E0D9",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 5,
  },
  tabButtonActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  tabLabel: { width: "100%", fontFamily: FONTS.bold, fontSize: 12, lineHeight: 19, textAlign: "center", color: PCOLORS.muted },
  tabLabelActive: { color: PCOLORS.white },
  tabCount: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#F0EEEB",
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  tabCountDanger: { backgroundColor: PCOLORS.danger },
  tabCountText: { fontFamily: FONTS.bold, fontSize: 10, color: PCOLORS.text },
  tabCountTextActive: { color: PCOLORS.white },

  petChips: { gap: 8, paddingBottom: 14 },
  petChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  petChipActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  petChipPhoto: { width: 24, height: 24, borderRadius: 12 },
  petChipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text },
  petChipTextActive: { color: PCOLORS.white },

  list: { gap: 12 },
  card: {
    backgroundColor: PCOLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ECE6DD",
    gap: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateBox: { width: 52, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dateDay: { fontFamily: FONTS.extraBold, fontSize: 21, lineHeight: 26 },
  dateMonth: { fontFamily: FONTS.semiBold, fontSize: 10, lineHeight: 14 },
  cardDate: { fontFamily: FONTS.bold, fontSize: 14, lineHeight: 22, color: PCOLORS.text },
  cardMeta: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontFamily: FONTS.bold, fontSize: 11 },

  petRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  petPhoto: { width: 28, height: 28, borderRadius: 14 },
  petIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: PCOLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  petName: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  packName: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },

  recipes: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  recipeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    backgroundColor: PCOLORS.background,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  recipeQty: { fontFamily: FONTS.extraBold, fontSize: 12, color: PCOLORS.primary },
  recipeName: { flexShrink: 1, fontFamily: FONTS.medium, fontSize: 12, color: PCOLORS.text },

  infoLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { flexShrink: 1, fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },
  editableText: { color: PCOLORS.primary, fontFamily: FONTS.semiBold },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EBE4",
  },
  manage: { flexDirection: "row", alignItems: "center", gap: 2 },
  manageText: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.primary },

  emptyBox: {
    minHeight: 220,
    backgroundColor: PCOLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE6DD",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text, textAlign: "center" },
  emptyText: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 21, color: PCOLORS.muted, textAlign: "center" },
  emptyButton: { alignSelf: "stretch", marginTop: 10 },

  planBanner: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: PCOLORS.primary,
    borderRadius: 16,
    padding: 16,
  },
  planBannerTitle: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.white },
  planBannerText: { fontFamily: FONTS.regular, fontSize: 12, color: "rgba(255,255,255,0.85)" },
});