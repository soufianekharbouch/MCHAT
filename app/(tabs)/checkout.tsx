import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

import { useAppLanguage } from "../../context/LanguageContext";
import { clearSession, useSession } from "../../services/session";
import {
  fetchProvinces,
  fetchSavedAddresses,
  fetchShopProducts,
  payShopPurchase,
  shopCheckout,
  ShopApiError,
  type Province,
  type SavedAddress,
} from "../../services/shopApi";
import type { BreedSize, CheckoutPayload, LifeStage, ShopCatalogResponse, ShopProduct } from "../../types/shop";

import { BackRow, CenteredLoader, ErrorState, PrimaryButton, SecondaryButton } from "../../components/purchase/ScreenParts";
import { FONTS, PCOLORS, slotLabel } from "../../components/purchase/purchaseUtils";
import { formatPrice } from "../../components/purchase/SubscriptionCard";
import { PriceTag, ProductImage, SpeciesIcon } from "../../components/shop/shopUi";
import CardPaymentSheet from "../../components/shop/CardPaymentSheet";

/*
|--------------------------------------------------------------------------
| CHECKOUT (signed in)
|--------------------------------------------------------------------------
|
| One screen, as few fields as possible:
|   1. Pet     : an existing compatible pet, or a new one (age + size for dogs,
|                name optional -> "My Cat" / "My Dog")
|   2. Address : only the first time (governorate, area, address, slot),
|                otherwise choice between the saved addresses
|   3. Payment : card only (KNET or Visa / Mastercard).
|                SIMULATION (no gateway yet): the card sheet asks any card
|                data, then the order is sent with card_paid = true and the
|                purchase is PAID at once (no "pending"). The checkout then
|                shows the confirmation + "Plan my deliveries".
|
*/

type PetChoice = number | "new";

const SIZES: BreedSize[] = ["Small", "Medium", "Large"];

export default function CheckoutScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const { signedIn, ready } = useSession();
  const params = useLocalSearchParams<{ productId?: string }>();
  const productId = Number(params.productId);
  const isFocused = useIsFocused();

  const [catalog, setCatalog] = useState<ShopCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pet
  const [petChoice, setPetChoice] = useState<PetChoice>("new");
  const [petAge, setPetAge] = useState<LifeStage | null>(null);
  const [petSize, setPetSize] = useState<BreedSize | null>(null);
  const [petName, setPetName] = useState("");

  // Address
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [addressText, setAddressText] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [deliverySlot, setDeliverySlot] = useState<string | null>(null);
  const [picker, setPicker] = useState<"province" | "zone" | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPayload["payment_method"] | null>("knet");
  const [note, setNote] = useState("");

  // Card sheet + confirmation after payment
  const [paySheetVisible, setPaySheetVisible] = useState(false);
  const [paidOrder, setPaidOrder] = useState<{ purchaseId: number; paid: boolean; petName: string; last4: string } | null>(null);
  const confirmScale = useRef(new Animated.Value(0)).current;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const t = isArabic
    ? {
        back: "رجوع",
        title: "إتمام الطلب",
        retry: "إعادة المحاولة",
        notFound: "هذا المنتج غير متوفر.",
        petTitle: "لأي حيوان؟",
        newPet: "حيوان جديد",
        age: "العمر",
        size: "حجم الكلب",
        petName: "الاسم (اختياري)",
        petNamePlaceholderCat: "قطتي",
        petNamePlaceholderDog: "كلبي",
        sizes: { Small: "صغير", Medium: "متوسط", Large: "كبير" } as Record<BreedSize, string>,
        addressTitle: "عنوان التوصيل",
        province: "المحافظة",
        zone: "المنطقة",
        choose: "اختر",
        address: "العنوان",
        addressPlaceholder: "القطعة، الشارع، المنزل...",
        slot: "وقت التوصيل",
        addressNote: "ملاحظة للسائق (اختياري)",
        defaultLabel: "افتراضي",
        paymentTitle: "طريقة الدفع",
        orderNote: "ملاحظة على الطلب (اختياري)",
        total: "المجموع",
        confirm: "الدفع",
        knetHint: "بطاقة السحب الكويتية",
        cardHint: "بطاقة ائتمان",
        search: "بحث...",
        errPet: "يرجى اختيار عمر حيوانك.",
        errSize: "يرجى اختيار حجم الكلب.",
        errAddress: "يرجى إكمال عنوان التوصيل.",
        errPayment: "يرجى اختيار طريقة الدفع.",
        paidTitle: "تم الدفع بنجاح!",
        paidText: "تم تأكيد اشتراكك. يمكنك الآن اختيار مواعيد التوصيل والوصفات.",
        pendingTitle: "تم تسجيل طلبك",
        pendingText: "لم يتم تأكيد الدفع بعد. يمكنك متابعة طلبك من صفحة الاشتراك.",
        paidAmount: "المبلغ المدفوع",
        paidFor: "لـ",
        paidCard: "البطاقة",
        planDeliveries: "تنظيم مواعيد التوصيل",
        viewSubscription: "عرض الاشتراك",
        testPaid: "دفع تجريبي - لم يتم خصم أي مبلغ",
      }
    : {
        back: "Back",
        title: "Checkout",
        retry: "Try again",
        notFound: "This product is not available.",
        petTitle: "For which pet?",
        newPet: "New pet",
        age: "Age",
        size: "Dog size",
        petName: "Name (optional)",
        petNamePlaceholderCat: "My Cat",
        petNamePlaceholderDog: "My Dog",
        sizes: { Small: "Small", Medium: "Medium", Large: "Large" } as Record<BreedSize, string>,
        addressTitle: "Delivery address",
        province: "Governorate",
        zone: "Area",
        choose: "Choose",
        address: "Address",
        addressPlaceholder: "Block, street, house...",
        slot: "Delivery time",
        addressNote: "Note for the driver (optional)",
        defaultLabel: "Default",
        paymentTitle: "Payment method",
        orderNote: "Order note (optional)",
        total: "Total",
        confirm: "Pay now",
        knetHint: "Kuwaiti debit card",
        cardHint: "Credit card",
        search: "Search...",
        errPet: "Please choose the age of your pet.",
        errSize: "Please choose the size of your dog.",
        errAddress: "Please complete your delivery address.",
        errPayment: "Please choose a payment method.",
        paidTitle: "Payment successful!",
        paidText: "Your plan is confirmed. You can now choose your delivery dates and recipes.",
        pendingTitle: "Your order is registered",
        pendingText: "The payment is not confirmed yet. You can follow your order from the subscription page.",
        paidAmount: "Amount paid",
        paidFor: "For",
        paidCard: "Card",
        planDeliveries: "Plan my deliveries",
        viewSubscription: "View my subscription",
        testPaid: "Test payment - no money was taken",
      };

  /*
  |--------------------------------------------------------------------------
  | LOAD
  |--------------------------------------------------------------------------
  */

  const load = useCallback(async () => {
    try {
      setError("");

      const data = await fetchShopProducts(lang);
      setCatalog(data);

      const product = data.products.find(item => item.id === productId);

      if (product) {
        // Pet: the first compatible pet, otherwise a new one
        const compatible = data.pets.filter(pet => product.compatible_pet_ids.includes(pet.id));
        setPetChoice(current =>
          current !== "new" && compatible.some(pet => pet.id === current) ? current : compatible[0]?.id ?? "new"
        );

        if (product.age_options.length === 1) setPetAge(product.age_options[0].value);
        if (product.breed_size_category) setPetSize(product.breed_size_category);
      }

      // Card payment only: KNET by default
      setPaymentMethod(current =>
        current && data.payment_methods.some(method => method.value === current)
          ? current
          : data.payment_methods[0]?.value ?? "knet"
      );

      if (data.has_address) {
        const addresses = await fetchSavedAddresses(lang).catch(() => [] as SavedAddress[]);
        setSavedAddresses(addresses);
        setAddressId(current => current ?? (addresses.find(a => !!Number(a.is_default)) ?? addresses[0])?.id ?? null);
      } else {
        fetchProvinces(lang).then(setProvinces).catch(() => undefined);
      }
    } catch (e: any) {
      if (e instanceof ShopApiError && e.status === 401) {
        await clearSession();
      }
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }, [lang, productId]);

  useFocusEffect(
    useCallback(() => {
      if (ready && signedIn) void load();
    }, [load, ready, signedIn])
  );

  // Not signed in (or session lost): sign in, then back here
  useEffect(() => {
    if (isFocused && ready && !signedIn) {
      router.replace({ pathname: "/login", params: { redirect: "checkout", productId: String(productId || "") } } as any);
    }
  }, [isFocused, ready, signedIn, productId]);

  const product: ShopProduct | null = useMemo(
    () => catalog?.products.find(item => item.id === productId) ?? null,
    [catalog, productId]
  );

  const compatiblePets = useMemo(
    () => (catalog?.pets ?? []).filter(pet => product?.compatible_pet_ids.includes(pet.id)),
    [catalog, product]
  );

  const province = provinces.find(item => item.id === provinceId) ?? null;
  const zone = province?.zones.find(item => item.id === zoneId) ?? null;
  const placeName = (item: { name: string; name_ar?: string | null }) => (isArabic && item.name_ar ? item.name_ar : item.name);

  const pickerItems = useMemo(() => {
    const items: { id: number; name: string; name_ar?: string | null }[] =
      picker === "province" ? provinces : picker === "zone" ? province?.zones ?? [] : [];
    const search = pickerSearch.trim().toLowerCase();

    return search
      ? items.filter(item => `${item.name} ${item.name_ar ?? ""}`.toLowerCase().includes(search))
      : items;
  }, [picker, provinces, province, pickerSearch]);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/(tabs)" as any));

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  /** Form errors (null = ready to pay). */
  const validate = (): string | null => {
    if (!product || !catalog) return "Error";

    const isNewPet = petChoice === "new";

    if (isNewPet && !petAge) return t.errPet;
    if (isNewPet && product.species === "Dog" && !product.breed_size_category && !petSize) return t.errSize;
    if (!catalog.has_address && (!provinceId || !zoneId || addressText.trim().length < 3 || !deliverySlot)) {
      return t.errAddress;
    }
    if (!paymentMethod) return t.errPayment;

    return null;
  };

  const buildPayload = (cardLast4: string): CheckoutPayload => {
    const isNewPet = petChoice === "new";

    return {
      product_id: (product as ShopProduct).id,
      payment_method: paymentMethod as CheckoutPayload["payment_method"],
      card_paid: true,
      card_last4: cardLast4 || null,
      customer_note: note.trim() || null,
      animal_id: isNewPet ? null : (petChoice as number),
      pet: isNewPet
        ? {
            name: petName.trim() || null,
            age: petAge as LifeStage,
            breed_size_category: (product as ShopProduct).species === "Dog" ? petSize : null,
          }
        : null,
      address_id: catalog?.has_address ? addressId : null,
      address: catalog?.has_address
        ? null
        : {
            province_id: provinceId as number,
            zone_id: zoneId as number,
            address: addressText.trim(),
            delivery_slot: deliverySlot as string,
            note: addressNote.trim() || null,
          },
    };
  };

  /** "Pay now": checks the form, then opens the card sheet. */
  const submit = () => {
    if (submitting) return;

    setSubmitError("");

    const formError = validate();
    if (formError) {
      setSubmitError(formError);
      return;
    }

    setPaySheetVisible(true);
  };

  /*
  |--------------------------------------------------------------------------
  | CARD "PAID" (simulation) -> ORDER SENT, PAID AT ONCE
  |--------------------------------------------------------------------------
  */

  const payAndOrder = async (cardLast4: string) => {
    if (!product) return;

    try {
      setSubmitting(true);

      const result = await shopCheckout(lang, buildPayload(cardLast4));

      const petName = (result as any)?.animal?.name ?? "";
      const status = (result as any)?.purchase?.status;
      let paid = !!result.paid || status === "paid" || status === "active";

      // Not confirmed by the checkout call: confirm the card payment now
      if (!paid && paymentMethod) {
        try {
          const payment = await payShopPurchase(lang, result.purchase.id, paymentMethod, cardLast4);
          const paidStatus = (payment as any)?.purchase?.status;
          paid = !!payment.success && (paidStatus === "paid" || paidStatus === "active" || !paidStatus);
        } catch (payError) {
          console.warn("Card payment confirmation error:", payError);
        }
      }

      setPaySheetVisible(false);
      setPaidOrder({ purchaseId: result.purchase.id, paid, petName, last4: cardLast4 });

      confirmScale.setValue(0);
      Animated.spring(confirmScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
    } catch (e: any) {
      if (e instanceof ShopApiError && (e.status === 401 || e.data?.requires_login)) {
        setPaySheetVisible(false);
        await clearSession(); // the effect above opens the sign in screen
        return;
      }

      // Error shown in the card sheet
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  /*
  | CONFIRMATION (after the payment)
  */
  if (paidOrder) {
    const product0 = catalog?.products.find(item => item.id === productId) ?? null;
    const dir = isArabic ? styles.textRtl : null;

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.confirmContent}>
        <Animated.View
          style={[
            styles.confirmCircle,
            !paidOrder.paid && styles.confirmCirclePending,
            { transform: [{ scale: confirmScale }] },
          ]}
        >
          <Ionicons name={paidOrder.paid ? "checkmark" : "time-outline"} size={54} color={PCOLORS.white} />
        </Animated.View>

        <Text style={styles.confirmTitle}>{paidOrder.paid ? t.paidTitle : t.pendingTitle}</Text>
        <Text style={styles.confirmText}>{paidOrder.paid ? t.paidText : t.pendingText}</Text>

        {product0 && (
          <View style={styles.receipt}>
            <Text style={[styles.receiptName, dir]}>{product0.name}</Text>

            {!!paidOrder.petName && (
              <ReceiptRow label={t.paidFor} value={paidOrder.petName} isArabic={isArabic} />
            )}
            <ReceiptRow
              label={t.paidAmount}
              value={`${formatPrice(product0.current_price)} ${product0.currency}`}
              isArabic={isArabic}
              strong
            />
            <ReceiptRow
              label={t.paidCard}
              value={`${paymentMethod === "card" ? "Visa / Mastercard" : "KNET"} •••• ${paidOrder.last4}`}
              isArabic={isArabic}
            />

            <View style={[styles.testPaid, isArabic && styles.rowRtl]}>
              <Ionicons name="warning-outline" size={14} color={PCOLORS.danger} />
              <Text style={styles.testPaidText}>{t.testPaid}</Text>
            </View>
          </View>
        )}

        <View style={styles.confirmButtons}>
          {paidOrder.paid && (
            <PrimaryButton
              label={t.planDeliveries}
              icon="calendar-outline"
              onPress={() =>
                router.replace({ pathname: "/distribute-package", params: { id: String(paidOrder.purchaseId) } } as any)
              }
            />
          )}
          <SecondaryButton
            label={t.viewSubscription}
            icon="receipt-outline"
            onPress={() => router.replace({ pathname: "/purchase", params: { id: String(paidOrder.purchaseId) } } as any)}
          />
        </View>
      </ScrollView>
    );
  }

  if (!ready || !signedIn || (loading && !catalog)) return <CenteredLoader />;

  if (error && !catalog) {
    return <ErrorState message={error} retryLabel={t.retry} onRetry={() => void load()} />;
  }

  const textDir = isArabic ? styles.textRtl : null;

  if (!product) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <BackRow label={t.back} isArabic={isArabic} onBack={goBack} />
          <Text style={[styles.notFound, textDir]}>{t.notFound}</Text>
        </View>
      </View>
    );
  }

  const petPlaceholder = product.species === "Dog" ? t.petNamePlaceholderDog : t.petNamePlaceholderCat;
  const slots = catalog?.delivery_slots ?? [];

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackRow label={t.back} isArabic={isArabic} onBack={goBack} />

        <Text style={[styles.title, textDir]}>{t.title}</Text>

        {/* PRODUCT SUMMARY */}
        <View style={[styles.summary, isArabic && styles.rowRtl]}>
          <View style={styles.summaryImage}>
            <ProductImage product={product} height={64} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.summaryName, textDir]} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={[styles.summaryMeta, textDir]} numberOfLines={1}>
              {[product.duration_label, product.total_recipes ? `${product.total_recipes} ${isArabic ? "وصفة" : "recipes"}` : ""].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </View>

        {/* 1. PET */}
        <Section title={t.petTitle} isArabic={isArabic}>
          {compatiblePets.map(pet => (
            <OptionRow
              key={pet.id}
              selected={petChoice === pet.id}
              onPress={() => setPetChoice(pet.id)}
              isArabic={isArabic}
              icon={<SpeciesIcon species={pet.species} size={20} />}
              title={pet.name}
              subtitle={pet.age_label ?? undefined}
            />
          ))}

          {compatiblePets.length > 0 && (
            <OptionRow
              selected={petChoice === "new"}
              onPress={() => setPetChoice("new")}
              isArabic={isArabic}
              icon={<Ionicons name="add-circle-outline" size={20} color={PCOLORS.primary} />}
              title={t.newPet}
            />
          )}

          {petChoice === "new" && (
            <View style={styles.subForm}>
              <Text style={[styles.label, textDir]}>{t.age}</Text>
              <Chips
                isArabic={isArabic}
                items={product.age_options.map(option => ({ value: option.value, label: option.label }))}
                value={petAge}
                onChange={value => setPetAge(value as LifeStage)}
              />

              {product.species === "Dog" && !product.breed_size_category && (
                <>
                  <Text style={[styles.label, textDir]}>{t.size}</Text>
                  <Chips
                    isArabic={isArabic}
                    items={SIZES.map(size => ({ value: size, label: t.sizes[size] }))}
                    value={petSize}
                    onChange={value => setPetSize(value as BreedSize)}
                  />
                </>
              )}

              <Text style={[styles.label, textDir]}>{t.petName}</Text>
              <TextInput
                value={petName}
                onChangeText={setPetName}
                placeholder={petPlaceholder}
                placeholderTextColor={PCOLORS.muted}
                style={[styles.input, textDir]}
                maxLength={100}
              />
            </View>
          )}
        </Section>

        {/* 2. ADDRESS */}
        <Section title={t.addressTitle} isArabic={isArabic}>
          {catalog?.has_address ? (
            savedAddresses.map(address => (
              <OptionRow
                key={address.id}
                selected={addressId === address.id}
                onPress={() => setAddressId(address.id)}
                isArabic={isArabic}
                icon={<Ionicons name="location-outline" size={20} color={PCOLORS.primary} />}
                title={address.label || [address.zone_label, address.province_label].filter(Boolean).join(", ") || address.address}
                subtitle={[address.address, address.delivery_slot ? slotLabel(address.delivery_slot) : ""].filter(Boolean).join(" · ")}
                tag={Number(address.is_default) ? t.defaultLabel : undefined}
              />
            ))
          ) : (
            <View>
              <View style={[styles.twoCols, isArabic && styles.rowRtl]}>
                <SelectBox
                  label={t.province}
                  value={province ? placeName(province) : ""}
                  placeholder={t.choose}
                  isArabic={isArabic}
                  onPress={() => {
                    setPickerSearch("");
                    setPicker("province");
                  }}
                />
                <SelectBox
                  label={t.zone}
                  value={zone ? placeName(zone) : ""}
                  placeholder={t.choose}
                  isArabic={isArabic}
                  disabled={!province}
                  onPress={() => {
                    setPickerSearch("");
                    setPicker("zone");
                  }}
                />
              </View>

              <Text style={[styles.label, textDir]}>{t.address}</Text>
              <TextInput
                value={addressText}
                onChangeText={setAddressText}
                placeholder={t.addressPlaceholder}
                placeholderTextColor={PCOLORS.muted}
                style={[styles.input, styles.multiline, textDir]}
                multiline
                maxLength={500}
              />

              <Text style={[styles.label, textDir]}>{t.slot}</Text>
              <Chips
                isArabic={isArabic}
                items={slots.map(slot => ({ value: slot, label: slotLabel(slot) }))}
                value={deliverySlot}
                onChange={setDeliverySlot}
              />

              <Text style={[styles.label, textDir]}>{t.addressNote}</Text>
              <TextInput
                value={addressNote}
                onChangeText={setAddressNote}
                placeholderTextColor={PCOLORS.muted}
                style={[styles.input, textDir]}
                maxLength={1000}
              />
            </View>
          )}
        </Section>

        {/* 3. PAYMENT */}
        <Section title={t.paymentTitle} isArabic={isArabic}>
          {(catalog?.payment_methods ?? []).map(method => (
            <OptionRow
              key={method.value}
              selected={paymentMethod === method.value}
              onPress={() => setPaymentMethod(method.value)}
              isArabic={isArabic}
              icon={
                method.value === "knet" ? (
                  <View style={styles.knetBadge}>
                    <Text style={styles.knetBadgeText}>KNET</Text>
                  </View>
                ) : (
                  <View style={styles.cardBadge}>
                    <Ionicons name="card" size={16} color={PCOLORS.white} />
                  </View>
                )
              }
              title={method.label}
              subtitle={method.value === "knet" ? t.knetHint : t.cardHint}
            />
          ))}

          <Text style={[styles.label, textDir]}>{t.orderNote}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholderTextColor={PCOLORS.muted}
            style={[styles.input, textDir]}
            maxLength={1000}
          />
        </Section>
      </ScrollView>

      {/* TOTAL + CONFIRM */}
      <View style={styles.footer}>
        {submitError !== "" && <Text style={[styles.submitError, textDir]}>{submitError}</Text>}

        <View style={[styles.totalRow, isArabic && styles.rowRtl]}>
          <Text style={styles.totalLabel}>{t.total}</Text>
          <PriceTag product={product} isArabic={isArabic} />
        </View>

        <PrimaryButton label={t.confirm} icon="lock-closed-outline" loading={submitting} onPress={submit} />
      </View>

      {/* CARD PAYMENT (simulation) */}
      {!!paymentMethod && (
        <CardPaymentSheet
          visible={paySheetVisible}
          method={paymentMethod}
          amount={product.current_price}
          currency={product.currency}
          isArabic={isArabic}
          onClose={() => !submitting && setPaySheetVisible(false)}
          onPay={payAndOrder}
          showSuccess={false}
        />
      )}

      {/* PROVINCE / ZONE PICKER */}
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.overlay} onPress={() => setPicker(null)} />
        <View style={styles.sheet}>
          <Text style={[styles.sheetTitle, textDir]}>{picker === "zone" ? t.zone : t.province}</Text>
          <TextInput
            value={pickerSearch}
            onChangeText={setPickerSearch}
            placeholder={t.search}
            placeholderTextColor={PCOLORS.muted}
            style={[styles.input, textDir]}
          />
          <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
            {pickerItems.map(item => {
              const selected = picker === "province" ? item.id === provinceId : item.id === zoneId;

              return (
                <Pressable
                  key={item.id}
                  style={[styles.sheetItem, isArabic && styles.rowRtl]}
                  onPress={() => {
                    if (picker === "province") {
                      if (item.id !== provinceId) setZoneId(null);
                      setProvinceId(item.id);
                      setPickerSearch("");
                      setPicker("zone"); // next: the area
                    } else {
                      setZoneId(item.id);
                      setPicker(null);
                    }
                  }}
                >
                  <Text style={[styles.sheetItemText, selected && styles.sheetItemSelected, textDir]}>{placeName(item)}</Text>
                  {selected && <Ionicons name="checkmark" size={18} color={PCOLORS.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/*
|--------------------------------------------------------------------------
| SMALL PARTS
|--------------------------------------------------------------------------
*/

function ReceiptRow({ label, value, isArabic, strong }: { label: string; value: string; isArabic: boolean; strong?: boolean }) {
  return (
    <View style={[styles.receiptRow, isArabic && styles.rowRtl]}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={[styles.receiptValue, strong && styles.receiptStrong]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, isArabic, children }: { title: string; isArabic: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isArabic && styles.textRtl]}>{title}</Text>
      {children}
    </View>
  );
}

function OptionRow({
  selected,
  onPress,
  isArabic,
  icon,
  title,
  subtitle,
  tag,
}: {
  selected: boolean;
  onPress: () => void;
  isArabic: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tag?: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionSelected, isArabic && styles.rowRtl]}>
      {icon}
      <View style={styles.flex}>
        <View style={[styles.optionTitleRow, isArabic && styles.rowRtl]}>
          <Text style={[styles.optionTitle, isArabic && styles.textRtl]} numberOfLines={1}>
            {title}
          </Text>
          {!!tag && <Text style={styles.optionTag}>{tag}</Text>}
        </View>
        {!!subtitle && (
          <Text style={[styles.optionSubtitle, isArabic && styles.textRtl]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={selected ? PCOLORS.primary : PCOLORS.border} />
    </Pressable>
  );
}

function Chips({
  items,
  value,
  onChange,
  isArabic,
}: {
  items: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  isArabic: boolean;
}) {
  return (
    <View style={[styles.chips, isArabic && styles.rowRtl]}>
      {items.map(item => {
        const active = item.value === value;

        return (
          <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SelectBox({
  label,
  value,
  placeholder,
  isArabic,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  isArabic: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.flex}>
      <Text style={[styles.label, isArabic && styles.textRtl]}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[styles.input, styles.select, isArabic && styles.rowRtl, disabled && styles.disabled]}
      >
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={PCOLORS.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PCOLORS.background },
  content: { padding: 20, paddingBottom: 30 },
  flex: { flex: 1 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  disabled: { opacity: 0.5 },

  title: { fontFamily: FONTS.extraBold, fontSize: 26, lineHeight: 38, color: PCOLORS.text, marginTop: 8, marginBottom: 12 },
  notFound: { marginTop: 30, fontFamily: FONTS.medium, fontSize: 15, color: PCOLORS.muted, textAlign: "center" },

  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: PCOLORS.white,
    borderRadius: 14,
    padding: 10,
  },
  summaryImage: { width: 64, height: 64, borderRadius: 10, overflow: "hidden" },
  summaryName: { fontFamily: FONTS.bold, fontSize: 15, lineHeight: 23, color: PCOLORS.text },
  summaryMeta: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },

  section: { marginTop: 22 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 17, color: PCOLORS.text, marginBottom: 10 },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: PCOLORS.white,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  optionSelected: { borderColor: PCOLORS.primary, backgroundColor: PCOLORS.primaryLight },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  optionTitle: { flexShrink: 1, fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  optionTag: { fontFamily: FONTS.bold, fontSize: 10, color: PCOLORS.primary },
  optionSubtitle: { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 18, color: PCOLORS.muted },

  subForm: { marginTop: 4 },
  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text, marginTop: 12, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    borderRadius: 10,
    backgroundColor: PCOLORS.white,
    paddingHorizontal: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: PCOLORS.text,
  },
  multiline: { minHeight: 76, paddingTop: 10, textAlignVertical: "top" },
  twoCols: { flexDirection: "row", gap: 10 },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  selectText: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.text },
  selectPlaceholder: { color: PCOLORS.muted },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text },
  chipTextActive: { color: PCOLORS.white },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: PCOLORS.border,
    backgroundColor: PCOLORS.background,
    gap: 8,
  },
  submitError: { fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.danger },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontFamily: FONTS.semiBold, fontSize: 15, color: PCOLORS.muted },

  knetBadge: { height: 24, minWidth: 44, borderRadius: 5, backgroundColor: "#0B4A8B", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  knetBadgeText: { fontFamily: FONTS.extraBold, fontSize: 10, color: PCOLORS.white, letterSpacing: 0.5 },
  cardBadge: { height: 24, minWidth: 44, borderRadius: 5, backgroundColor: PCOLORS.dark, alignItems: "center", justifyContent: "center" },

  confirmContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, paddingBottom: 40 },
  confirmCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: PCOLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  confirmCirclePending: { backgroundColor: PCOLORS.warning },
  confirmTitle: { fontFamily: FONTS.extraBold, fontSize: 26, lineHeight: 38, color: PCOLORS.text, textAlign: "center" },
  confirmText: { marginTop: 6, fontFamily: FONTS.regular, fontSize: 14, lineHeight: 23, color: PCOLORS.muted, textAlign: "center" },
  receipt: {
    alignSelf: "stretch",
    marginTop: 22,
    backgroundColor: PCOLORS.white,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  receiptName: { fontFamily: FONTS.bold, fontSize: 16, color: PCOLORS.text, marginBottom: 4 },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  receiptLabel: { fontFamily: FONTS.regular, fontSize: 13, color: PCOLORS.muted },
  receiptValue: { flexShrink: 1, fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text },
  receiptStrong: { fontFamily: FONTS.extraBold, fontSize: 16 },
  testPaid: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  testPaidText: { fontFamily: FONTS.semiBold, fontSize: 11, color: PCOLORS.danger },
  confirmButtons: { alignSelf: "stretch", marginTop: 24, gap: 10 },

  overlay: { flex: 1, backgroundColor: PCOLORS.overlay },
  sheet: {
    backgroundColor: PCOLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
    gap: 10,
  },
  sheetTitle: { fontFamily: FONTS.bold, fontSize: 17, color: PCOLORS.text },
  sheetList: { marginTop: 4 },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
  sheetItemText: { flex: 1, fontFamily: FONTS.medium, fontSize: 15, color: PCOLORS.text },
  sheetItemSelected: { fontFamily: FONTS.bold, color: PCOLORS.primary },
});