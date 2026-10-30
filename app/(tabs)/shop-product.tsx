import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { useSession } from "../../services/session";
import { fetchShopProduct, fetchShopProducts } from "../../services/shopApi";
import type { ShopProduct, ShopProductResponse } from "../../types/shop";

import { BackRow, CenteredLoader, ErrorState, PrimaryButton } from "../../components/purchase/ScreenParts";
import { FONTS, PCOLORS } from "../../components/purchase/purchaseUtils";
import {
  InfoChip,
  PriceTag,
  ConsultationNote,
  ProductBadges,
  ProductImage,
  SignInBanner,
  goToCheckout,
} from "../../components/shop/shopUi";
import { findGroup, groupProducts, type ShopProductGroup } from "../../components/shop/productGroups";
import ProductDescription from "../../components/shop/ProductDescription";

/*
|--------------------------------------------------------------------------
| PRODUCT DETAIL (public)
|--------------------------------------------------------------------------
*/

export default function ShopProductScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const { signedIn } = useSession();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = Number(params.id);

  const [data, setData] = useState<ShopProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Same pack in the other ages (REG-CAT-KITTEN / ADULT / SENIOR) + chosen age
  const [group, setGroup] = useState<ShopProductGroup | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Another product opened (the tab screen stays mounted): back to its age
  useEffect(() => {
    setSelectedId(null);
    setGroup(null);
  }, [productId]);

  const t = isArabic
    ? {
        back: "المتجر",
        retry: "إعادة المحاولة",
        buy: "اشترك الآن",
        recipesTitle: "الوصفات المتضمنة",
        premiumHint: "👑 يتواصل معك فريقنا بعد الشراء لتحضير وصفاتك",
        aboutTitle: "عن الباقة",
        ages: "الأعمار",
        recipes: "وصفة",
        perRecipe: "للوصفة",
        deliveries: "عدد التوصيلات",
        trialOffer: "سعر خاص لأن حيوانك في فترة التجربة",
        ageAtCheckout: "ستختار عمر حيوانك في الخطوة التالية.",
        chooseAge: "اختر عمر حيوانك",
        selectedAge: "العمر المختار:",
        premium: "بريميوم",
      }
    : {
        back: "Shop",
        retry: "Try again",
        buy: "Subscribe now",
        recipesTitle: "Included recipes",
        premiumHint: "👑 Our team contacts you after the purchase to prepare your recipes",
        aboutTitle: "About this plan",
        ages: "Ages",
        recipes: "recipes",
        perRecipe: "per recipe",
        deliveries: "Deliveries",
        trialOffer: "Special price because your pet is on a trial",
        ageAtCheckout: "You will choose your pet's age in the next step.",
        chooseAge: "Choose your pet's age",
        selectedAge: "Selected age:",
        premium: "Premium",
      };

  const load = useCallback(async () => {
    if (!productId) {
      setError(isArabic ? "المنتج غير موجود." : "Product not found.");
      setLoading(false);
      return;
    }

    try {
      setError("");
      const response = await fetchShopProduct(lang, productId);
      setData(response);
      setSelectedId(current => current ?? response.product.id);

      // Other ages of the same pack (not blocking: the page works without)
      try {
        const catalog = await fetchShopProducts(lang, response.product.species);
        setGroup(findGroup(groupProducts(catalog.products, isArabic), response.product.id));
      } catch {
        setGroup(null);
      }
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }, [lang, productId, isArabic]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load, signedIn])
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/(tabs)" as any));

  if (loading && !data) return <CenteredLoader />;

  if (error && !data) {
    return (
      <View style={styles.screen}>
        <View style={styles.backWrap}>
          <BackRow label={t.back} isArabic={isArabic} onBack={goBack} />
        </View>
        <ErrorState message={error} retryLabel={t.retry} onRetry={() => void load()} />
      </View>
    );
  }

  if (!data) return null;

  // Chosen age version (price, recipes, rules follow it)
  const variants: ShopProduct[] = group && group.products.length > 1 ? group.products : [data.product];
  const product = variants.find(item => item.id === selectedId) ?? data.product;
  const ageLabelOf = (item: ShopProduct) =>
    item.age_options.find(option => item.life_stages.includes(option.value))?.label ?? item.life_stages_label;
  const textDir = isArabic ? styles.textRtl : null;
  const rules = product.rules;
  const deliveriesLabel =
    rules.min_deliveries === rules.max_deliveries ? String(rules.min_deliveries) : `${rules.min_deliveries} - ${rules.max_deliveries}`;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.backWrap}>
          <BackRow label={t.back} isArabic={isArabic} onBack={goBack} />
        </View>

        <View style={styles.imageBox}>
          <ProductImage product={product} height={230} />
          <View style={[styles.badgesOverlay, isArabic ? { right: 14 } : { left: 14 }]}>
            <ProductBadges product={product} isArabic={isArabic} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.name, textDir]}>{variants.length > 1 && group ? group.title : product.name}</Text>

          {/* AGE: one version of the pack per age, the price follows */}
          {variants.length > 1 && (
            <View style={styles.ageBox}>
              <Text style={[styles.ageTitle, textDir]}>{t.chooseAge}</Text>
              <View style={[styles.ageRow, isArabic && styles.rowRtl]}>
                {variants.map(item => {
                  const active = item.id === product.id;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedId(item.id)}
                      style={({ pressed }) => [styles.ageOption, active && styles.ageOptionActive, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={[styles.ageOptionLabel, active && styles.ageOptionLabelActive]}>{ageLabelOf(item)}</Text>
                      <Text style={[styles.ageOptionPrice, active && styles.ageOptionLabelActive]}>
                        {item.current_price.toFixed(3)} {item.currency}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <PriceTag product={product} isArabic={isArabic} large />

          {product.price_source === "trial_offer" && (
            <View style={[styles.offerBox, isArabic && styles.rowRtl]}>
              <Ionicons name="gift-outline" size={18} color={PCOLORS.danger} />
              <Text style={[styles.offerText, textDir]}>{t.trialOffer}</Text>
            </View>
          )}

          <View style={[styles.chips, isArabic && styles.rowRtl]}>
            <InfoChip icon="calendar-outline" label={product.duration_label} isArabic={isArabic} />
            <InfoChip
              icon="restaurant-outline"
              label={product.total_recipes ? `${product.total_recipes} ${t.recipes}` : ""}
              isArabic={isArabic}
            />
            <InfoChip icon="car-outline" label={`${t.deliveries}: ${deliveriesLabel}`} isArabic={isArabic} />
            <InfoChip icon="paw-outline" label={product.life_stages_label} isArabic={isArabic} />
          </View>

          {product.price_per_recipe > 0 && (
            <Text style={[styles.perRecipe, textDir]}>
              {product.price_per_recipe.toFixed(3)} {product.currency} {t.perRecipe}
            </Text>
          )}

          {/* PREMIUM-... : the team calls the customer and chooses his recipes */}
          <ConsultationNote product={product} isArabic={isArabic} />

          {!!product.description &&
            (/^\s*#/m.test(product.description) ? (
              // Description with ## sections: blocks that open / close
              <ProductDescription key={product.id} description={product.description} isArabic={isArabic} />
            ) : (
              <>
                <Text style={[styles.sectionTitle, textDir]}>{t.aboutTitle}</Text>
                <Text style={[styles.description, textDir]}>{product.description}</Text>
              </>
            ))}

          {product.recipes.length > 0 && !product.requires_consultation && (
            <>
              <Text style={[styles.sectionTitle, textDir]}>{t.recipesTitle}</Text>
              {product.recipes.map(recipe => (
                <View key={recipe.id} style={[styles.recipeRow, isArabic && styles.rowRtl]}>
                  <Ionicons name="checkmark-circle" size={18} color={PCOLORS.primary} />
                  <Text style={[styles.recipeName, textDir]}>{recipe.name}</Text>
                  {recipe.is_premium && <Text style={styles.premium}>{t.premium}</Text>}
                </View>
              ))}
            </>
          )}

          {!signedIn && (
            <View style={styles.bannerWrap}>
              <SignInBanner isArabic={isArabic} redirect={`/shop-product?id=${product.id}`} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* STICKY BUY BAR */}
      <View style={styles.footer}>
        <Text style={[styles.footerHint, product.requires_consultation && styles.footerHintPremium]}>
          {product.requires_consultation
            ? t.premiumHint
            : variants.length > 1
              ? `${t.selectedAge} ${ageLabelOf(product)}`
              : t.ageAtCheckout}
        </Text>
        <PrimaryButton label={t.buy} icon="cart-outline" onPress={() => goToCheckout(product.id)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerHintPremium: { color: "#8A6400", fontFamily: FONTS.semiBold },
  screen: { flex: 1, backgroundColor: PCOLORS.background },
  content: { paddingBottom: 30 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  backWrap: { paddingHorizontal: 20, paddingTop: 12 },
  imageBox: { marginHorizontal: 20, marginTop: 10, borderRadius: 18, overflow: "hidden" },
  badgesOverlay: { position: "absolute", top: 14 },

  body: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  name: { fontFamily: FONTS.extraBold, fontSize: 24, lineHeight: 34, color: PCOLORS.text },

  offerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PCOLORS.dangerLight,
    borderRadius: 10,
    padding: 10,
  },
  offerText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.danger },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

  ageBox: { gap: 8 },
  ageTitle: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  ageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ageOption: {
    flexGrow: 1,
    minWidth: 95,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  ageOptionActive: { borderColor: PCOLORS.primary, backgroundColor: PCOLORS.primary },
  ageOptionLabel: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  ageOptionLabelActive: { color: PCOLORS.white },
  ageOptionPrice: { fontFamily: FONTS.medium, fontSize: 12, color: PCOLORS.muted },
  perRecipe: { fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.muted },

  sectionTitle: { marginTop: 8, fontFamily: FONTS.bold, fontSize: 17, color: PCOLORS.text },
  description: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 24, color: PCOLORS.muted },

  recipeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  recipeName: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.text },
  premium: { fontFamily: FONTS.bold, fontSize: 11, color: PCOLORS.warning },

  bannerWrap: { marginTop: 10 },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: PCOLORS.border,
    backgroundColor: PCOLORS.background,
    gap: 6,
  },
  footerHint: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted, textAlign: "center" },
});