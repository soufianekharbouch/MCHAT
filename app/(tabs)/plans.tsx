import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { createPurchase, fetchProducts } from "../../services/purchaseApi";
import { payShopPurchase } from "../../services/shopApi";
import CardPaymentSheet, { type CardMethod } from "../../components/shop/CardPaymentSheet";
import type { CatalogAnimal, PaymentMethod, PaymentMethodOption, Product } from "../../types/purchase";

import { BackRow, CenteredLoader, ErrorState, PageTitle, PrimaryButton } from "../../components/purchase/ScreenParts";
import { formatPrice } from "../../components/purchase/SubscriptionCard";
import { FONTS, PCOLORS, formatDate, purchaseTexts } from "../../components/purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| PLANS: packs available for a pet + purchase
|--------------------------------------------------------------------------
|
| Params: animalId? (pre-selected pet)
|
| Payment: card only (KNET or Visa / Mastercard). The purchase is created
| "pending", then the card sheet pays it (SIMULATION until the payment
| gateway is connected). Sheet closed: the purchase stays pending and
| "Choose this plan" again pays the same purchase (no duplicate).
|
*/

export default function PlansScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const base = purchaseTexts(isArabic);

  const params = useLocalSearchParams<{ animalId?: string }>();

  const t = isArabic
    ? {
        title: "اختر الباقة",
        subtitle: "باقات وجبات طازجة مصممة لحيوانك الأليف.",
        choosePet: "لمن هذه الباقة؟",
        noPets: "أضف حيوانك الأليف أولاً لاختيار باقة.",
        addPet: "إضافة حيوان",
        noProducts: "لا توجد باقات متاحة لهذا الحيوان حالياً.",
        recipes: "وجبة",
        perMeal: "للوجبة",
        deliveries: "توصيلات",
        perDelivery: "وجبة لكل توصيل",
        choose: "اختيار هذه الباقة",
        limitReached: "تم الوصول إلى الحد الأقصى",
        trial: "باقة تجريبية",
        save: "وفّر",
        checkoutTitle: "تأكيد الطلب",
        paymentMethod: "طريقة الدفع",
        note: "ملاحظة (اختياري)",
        confirm: "الدفع",
        cardInfo: "ستتم إعادة توجيهك إلى صفحة الدفع الآمن. يتم تأكيد الطلب فور نجاح الدفع.",
        knetHint: "بطاقة السحب الكويتية",
        cardHint: "بطاقة ائتمان",
        recipesIncluded: "الوصفات المتاحة",
        plansFor: "باقات مناسبة لـ",
        trialOffer: "عرض الفترة التجريبية",
        trialBannerTitle: "سعر خاص أثناء الفترة التجريبية",
        trialBannerText: "استمتع بأسعار خاصة على الباقات المميزة طوال الفترة التجريبية",
        until: "حتى",
        trialRunning: "قبل نهاية الباقة التجريبية",
        ages: "مناسبة لـ",
      }
    : {
        title: "Choose a Plan",
        subtitle: "Fresh meal packs tailored to your pet.",
        choosePet: "Who is this plan for?",
        noPets: "Add your pet first to choose a plan.",
        addPet: "Add a pet",
        noProducts: "No plan is available for this pet at the moment.",
        recipes: "meals",
        perMeal: "per meal",
        deliveries: "deliveries",
        perDelivery: "meals per delivery",
        choose: "Choose this plan",
        limitReached: "Purchase limit reached",
        trial: "Trial pack",
        save: "Save",
        checkoutTitle: "Confirm your order",
        paymentMethod: "Payment method",
        note: "Note (optional)",
        confirm: "Pay now",
        cardInfo: "You will pay on the secure payment page. Your order is confirmed as soon as the payment succeeds.",
        knetHint: "Kuwaiti debit card",
        cardHint: "Credit card",
        recipesIncluded: "Available recipes",
        plansFor: "Plans for",
        trialOffer: "Trial offer",
        trialBannerTitle: "Special prices during the trial",
        trialBannerText: "Enjoy special prices on the marked plans while the trial is running",
        until: "until",
        trialRunning: "before the end of the trial pack",
        ages: "Suited for",
      };

  const [animals, setAnimals] = useState<CatalogAnimal[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(
    params.animalId ? Number(params.animalId) : null
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Card payment of the purchase just created
  const [payment, setPayment] = useState<{
    purchaseId: number;
    method: CardMethod;
    amount: number;
    currency: string;
  } | null>(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD
  |--------------------------------------------------------------------------
  */

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await fetchProducts(lang);

      setAnimals(data.animals);
      setPaymentMethods(data.payment_methods);

      setSelectedAnimalId(current =>
        current && data.animals.some(a => a.id === current) ? current : data.animals[0]?.id ?? null
      );
    } catch (e: any) {
      setError(e?.message || base.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const animal = useMemo(
    () => animals.find(a => a.id === selectedAnimalId) ?? null,
    [animals, selectedAnimalId]
  );

  /*
  |--------------------------------------------------------------------------
  | CHECKOUT
  |--------------------------------------------------------------------------
  */

  const openCheckout = (product: Product) => {
    setCheckoutProduct(product);
    setPaymentMethod(paymentMethods[0]?.value ?? null);
    setNote("");
  };

  const confirmPurchase = async () => {
    if (!checkoutProduct || !animal || !paymentMethod || submitting) return;

    try {
      setSubmitting(true);

      const result = await createPurchase(lang, {
        product_id: checkoutProduct.id,
        animal_id: animal.id,
        payment_method: paymentMethod,
        customer_note: note.trim() || null,
      });

      const product = checkoutProduct;
      setCheckoutProduct(null);

      // Purchase "pending" (new or already waiting): open the card payment
      setPayment({
        purchaseId: result.purchase.id,
        method: paymentMethod === "card" ? "card" : "knet",
        amount: product.current_price,
        currency: product.currency,
      });
    } catch (e: any) {
      Alert.alert("", e?.message || base.error);
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CARD PAYMENT (simulation)
  |--------------------------------------------------------------------------
  */

  const payPurchase = async (cardLast4: string) => {
    if (!payment) return;

    await payShopPurchase(lang, payment.purchaseId, payment.method, cardLast4);

    // Success animation, then the subscription page
    const purchaseId = payment.purchaseId;
    setTimeout(() => {
      setPayment(null);
      router.replace({ pathname: "/purchase", params: { id: String(purchaseId) } });
    }, 1300);
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <CenteredLoader />
      </SafeAreaView>
    );
  }

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
          />
        }
      >
        <BackRow label={base.back} isArabic={isArabic} />
        <PageTitle title={t.title} subtitle={t.subtitle} isArabic={isArabic} />

        {!!error && <ErrorState message={error} retryLabel={base.retry} onRetry={load} />}

        {!error && animals.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="paw-outline" size={38} color={PCOLORS.primary} />
            <Text style={styles.emptyText}>{t.noPets}</Text>
            <PrimaryButton label={t.addPet} icon="add" onPress={() => router.push("/pet-form")} />
          </View>
        )}

        {/* PET SELECTOR */}
        {animals.length > 1 && (
          <>
            <Text style={[styles.sectionLabel, isArabic && styles.textRtl]}>{t.choosePet}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.petChips, isArabic && styles.rowRtl]}
            >
              {animals.map(a => {
                const active = a.id === selectedAnimalId;

                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setSelectedAnimalId(a.id)}
                    style={[styles.petChip, active && styles.petChipActive, isArabic && styles.rowRtl]}
                  >
                    {a.photo_url ? (
                      <Image source={{ uri: a.photo_url }} style={styles.petChipPhoto} />
                    ) : (
                      <MaterialCommunityIcons
                        name={a.species === "Dog" ? "dog" : "cat"}
                        size={20}
                        color={active ? PCOLORS.white : PCOLORS.primary}
                      />
                    )}
                    <Text style={[styles.petChipText, active && styles.petChipTextActive]}>{a.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* PET AGE */}
        {animal && (
          <View style={[styles.petInfoRow, isArabic && styles.rowRtl]}>
            <MaterialCommunityIcons
              name={animal.species === "Dog" ? "dog" : "cat"}
              size={18}
              color={PCOLORS.primary}
            />
            <Text style={[styles.petInfoText, isArabic && styles.textRtl]}>
              {t.plansFor} <Text style={styles.petInfoStrong}>{animal.name}</Text>
              {animal.age_label ? ` · ${animal.age_label}` : ""}
            </Text>
          </View>
        )}

        {/* TRIAL OFFER BANNER */}
        {animal?.trial && animal.products.some(p => p.trial_offer?.active) && (
          <View style={[styles.trialBanner, isArabic && styles.rowRtl]}>
            <View style={styles.trialBannerIcon}>
              <MaterialCommunityIcons name="gift-outline" size={24} color={PCOLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trialBannerTitle, isArabic && styles.textRtl]}>{t.trialBannerTitle}</Text>
              <Text style={[styles.trialBannerText, isArabic && styles.textRtl]}>
                {t.trialBannerText} ({animal.trial.product_name})
                {animal.trial.ends_on ? ` ${t.until} ${formatDate(animal.trial.ends_on, isArabic)}` : ""}.
              </Text>
            </View>
          </View>
        )}

        {/* PRODUCTS */}
        {animal && animal.products.length === 0 && (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="package-variant" size={38} color={PCOLORS.muted} />
            <Text style={styles.emptyText}>{t.noProducts}</Text>
          </View>
        )}

        {animal?.products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            t={t}
            isArabic={isArabic}
            onChoose={() => openCheckout(product)}
          />
        ))}
      </ScrollView>

      {/* CHECKOUT MODAL */}
      <Modal
        transparent
        visible={!!checkoutProduct}
        animationType="fade"
        onRequestClose={() => !submitting && setCheckoutProduct(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={[styles.sheetHeader, isArabic && styles.rowRtl]}>
                <Text style={[styles.sheetTitle, isArabic && styles.textRtl]}>{t.checkoutTitle}</Text>
                <Pressable hitSlop={10} onPress={() => !submitting && setCheckoutProduct(null)}>
                  <Ionicons name="close" size={26} color={PCOLORS.muted} />
                </Pressable>
              </View>

              {checkoutProduct && animal && (
                <ScrollView keyboardShouldPersistTaps="handled">
                  <View style={styles.summaryBox}>
                    <Text style={[styles.summaryName, isArabic && styles.textRtl]}>{checkoutProduct.name}</Text>
                    <Text style={[styles.summaryMeta, isArabic && styles.textRtl]}>
                      {animal.name} · {checkoutProduct.total_recipes} {t.recipes} · {checkoutProduct.duration_label}
                    </Text>
                    <Text style={[styles.summaryPrice, isArabic && styles.textRtl]}>
                      {formatPrice(checkoutProduct.current_price)} {checkoutProduct.currency}
                      {checkoutProduct.has_promo && (
                        <Text style={styles.summaryOldPrice}>
                          {"  "}{formatPrice(checkoutProduct.price)}
                        </Text>
                      )}
                    </Text>
                    {checkoutProduct.trial_offer?.active && (
                      <Text style={[styles.summaryOffer, isArabic && styles.textRtl]}>
                        🎁 {t.trialOffer}
                        {checkoutProduct.trial_offer.ends_on
                          ? ` · ${t.until} ${formatDate(checkoutProduct.trial_offer.ends_on, isArabic)}`
                          : ""}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.sectionLabel, isArabic && styles.textRtl]}>{t.paymentMethod}</Text>

                  {paymentMethods.map(method => {
                    const active = method.value === paymentMethod;

                    return (
                      <Pressable
                        key={method.value}
                        onPress={() => setPaymentMethod(method.value)}
                        style={[styles.methodRow, active && styles.methodRowActive, isArabic && styles.rowRtl]}
                      >
                        <Ionicons
                          name={active ? "radio-button-on" : "radio-button-off"}
                          size={22}
                          color={active ? PCOLORS.primary : PCOLORS.muted}
                        />
                        {method.value === "knet" ? (
                          <View style={styles.knetBadge}>
                            <Text style={styles.knetBadgeText}>KNET</Text>
                          </View>
                        ) : (
                          <View style={styles.cardBadge}>
                            <Ionicons name="card" size={15} color={PCOLORS.white} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.methodText, isArabic && styles.textRtl]}>{method.label}</Text>
                          <Text style={[styles.methodHint, isArabic && styles.textRtl]}>
                            {method.value === "knet" ? t.knetHint : t.cardHint}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}

                  {!!paymentMethod && (
                    <Text style={[styles.infoText, isArabic && styles.textRtl]}>{t.cardInfo}</Text>
                  )}

                  <Text style={[styles.sectionLabel, isArabic && styles.textRtl]}>{t.note}</Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    multiline
                    textAlignVertical="top"
                    style={[styles.noteInput, isArabic && styles.inputRtl]}
                  />

                  <View style={{ marginTop: 20 }}>
                    <PrimaryButton
                      label={t.confirm}
                      icon="lock-closed-outline"
                      onPress={confirmPurchase}
                      loading={submitting}
                      disabled={!paymentMethod}
                    />
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CARD PAYMENT (simulation) */}
      <CardPaymentSheet
        visible={!!payment}
        method={payment?.method ?? "knet"}
        amount={payment?.amount ?? 0}
        currency={payment?.currency ?? "KWD"}
        isArabic={isArabic}
        onClose={() => setPayment(null)}
        onPay={payPurchase}
      />
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| PRODUCT CARD
|--------------------------------------------------------------------------
*/

function ProductCard({
  product,
  t,
  isArabic,
  onChoose,
}: {
  product: Product;
  t: any;
  isArabic: boolean;
  onChoose: () => void;
}) {
  const rtl = isArabic ? styles.textRtl : null;
  const rules = product.rules;

  const deliveries =
    rules.min_deliveries === rules.max_deliveries
      ? `${rules.max_deliveries}`
      : `${rules.min_deliveries}–${rules.max_deliveries}`;

  const perDelivery =
    rules.min_recipes_per_delivery === rules.max_recipes_per_delivery
      ? `${rules.max_recipes_per_delivery}`
      : `${rules.min_recipes_per_delivery}–${rules.max_recipes_per_delivery}`;

  const trialOffer = product.trial_offer?.active ? product.trial_offer : null;

  return (
    <View style={[styles.productCard, trialOffer && styles.productCardOffer]}>
      {!!product.image_url && <Image source={{ uri: product.image_url }} style={styles.productImage} />}

      <View style={[styles.badges, isArabic && styles.rowRtl]}>
        {product.is_premium && (
          <View style={[styles.badge, styles.badgePremium]}>
            <MaterialCommunityIcons name="crown-outline" size={13} color="#8A6D1F" />
            <Text style={[styles.badgeText, { color: "#8A6D1F" }]}>Premium</Text>
          </View>
        )}
        {product.is_trial && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t.trial}</Text>
          </View>
        )}
        {!!trialOffer && (
          <View style={[styles.badge, styles.badgeOffer]}>
            <MaterialCommunityIcons name="gift-outline" size={13} color={PCOLORS.white} />
            <Text style={[styles.badgeText, { color: PCOLORS.white }]}>{t.trialOffer}</Text>
          </View>
        )}
        {product.has_promo && (
          <View style={[styles.badge, styles.badgePromo]}>
            <Text style={[styles.badgeText, { color: PCOLORS.white }]}>
              {t.save} {product.discount_percent}%
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.productName, rtl]}>{product.name}</Text>
      {!!product.description && <Text style={[styles.productDescription, rtl]}>{product.description}</Text>}

      {/* PRICE */}
      <View style={[styles.priceRow, isArabic && styles.rowRtl]}>
        <Text style={styles.priceValue}>{formatPrice(product.current_price)}</Text>
        <Text style={styles.priceCurrency}>{product.currency}</Text>
        {product.has_promo && <Text style={styles.priceOld}>{formatPrice(product.price)}</Text>}
      </View>
      <Text style={[styles.pricePerMeal, rtl]}>
        {formatPrice(product.price_per_recipe)} {product.currency} {t.perMeal}
      </Text>
      {!!trialOffer && (
        <Text style={[styles.offerNote, rtl]}>
          {t.trialRunning}
          {trialOffer.ends_on ? ` · ${t.until} ${formatDate(trialOffer.ends_on, isArabic)}` : ""}
        </Text>
      )}

      {/* FACTS */}
      <View style={styles.facts}>
        <Fact icon="food-variant" text={`${product.total_recipes} ${t.recipes} · ${product.duration_label}`} isArabic={isArabic} />
        <Fact icon="truck-outline" text={`${deliveries} ${t.deliveries}`} isArabic={isArabic} />
        <Fact icon="package-variant-closed" text={`${perDelivery} ${t.perDelivery}`} isArabic={isArabic} />
        {!!product.life_stages?.length && !!product.life_stages_label && (
          <Fact icon="cake-variant-outline" text={`${t.ages} ${product.life_stages_label}`} isArabic={isArabic} />
        )}
      </View>

      {product.recipes.length > 0 && (
        <>
          <Text style={[styles.recipesTitle, rtl]}>{t.recipesIncluded}</Text>
          <Text style={[styles.recipesText, rtl]}>{product.recipes.map(r => r.name).join(" · ")}</Text>
        </>
      )}

      <View style={{ marginTop: 22 }}>
        <PrimaryButton
          label={product.can_purchase ? t.choose : t.limitReached}
          onPress={onChoose}
          disabled={!product.can_purchase}
        />
      </View>
    </View>
  );
}

function Fact({
  icon,
  text,
  isArabic,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  text: string;
  isArabic: boolean;
}) {
  return (
    <View style={[styles.fact, isArabic && styles.rowRtl]}>
      <MaterialCommunityIcons name={icon} size={19} color={PCOLORS.primary} />
      <Text style={[styles.factText, isArabic && styles.textRtl]}>{text}</Text>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  inputRtl: { textAlign: "right", writingDirection: "rtl" },

  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 50 },

  sectionLabel: {
    marginTop: 6,
    marginBottom: 12,
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: PCOLORS.text,
  },

  empty: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 22,
    color: PCOLORS.muted,
    textAlign: "center",
  },

  petChips: { gap: 10, paddingBottom: 22 },
  petChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PCOLORS.border,
  },
  petChipActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  petChipPhoto: { width: 26, height: 26, borderRadius: 13 },
  petChipText: { fontFamily: FONTS.semiBold, fontSize: 14, color: PCOLORS.text },
  petChipTextActive: { color: PCOLORS.white },

  productCard: {
    marginBottom: 22,
    padding: 22,
    borderTopWidth: 3,
    borderTopColor: PCOLORS.primary,
    backgroundColor: PCOLORS.card,
  },
  productImage: {
    width: "100%",
    height: 170,
    borderRadius: 10,
    marginBottom: 16,
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: PCOLORS.primaryLight,
  },
  badgePremium: { backgroundColor: "#F8EDC8" },
  badgePromo: { backgroundColor: PCOLORS.danger },
  badgeOffer: { backgroundColor: PCOLORS.warning },
  productCardOffer: {
    borderTopColor: PCOLORS.warning,
    borderWidth: 1,
    borderColor: "#F0CF94",
    backgroundColor: PCOLORS.warningLight,
  },
  offerNote: {
    marginTop: 6,
    fontFamily: FONTS.semiBold,
    fontSize: 12.5,
    color: "#A86A12",
  },

  petInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  petInfoText: { flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: PCOLORS.muted },
  petInfoStrong: { fontFamily: FONTS.bold, color: PCOLORS.text },

  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    marginBottom: 22,
    borderRadius: 12,
    backgroundColor: PCOLORS.warningLight,
    borderWidth: 1,
    borderColor: "#F0CF94",
  },
  trialBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PCOLORS.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  trialBannerTitle: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  trialBannerText: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    lineHeight: 19,
    color: PCOLORS.muted,
  },
  badgeText: { fontFamily: FONTS.semiBold, fontSize: 11, color: PCOLORS.primary },

  productName: { fontFamily: FONTS.bold, fontSize: 24, lineHeight: 32, color: PCOLORS.text },
  productDescription: {
    marginTop: 8,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: PCOLORS.muted,
  },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 7, marginTop: 18 },
  priceValue: { fontFamily: FONTS.medium, fontSize: 36, lineHeight: 44, color: PCOLORS.text },
  priceCurrency: { fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.text },
  priceOld: {
    marginLeft: 6,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: PCOLORS.muted,
    textDecorationLine: "line-through",
  },
  pricePerMeal: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },

  facts: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: PCOLORS.border,
    gap: 10,
  },
  fact: { flexDirection: "row", alignItems: "center", gap: 10 },
  factText: { flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: PCOLORS.text },

  recipesTitle: { marginTop: 18, fontFamily: FONTS.semiBold, fontSize: 12, color: PCOLORS.muted },
  recipesText: { marginTop: 4, fontFamily: FONTS.regular, fontSize: 13, lineHeight: 21, color: PCOLORS.text },

  overlay: {
    flex: 1,
    backgroundColor: PCOLORS.overlay,
    justifyContent: "center",
    padding: 22,
  },
  sheet: {
    maxHeight: "92%",
    borderRadius: 15,
    backgroundColor: PCOLORS.background,
    padding: 22,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: { flex: 1, fontFamily: FONTS.extraBold, fontSize: 24, color: PCOLORS.text },
  summaryBox: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: PCOLORS.card,
    marginBottom: 18,
  },
  summaryName: { fontFamily: FONTS.bold, fontSize: 17, color: PCOLORS.text },
  summaryMeta: { marginTop: 4, fontFamily: FONTS.regular, fontSize: 13, color: PCOLORS.muted },
  summaryPrice: { marginTop: 8, fontFamily: FONTS.bold, fontSize: 22, color: PCOLORS.text },
  summaryOldPrice: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: PCOLORS.muted,
    textDecorationLine: "line-through",
  },
  summaryOffer: { marginTop: 4, fontFamily: FONTS.semiBold, fontSize: 13, color: "#A86A12" },

  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    borderRadius: 9,
  },
  methodRowActive: { borderColor: PCOLORS.primary, backgroundColor: "rgba(36,155,151,0.06)" },
  methodText: { fontFamily: FONTS.semiBold, fontSize: 15, color: PCOLORS.text },
  methodHint: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },
  knetBadge: { height: 24, minWidth: 44, borderRadius: 5, backgroundColor: "#0B4A8B", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  knetBadgeText: { fontFamily: FONTS.extraBold, fontSize: 10, color: PCOLORS.white, letterSpacing: 0.5 },
  cardBadge: { height: 24, minWidth: 44, borderRadius: 5, backgroundColor: PCOLORS.dark, alignItems: "center", justifyContent: "center" },
  infoText: {
    marginBottom: 14,
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    lineHeight: 20,
    color: PCOLORS.muted,
  },
  noteInput: {
    minHeight: 90,
    padding: 14,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    borderRadius: 8,
    backgroundColor: PCOLORS.inputBackground,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: PCOLORS.text,
  },
});