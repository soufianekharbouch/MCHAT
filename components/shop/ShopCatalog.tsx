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
  ConsultationNote,
  InfoChip,
  PriceTag,
  ProductBadges,
  ProductImage,
  SignInBanner,
  SpeciesIcon,
  goToCheckout,
} from "./shopUi";
import { groupProducts, type ShopProductGroup } from "./productGroups";

/*
|--------------------------------------------------------------------------
| SHOP CATALOG (public)
|--------------------------------------------------------------------------
|
| Shown by the Home tab (index) when nobody is signed in,
| and by the hidden route /shop for signed in customers.
|
| Open without account. Products are filtered by species only.
| One card per pack: the age versions of a pack (REG-CAT-KITTEN /
| ADULT / SENIOR) are grouped, the age is chosen on the product page.
|
*/

const SPECIES_KEY = "shop_species";

/*
 * Kinds of packs (product code):
 *   REG-      subscription packs
 *   TP-       taste packs (to try our recipes)
 *   PREMIUM-  custom recipes
 * One section per kind, in the order sent by the server
 * (it depends on what the customer already bought).
 */
type PackKind = "REG" | "TP" | "PREMIUM" | "OTHER";

function packKind(code?: string | null): PackKind {
  const value = String(code || "").trim().toUpperCase();

  if (value.startsWith("REG-")) return "REG";
  if (value.startsWith("TP-")) return "TP";
  if (value.startsWith("PREMIUM-")) return "PREMIUM";

  return "OTHER";
}

const KIND_ICON: Record<PackKind, React.ComponentProps<typeof Ionicons>["name"]> = {
  REG: "calendar-outline",
  TP: "gift-outline",
  PREMIUM: "diamond-outline",
  OTHER: "basket-outline",
};

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
        from: "ابتداءً من",
        ages: "الأعمار:",
        cats: "قطط",
        dogs: "كلاب",
        empty: "لا توجد باقات متاحة حالياً.",
        retry: "إعادة المحاولة",
        buy: "اشترك الآن",
        buyTaste: "جرّب الآن",
        buyPremium: "اطلب باقتك",
        premiumRibbon: "باقة مخصصة · بريميوم",
        recipes: "وصفة",
        details: "التفاصيل",
        yourPets: "لحيوانك",
        sections: {
          REG: { title: "باقات الاشتراك", text: "وجباتك الطازجة كل شهر، توصيل منتظم إلى بابك." },
          TP: { title: "باقات التذوق", text: "ليجرّب حيوانك وصفاتنا قبل الاشتراك." },
          PREMIUM: { title: "وصفات مخصصة", text: "وصفات يحضّرها فريق التغذية لحيوانك فقط." },
          OTHER: { title: "باقات أخرى", text: "" },
        },
      }
    : {
        title: "Choose your pet's plan",
        subtitle: "Fresh meals delivered to your door. Pick the age at checkout.",
        from: "From",
        ages: "Ages:",
        cats: "Cats",
        dogs: "Dogs",
        empty: "No plans available right now.",
        retry: "Try again",
        buy: "Subscribe now",
        buyTaste: "Try now",
        buyPremium: "Get my pack",
        premiumRibbon: "PERSONALIZED · PREMIUM",
        recipes: "recipes",
        details: "Details",
        yourPets: "For",
        sections: {
          REG: { title: "Subscription packs", text: "Your fresh meals every month, delivered to your door." },
          TP: { title: "Taste packs", text: "Let your pet try our recipes before subscribing." },
          PREMIUM: { title: "Custom recipes", text: "Recipes prepared by our nutrition team for your pet only." },
          OTHER: { title: "Other packs", text: "" },
        },
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

  // Number of packs per species (age versions counted once)
  const groupCounts = useMemo(() => {
    const all = catalog?.products ?? [];

    return {
      Cat: groupProducts(all.filter(product => product.species === "Cat"), isArabic).length,
      Dog: groupProducts(all.filter(product => product.species === "Dog"), isArabic).length,
    } as Record<ShopSpecies, number>;
  }, [catalog, isArabic]);

  // One card per pack (age versions grouped)
  const groups = useMemo(() => groupProducts(products, isArabic), [products, isArabic]);

  // Sections REG- / TP- / PREMIUM-, in the order of the server
  const sections = useMemo(() => {
    const list: { kind: PackKind; groups: ShopProductGroup[] }[] = [];

    groups.forEach(group => {
      const kind = packKind(group.main.code);
      const section = list.find(item => item.kind === kind);

      if (section) {
        section.groups.push(group);
      } else {
        list.push({ kind, groups: [group] });
      }
    });

    return list;
  }, [groups]);

  // Pets of the customer that can receive one of the versions of the pack
  const petNames = (group: ShopProductGroup) =>
    (catalog?.pets ?? [])
      .filter(pet => group.products.some((product: ShopProduct) => product.compatible_pet_ids.includes(pet.id)))
      .map(pet => pet.name)
      .join(isArabic ? "، " : ", ");

  const openGroup = (group: ShopProductGroup) =>
    router.push({ pathname: "/shop-product", params: { id: String(group.main.id) } } as any);

  // One version only: straight to checkout, otherwise choose the age first
  const buyGroup = (group: ShopProductGroup) =>
    group.products.length === 1 ? goToCheckout(group.main.id) : openGroup(group);

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
          const count = groupCounts[value] ?? 0;

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

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={42} color={PCOLORS.muted} />
          <Text style={styles.emptyText}>{t.empty}</Text>
        </View>
      ) : (
        sections.map(section => (
          <View key={section.kind} style={styles.section}>
            {/* SECTION HEADER */}
            <View style={[styles.sectionHeader, isArabic && styles.rowRtl]}>
              <View style={[styles.sectionIcon, section.kind === "PREMIUM" && styles.sectionIconPremium]}>
                <Ionicons name={KIND_ICON[section.kind]} size={18} color={PCOLORS.white} />
              </View>
              <View style={styles.sectionTexts}>
                <Text style={[styles.sectionTitle, section.kind === "PREMIUM" && styles.sectionTitlePremium, textDir]}>
                  {t.sections[section.kind].title}
                </Text>
                {!!t.sections[section.kind].text && (
                  <Text style={[styles.sectionText, textDir]}>{t.sections[section.kind].text}</Text>
                )}
              </View>
            </View>

            {section.groups.map(group => {
          const product = group.main;
          const pets = petNames(group);
          const samePrice = group.minPrice === group.maxPrice;
          // PREMIUM-... (cats and dogs): own style
          const premium = !!product.requires_consultation;

          return (
            <Pressable
              key={group.key}
              onPress={() => openGroup(group)}
              style={({ pressed }) => [styles.card, premium && styles.cardPremium, pressed && styles.pressed]}
            >
              {premium && (
                <View style={[styles.premiumRibbon, isArabic && styles.rowRtl]}>
                  <Ionicons name="diamond-outline" size={15} color={PCOLORS.white} />
                  <Text style={styles.premiumRibbonText}>{t.premiumRibbon}</Text>
                </View>
              )}

              <View>
                <ProductImage product={product} height={170} />
                <View style={[styles.badgesOverlay, isArabic ? styles.overlayRight : styles.overlayLeft]}>
                  <ProductBadges product={product} isArabic={isArabic} />
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.productName, premium && styles.productNamePremium, textDir]} numberOfLines={2}>
                  {group.title}
                </Text>

                <View style={[styles.chips, isArabic && styles.rowRtl]}>
                  <InfoChip icon="calendar-outline" label={product.duration_label} isArabic={isArabic} />
                  <InfoChip
                    icon="restaurant-outline"
                    label={product.total_recipes ? `${product.total_recipes} ${t.recipes}` : ""}
                    isArabic={isArabic}
                  />
                  {group.ages.length <= 1 && (
                    <InfoChip icon="paw-outline" label={product.life_stages_label} isArabic={isArabic} />
                  )}
                </View>

                {/* PREMIUM-... : recipes chosen by our team */}
                <ConsultationNote product={product} isArabic={isArabic} compact />

                {/* Ages available for this pack */}
                {group.ages.length > 1 && (
                  <View style={[styles.ageRow, isArabic && styles.rowRtl]}>
                    <Text style={styles.ageRowLabel}>{t.ages}</Text>
                    {group.ages.map(age => (
                      <View key={age.productId} style={styles.agePill}>
                        <Text style={styles.agePillText}>{age.label}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {!!pets && (
                  <Text style={[styles.forPets, textDir]} numberOfLines={1}>
                    {t.yourPets} {pets}
                  </Text>
                )}

                <View style={[styles.cardFooter, isArabic && styles.rowRtl]}>
                  {samePrice ? (
                    <PriceTag product={product} isArabic={isArabic} />
                  ) : (
                    <Text style={styles.fromPrice}>
                      {t.from}{" "}
                      <Text style={styles.fromPriceValue}>{group.minPrice.toFixed(3)}</Text>{" "}
                      {product.currency}
                    </Text>
                  )}

                  <Pressable
                    onPress={() => buyGroup(group)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.buyButton, premium && styles.buyButtonPremium, pressed && styles.pressed]}
                  >
                    <Text style={styles.buyText}>
                      {section.kind === "TP" ? t.buyTaste : section.kind === "PREMIUM" ? t.buyPremium : t.buy}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
            })}
          </View>
        ))
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
  ageRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  ageRowLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: PCOLORS.muted },
  agePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: PCOLORS.card,
    borderWidth: 1,
    borderColor: PCOLORS.border,
  },
  agePillText: { fontFamily: FONTS.semiBold, fontSize: 12, color: PCOLORS.text },
  fromPrice: { fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.muted },
  fromPriceValue: { fontFamily: FONTS.extraBold, fontSize: 20, color: PCOLORS.text },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 },
  buyButton: { backgroundColor: PCOLORS.dark, borderRadius: 10, paddingHorizontal: 16, height: 42, justifyContent: "center" },
  buyText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.white },

  // Sections REG- / TP- / PREMIUM-
  section: { marginBottom: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 6 },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PCOLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIconPremium: { backgroundColor: "#B8860B" },
  sectionTexts: { flex: 1 },
  sectionTitle: { fontFamily: FONTS.extraBold, fontSize: 19, lineHeight: 28, color: PCOLORS.text },
  sectionTitlePremium: { color: "#6B4E00" },
  sectionText: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.muted },

  // PREMIUM-... card
  cardPremium: {
    backgroundColor: "#FFF9EC",
    borderWidth: 2,
    borderColor: "#C9A227",
    shadowColor: "#B8860B",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  premiumRibbon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    backgroundColor: "#B8860B",
  },
  premiumRibbonText: { fontFamily: FONTS.bold, fontSize: 13, letterSpacing: 0.5, color: PCOLORS.white },
  productNamePremium: { color: "#6B4E00" },
  buyButtonPremium: { backgroundColor: "#B8860B" },
});