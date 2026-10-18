import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { FONTS, PCOLORS } from "../purchase/purchaseUtils";
import { formatPrice } from "../purchase/SubscriptionCard";
import { isSignedInNow } from "../../services/session";
import type { ShopProduct, ShopSpecies } from "../../types/shop";

/*
|--------------------------------------------------------------------------
| SHOP NAVIGATION
|--------------------------------------------------------------------------
*/

/** Buy now: checkout, or sign in first (then back to checkout). */
export function goToCheckout(productId: number) {
  if (isSignedInNow()) {
    router.push({ pathname: "/checkout", params: { productId: String(productId) } } as any);
    return;
  }

  router.push({ pathname: "/login", params: { redirect: "checkout", productId: String(productId) } } as any);
}

export function goToSignIn(redirect?: string) {
  router.push({ pathname: "/login", params: redirect ? { redirect } : {} } as any);
}

/*
|--------------------------------------------------------------------------
| SPECIES ICON
|--------------------------------------------------------------------------
*/

export function SpeciesIcon({ species, size = 22, color = PCOLORS.primary }: { species: ShopSpecies; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={species === "Dog" ? "dog" : "cat"} size={size} color={color} />;
}

/*
|--------------------------------------------------------------------------
| PRICE (current + old price when discounted)
|--------------------------------------------------------------------------
*/

export function PriceTag({ product, isArabic, large }: { product: ShopProduct; isArabic: boolean; large?: boolean }) {
  return (
    <View style={[styles.priceRow, isArabic && styles.rowRtl]}>
      <Text style={[styles.price, large && styles.priceLarge]}>
        {formatPrice(product.current_price)} <Text style={styles.currency}>{product.currency}</Text>
      </Text>

      {product.has_promo && <Text style={styles.oldPrice}>{formatPrice(product.price)}</Text>}
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| BADGES
|--------------------------------------------------------------------------
*/

export function ProductBadges({ product, isArabic }: { product: ShopProduct; isArabic: boolean }) {
  const badges: { label: string; color: string; background: string }[] = [];

  if (product.price_source === "trial_offer") {
    badges.push({ label: isArabic ? "عرض فترة التجربة" : "Trial offer", color: PCOLORS.white, background: PCOLORS.danger });
  } else if (product.has_promo && product.discount_percent > 0) {
    badges.push({ label: `-${Math.round(product.discount_percent)}%`, color: PCOLORS.white, background: PCOLORS.danger });
  }

  if (product.is_trial) {
    badges.push({ label: isArabic ? "تجربة" : "Trial", color: PCOLORS.primary, background: PCOLORS.primaryLight });
  }

  if (product.is_premium) {
    badges.push({ label: isArabic ? "بريميوم" : "Premium", color: PCOLORS.white, background: PCOLORS.dark });
  }

  if (badges.length === 0) return null;

  return (
    <View style={[styles.badges, isArabic && styles.rowRtl]}>
      {badges.map(badge => (
        <View key={badge.label} style={[styles.badge, { backgroundColor: badge.background }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      ))}
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| PRODUCT IMAGE (or species placeholder)
|--------------------------------------------------------------------------
*/

export function ProductImage({ product, height }: { product: ShopProduct; height: number }) {
  if (product.image_url) {
    return <Image source={{ uri: product.image_url }} style={[styles.image, { height }]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.image, styles.imagePlaceholder, { height }]}>
      <SpeciesIcon species={product.species} size={Math.round(height * 0.42)} color={PCOLORS.primary} />
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| INFO CHIP (duration, recipes, ages...)
|--------------------------------------------------------------------------
*/

export function InfoChip({ icon, label, isArabic }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; isArabic: boolean }) {
  if (!label) return null;

  return (
    <View style={[styles.chip, isArabic && styles.rowRtl]}>
      <Ionicons name={icon} size={14} color={PCOLORS.muted} />
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| SIGN IN BANNER ("Are you already a client?")
|--------------------------------------------------------------------------
*/

export function SignInBanner({ isArabic, redirect }: { isArabic: boolean; redirect?: string }) {
  return (
    <Pressable onPress={() => goToSignIn(redirect)} style={({ pressed }) => [styles.banner, isArabic && styles.rowRtl, pressed && styles.pressed]}>
      <View style={styles.bannerIcon}>
        <MaterialCommunityIcons name="whatsapp" size={22} color={PCOLORS.white} />
      </View>

      <View style={styles.bannerTextBox}>
        <Text style={[styles.bannerTitle, isArabic && styles.textRtl]}>
          {isArabic ? "هل أنت عميل لدينا؟" : "Are you already a client?"}
        </Text>
        <Text style={[styles.bannerText, isArabic && styles.textRtl]}>
          {isArabic ? "سجّل الدخول برمز واتساب لرؤية حيواناتك وعروضك." : "Sign in with a WhatsApp code to see your pets and offers."}
        </Text>
      </View>

      <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={20} color={PCOLORS.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.85 },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  price: { fontFamily: FONTS.extraBold, fontSize: 19, color: PCOLORS.text },
  priceLarge: { fontSize: 26 },
  currency: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.muted },
  oldPrice: { fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.muted, textDecorationLine: "line-through" },

  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { fontFamily: FONTS.bold, fontSize: 11 },

  image: { width: "100%", backgroundColor: PCOLORS.card },
  imagePlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: PCOLORS.primaryLight },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    paddingHorizontal: 9,
    paddingVertical: 2,
    maxWidth: "100%",
  },
  chipText: { fontFamily: FONTS.medium, fontSize: 12, color: PCOLORS.muted, flexShrink: 1 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: PCOLORS.primaryLight,
    borderRadius: 14,
    padding: 14,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextBox: { flex: 1 },
  bannerTitle: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  bannerText: { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 19, color: PCOLORS.muted },
});
