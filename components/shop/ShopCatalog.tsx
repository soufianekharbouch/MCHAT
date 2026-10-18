import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { deleteStoredItem, getStoredItem, setStoredItem } from "../../services/storage";

import { useAppLanguage } from "../../context/LanguageContext";
import { useSession } from "../../services/session";
import { fetchShopProducts } from "../../services/shopApi";
import type { ShopCatalogResponse, ShopProduct, ShopSpecies } from "../../types/shop";

import { CenteredLoader, ErrorState } from "../purchase/ScreenParts";
import { FONTS, PCOLORS } from "../purchase/purchaseUtils";
import {
  InfoChip,
  PriceTag,
  ProductBadges,
  ProductImage,
  SignInBanner,
  SpeciesIcon,
  goToCheckout,
} from "./shopUi";

/*
|--------------------------------------------------------------------------
| SHOP CATALOG (public)
|--------------------------------------------------------------------------
|
| Shown by the Home tab (index) when nobody is signed in,
| and by the hidden route /shop for signed in customers.
|
| Open without account. Products are filtered by species only,
| the age of the pet is chosen at checkout.
|
*/

const SPECIES_KEY = "shop_species";

export default function ShopCatalog() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const { signedIn } = useSession();

  const [catalog, setCatalog] = useState<ShopCatalogResponse | null>(null);
  const [species, setSpecies] = useState<ShopSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const speciesChosen = useRef(false);

  const t = isArabic
    ? {
        title: "اختر باقة حيوانك",
        subtitle: "وجبات طازجة تصل إلى بابك. اختر العمر عند الطلب.",
        cats: "قطط",
        dogs: "كلاب",
        empty: "لا توجد باقات متاحة حالياً.",
        retry: "إعادة المحاولة",
        buy: "اشترك الآن",
        recipes: "وصفة",
        details: "التفاصيل",
        yourPets: "لحيوانك",
      }
    : {
        title: "Choose your pet's plan",
        subtitle: "Fresh meals delivered to your door. Pick the age at checkout.",
        cats: "Cats",
        dogs: "Dogs",
        empty: "No plans available right now.",
        retry: "Try again",
        buy: "Subscribe now",
        recipes: "recipes",
        details: "Details",
        yourPets: "For",
      };

  /*
  |--------------------------------------------------------------------------
  | LOAD (all products once, the species filter is local)
  |--------------------------------------------------------------------------
  */

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        setError("");

        const data = await fetchShopProducts(lang);
        setCatalog(data);

        if (!speciesChosen.current) {
          speciesChosen.current = true;

          let saved: string | null = null;
          try {
            saved = await getStoredItem(SPECIES_KEY);
          } catch {
            saved = null;
          }

          // Saved choice > species of the customer's pets > the one with products
          const petSpecies = data.pets[0]?.species ?? null;
          const fallback: ShopSpecies = (data.counts?.Cat ?? 0) > 0 || (data.counts?.Dog ?? 0) === 0 ? "Cat" : "Dog";

          setSpecies(saved === "Cat" || saved === "Dog" ? saved : petSpecies ?? fallback);
        }
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang]
  );

  // Reload on focus and when the customer signs in / out (prices, pets)
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load, signedIn])
  );

  const chooseSpecies = (value: ShopSpecies) => {
    setSpecies(value);
    setStoredItem(SPECIES_KEY, value).catch(() => undefined);
  };

  const products = useMemo(
    () => (catalog?.products ?? []).filter(product => !species || product.species === species),
    [catalog, species]
  );

  const petNames = (product: ShopProduct) =>
    (catalog?.pets ?? [])
      .filter(pet => product.compatible_pet_ids.includes(pet.id))
      .map(pet => pet.name)
      .join(isArabic ? "، " : ", ");

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  if (loading && !catalog) {
    return <CenteredLoader />;
  }

  if (error && !catalog) {
    return <ErrorState message={error} retryLabel={t.retry} onRetry={() => void load()} />;
  }

  const textDir = isArabic ? styles.textRtl : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={PCOLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, textDir]}>{t.title}</Text>
      <Text style={[styles.subtitle, textDir]}>{t.subtitle}</Text>

      {/* CAT / DOG */}
      <View style={[styles.toggle, isArabic && styles.rowRtl]}>
        {(["Cat", "Dog"] as ShopSpecies[]).map(value => {
          const active = species === value;
          const count = catalog?.counts?.[value] ?? 0;

          return (
            <Pressable
              key={value}
              onPress={() => chooseSpecies(value)}
              style={[styles.toggleItem, active && styles.toggleItemActive, isArabic && styles.rowRtl]}
            >
              <SpeciesIcon species={value} size={22} color={active ? PCOLORS.white : PCOLORS.text} />
              <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                {value === "Cat" ? t.cats : t.dogs}
              </Text>
              <View style={[styles.countPill, active && styles.countPillActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {!signedIn && (
        <View style={styles.bannerWrap}>
          <SignInBanner isArabic={isArabic} redirect="/(tabs)" />
        </View>
      )}

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={42} color={PCOLORS.muted} />
          <Text style={styles.emptyText}>{t.empty}</Text>
        </View>
      ) : (
        products.map(product => {
          const pets = petNames(product);

          return (
            <Pressable
              key={product.id}
              onPress={() => router.push({ pathname: "/shop-product", params: { id: String(product.id) } } as any)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View>
                <ProductImage product={product} height={170} />
                <View style={[styles.badgesOverlay, isArabic ? styles.overlayRight : styles.overlayLeft]}>
                  <ProductBadges product={product} isArabic={isArabic} />
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.productName, textDir]} numberOfLines={2}>
                  {product.name}
                </Text>

                <View style={[styles.chips, isArabic && styles.rowRtl]}>
                  <InfoChip icon="calendar-outline" label={product.duration_label} isArabic={isArabic} />
                  <InfoChip
                    icon="restaurant-outline"
                    label={product.total_recipes ? `${product.total_recipes} ${t.recipes}` : ""}
                    isArabic={isArabic}
                  />
                  <InfoChip icon="paw-outline" label={product.life_stages_label} isArabic={isArabic} />
                </View>

                {!!pets && (
                  <Text style={[styles.forPets, textDir]} numberOfLines={1}>
                    {t.yourPets} {pets}
                  </Text>
                )}

                <View style={[styles.cardFooter, isArabic && styles.rowRtl]}>
                  <PriceTag product={product} isArabic={isArabic} />

                  <Pressable
                    onPress={() => goToCheckout(product.id)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.buyButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.buyText}>{t.buy}</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PCOLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.88 },

  title: { fontFamily: FONTS.extraBold, fontSize: 26, lineHeight: 38, color: PCOLORS.text },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 22, color: PCOLORS.muted, marginBottom: 16 },

  toggle: { flexDirection: "row", gap: 10, marginBottom: 16 },
  toggleItem: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  toggleItemActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  toggleText: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  toggleTextActive: { color: PCOLORS.white },
  countPill: { minWidth: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: PCOLORS.card, alignItems: "center" },
  countPillActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  countText: { fontFamily: FONTS.bold, fontSize: 11, color: PCOLORS.muted },
  countTextActive: { color: PCOLORS.white },

  bannerWrap: { marginBottom: 18 },

  empty: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyText: { fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.muted },

  card: {
    backgroundColor: PCOLORS.white,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ECE6DD",
  },
  badgesOverlay: { position: "absolute", top: 12 },
  overlayLeft: { left: 12 },
  overlayRight: { right: 12 },
  cardBody: { padding: 16, gap: 10 },
  productName: { fontFamily: FONTS.bold, fontSize: 17, lineHeight: 26, color: PCOLORS.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  forPets: { fontFamily: FONTS.semiBold, fontSize: 12, color: PCOLORS.primary },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 },
  buyButton: { backgroundColor: PCOLORS.dark, borderRadius: 10, paddingHorizontal: 16, height: 42, justifyContent: "center" },
  buyText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.white },
});