import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { getStoredItem, setStoredItem } from "../../services/storage";
import type { LoyaltyResponse, PetLoyalty } from "../../services/loyaltyApi";
import { FONTS, PCOLORS } from "../purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| LOYALTY BANNER (bottom of Home, from time to time)
|--------------------------------------------------------------------------
|
| One message at a time, the most useful first:
|  1. points lost soon        "Mimi's 85 points expire in 5 days"
|  2. points usable           "Mimi has 85 points = 8.500 KWD off"
|  3. test pack points to keep "Subscribe before 03/11 to keep 15 points"
| Closed: shown again after REMIND_AFTER_HOURS. Nothing useful: hidden.
|
*/

const REMIND_AFTER_HOURS = 72;
const SHOW_DELAY_MS = 1500;
const EXPIRING_DAYS = 7;
const GOLD = "#D4A017";

type Message = {
  key: string;
  pet: PetLoyalty;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  action: string;
  urgent?: boolean;
};

type Props = {
  data: LoyaltyResponse | null;
  isArabic: boolean;
};

export default function LoyaltyBanner({ data, isArabic }: Props) {
  const [hiddenUntil, setHiddenUntil] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  const currency = data?.program.currency ?? "KWD";
  const money = (value: number) => `${value.toFixed(3)} ${currency}`;

  const dateLabel = (value: string | null) => {
    if (!value) return "";
    const [y, m, d] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(isArabic ? "ar" : "en", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
  };

  // All the messages possible now (most useful first)
  const messages = useMemo<Message[]>(() => {
    if (!data?.program.enabled) return [];

    const list: Message[] = [];

    data.pets.forEach(pet => {
      const name = pet.pet.name;

      if (pet.balance > 0 && pet.days_left !== null && pet.days_left >= 0 && pet.days_left <= EXPIRING_DAYS) {
        list.push({
          key: `loyalty-expiring-${pet.pet.id}-${pet.expires_on}`,
          pet,
          icon: "hourglass-outline",
          urgent: true,
          title: isArabic
            ? `نقاط ${name} تنتهي خلال ${pet.days_left} يوم`
            : `${name}'s ${pet.balance} points expire in ${pet.days_left} day${pet.days_left === 1 ? "" : "s"}`,
          body: isArabic
            ? `جدّد باقة ${name} قبل ${dateLabel(pet.expires_on)} للاحتفاظ بنقاطك${pet.usable_points > 0 ? ` واستخدامها (${money(pet.usable_discount)})` : ""}.`
            : `Renew ${name}'s plan before ${dateLabel(pet.expires_on)} to keep them${pet.usable_points > 0 ? ` and save ${money(pet.usable_discount)}` : ""}.`,
          action: isArabic ? "تجديد الباقة" : "Renew the plan",
        });
      }
    });

    data.pets.forEach(pet => {
      if (pet.usable_points > 0) {
        const name = pet.pet.name;

        list.push({
          key: `loyalty-usable-${pet.pet.id}-${pet.balance}`,
          pet,
          icon: "star",
          title: isArabic
            ? `لدى ${name} ${pet.usable_points} نقطة ⭐`
            : `${name} has ${pet.usable_points} points ⭐`,
          body: isArabic
            ? `= خصم ${money(pet.usable_discount)} على باقته القادمة.`
            : `= ${money(pet.usable_discount)} off the next pack.`,
          action: isArabic ? "استخدام نقاطي" : "Use my points",
        });
      }
    });

    data.pets.forEach(pet => {
      if (pet.trial_status === "pending" && pet.trial_deadline) {
        const name = pet.pet.name;

        list.push({
          key: `loyalty-trial-${pet.pet.id}-${pet.trial_deadline}`,
          pet,
          icon: "gift-outline",
          title: isArabic ? "احتفظ بنقاط الترحيب 🎁" : "Keep your welcome points 🎁",
          body: isArabic
            ? `اشترك لـ ${name} قبل ${dateLabel(pet.trial_deadline)} للاحتفاظ بنقاط باقة التذوق.`
            : `Subscribe for ${name} before ${dateLabel(pet.trial_deadline)} to keep the taste pack points.`,
          action: isArabic ? "اختيار باقة" : "Choose a plan",
        });
      }
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isArabic]);

  // When each message was closed
  useEffect(() => {
    let mounted = true;

    (async () => {
      const values: Record<string, number> = {};

      for (const message of messages) {
        try {
          const raw = await getStoredItem(message.key);
          if (raw) values[message.key] = Number(raw) || 0;
        } catch {
          // storage unavailable: shown
        }
      }

      if (mounted) {
        setHiddenUntil(values);
        setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [messages]);

  const message = ready
    ? messages.find(item => !hiddenUntil[item.key] || Date.now() - hiddenUntil[item.key] > REMIND_AFTER_HOURS * 3600 * 1000) ?? null
    : null;

  // Slides in after a short delay (not at the same time as the page)
  useEffect(() => {
    if (!message) {
      setVisible(false);
      slide.setValue(0);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
      Animated.spring(slide, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [message?.key, slide]);

  if (!message || !visible) {
    return null;
  }

  const close = () => {
    const now = Date.now();
    setHiddenUntil(current => ({ ...current, [message.key]: now }));
    setStoredItem(message.key, String(now)).catch(() => undefined);
  };

  const open = () => {
    close();
    router.push({ pathname: "/plans", params: { animalId: String(message.pet.pet.id) } } as any);
  };

  const dir = isArabic ? styles.textRtl : null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
        },
      ]}
    >
      <View style={[styles.banner, message.urgent && styles.bannerUrgent]}>
        <View style={[styles.row, isArabic && styles.rowRtl]}>
          <View style={[styles.icon, message.urgent && styles.iconUrgent]}>
            <Ionicons name={message.icon} size={20} color={PCOLORS.white} />
          </View>

          <View style={styles.flex}>
            <Text style={[styles.title, dir]} numberOfLines={2}>{message.title}</Text>
            <Text style={[styles.body, dir]} numberOfLines={2}>{message.body}</Text>
          </View>

          <Pressable onPress={close} hitSlop={10} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={PCOLORS.muted} />
          </Pressable>
        </View>

        <View style={[styles.actions, isArabic && styles.rowRtl]}>
          <Pressable
            onPress={() => router.push("/loyalty" as any)}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>{isArabic ? "نقاطي" : "My points"}</Text>
          </Pressable>

          <Pressable
            onPress={open}
            style={({ pressed }) => [styles.action, message.urgent && styles.actionUrgent, isArabic && styles.rowRtl, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>{message.action}</Text>
            <Ionicons name={isArabic ? "arrow-back" : "arrow-forward"} size={16} color={PCOLORS.white} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.88 },

  wrapper: { position: "absolute", left: 14, right: 14, bottom: 12 },
  banner: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8C66A",
    backgroundColor: "#FFF8E5",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bannerUrgent: { borderColor: "#F0A8A0", backgroundColor: "#FFF1EF" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" },
  iconUrgent: { backgroundColor: "#D9534F" },
  title: { fontFamily: FONTS.bold, fontSize: 14, lineHeight: 21, color: PCOLORS.text },
  body: { fontFamily: FONTS.regular, fontSize: 12.5, lineHeight: 19, color: PCOLORS.muted },
  closeButton: { padding: 2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  secondary: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontFamily: FONTS.bold, fontSize: 13, color: "#9A6B00" },
  action: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    backgroundColor: GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionUrgent: { backgroundColor: "#D9534F" },
  actionText: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.white },
});