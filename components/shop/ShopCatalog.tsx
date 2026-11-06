import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { deleteStoredItem, getStoredItem, setStoredItem } from "../../services/storage";

import { useAppLanguage } from "../../context/LanguageContext";
import { useSession } from "../../services/session";
import { fetchShopProducts } from "../../services/shopApi";
import type { LifeStage, ShopCatalogResponse, ShopProduct, ShopSpecies } from "../../types/shop";

import { CenteredLoader, ErrorState } from "../purchase/ScreenParts";
import { FONTS, PCOLORS } from "../purchase/purchaseUtils";
import { ConsultationNote, ProductBadges, ProductImage, SignInBanner, SpeciesIcon, goToCheckout } from "./shopUi";
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

/* Same look as the product page */
const CORAL = "#EB6268";
const CORAL_LIGHT = "#FDE9E7";
const SUN = "#F6C945";

const FEATURE_ICONS: Record<string, { family: "ion" | "mdi"; name: string }> = {
  fresh: { family: "ion", name: "sparkles-outline" },
  natural: { family: "ion", name: "leaf-outline" },
  chilled: { family: "ion", name: "snow-outline" },
  human_grade: { family: "ion", name: "restaurant-outline" },
  no_preservatives: { family: "mdi", name: "flask-empty-off-outline" },
  grain_free: { family: "mdi", name: "barley-off" },
  vet_approved: { family: "mdi", name: "stethoscope" },
};

/** Short age labels (same as the product page) */
const AGE_SHORT: Record<LifeStage, { en: string; ar: string }> = {
  Kitten: { en: "Kitten", ar: "صغير" },
  Puppy: { en: "Puppy", ar: "صغير" },
  Adult: { en: "Adult", ar: "بالغ" },
  Senior: { en: "Senior", ar: "كبير" },
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
        subtitle: "وجبات طازجة تصل إلى بابك.",
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
        currency: "د.ك",
        freeDelivery: "توصيل مجاني",
        bags: "أكياس",
        bag: "كيس",
        sections: {
          REG: { title: "باقات الاشتراك", text: "وجباتك الطازجة كل شهر، توصيل منتظم إلى بابك." },
          TP: { title: "باقات التذوق", text: "ليجرّب حيوانك وصفاتنا قبل الاشتراك." },
          PREMIUM: { title: "وصفات مخصصة", text: "وصفات يحضّرها فريق التغذية لحيوانك فقط." },
          OTHER: { title: "باقات أخرى", text: "" },
        },
      }
    : {
        title: "Choose your pet's plan",
        subtitle: "Fresh meals delivered to your door.",
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
        currency: "KWD",
        freeDelivery: "Free delivery",
        bags: "bags",
        bag: "bag",
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
              const bags = Number(product.bags_count || 0);
              const currency = product.currency === "KWD" ? t.currency : product.currency;
              const features = product.features ?? [];
              const ageLabels = group.ages.map(age => AGE_SHORT[age.value]?.[lang] ?? age.label);

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

                  {/* PHOTO + badges */}
                  <View style={styles.imageBox}>
                    <ProductImage product={product} height={190} />

                    <View style={[styles.badgesOverlay, isArabic ? styles.overlayLeft : styles.overlayRight]}>
                      <ProductBadges product={product} isArabic={isArabic} />
                    </View>

                    {bags > 0 && !premium && (
                      <View style={[styles.bagsSticker, isArabic ? styles.overlayRight : styles.overlayLeft]}>
                        <Text style={styles.bagsNumber}>{bags}</Text>
                        <Text style={styles.bagsLabel}>{bags === 1 ? t.bag : t.bags}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    {/* NAME + SUBTITLE */}
                    <Text style={[styles.productName, premium && styles.productNamePremium]} numberOfLines={2}>
                      {group.title}
                    </Text>
                    {!!product.subtitle && (
                      <Text style={styles.productSubtitle} numberOfLines={2}>
                        {product.subtitle}
                      </Text>
                    )}

                    {/* PRICE + FREE DELIVERY */}
                    <View style={[styles.priceRow, isArabic && styles.rowRtl]}>
                      <View style={[styles.pricePill, isArabic && styles.rowRtl]}>
                        {!samePrice && <Text style={styles.fromText}>{t.from}</Text>}
                        <Text style={styles.priceText}>
                          {(samePrice ? product.current_price : group.minPrice).toFixed(3)} {currency}
                        </Text>
                        {samePrice && product.has_promo && <Text style={styles.oldPrice}>{product.price.toFixed(3)}</Text>}
                      </View>

                      {product.free_delivery !== false && (
                        <View style={[styles.deliveryPill, isArabic && styles.rowRtl]}>
                          <MaterialCommunityIcons name="truck-delivery-outline" size={16} color={PCOLORS.primary} />
                          <Text style={styles.deliveryText}>{t.freeDelivery}</Text>
                        </View>
                      )}
                    </View>

                    {/* AGES of the pack */}
                    {ageLabels.length > 1 && (
                      <View style={[styles.ageRow, isArabic && styles.rowRtl]}>
                        {ageLabels.map((label, index) => (
                          <View key={`${label}-${index}`} style={[styles.agePill, isArabic && styles.rowRtl]}>
                            <MaterialCommunityIcons name={product.species === "Dog" ? "dog" : "cat"} size={15} color={PCOLORS.primary} />
                            <Text style={styles.agePillText}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* PREMIUM-... : recipes chosen by our team */}
                    <ConsultationNote product={product} isArabic={isArabic} compact />

                    {/* QUALITIES */}
                    {features.length > 0 && !premium && (
                      <View style={[styles.featuresRow, isArabic && styles.rowRtl]}>
                        {features.slice(0, 3).map(feature => {
                          const icon = FEATURE_ICONS[feature.key] ?? { family: "ion", name: "checkmark-circle-outline" };

                          return (
                            <View key={feature.key} style={styles.featureItem}>
                              {icon.family === "mdi" ? (
                                <MaterialCommunityIcons name={icon.name as any} size={18} color={PCOLORS.primary} />
                              ) : (
                                <Ionicons name={icon.name as any} size={18} color={PCOLORS.primary} />
                              )}
                              <Text style={styles.featureText} numberOfLines={2}>
                                {feature.label}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {!!pets && (
                      <Text style={[styles.forPets, textDir]} numberOfLines={1}>
                        {t.yourPets} {pets}
                      </Text>
                    )}

                    {/* BUTTON */}
                    <Pressable
                      onPress={() => buyGroup(group)}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.buyButton,
                        premium && styles.buyButtonPremium,
                        isArabic && styles.rowRtl,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="cart-outline" size={19} color={PCOLORS.white} />
                      <Text style={styles.buyText}>
                        {section.kind === "TP" ? t.buyTaste : section.kind === "PREMIUM" ? t.buyPremium : t.buy}
                      </Text>
                    </Pressable>
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
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#ECE6DD",
  },
  imageBox: { margin: 10, marginBottom: 0, borderRadius: 18, overflow: "hidden" },
  badgesOverlay: { position: "absolute", top: 12 },
  overlayLeft: { left: 12 },
  overlayRight: { right: 12 },
  bagsSticker: {
    position: "absolute",
    top: 10,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: SUN,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bagsNumber: { fontFamily: FONTS.extraBold, fontSize: 20, lineHeight: 24, color: PCOLORS.text },
  bagsLabel: { fontFamily: FONTS.bold, fontSize: 11, lineHeight: 14, color: PCOLORS.text },

  cardBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 10 },
  productName: { fontFamily: FONTS.extraBold, fontSize: 20, lineHeight: 30, color: PCOLORS.text, textAlign: "center" },
  productSubtitle: { marginTop: -8, fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.muted, textAlign: "center" },

  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  pricePill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    backgroundColor: CORAL_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  fromText: { fontFamily: FONTS.semiBold, fontSize: 12, color: CORAL },
  priceText: { fontFamily: FONTS.extraBold, fontSize: 18, color: CORAL },
  oldPrice: { fontFamily: FONTS.medium, fontSize: 12, color: PCOLORS.muted, textDecorationLine: "line-through" },
  deliveryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PCOLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deliveryText: { fontFamily: FONTS.bold, fontSize: 12, color: PCOLORS.text },

  ageRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#F3EDE5",
  },
  agePillText: { fontFamily: FONTS.bold, fontSize: 12, color: PCOLORS.text },

  featuresRow: { flexDirection: "row", gap: 8 },
  featureItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECE6DD",
  },
  featureText: { fontFamily: FONTS.semiBold, fontSize: 11, lineHeight: 16, color: PCOLORS.text, textAlign: "center" },

  forPets: { fontFamily: FONTS.semiBold, fontSize: 12, color: PCOLORS.primary, textAlign: "center" },

  buyButton: {
    marginTop: 2,
    height: 48,
    borderRadius: 999,
    backgroundColor: PCOLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buyText: { fontFamily: FONTS.extraBold, fontSize: 15, color: PCOLORS.white },

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