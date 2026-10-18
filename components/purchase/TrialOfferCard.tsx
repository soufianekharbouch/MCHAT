import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { CatalogAnimal, Product } from "../../types/purchase";
import { formatPrice } from "./SubscriptionCard";
import { formatDate, parseISODate } from "./purchaseUtils";

/*
|--------------------------------------------------------------------------
| TRIAL OFFER CARD (Home)
|--------------------------------------------------------------------------
|
| Shown when a pet has a trial pack still running and packs have a
| "price during trial". Live countdown until the last day of the trial
| (23:59:59, phone time).
|
*/

const COLORS = {
  text: "#272727",
  muted: "#77736D",
  card: "#F5EBDD",
  border: "#D8CBBB",
  primary: "#249B97",
  accent: "#E9A23B",
  accentDark: "#A86A12",
  danger: "#EB6268",
  white: "#FFFFFF",
  box: "#FBF9F5",
  boxBorder: "#D8D0C5",
};

type Props = {
  animal: CatalogAnimal;
  offers: Product[]; // packs with trial_offer.active, best first
  isArabic: boolean;
  onOpen: () => void;
  onExpired?: () => void;
};

export default function TrialOfferCard({ animal, offers, isArabic, onOpen, onExpired }: Props) {
  const best = offers[0];
  const endsOn = best?.trial_offer?.ends_on ?? animal.trial?.ends_on ?? null;

  // Last second of the last trial day
  const endTime = (() => {
    const date = parseISODate(endsOn);
    if (!date) return null;
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  })();

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!endTime) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const remaining = endTime ? Math.max(0, endTime - now) : null;

  useEffect(() => {
    if (remaining === 0) onExpired?.();
  }, [remaining === 0]);

  // Soft pulse of the "live" dot
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  if (!best || remaining === 0) return null;

  const t = isArabic
    ? {
        eyebrow: "عرض الفترة التجريبية",
        title: `استمر مع ${animal.name} بسعر خاص`,
        text: "عرض خاص لأن لديك باقة تجريبية جارية. ينتهي العرض مع نهاية الفترة التجريبية.",
        endsIn: "ينتهي العرض خلال",
        live: "مباشر",
        days: "أيام",
        hours: "ساعات",
        mins: "دقائق",
        secs: "ثوانٍ",
        until: "صالح حتى نهاية الباقة التجريبية",
        endsOn: "آخر يوم:",
        others: (n: number) => `+ ${n} باقات أخرى بسعر خاص`,
        meals: "وجبة",
        get: "احصل على العرض",
      }
    : {
        eyebrow: "TRIAL OFFER",
        title: `Keep ${animal.name} on fresh food for less`,
        text: "Special price because your trial is running. The offer ends with your trial.",
        endsIn: "Offer ends in",
        live: "Live",
        days: "days",
        hours: "hours",
        mins: "mins",
        secs: "secs",
        until: "Valid until the end of your trial pack",
        endsOn: "Last day:",
        others: (n: number) => `+ ${n} more plan${n > 1 ? "s" : ""} at a special price`,
        meals: "meals",
        get: "Get the offer",
      };

  const totalSeconds = remaining !== null ? Math.floor(remaining / 1000) : 0;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");
  const urgent = remaining !== null && remaining < 24 * 3600 * 1000;

  const price = best.trial_offer?.price ?? best.current_price;
  const rtl = isArabic ? styles.textRtl : null;

  return (
    <Pressable onPress={onOpen} style={styles.card}>
      {/* HEADER */}
      <View style={[styles.top, isArabic && styles.rowRtl]}>
        <View style={[styles.eyebrowRow, isArabic && styles.rowRtl]}>
          <MaterialCommunityIcons name="gift-outline" size={17} color={COLORS.accentDark} />
          <Text style={styles.eyebrow}>{t.eyebrow}</Text>
        </View>

        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{best.discount_percent}%</Text>
        </View>
      </View>

      {/* PET + TITLE */}
      <View style={[styles.titleRow, isArabic && styles.rowRtl]}>
        {animal.photo_url ? (
          <Image source={{ uri: animal.photo_url }} style={styles.petPhoto} />
        ) : (
          <View style={[styles.petPhoto, styles.petPhotoEmpty]}>
            <MaterialCommunityIcons name={animal.species === "Dog" ? "dog" : "cat"} size={26} color={COLORS.primary} />
          </View>
        )}
        <Text style={[styles.title, rtl]}>{t.title}</Text>
      </View>

      <Text style={[styles.description, rtl]}>{t.text}</Text>

      {/* PRODUCT + PRICE */}
      <View style={[styles.productRow, isArabic && styles.rowRtl]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.productName, rtl]} numberOfLines={2}>
            {best.name}
          </Text>
          <Text style={[styles.productMeta, rtl]}>
            {best.total_recipes} {t.meals} · {best.duration_label}
          </Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.oldPrice}>{formatPrice(best.price)}</Text>
          <Text style={styles.newPrice}>
            {formatPrice(price)} <Text style={styles.currency}>{best.currency}</Text>
          </Text>
        </View>
      </View>

      {/* COUNTDOWN */}
      {remaining !== null ? (
        <>
          <View style={[styles.countdownHeader, isArabic && styles.rowRtl]}>
            <Text style={[styles.countdownLabel, urgent && { color: COLORS.danger }]}>{t.endsIn}</Text>
            <View style={[styles.liveRow, isArabic && styles.rowRtl]}>
              <Animated.View
                style={[
                  styles.liveDot,
                  urgent && { backgroundColor: COLORS.danger },
                  {
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
                  },
                ]}
              />
              <Text style={styles.liveText}>{t.live}</Text>
            </View>
          </View>

          <View style={[styles.countdownRow, isArabic && styles.rowRtl]}>
            <FlipBox value={pad(days)} label={t.days} urgent={urgent} />
            <FlipBox value={pad(hours)} label={t.hours} urgent={urgent} />
            <FlipBox value={pad(mins)} label={t.mins} urgent={urgent} />
            <FlipBox value={pad(secs)} label={t.secs} urgent={urgent} />
          </View>

          {!!endsOn && (
            <Text style={[styles.untilText, rtl]}>
              {t.endsOn} {formatDate(endsOn, isArabic)}
            </Text>
          )}
        </>
      ) : (
        <Text style={[styles.untilText, rtl, { marginTop: 18 }]}>{t.until}</Text>
      )}

      {offers.length > 1 && <Text style={[styles.othersText, rtl]}>{t.others(offers.length - 1)}</Text>}

      {/* BUTTON */}
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.button, isArabic && styles.rowRtl, pressed && { opacity: 0.88 }]}
      >
        <MaterialCommunityIcons name="creation" size={22} color={COLORS.white} />
        <Text style={styles.buttonText}>
          {t.get} · {formatPrice(price)} {best.currency}
        </Text>
      </Pressable>
    </Pressable>
  );
}

/*
|--------------------------------------------------------------------------
| ANIMATED DIGIT BOX: the new value slides down and fades in
|--------------------------------------------------------------------------
*/

function FlipBox({ value, label, urgent }: { value: string; label: string; urgent: boolean }) {
  const anim = useRef(new Animated.Value(1)).current;
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;

    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [value, anim]);

  return (
    <View style={[styles.box, urgent && styles.boxUrgent]}>
      <Animated.Text
        style={[
          styles.boxValue,
          urgent && { color: COLORS.danger },
          {
            opacity: anim,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ],
          },
        ]}
      >
        {value}
      </Animated.Text>
      <Text style={styles.boxUnit}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  card: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    borderTopColor: COLORS.accent,
    borderRadius: 11,
    backgroundColor: COLORS.card,
    marginBottom: 34,
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { fontFamily: "Cairo_700Bold", fontSize: 12, letterSpacing: 1.6, color: COLORS.accentDark },
  discountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: COLORS.danger,
  },
  discountText: { fontFamily: "Cairo_700Bold", fontSize: 13, color: COLORS.white },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  petPhoto: { width: 48, height: 48, borderRadius: 24 },
  petPhotoEmpty: { backgroundColor: "#E7F0ED", alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: "Cairo_700Bold", fontSize: 22, lineHeight: 30, color: COLORS.text },
  description: { marginTop: 10, fontFamily: "Cairo_400Regular", fontSize: 14, lineHeight: 23, color: COLORS.muted },

  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.box,
    borderWidth: 1,
    borderColor: COLORS.boxBorder,
  },
  productName: { fontFamily: "Cairo_700Bold", fontSize: 15, lineHeight: 22, color: COLORS.text },
  productMeta: { marginTop: 2, fontFamily: "Cairo_400Regular", fontSize: 12, color: COLORS.muted },
  priceBox: { alignItems: "flex-end" },
  oldPrice: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: COLORS.muted,
    textDecorationLine: "line-through",
  },
  newPrice: { fontFamily: "Cairo_800ExtraBold", fontSize: 24, lineHeight: 30, color: COLORS.accentDark },
  currency: { fontFamily: "Cairo_500Medium", fontSize: 12, color: COLORS.text },

  countdownHeader: {
    marginTop: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countdownLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 13, color: COLORS.text },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  liveText: { fontFamily: "Cairo_500Medium", fontSize: 11, color: COLORS.muted },

  countdownRow: { flexDirection: "row", gap: 10 },
  box: {
    flex: 1,
    height: 78,
    borderWidth: 1,
    borderColor: COLORS.boxBorder,
    borderRadius: 8,
    backgroundColor: COLORS.box,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  boxUrgent: { borderColor: "#F3B9BC", backgroundColor: "#FFF5F5" },
  boxValue: { fontFamily: "Cairo_600SemiBold", fontSize: 30, lineHeight: 37, color: COLORS.text },
  boxUnit: { marginTop: 1, fontFamily: "Cairo_400Regular", fontSize: 10, color: COLORS.muted },

  untilText: { marginTop: 10, fontFamily: "Cairo_400Regular", fontSize: 12, color: COLORS.muted, textAlign: "center" },
  othersText: { marginTop: 12, fontFamily: "Cairo_600SemiBold", fontSize: 13, color: COLORS.primary },

  button: {
    minHeight: 60,
    marginTop: 18,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { fontFamily: "Cairo_700Bold", fontSize: 15, color: COLORS.white },
});