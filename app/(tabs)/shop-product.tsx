import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { useSession } from "../../services/session";
import { fetchShopProduct, fetchShopProducts } from "../../services/shopApi";
import type { LifeStage, ShopProduct, ShopProductResponse } from "../../types/shop";

import { BackRow, CenteredLoader, ErrorState } from "../../components/purchase/ScreenParts";
import { FONTS, PCOLORS } from "../../components/purchase/purchaseUtils";
import { ConsultationNote, ProductBadges, SignInBanner, goToCheckout } from "../../components/shop/shopUi";
import { findGroup, groupProducts, type ShopProductGroup } from "../../components/shop/productGroups";
import ProductMediaCarousel from "../../components/shop/ProductMediaCarousel";
import ProductInfoSections, { RichLine, parseDescription, type InfoSection } from "../../components/shop/ProductInfoSections";

/*
|--------------------------------------------------------------------------
| PRODUCT DETAIL (public) - new design
|--------------------------------------------------------------------------
|
|  photo / videos (badge "5 bags")
|  name, subtitle, price + free delivery
|  age of the pet (one version of the pack per age, the price follows)
|  bag weight, "what's inside", qualities, WhatsApp question
|  blocks of the description (ingredients, serving, storage, delivery)
|  bottom bar: number of packs, total, "Subscribe now"
|
*/

const CORAL = "#EB6268";
const CORAL_LIGHT = "#FDE9E7";
const SUN = "#F6C945";
const WHATSAPP = "#25D366";

const FEATURE_ICONS: Record<string, { family: "ion" | "mdi"; name: string }> = {
  fresh: { family: "ion", name: "sparkles-outline" },
  natural: { family: "ion", name: "leaf-outline" },
  chilled: { family: "ion", name: "snow-outline" },
  human_grade: { family: "ion", name: "restaurant-outline" },
  no_preservatives: { family: "mdi", name: "flask-empty-off-outline" },
  grain_free: { family: "mdi", name: "barley-off" },
  vet_approved: { family: "mdi", name: "stethoscope" },
};

/** Short age labels of the age cards */
const AGE_SHORT: Record<LifeStage, { en: string; ar: string }> = {
  Kitten: { en: "Kitten", ar: "صغير" },
  Puppy: { en: "Puppy", ar: "صغير" },
  Adult: { en: "Adult", ar: "بالغ" },
  Senior: { en: "Senior", ar: "كبير" },
};

const MAX_PACKS = 3;

export default function ShopProductScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const { signedIn } = useSession();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = Number(params.id);

  const [data, setData] = useState<ShopProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Same pack in the other ages (REG-CAT-KITTEN / ADULT / SENIOR) + chosen age
  const [group, setGroup] = useState<ShopProductGroup | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Another product opened (the tab screen stays mounted): back to its age
  useEffect(() => {
    setSelectedId(null);
    setGroup(null);
    setQuantity(1);
  }, [productId]);

  const t = isArabic
    ? {
        back: "المتجر",
        retry: "إعادة المحاولة",
        buy: "اشترك الآن",
        currency: "د.ك",
        freeDelivery: "توصيل مجاني",
        bags: "أكياس",
        bag: "كيس",
        bagWeight: "وزن الكيس",
        grams: "جم",
        chooseAgeCat: "اختر عمر قطتك",
        chooseAgeDog: "اختر عمر كلبك",
        inside: "شنو داخل الباقة؟",
        question: "عندك سؤال؟ واتساب",
        whatsappText: (name: string) => `مرحباً، عندي سؤال عن ${name}`,
        trialOffer: "سعر خاص لأن حيوانك في فترة التجربة",
        premiumHint: "👑 يتواصل معك فريقنا بعد الشراء لتحضير وصفاتك",
        recipesTitle: "الوصفات المتضمنة",
        aboutTitle: "عن الباقة",
        deliveryTitle: "التوصيل",
        deliveryDuration: (label: string) => `مدة الباقة: ${label}`,
        deliveryCount: (label: string) => `عدد التوصيلات: ${label}`,
        deliveryFree: "التوصيل مجاني داخل الكويت",
        deliveryPlan: "تختار أيام التوصيل بعد الشراء، ويمكنك تعديلها لاحقاً",
        premium: "بريميوم",
      }
    : {
        back: "Shop",
        retry: "Try again",
        buy: "Subscribe now",
        currency: "KWD",
        freeDelivery: "Free delivery",
        bags: "bags",
        bag: "bag",
        bagWeight: "Bag weight",
        grams: "g",
        chooseAgeCat: "Choose your cat's age",
        chooseAgeDog: "Choose your dog's age",
        inside: "What's inside the pack?",
        question: "Any question? WhatsApp",
        whatsappText: (name: string) => `Hello, I have a question about ${name}`,
        trialOffer: "Special price because your pet is on a trial",
        premiumHint: "👑 Our team contacts you after the purchase to prepare your recipes",
        recipesTitle: "Included recipes",
        aboutTitle: "About this plan",
        deliveryTitle: "Delivery",
        deliveryDuration: (label: string) => `Plan length: ${label}`,
        deliveryCount: (label: string) => `Deliveries: ${label}`,
        deliveryFree: "Free delivery in Kuwait",
        deliveryPlan: "You choose your delivery days after the purchase, and can change them later",
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

  // Chosen age version (price, recipes, rules follow it)
  const variants: ShopProduct[] = data ? (group && group.products.length > 1 ? group.products : [data.product]) : [];
  const product = data ? variants.find(item => item.id === selectedId) ?? data.product : null;

  // Blocks of the description + recipes + delivery
  const info = useMemo(() => {
    if (!product) return { intro: [] as string[], sections: [] as InfoSection[] };

    const parsed = parseDescription(product.description);
    const sections: InfoSection[] = [...parsed.sections];

    // Description without "## Title": one block "About this plan"
    if (sections.length === 0 && parsed.intro.length > 0) {
      sections.push({ key: "about", title: t.aboutTitle, lines: parsed.intro });
    }

    if (product.recipes.length > 0 && !product.requires_consultation) {
      sections.push({
        key: "recipes",
        title: t.recipesTitle,
        lines: product.recipes.map(recipe => `- ${recipe.name}${recipe.is_premium ? ` (${t.premium})` : ""}`),
      });
    }

    // Delivery block when the description has none
    if (!sections.some(section => /توصيل|deliver/i.test(section.title))) {
      const rules = product.rules;
      const deliveries =
        rules.min_deliveries === rules.max_deliveries ? String(rules.min_deliveries) : `${rules.min_deliveries} - ${rules.max_deliveries}`;

      sections.push({
        key: "delivery",
        title: t.deliveryTitle,
        lines: [
          `- ${t.deliveryDuration(product.duration_label)}`,
          `- ${t.deliveryCount(deliveries)}`,
          ...(product.free_delivery !== false ? [`- ${t.deliveryFree}`] : []),
          `- ${t.deliveryPlan}`,
        ],
      });
    }

    return { intro: parsed.sections.length > 0 ? parsed.intro : [], sections };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, isArabic]);

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

  if (!data || !product) return null;

  const rtl = isArabic ? styles.textRtl : null;
  const row = isArabic ? styles.rowRtl : null;
  const title = variants.length > 1 && group ? group.title : product.name;
  const currency = product.currency === "KWD" ? t.currency : product.currency;
  const price = (value: number) => `${value.toFixed(3)} ${currency}`;
  const maxPacks = product.is_trial ? 1 : MAX_PACKS;
  const packs = Math.min(quantity, maxPacks);
  const bags = Number(product.bags_count || 0);
  const ageOf = (item: ShopProduct): LifeStage | null => (item.life_stages.length === 1 ? item.life_stages[0] : null);
  const ageLabel = (item: ShopProduct) => {
    const stage = ageOf(item);
    return stage ? AGE_SHORT[stage][lang] : item.life_stages_label;
  };
  const contents = product.contents ?? [];
  const features = product.features ?? [];
  const whatsapp = data.whatsapp_number;

  const openWhatsapp = () => {
    if (!whatsapp) return;
    void Linking.openURL(`https://wa.me/${whatsapp}?text=${encodeURIComponent(t.whatsappText(title))}`);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.backWrap}>
          <BackRow label={t.back} isArabic={isArabic} onBack={goBack} />
        </View>

        {/* PHOTOS / VIDEOS + badges */}
        <View style={styles.imageBox}>
          <ProductMediaCarousel
            product={product}
            height={250}
            overlay={
              <>
                <View pointerEvents="none" style={[styles.badgesOverlay, isArabic ? { left: 14 } : { right: 14 }]}>
                  <ProductBadges product={product} isArabic={isArabic} />
                </View>

                {bags > 0 && (
                  <View pointerEvents="none" style={[styles.bagsSticker, isArabic ? { right: 12 } : { left: 12 }]}>
                    <Text style={styles.bagsNumber}>{bags}</Text>
                    <Text style={styles.bagsLabel}>{bags === 1 ? t.bag : t.bags}</Text>
                  </View>
                )}
              </>
            }
          />
        </View>

        <View style={styles.body}>
          {/* NAME + SUBTITLE */}
          <Text style={styles.name}>{title}</Text>
          {!!product.subtitle && <Text style={styles.subtitle}>{product.subtitle}</Text>}

          {/* PRICE + FREE DELIVERY */}
          <View style={[styles.priceRow, row]}>
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>{price(product.current_price)}</Text>
              {product.has_promo && <Text style={styles.oldPrice}>{price(product.price)}</Text>}
            </View>

            {product.free_delivery !== false && (
              <>
                <View style={styles.priceDivider} />
                <View style={[styles.deliveryPill, row]}>
                  <MaterialCommunityIcons name="truck-delivery-outline" size={18} color={PCOLORS.primary} />
                  <Text style={styles.deliveryText}>{t.freeDelivery}</Text>
                </View>
              </>
            )}
          </View>

          {product.price_source === "trial_offer" && (
            <View style={[styles.offerBox, row]}>
              <Ionicons name="gift-outline" size={18} color={CORAL} />
              <Text style={[styles.offerText, rtl]}>{t.trialOffer}</Text>
            </View>
          )}

          {/* AGE: one version of the pack per age, the price follows */}
          {variants.length > 1 && (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, rtl]}>{product.species === "Dog" ? t.chooseAgeDog : t.chooseAgeCat}</Text>

              <View style={[styles.ageRow, row]}>
                {variants.map(item => {
                  const active = item.id === product.id;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedId(item.id)}
                      style={({ pressed }) => [styles.ageCard, active && styles.ageCardActive, pressed && styles.pressed]}
                    >
                      {active && (
                        <View style={[styles.ageCheck, isArabic ? { left: -6 } : { right: -6 }]}>
                          <Ionicons name="checkmark" size={13} color={PCOLORS.white} />
                        </View>
                      )}
                      <MaterialCommunityIcons
                        name={product.species === "Dog" ? "dog" : "cat"}
                        size={26}
                        color={active ? PCOLORS.white : PCOLORS.text}
                      />
                      <Text style={[styles.ageLabel, active && styles.ageLabelActive]}>{ageLabel(item)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* BAG WEIGHT */}
          {!!product.bag_weight_grams && (
            <View style={[styles.weightPill, row]}>
              <MaterialCommunityIcons name="scale" size={17} color={PCOLORS.primary} />
              <Text style={styles.weightText}>
                {t.bagWeight} <Text style={styles.weightValue}>{product.bag_weight_grams}</Text> {t.grams}
              </Text>
            </View>
          )}

          {/* PREMIUM-... : the team calls the customer and chooses his recipes */}
          <ConsultationNote product={product} isArabic={isArabic} />

          {/* WHAT'S INSIDE */}
          {contents.length > 0 && (
            <View style={styles.insideCard}>
              <Text style={[styles.blockTitle, rtl]}>{t.inside}</Text>

              <View style={[styles.insideRow, row]}>
                {contents.map((item, index) => (
                  <React.Fragment key={`${item.label}-${index}`}>
                    {index > 0 && (
                      <View style={styles.plus}>
                        <Ionicons name="add" size={18} color={PCOLORS.white} />
                      </View>
                    )}
                    <View style={styles.insideItem}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.insideImage} resizeMode="contain" />
                      ) : (
                        <View style={[styles.insideImage, styles.insidePlaceholder]}>
                          <Ionicons name="cube-outline" size={30} color={PCOLORS.primary} />
                        </View>
                      )}
                      <View style={styles.insideLabel}>
                        <Text style={styles.insideLabelText} numberOfLines={1}>
                          {item.quantity ? `${item.quantity} ${item.label}` : item.label}
                        </Text>
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {/* QUALITIES */}
          {features.length > 0 && (
            <View style={[styles.featuresRow, row]}>
              {features.map(feature => {
                const icon = FEATURE_ICONS[feature.key] ?? { family: "ion", name: "checkmark-circle-outline" };

                return (
                  <View key={feature.key} style={styles.featureCard}>
                    {icon.family === "mdi" ? (
                      <MaterialCommunityIcons name={icon.name as any} size={24} color={PCOLORS.primary} />
                    ) : (
                      <Ionicons name={icon.name as any} size={24} color={PCOLORS.primary} />
                    )}
                    <Text style={styles.featureText} numberOfLines={2}>
                      {feature.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* INTRO OF THE DESCRIPTION (text before the first block) */}
          {info.intro.length > 0 && (
            <View style={styles.intro}>
              {info.intro.map((line, index) => (
                <RichLine key={index} text={line.replace(/^[-•]\s+/, "• ")} isArabic={isArabic} />
              ))}
            </View>
          )}

          {/* WHATSAPP */}
          {!!whatsapp && (
            <Pressable onPress={openWhatsapp} style={({ pressed }) => [styles.whatsapp, row, pressed && styles.pressed]}>
              <MaterialCommunityIcons name="whatsapp" size={22} color={WHATSAPP} />
              <Text style={[styles.whatsappText, rtl]}>{t.question}</Text>
              <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={18} color={PCOLORS.primary} />
            </Pressable>
          )}

          {/* INGREDIENTS / SERVING / STORAGE / DELIVERY */}
          <ProductInfoSections key={product.id} sections={info.sections} isArabic={isArabic} />

          {!signedIn && (
            <View style={styles.bannerWrap}>
              <SignInBanner isArabic={isArabic} redirect={`/shop-product?id=${product.id}`} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM BAR: packs + total + Subscribe now */}
      <View style={styles.footer}>
        {product.requires_consultation && <Text style={styles.footerHint}>{t.premiumHint}</Text>}

        <View style={[styles.footerRow, row]}>
          <View style={[styles.stepper, row]}>
            <Pressable
              onPress={() => setQuantity(Math.min(maxPacks, packs + 1))}
              disabled={packs >= maxPacks}
              hitSlop={6}
              style={({ pressed }) => [styles.stepButton, (packs >= maxPacks || pressed) && styles.stepDisabled]}
            >
              <Ionicons name="add" size={20} color={PCOLORS.text} />
            </Pressable>
            <Text style={styles.stepValue}>{packs}</Text>
            <Pressable
              onPress={() => setQuantity(Math.max(1, packs - 1))}
              disabled={packs <= 1}
              hitSlop={6}
              style={({ pressed }) => [styles.stepButton, (packs <= 1 || pressed) && styles.stepDisabled]}
            >
              <Ionicons name="remove" size={20} color={PCOLORS.text} />
            </Pressable>
          </View>

          <Text style={styles.footerTotal} numberOfLines={1} adjustsFontSizeToFit>
            {price(product.current_price * packs)}
          </Text>

          <Pressable
            onPress={() => goToCheckout(product.id, packs)}
            style={({ pressed }) => [styles.buyButton, row, pressed && styles.pressed]}
          >
            <Ionicons name="cart-outline" size={20} color={PCOLORS.white} />
            <Text style={styles.buyText} numberOfLines={1}>
              {t.buy}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PCOLORS.background },
  content: { paddingBottom: 24 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.85 },

  backWrap: { paddingHorizontal: 20, paddingTop: 12 },

  imageBox: { marginHorizontal: 16, marginTop: 8, borderRadius: 26, overflow: "hidden" },
  badgesOverlay: { position: "absolute", top: 14 },
  bagsSticker: {
    position: "absolute",
    top: 12,
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: SUN,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bagsNumber: { fontFamily: FONTS.extraBold, fontSize: 24, lineHeight: 28, color: PCOLORS.text },
  bagsLabel: { fontFamily: FONTS.bold, fontSize: 13, lineHeight: 17, color: PCOLORS.text },

  body: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },

  name: { fontFamily: FONTS.extraBold, fontSize: 26, lineHeight: 38, color: PCOLORS.text, textAlign: "center" },
  subtitle: { marginTop: -12, fontFamily: FONTS.medium, fontSize: 15, color: PCOLORS.muted, textAlign: "center" },

  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" },
  pricePill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    backgroundColor: CORAL_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  priceText: { fontFamily: FONTS.extraBold, fontSize: 22, color: CORAL },
  oldPrice: { fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.muted, textDecorationLine: "line-through" },
  priceDivider: { width: 1, height: 28, backgroundColor: PCOLORS.border },
  deliveryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PCOLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  deliveryText: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.text },

  offerBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: CORAL_LIGHT, borderRadius: 12, padding: 10 },
  offerText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 13, color: CORAL },

  block: { gap: 10 },
  blockTitle: { fontFamily: FONTS.extraBold, fontSize: 16, color: PCOLORS.text },

  ageRow: { flexDirection: "row", gap: 10 },
  ageCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6DED3",
    backgroundColor: "#F3EDE5",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 8,
  },
  ageCardActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  ageCheck: {
    position: "absolute",
    top: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PCOLORS.primary,
    borderWidth: 2,
    borderColor: PCOLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  ageLabel: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  ageLabelActive: { color: PCOLORS.white },

  weightPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PCOLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  weightText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text },
  weightValue: { fontFamily: FONTS.extraBold, color: PCOLORS.primary },

  insideCard: {
    backgroundColor: PCOLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ECE6DD",
    padding: 14,
    gap: 12,
  },
  insideRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  insideItem: { flexShrink: 1, alignItems: "center", gap: 6 },
  insideImage: { width: 110, height: 76, maxWidth: "100%" },
  insidePlaceholder: { borderRadius: 12, backgroundColor: PCOLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  insideLabel: { backgroundColor: "#F3EDE5", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 2 },
  insideLabelText: { fontFamily: FONTS.bold, fontSize: 12, color: PCOLORS.text },
  plus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PCOLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  featuresRow: { flexDirection: "row", gap: 10 },
  featureCard: {
    flex: 1,
    minHeight: 76,
    backgroundColor: PCOLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ECE6DD",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 8,
  },
  featureText: { fontFamily: FONTS.bold, fontSize: 12, lineHeight: 18, color: PCOLORS.text, textAlign: "center" },

  intro: { gap: 4 },

  whatsapp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: PCOLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  whatsappText: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.primary, textAlign: "center" },

  bannerWrap: { marginTop: 4 },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: PCOLORS.border,
    backgroundColor: PCOLORS.background,
    gap: 6,
  },
  footerHint: { fontFamily: FONTS.semiBold, fontSize: 12, color: "#8A6400", textAlign: "center" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
    paddingHorizontal: 6,
    height: 46,
  },
  stepButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  stepDisabled: { opacity: 0.35 },
  stepValue: { minWidth: 22, textAlign: "center", fontFamily: FONTS.extraBold, fontSize: 16, color: PCOLORS.text },
  footerTotal: { flexShrink: 1, fontFamily: FONTS.extraBold, fontSize: 17, color: PCOLORS.text },
  buyButton: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    backgroundColor: PCOLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  buyText: { fontFamily: FONTS.extraBold, fontSize: 16, color: PCOLORS.white },
});