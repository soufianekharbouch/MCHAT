import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { getStoredItem, setStoredItem } from "../../services/storage";
import type { PurchaseSummary } from "../../types/purchase";
import { FONTS, PCOLORS } from "./purchaseUtils";

/*
|--------------------------------------------------------------------------
| PLAN REMINDER (top of Home)
|--------------------------------------------------------------------------
|
| Paid packs with meals not planned yet:
|  - 1 delivery (taste pack): "Choose the day" -> planning screen
|  - several deliveries: "X meals not planned yet" -> planning screen
|  (same rules everywhere: deliveries, meals, days between, address)
| Can be closed: shown again after REMIND_AFTER_HOURS.
|
*/

const REMIND_AFTER_HOURS = 24;
const MAX_BANNERS = 2;
const storageKey = (id: number) => `plan_banner_dismissed_${id}`;
const premiumKey = (id: number) => `premium_banner_dismissed_${id}`;

/** Sent by the API for PREMIUM-... packs (recipes chosen by our team). */
type PremiumFlags = {
  is_personalized?: boolean;
  needs_consultation?: boolean;
  custom_ready?: boolean;
  consultation_message?: string | null;
};

type Props = {
  purchases: PurchaseSummary[];
  isArabic: boolean;
  onPlanned: () => void;
};

export default function PlanReminderBanner({ purchases, isArabic }: Props) {
  const [dismissed, setDismissed] = useState<Record<number, number>>({});
  const [ready, setReady] = useState(false);

  // PREMIUM-... packs paid, recipes not chosen yet by our team: info only
  const waitingTeam = useMemo(
    () => purchases.filter(purchase => purchase.is_active && (purchase as PremiumFlags).needs_consultation),
    [purchases]
  );

  // Packs paid with meals still to plan (taste packs first)
  const toPlan = useMemo(
    () =>
      purchases
        .filter(purchase => purchase.is_active && !(purchase as PremiumFlags).needs_consultation)
        .filter(purchase => (purchase.usage?.remaining_recipes ?? 0) > 0)
        .sort((a, b) => Number(b.usage.max_deliveries === 1) - Number(a.usage.max_deliveries === 1)),
    [purchases]
  );

  // When each banner was closed (per purchase)
  useEffect(() => {
    let mounted = true;

    (async () => {
      const values: Record<number, number> = {};

      for (const purchase of toPlan) {
        try {
          const raw = await getStoredItem(storageKey(purchase.id));
          if (raw) values[purchase.id] = Number(raw) || 0;
        } catch {
          // storage unavailable: banner shown
        }
      }

      for (const purchase of waitingTeam) {
        try {
          const raw = await getStoredItem(premiumKey(purchase.id));
          if (raw) values[-purchase.id] = Number(raw) || 0; // negative id: premium banner
        } catch {
          // storage unavailable: banner shown
        }
      }

      if (mounted) {
        setDismissed(values);
        setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [toPlan, waitingTeam]);

  const close = useCallback((id: number) => {
    const now = Date.now();
    setDismissed(current => ({ ...current, [id]: now }));
    setStoredItem(storageKey(id), String(now)).catch(() => undefined);
  }, []);

  const closePremium = useCallback((id: number) => {
    const now = Date.now();
    setDismissed(current => ({ ...current, [-id]: now }));
    setStoredItem(premiumKey(id), String(now)).catch(() => undefined);
  }, []);

  const isShown = (key: number) => !dismissed[key] || Date.now() - dismissed[key] > REMIND_AFTER_HOURS * 3600 * 1000;

  const premiumVisible = waitingTeam.filter(purchase => isShown(-purchase.id)).slice(0, MAX_BANNERS);

  const visible = toPlan
    .filter(purchase => isShown(purchase.id))
    .slice(0, Math.max(0, MAX_BANNERS - premiumVisible.length));

  const dir = isArabic ? styles.textRtl : null;

  return (
    <>
      {/* PREMIUM-... : "our team will contact you" (no action, can be closed) */}
      {ready &&
        premiumVisible.map(purchase => {
          const pet = purchase.animal?.name ?? "";
          const message =
            (purchase as PremiumFlags).consultation_message ||
            (isArabic
              ? "سيتواصل معك فريق التغذية لاختيار وصفات خاصة بحيوانك، ثم يمكنك تنظيم مواعيد التوصيل."
              : "Our nutrition team will contact you to choose recipes made for your pet, then you can plan your deliveries.");

          return (
            <View key={`premium-${purchase.id}`} style={[styles.banner, styles.bannerPremium]}>
              <View style={[styles.row, isArabic && styles.rowRtl]}>
                <View style={[styles.icon, styles.iconPremium]}>
                  <Ionicons name="call-outline" size={20} color={PCOLORS.white} />
                </View>

                <View style={styles.flex}>
                  <Text style={[styles.title, dir]}>
                    {isArabic
                      ? `باقتك المخصصة${pet ? ` لـ ${pet}` : ""} قيد التحضير`
                      : `${pet ? `${pet}'s` : "Your"} personalized pack is being prepared`}
                  </Text>
                  <Text style={[styles.body, dir]}>{message}</Text>
                </View>

                <Pressable onPress={() => closePremium(purchase.id)} hitSlop={10} style={styles.closeButton}>
                  <Ionicons name="close" size={18} color={PCOLORS.muted} />
                </Pressable>
              </View>
            </View>
          );
        })}

      {ready &&
        visible.map(purchase => {
          const single = purchase.usage.max_deliveries === 1;
          const pet = purchase.animal?.name ?? "";
          const remaining = purchase.usage.remaining_recipes;
          const started = purchase.usage.scheduled_recipes > 0;
          // PREMIUM-... treated: his custom recipes are ready
          const customReady = !!(purchase as PremiumFlags).custom_ready && !started;

          const text = customReady
            ? isArabic
              ? {
                  title: "وصفاتك المخصصة جاهزة 🐾",
                  body: `حضّرنا وصفات خاصة${pet ? ` بـ ${pet}` : " بحيوانك"}. اختر الآن أيام التوصيل.`,
                  action: "اختيار أيام التوصيل",
                }
              : {
                  title: "Your custom recipes are ready 🐾",
                  body: `We prepared${pet ? ` ${pet}'s` : " your pet's"} own recipes. Choose your delivery days now.`,
                  action: "Choose my delivery days",
                }
            : isArabic
            ? single
              ? {
                  title: "اختر يوم استلام باقة التذوق",
                  body: `حدّد اليوم المناسب لبدء باقة التذوق${pet ? ` لـ ${pet}` : ""}.`,
                  action: "اختيار اليوم",
                }
              : {
                  title: started ? `${remaining} وجبة لم تُجدول بعد` : "حدّد أيام استلام وجباتك",
                  body: started
                    ? `وزّع باقي وجبات${pet ? ` ${pet}` : ""} لتصلك في الموعد.`
                    : `اختر الأيام التي تناسبك لاستلام وجبات${pet ? ` ${pet}` : ""}.`,
                  action: "تنظيم التوصيل",
                }
            : single
              ? {
                  title: "Choose your Taste Pack delivery day",
                  body: `Pick the day you want to start${pet ? ` ${pet}'s` : " your"} Taste Pack.`,
                  action: "Choose the day",
                }
              : {
                  title: started ? `${remaining} meals not planned yet` : "Choose your delivery days",
                  body: started
                    ? `Plan the rest of${pet ? ` ${pet}'s` : " your"} meals so they reach you on time.`
                    : `Pick the days you prefer to receive${pet ? ` ${pet}'s` : " your"} meals.`,
                  action: "Plan deliveries",
                };

          const open = () =>
            router.push({ pathname: "/distribute-package", params: { id: String(purchase.id) } } as any);

          return (
            <View key={purchase.id} style={[styles.banner, single && styles.bannerTaste, customReady && styles.bannerPremium]}>
              <View style={[styles.row, isArabic && styles.rowRtl]}>
                <View style={[styles.icon, single && styles.iconTaste, customReady && styles.iconPremium]}>
                  <Ionicons name={customReady ? "sparkles" : single ? "gift-outline" : "calendar-outline"} size={22} color={PCOLORS.white} />
                </View>

                <View style={styles.flex}>
                  <Text style={[styles.title, dir]}>{text.title}</Text>
                  <Text style={[styles.body, dir]}>{text.body}</Text>
                </View>

                <Pressable onPress={() => close(purchase.id)} hitSlop={10} style={styles.closeButton}>
                  <Ionicons name="close" size={18} color={PCOLORS.muted} />
                </Pressable>
              </View>

              <Pressable
                onPress={open}
                style={({ pressed }) => [
                  styles.action,
                  single && styles.actionTaste,
                  customReady && styles.actionPremium,
                  isArabic && styles.rowRtl,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionText}>{text.action}</Text>
                <Ionicons name={isArabic ? "arrow-back" : "arrow-forward"} size={18} color={PCOLORS.white} />
              </Pressable>
            </View>
          );
        })}

    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.88 },

  banner: {
    backgroundColor: PCOLORS.primaryLight,
    borderWidth: 1,
    borderColor: "#A8D7D1",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  bannerTaste: { backgroundColor: PCOLORS.warningLight, borderColor: "#F1CF96" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PCOLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconTaste: { backgroundColor: PCOLORS.warning },
  bannerPremium: { backgroundColor: "#FFF8E5", borderColor: "#E8C66A" },
  iconPremium: { backgroundColor: "#B8860B" },
  title: { fontFamily: FONTS.bold, fontSize: 15, lineHeight: 23, color: PCOLORS.text },
  body: { marginTop: 2, fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.muted },
  closeButton: { padding: 2 },
  action: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: PCOLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionTaste: { backgroundColor: PCOLORS.warning },
  actionPremium: { backgroundColor: "#B8860B" },
  actionText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.white },
});