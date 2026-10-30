import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import type { BreedSize, CheckoutItem, CheckoutPayload, CheckoutResult, LifeStage, ShopCatalogResponse, ShopProduct } from "../../types/shop";

import { BackRow, CenteredLoader, ErrorState, PrimaryButton, SecondaryButton } from "../../components/purchase/ScreenParts";
import { FONTS, PCOLORS, slotLabel } from "../../components/purchase/purchaseUtils";
import { formatPrice } from "../../components/purchase/SubscriptionCard";
import { ConsultationNote, ProductImage, SpeciesIcon } from "../../components/shop/shopUi";
import CardPaymentSheet from "../../components/shop/CardPaymentSheet";
import { findGroup, groupProducts } from "../../components/shop/productGroups";
import QuickDeliverySheet from "../../components/shop/QuickDeliverySheet";
import { createPet } from "../../services/customerApi";
import { addToOrderCart, clearOrderCart, getOrderCart, removeFromOrderCart, saveOrderCart, type OrderCartItem } from "../../services/orderCart";

/*
|--------------------------------------------------------------------------
| CHECKOUT (signed in)
|--------------------------------------------------------------------------
|
| One screen, as few fields as possible:
|   1. Pets    : one or several pets in the same order. Existing pets are
|                ticked, new ones added (age, size for dogs, name optional).
|                Each pet gets the age version of the pack that suits it and
|                1-3 packs (the next ones follow). 2 pets or more: discount
|                on every pack (multi_pet_discount of the catalog).
|   2. Address : only the first time (governorate, area, address, slot),
|                otherwise choice between the saved addresses
|   3. Payment : card only (KNET or Visa / Mastercard).
|                SIMULATION (no gateway yet): the card sheet asks any card
|                data, then the order is sent with card_paid = true and the
|                purchase is PAID at once (no "pending"). The checkout then
|                shows the confirmation + "Plan my deliveries".
|
*/

/** One pet of the order: existing (animalId) or new (age, size, name) + packs */
type Line = {
  key: string;
  animalId: number | null;
  /** New pet only: Cat / Dog (another species = another plan) */
  species?: "Cat" | "Dog";
  age: LifeStage | null;
  size: BreedSize | null;
  name: string;
  quantity: number;
};

/*
 * Pack name from the product code (not the product name of Laravel):
 *   REG- Subscription pack · 30 meals / TP- Taste pack / PREMIUM- Premium subscription
 */
function packLabel(
  code: string | null | undefined,
  totalRecipes: number | null | undefined,
  isArabic: boolean,
  fallbackName = ""
): string {
  const value = String(code || "").trim().toUpperCase();

  const kind = value.startsWith("PREMIUM-")
    ? isArabic
      ? "اشتراك بريميوم"
      : "Premium subscription"
    : value.startsWith("REG-")
      ? isArabic
        ? "باقة اشتراك"
        : "Subscription pack"
      : value.startsWith("TP-")
        ? isArabic
          ? "باقة التذوق"
          : "Taste pack"
        : null;

  if (!kind) {
    return fallbackName;
  }

  return totalRecipes ? `${kind} · ${totalRecipes} ${isArabic ? "وجبة" : "meals"}` : kind;
}

/** Loyalty points color */
const GOLD = "#D4A017";

let lineCounter = 0;
const newKey = () => `line-${Date.now()}-${lineCounter++}`;

const SIZES: BreedSize[] = ["Small", "Medium", "Large"];

/** Ages of a new pet of the other species (another plan). */
const SPECIES_AGES: Record<"Cat" | "Dog", string[]> = { Cat: ["Kitten", "Adult", "Senior"], Dog: ["Puppy", "Adult", "Senior"] };

export default function CheckoutScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const { signedIn, ready } = useSession();
  // animalId: pet chosen on the plans page (selected first, the other pets can be added)
  const params = useLocalSearchParams<{ productId?: string; animalId?: string; quantity?: string }>();
  const productId = Number(params.productId);
  const preselectedPetId = params.animalId ? Number(params.animalId) : null;
  const preselectedQuantity = Math.max(1, Number(params.quantity) || 1);

  // The screen stays mounted: new product / pet in the params = new lines
  const paramsKey = `${productId}-${preselectedPetId ?? ""}`;
  const linesKeyRef = useRef("");
  const isFocused = useIsFocused();

  const [catalog, setCatalog] = useState<ShopCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pets of the order (one line per pet)
  const [lines, setLines] = useState<Line[]>([]);

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
  const [noteOpen, setNoteOpen] = useState(false);

  // Card sheet + confirmation after payment
  const [paySheetVisible, setPaySheetVisible] = useState(false);
  const [paidOrder, setPaidOrder] = useState<{
    paid: boolean;
    last4: string;
    purchases: NonNullable<CheckoutResult["purchases"]>;
    /** Pack name of each pet (from the product code) */
    labels?: Record<number, string>;
    total: number;
    discount: number;
    /** Loyalty points used / earned on the order */
    pointsUsed: number;
    pointsDiscount: number;
    pointsEarned: number;
    currency: string;
  } | null>(null);

  // Loyalty points: used by default, the customer can switch them off (per pet)
  const [pointsOff, setPointsOff] = useState<Record<number, boolean>>({});
  const confirmScale = useRef(new Animated.Value(0)).current;

  // Taste pack (1 delivery): the day is chosen right after the payment
  const [quickPlan, setQuickPlan] = useState<{ id: number; petName: string } | null>(null);
  const [plannedIds, setPlannedIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const t = isArabic
    ? {
        back: "رجوع",
        title: "إتمام الطلب",
        retry: "إعادة المحاولة",
        notFound: "هذا المنتج غير متوفر.",
        petTitle: "لأي حيوان؟",
        yourOrder: "طلبك",
        addOtherPet: "إضافة حيوان آخر",
        packsQuestionTitle: "باقة إضافية",
        packsQuestionText: (name: string) => `هل هذه الباقة الإضافية لـ ${name} (تبدأ بعد انتهاء الأولى) أم لحيوان آخر؟`,
        packsSamePet: (name: string) => `لـ ${name}`,
        packsOtherPet: "لحيوان آخر",
        cancelLabel: "إلغاء",
        packsInRow: (n: number, name: string) => `${n} باقات لـ ${name}، واحدة بعد الأخرى.`,
        cat: "قط",
        dog: "كلب",
        ageLabels: { Kitten: "صغير", Puppy: "جرو", Adult: "بالغ", Senior: "كبير السن" } as Record<string, string>,
        packForCats: "هذه الباقة مخصصة للقطط. اختر باقة مناسبة لكلبك، وسنحتفظ بطلبك.",
        packForDogs: "هذه الباقة مخصصة للكلاب. اختر باقة مناسبة لقطتك، وسنحتفظ بطلبك.",
        chooseSuitablePlan: "اختيار باقة مناسبة",
        errOtherSpecies: "اختر باقة مناسبة لحيوانك الجديد أو احذفه من الطلب.",
        addPetsTitle: (pack: string) => `إضافة حيوان إلى ${pack}`,
        alsoInOrder: "أيضاً في طلبك",
        addNote: "إضافة ملاحظة للطلب",
        continuePets: "اختيار باقة لحيواناتي الأخرى",
        continuePetsHint: "نحتفظ بهذا الطلب، اختر باقة أخرى ثم ادفع للجميع مرة واحدة.",
        otherPetsTitle: (n: number) => (n === 1 ? "يمكن لحيوانك الآخر الحصول على هذه الباقة" : `يمكن لـ ${n} من حيواناتك الحصول على هذه الباقة`),
        otherPetsText: "أضفهم إلى هذا الطلب: دفعة واحدة للجميع.",
        addAllPets: (n: number) => `إضافة الكل (${n})`,
        newPet: "حيوان جديد",
        newPetN: "حيوان جديد",
        addPet: "إضافة حيوان آخر",
        remove: "حذف",
        packs: "عدد الباقات",
        packsHint: "الباقة التالية تبدأ بعد انتهاء السابقة",
        discountOffer: (p: string) => `أضف حيواناً آخر ووفّر ${p}٪ على كل باقة`,
        discountApplied: (p: string) => `خصم الحيوانات المتعددة: -${p}٪ على كل باقة`,
        subtotal: "المجموع الفرعي",
        discount: "الخصم",
        errNoPet: "يرجى اختيار حيوان واحد على الأقل.",
        planFor: "تنظيم توصيل",
        chooseDay: "اختيار يوم التوصيل",
        dayChosen: "تم تحديد اليوم",
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
        usePoints: (n: number) => `استخدام ${n} نقطة`,
        pointsSave: (amount: string) => `وفّر ${amount}`,
        pointsMissing: (balance: number, missing: number) => `${balance} نقطة · ${missing} نقطة أخرى لاستخدامها`,
        pointsLine: "نقاط الولاء",
        pointsEarned: (n: number) => `+${n} نقطة ولاء`,
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
        yourOrder: "Your order",
        addOtherPet: "Add another pet",
        packsQuestionTitle: "One more pack",
        packsQuestionText: (name: string) => `Is this extra pack for ${name} (it starts when the first one ends) or for another pet?`,
        packsSamePet: (name: string) => `For ${name}`,
        packsOtherPet: "For another pet",
        cancelLabel: "Cancel",
        packsInRow: (n: number, name: string) => `${n} packs for ${name}, one after the other.`,
        cat: "Cat",
        dog: "Dog",
        ageLabels: { Kitten: "Kitten", Puppy: "Puppy", Adult: "Adult", Senior: "Senior" } as Record<string, string>,
        packForCats: "This pack is for cats. Choose a plan suited to your dog, we keep your order.",
        packForDogs: "This pack is for dogs. Choose a plan suited to your cat, we keep your order.",
        chooseSuitablePlan: "Choose a suitable plan",
        errOtherSpecies: "Choose a suitable plan for your new pet, or remove it from the order.",
        addPetsTitle: (pack: string) => `Add a pet to ${pack}`,
        alsoInOrder: "Also in your order",
        addNote: "Add a note to the order",
        continuePets: "Choose a plan for my other pets",
        continuePetsHint: "We keep this order: pick another plan, then pay for everyone at once.",
        otherPetsTitle: (n: number) => (n === 1 ? "Your other pet can get this pack too" : `Your ${n} other pets can get this pack too`),
        otherPetsText: "Add them to this order: one payment for all.",
        addAllPets: (n: number) => `Add all (${n})`,
        newPet: "New pet",
        newPetN: "New pet",
        addPet: "Add another pet",
        remove: "Remove",
        packs: "Packs",
        packsHint: "The next pack starts when the previous one ends",
        discountOffer: (p: string) => `Add another pet and save ${p}% on every pack`,
        discountApplied: (p: string) => `Multi-pet discount: -${p}% on every pack`,
        subtotal: "Subtotal",
        discount: "Discount",
        errNoPet: "Please choose at least one pet.",
        planFor: "Plan deliveries",
        chooseDay: "Choose the delivery day",
        dayChosen: "Day chosen",
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
        usePoints: (n: number) => `Use ${n} points`,
        pointsSave: (amount: string) => `Save ${amount}`,
        pointsMissing: (balance: number, missing: number) => `${balance} pts · ${missing} more to use them`,
        pointsLine: "Loyalty points",
        pointsEarned: (n: number) => `+${n} loyalty points`,
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

      const data = await fetchShopProducts(lang, null, productId || null);
      setCatalog(data);

      const product = data.products.find(item => item.id === productId);

      if (product) {
        // First time: the first compatible pet, otherwise one new pet of the chosen age
        setLines(current => {
          if (current.length > 0 && linesKeyRef.current === paramsKey) return current;
          linesKeyRef.current = paramsKey;

          // Pet chosen on the plans page first, otherwise the first compatible one
          const compatible =
            data.pets.find(pet => pet.id === preselectedPetId) ??
            data.pets.find(pet => product.compatible_pet_ids.includes(pet.id));

          return [
            {
              key: newKey(),
              animalId: compatible?.id ?? null,
              age: product.life_stages.length === 1 ? product.life_stages[0] : product.age_options.length === 1 ? product.age_options[0].value : null,
              size: product.breed_size_category ?? null,
              name: "",
              quantity: compatible?.id === preselectedPetId ? preselectedQuantity : 1,
            },
          ];
        });
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
  }, [lang, productId, preselectedPetId, paramsKey, preselectedQuantity]);

  useFocusEffect(
    useCallback(() => {
      if (ready && signedIn) void load();
    }, [load, ready, signedIn])
  );

  /*
  |--------------------------------------------------------------------------
  | ORDER IN PROGRESS: packs already chosen for the other pets
  |--------------------------------------------------------------------------
  */

  const [cart, setCart] = useState<OrderCartItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getOrderCart().then(setCart).catch(() => setCart([]));
    }, [])
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

  // Same pack in the other ages (REG-CAT-KITTEN / ADULT / SENIOR)
  const group = useMemo(
    () =>
      catalog && product
        ? findGroup(groupProducts(catalog.products.filter(item => item.species === product.species), isArabic), product.id)
        : null,
    [catalog, product, isArabic]
  );

  const variants: ShopProduct[] = useMemo(
    () => (group && group.products.length > 1 ? group.products : product ? [product] : []),
    [group, product]
  );

  // Ages a new pet can have (one per version of the pack)
  const ageChoices = useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach(item =>
      item.age_options
        .filter(option => variants.length === 1 || item.life_stages.includes(option.value))
        .forEach(option => map.set(option.value, option.label))
    );
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [variants]);

  // Existing pets that can receive one version of the pack
  const compatiblePets = useMemo(
    () => (catalog?.pets ?? []).filter(pet => variants.some(item => item.compatible_pet_ids.includes(pet.id))),
    [catalog, variants]
  );

  // Packs chosen for the other pets (the pets of this screen win)
  const cartOthers = useMemo(
    () => cart.filter(item => !lines.some(line => line.animalId === item.animalId)),
    [cart, lines]
  );

  // Pets of this pack not already in the order with another plan
  const selectablePets = useMemo(
    () => compatiblePets.filter(pet => !cartOthers.some(item => item.animalId === pet.id)),
    [compatiblePets, cartOthers]
  );

  /** Version of the pack for a line (age of the pet). */
  const productFor = (line: Line): ShopProduct | null => {
    if (!product) return null;
    if (line.animalId) {
      return (
        (product.compatible_pet_ids.includes(line.animalId) ? product : null) ??
        variants.find(item => item.compatible_pet_ids.includes(line.animalId as number)) ??
        product
      );
    }
    return (line.age && variants.find(item => item.life_stages.includes(line.age as LifeStage))) || product;
  };

  /** New pet line ready (age / size known): a card, not a form. */
  const newPetReady = (line: Line) =>
    !line.animalId &&
    (!line.species || line.species === product?.species) &&
    !!line.age &&
    !(product?.species === "Dog" && !productFor(line)?.breed_size_category && !line.size);

  const maxPets = catalog?.max_pets ?? 6;
  const maxPacks = catalog?.max_packs_per_pet ?? 3;
  const discountRule = catalog?.multi_pet_discount;
  const discountPercent = discountRule?.percent ?? 0;
  // Pets of the whole order (this screen + the other plans chosen)
  const packLines = lines.filter(line => !line.species || line.species === product?.species);
  const orderPetsCount = packLines.length + cartOthers.length;
  const freeSlots = Math.max(0, maxPets - cartOthers.length);
  const discountActive = discountPercent > 0 && orderPetsCount >= (discountRule?.min_pets ?? 2);
  const percentLabel = String(Math.round(discountPercent));

  // Prices of the order (the server computes the same)
  const pricing = useMemo(() => {
    let subtotal = 0;
    let discount = 0;

    packLines.forEach(line => {
      const item = productFor(line);
      if (!item) return;
      const amount = item.current_price * line.quantity;
      subtotal += amount;
      if (discountActive && (!item.is_trial || discountRule?.applies_to_trial)) {
        discount += Math.round(item.current_price * discountPercent * 10) / 1000 * line.quantity;
      }
    });

    // Other plans of the order (fresh price of the catalog when known)
    cartOthers.forEach(item => {
      const fresh = catalog?.products.find(other => other.id === item.productId);
      const price = fresh?.current_price ?? item.price;
      const isTrial = fresh?.is_trial ?? item.isTrial;
      subtotal += price * item.quantity;
      if (discountActive && (!isTrial || discountRule?.applies_to_trial)) {
        discount += Math.round(price * discountPercent * 10) / 1000 * item.quantity;
      }
    });

    return { subtotal, discount, total: Math.max(0, subtotal - discount) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, variants, discountActive, discountPercent, cartOthers, catalog]);

  /*
   * LOYALTY POINTS of a pet on its first pack (same rules as the server:
   * min / max points, never more than the price after the other discounts).
   */
  const program = catalog?.loyalty_program ?? null;

  const petPoints = (animalId: number | null | undefined, packPrice: number, isTrialPack: boolean) => {
    if (!animalId || animalId < 0 || !program?.enabled) return null;

    const info = catalog?.pets.find(pet => pet.id === animalId)?.loyalty;
    if (!info) return null;

    const multi = discountActive && (!isTrialPack || discountRule?.applies_to_trial)
      ? Math.round(packPrice * discountPercent * 10) / 1000
      : 0;
    const priceAfter = Math.max(0, packPrice - multi);

    let usable = info.usable_points;
    if (usable > 0 && program.point_value > 0) {
      usable = Math.min(usable, Math.floor(priceAfter / program.point_value + 1e-6));
    }
    if (usable < program.min_points) usable = 0;

    const on = usable > 0 && !pointsOff[animalId];

    return {
      info,
      usable,
      discount: Math.round(usable * program.point_value * 1000) / 1000,
      on,
    };
  };

  const updateLine = (key: string, changes: Partial<Line>) =>
    setLines(current => current.map(line => (line.key === key ? { ...line, ...changes } : line)));

  const togglePet = (petId: number) =>
    setLines(current =>
      current.some(line => line.animalId === petId)
        ? current.filter(line => line.animalId !== petId)
        : current.length >= freeSlots
          ? current
          : [...current, { key: newKey(), animalId: petId, age: null, size: null, name: "", quantity: 1 }]
    );

  // Existing pets not in the order yet (one tap: all of them)
  const otherPets = selectablePets.filter(pet => !lines.some(line => line.animalId === pet.id));

  const addAllPets = () =>
    setLines(current => {
      const next = [...current];
      selectablePets.forEach(pet => {
        if (next.length < freeSlots && !next.some(line => line.animalId === pet.id)) {
          next.push({ key: newKey(), animalId: pet.id, age: null, size: null, name: "", quantity: 1 });
        }
      });
      return next;
    });

  /*
   * "Choose a plan for my other pets": the pets of this screen are kept
   * in the order, then the plans page of the next pet without a plan.
   */
  const petsWithoutPlan = (catalog?.pets ?? []).filter(
    pet => !lines.some(line => line.animalId === pet.id) && !cartOthers.some(item => item.animalId === pet.id)
  );

  const continueWithOtherPets = async () => {
    const kept: OrderCartItem[] = lines
      .filter(line => !!line.animalId)
      .map(line => {
        const item = productFor(line) as ShopProduct;
        const pet = catalog?.pets.find(other => other.id === line.animalId);

        return {
          productId: item.id,
          animalId: line.animalId as number,
          quantity: line.quantity,
          productName: item.name,
          code: item.code,
          totalRecipes: item.total_recipes,
          petName: pet?.name ?? "",
          species: item.species,
          price: item.current_price,
          currency: item.currency,
          isTrial: !!item.is_trial,
          addedAt: Date.now(),
        };
      });

    const next = await addToOrderCart(kept);
    setCart(next);

    const nextPet = petsWithoutPlan[0];
    router.push({ pathname: "/plans", params: nextPet ? { animalId: String(nextPet.id) } : {} } as any);
  };

  const removeCartItem = async (animalId: number) => {
    setCart(await removeFromOrderCart(animalId));
  };

  const updateCartQuantity = async (animalId: number, quantity: number) => {
    const next = cart.map(item => (item.animalId === animalId ? { ...item, quantity } : item));
    setCart(next);
    await saveOrderCart(next);
  };

  /*
   * Whole order, one card per pet: the plans chosen before (in the order
   * they were added), then the pets of this pack.
   */
  const orderCards = [
    ...cartOthers.map(item => {
      const fresh = catalog?.products.find(other => other.id === item.productId) ?? null;

      return {
        key: `cart-${item.animalId}`,
        animalId: item.animalId,
        isTrial: fresh?.is_trial ?? item.isTrial,
        product: fresh,
        species: item.species,
        petName: item.petName,
        productName: packLabel(fresh?.code ?? item.code, fresh?.total_recipes ?? item.totalRecipes, isArabic, fresh?.name ?? item.productName),
        price: fresh?.current_price ?? item.price,
        currency: fresh?.currency ?? item.currency,
        quantity: item.quantity,
        onQuantity: (quantity: number) =>
          askPacks(`cart-${item.animalId}`, item.petName, item.quantity, quantity, n => void updateCartQuantity(item.animalId, n)),
        onRemove: () => void removeCartItem(item.animalId),
      };
    }),
    ...lines
      .filter(line => !!line.animalId)
      .map(line => {
        const item = productFor(line);
        const pet = catalog?.pets.find(other => other.id === line.animalId);

        return {
          key: line.key,
          animalId: line.animalId as number,
          isTrial: !!item?.is_trial,
          product: item,
          species: item?.species ?? "",
          petName: pet?.name ?? "",
          productName: packLabel(item?.code, item?.total_recipes, isArabic, item?.name ?? ""),
          price: item?.current_price ?? 0,
          currency: item?.currency ?? "",
          quantity: line.quantity,
          onQuantity: (quantity: number) =>
            askPacks(line.key, pet?.name ?? "", line.quantity, quantity, n => updateLine(line.key, { quantity: n })),
          onRemove: () => removeLine(line.key),
          onEdit: undefined as undefined | (() => void),
        };
      }),
    // New pets (account just created): shown like the others, "My Cat"
    ...lines
      .filter(line => newPetReady(line))
      .map((line, index) => {
        const item = productFor(line);
        const defaultName =
          (product?.species === "Dog" ? t.petNamePlaceholderDog : t.petNamePlaceholderCat) + (index > 0 ? ` ${index + 1}` : "");

        return {
          key: line.key,
          animalId: null as number | null,
          isTrial: !!item?.is_trial,
          product: item,
          species: item?.species ?? "",
          petName: line.name.trim() || defaultName,
          productName: packLabel(item?.code, item?.total_recipes, isArabic, item?.name ?? ""),
          price: item?.current_price ?? 0,
          currency: item?.currency ?? "",
          quantity: line.quantity,
          onQuantity: (quantity: number) =>
            askPacks(line.key, line.name.trim() || defaultName, line.quantity, quantity, n => updateLine(line.key, { quantity: n })),
          onRemove: () => removeLine(line.key),
          onEdit: () => setEditNew(current => ({ ...current, [line.key]: !current[line.key] })),
        };
      }),
  ];

  // Points of each card + total of the order after the points
  const cardPoints = (card: (typeof orderCards)[number]) => petPoints(card.animalId, card.price, card.isTrial);
  const pointsDiscount = Math.round(
    orderCards.reduce((sum, card) => {
      const points = cardPoints(card);
      return sum + (points?.on ? points.discount : 0);
    }, 0) * 1000
  ) / 1000;
  const grandTotal = Math.max(0, Math.round((pricing.total - pointsDiscount) * 1000) / 1000);

  /**
   * Packs of a pet: going from 1 to 2 the customer says if they are for the
   * same pet (one after the other) or for another pet (a pet is added).
   */
  const askPacks = (key: string, petName: string, current: number, next: number, apply: (n: number) => void) => {
    if (!(current === 1 && next === 2) || packsAsked[key]) {
      apply(next);
      return;
    }

    setPacksAsked(asked => ({ ...asked, [key]: true }));

    Alert.alert(t.packsQuestionTitle, t.packsQuestionText(petName), [
      { text: t.packsSamePet(petName), onPress: () => apply(next) },
      { text: t.packsOtherPet, onPress: () => router.push("/add-pet-plan" as any) },
      { text: t.cancelLabel, style: "cancel" },
    ]);
  };

  const addNewPet = () =>
    setLines(current =>
      current.length >= freeSlots
        ? current
        : [
            ...current,
            {
              key: newKey(),
              animalId: null,
              age: (product?.life_stages.length === 1 ? product.life_stages[0] : null) ?? null,
              size: product?.breed_size_category ?? null,
              name: "",
              quantity: 1,
            },
          ]
    );

  const removeLine = (key: string) => setLines(current => current.filter(line => line.key !== key));

  const [creatingPet, setCreatingPet] = useState(false);

  // New pet shown as a card ("My Cat"); its small form opens on "edit"
  const [editNew, setEditNew] = useState<Record<string, boolean>>({});

  // 1 -> 2 packs: asked once per pet (same pet one after the other, or another pet?)
  const [packsAsked, setPacksAsked] = useState<Record<string, boolean>>({});


  const choosePlanForNewPet = async (line: Line) => {
    if (creatingPet || !line.species) return;

    if (!line.age) {
      Alert.alert("", t.errPet);
      return;
    }

    if (line.species === "Dog" && !line.size) {
      Alert.alert("", t.errSize);
      return;
    }

    try {
      setCreatingPet(true);

      const name = line.name.trim() || (line.species === "Dog" ? t.petNamePlaceholderDog : t.petNamePlaceholderCat);
      const created: any = await createPet({
        name,
        species: line.species,
        breed_size_category: line.species === "Dog" ? line.size : null,
        age: line.age,
      } as any);

      // The pets of this pack stay in the order
      const kept: OrderCartItem[] = packLines
        .filter(other => !!other.animalId)
        .map(other => {
          const item = productFor(other) as ShopProduct;
          const pet = catalog?.pets.find(p => p.id === other.animalId);

          return {
            productId: item.id,
            animalId: other.animalId as number,
            quantity: other.quantity,
            productName: item.name,
            code: item.code,
            totalRecipes: item.total_recipes,
            petName: pet?.name ?? "",
            species: item.species,
            price: item.current_price,
            currency: item.currency,
            isTrial: !!item.is_trial,
            addedAt: Date.now(),
          };
        });

      setCart(await addToOrderCart(kept));
      removeLine(line.key);

      const newId = created?.animal?.id ?? created?.pet?.id ?? created?.data?.id ?? created?.id ?? null;

      router.push({
        pathname: "/plans",
        params: newId ? { animalId: String(newId) } : { newPetName: name },
      } as any);
    } catch (e: any) {
      Alert.alert("", e?.message || "Error");
    } finally {
      setCreatingPet(false);
    }
  };

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

    if (lines.some(line => line.species && line.species !== product.species)) return t.errOtherSpecies;
    if (packLines.length === 0 && cartOthers.length === 0) return t.errNoPet;
    if (lines.some(line => !line.animalId && !line.age)) return t.errPet;
    if (lines.some(line => !line.animalId && product.species === "Dog" && !productFor(line)?.breed_size_category && !line.size)) {
      return t.errSize;
    }
    if (!paymentMethod) return t.errPayment;

    return null;
  };

  const buildPayload = (cardLast4: string): CheckoutPayload => {
    // Points of the pet used on its first pack (switch of its card)
    const usePointsOf = (animalId: number | null | undefined) => {
      const card = orderCards.find(other => other.animalId === animalId);
      return !!(card && animalId && animalId > 0 && cardPoints(card)?.on);
    };

    const items: CheckoutItem[] = packLines.map(line => ({
      product_id: (productFor(line) as ShopProduct).id,
      animal_id: line.animalId,
      use_points: usePointsOf(line.animalId),
      pet: line.animalId
        ? null
        : {
            name: line.name.trim() || null,
            age: line.age as LifeStage,
            breed_size_category: (product as ShopProduct).species === "Dog" ? productFor(line)?.breed_size_category ?? line.size : null,
          },
      quantity: line.quantity,
    }));

    // + the plans chosen for the other pets
    cartOthers.forEach(item =>
      items.push(
        (item.animalId < 0 && item.newPet
          ? {
              // New pet: created by the checkout
              product_id: item.productId,
              animal_id: null,
              pet: {
                name: item.newPet.name || null,
                age: item.newPet.age as LifeStage,
                breed_size_category: item.newPet.species === "Dog" ? (item.newPet.size as BreedSize) ?? null : null,
              },
              quantity: item.quantity,
            }
          : {
              product_id: item.productId,
              animal_id: item.animalId,
              pet: null,
              quantity: item.quantity,
              use_points: usePointsOf(item.animalId),
            }) as CheckoutItem
      )
    );

    return {
      items,
      payment_method: paymentMethod as CheckoutPayload["payment_method"],
      card_paid: true,
      card_last4: cardLast4 || null,
      customer_note: note.trim() || null,
      // Address asked later, when the deliveries are planned
      address_id: null,
      address: null,
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

      const purchases =
        result.purchases && result.purchases.length > 0
          ? result.purchases
          : [
              {
                id: result.purchase.id,
                reference: "",
                status: result.purchase.status ?? "",
                product_name: product.name,
                animal_id: 0,
                animal_name: (result as any)?.animal?.name ?? "",
                unit_price: grandTotal,
                discount_amount: 0,
                total_amount: grandTotal,
              },
            ];

      let paid = !!result.paid || purchases.every(item => item.status === "paid" || item.status === "active");

      // Not confirmed by the checkout call: confirm the card payment of each pack now
      if (!paid && paymentMethod) {
        paid = true;
        for (const item of purchases) {
          try {
            const payment = await payShopPurchase(lang, item.id, paymentMethod, cardLast4);
            const paidStatus = (payment as any)?.purchase?.status;
            paid = paid && !!payment.success && (paidStatus === "paid" || paidStatus === "active" || !paidStatus);
          } catch (payError) {
            paid = false;
            console.warn("Card payment confirmation error:", payError);
          }
        }
      }

      // Pack names of the receipt, from the order cards (before emptying the order)
      const labels: Record<number, string> = {};
      cartOthers.forEach(item => {
        const fresh = catalog?.products.find(other => other.id === item.productId);
        labels[item.animalId] = packLabel(fresh?.code ?? item.code, fresh?.total_recipes ?? item.totalRecipes, isArabic, item.productName);
      });
      packLines.forEach(line => {
        const item = productFor(line);
        if (line.animalId && item) labels[line.animalId] = packLabel(item.code, item.total_recipes, isArabic, item.name);
      });

      // Order done: the plans kept for the other pets are paid too
      await clearOrderCart();
      setCart([]);

      setPaySheetVisible(false);
      setPaidOrder({
        paid,
        last4: cardLast4,
        purchases,
        labels,
        total: result.total_amount ?? grandTotal,
        // Discount without the points (shown on their own line)
        discount: Math.max(0, (result.discount_amount ?? pricing.discount) - (result.loyalty_discount ?? 0)),
        pointsUsed: result.loyalty_points_used ?? 0,
        pointsDiscount: result.loyalty_discount ?? 0,
        pointsEarned: (result.purchases ?? []).reduce((sum, item) => sum + (item.loyalty?.points_earned ?? 0), 0),
        currency: result.currency ?? product.currency,
      });

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

        <View style={styles.receipt}>
          {paidOrder.purchases.map(item => (
            <View key={item.id} style={[styles.receiptLine, isArabic && styles.rowRtl]}>
              <View style={styles.flex}>
                <Text style={[styles.receiptName, dir]} numberOfLines={1}>
                  {item.animal_name || product0?.name}
                </Text>
                <Text style={[styles.receiptLabel, dir]} numberOfLines={1}>
                  {paidOrder.labels?.[item.animal_id] ?? item.product_name}
                </Text>
              </View>
              <Text style={styles.receiptValue}>
                {formatPrice(item.total_amount)} {paidOrder.currency}
              </Text>
            </View>
          ))}

          {paidOrder.discount > 0 && (
            <ReceiptRow label={t.discount} value={`-${formatPrice(paidOrder.discount)} ${paidOrder.currency}`} isArabic={isArabic} />
          )}
          {paidOrder.pointsDiscount > 0 && (
            <ReceiptRow
              label={`⭐ ${t.pointsLine} (${paidOrder.pointsUsed})`}
              value={`-${formatPrice(paidOrder.pointsDiscount)} ${paidOrder.currency}`}
              isArabic={isArabic}
            />
          )}
          <ReceiptRow label={t.paidAmount} value={`${formatPrice(paidOrder.total)} ${paidOrder.currency}`} isArabic={isArabic} strong />
          <ReceiptRow
            label={t.paidCard}
            value={`${paymentMethod === "card" ? "Visa / Mastercard" : "KNET"} •••• ${paidOrder.last4}`}
            isArabic={isArabic}
          />

          {paidOrder.paid && paidOrder.pointsEarned > 0 && (
            <View style={[styles.pointsEarned, isArabic && styles.rowRtl]}>
              <Ionicons name="star" size={14} color={GOLD} />
              <Text style={styles.pointsEarnedText}>{t.pointsEarned(paidOrder.pointsEarned)}</Text>
            </View>
          )}

          <View style={[styles.testPaid, isArabic && styles.rowRtl]}>
            <Ionicons name="warning-outline" size={14} color={PCOLORS.danger} />
            <Text style={styles.testPaidText}>{t.testPaid}</Text>
          </View>
        </View>

        {/* PREMIUM-... : no planning now, our team calls the customer first */}
        {paidOrder.paid && product0?.requires_consultation && (
          <View style={styles.consultationWrap}>
            <ConsultationNote product={product0} isArabic={isArabic} />
          </View>
        )}

        <View style={styles.confirmButtons}>
          {paidOrder.paid &&
            !product0?.requires_consultation &&
            // One button per pet (first pack of each pet; the next ones are planned later)
            paidOrder.purchases
              .filter((item, index, all) => all.findIndex(other => other.animal_id === item.animal_id) === index)
              .map((item, index, firsts) => {
                const single = product0?.rules.max_deliveries === 1;
                const planned = plannedIds.includes(item.id);
                const base = single ? (planned ? t.dayChosen : t.chooseDay) : t.planDeliveries;

                return (
                  <PrimaryButton
                    key={item.id}
                    label={firsts.length > 1 ? `${base} · ${item.animal_name}` : base}
                    icon={planned ? "checkmark-circle-outline" : "calendar-outline"}
                    onPress={() =>
                      // Taste pack: only the day (no distribution form)
                      single
                        ? setQuickPlan({ id: item.id, petName: item.animal_name })
                        : router.replace({ pathname: "/distribute-package", params: { id: String(item.id) } } as any)
                    }
                  />
                );
              })}
          <SecondaryButton
            label={t.viewSubscription}
            icon="receipt-outline"
            onPress={() =>
              // One pet: its profile (subscription card) / several pets: My Pets
              new Set(paidOrder.purchases.map(item => item.animal_id)).size === 1 && paidOrder.purchases[0]?.animal_id
                ? router.replace({ pathname: "/pet-form", params: { id: String(paidOrder.purchases[0].animal_id) } } as any)
                : router.replace("/pets" as any)
            }
          />
        </View>

        <QuickDeliverySheet
          visible={!!quickPlan}
          purchaseId={quickPlan?.id ?? null}
          petName={quickPlan?.petName}
          isTastePack
          isArabic={isArabic}
          onClose={() => setQuickPlan(null)}
          onPlanned={() => quickPlan && setPlannedIds(current => [...current, quickPlan.id])}
        />
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

  const slots = catalog?.delivery_slots ?? [];

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackRow label={t.back} isArabic={isArabic} onBack={goBack} />

        <Text style={[styles.title, textDir]}>{t.title}</Text>

        {/* YOUR ORDER: one card per pet, same style for every pack */}
        <Section title={t.yourOrder} isArabic={isArabic}>
          {orderCards.length === 0 ? (
            <Text style={[styles.emptyOrder, textDir]}>{t.errNoPet}</Text>
          ) : (
            orderCards.map(card => (
              <View key={card.key} style={[styles.orderCard, isArabic && styles.rowRtl]}>
                <View style={styles.orderCardImage}>
                  {card.product ? (
                    <ProductImage product={card.product} height={56} />
                  ) : (
                    <SpeciesIcon species={card.species === "Dog" ? "Dog" : "Cat"} size={26} />
                  )}
                </View>

                <View style={styles.flex}>
                  <Text style={[styles.orderCardPet, textDir]} numberOfLines={1}>
                    {card.petName}
                  </Text>
                  <Text style={[styles.orderCardProduct, textDir]} numberOfLines={1}>
                    {card.productName}
                  </Text>
                  <View style={[styles.orderCardBottom, isArabic && styles.rowRtl]}>
                    <Text style={styles.orderCardPrice}>
                      {formatPrice(card.price * card.quantity)} {card.currency}
                    </Text>
                    <MiniStepper value={card.quantity} max={maxPacks} isArabic={isArabic} onChange={card.onQuantity} />
                  </View>
                  {card.quantity > 1 && (
                    <Text style={[styles.orderCardHint, textDir]}>{t.packsInRow(card.quantity, card.petName)}</Text>
                  )}

                  {/* LOYALTY POINTS of this pet (first pack) */}
                  {(() => {
                    const points = cardPoints(card);
                    if (!points) return null;

                    if (points.usable > 0) {
                      return (
                        <Pressable
                          onPress={() => setPointsOff(current => ({ ...current, [card.animalId as number]: points.on }))}
                          style={[styles.pointsRow, points.on && styles.pointsRowOn, isArabic && styles.rowRtl]}
                        >
                          <Ionicons name="star" size={15} color={GOLD} />
                          <View style={styles.flex}>
                            <Text style={[styles.pointsTitle, textDir]} numberOfLines={1}>{t.usePoints(points.usable)}</Text>
                            <Text style={[styles.pointsSub, textDir]} numberOfLines={1}>
                              {t.pointsSave(`${formatPrice(points.discount)} ${card.currency}`)}
                            </Text>
                          </View>
                          <Switch
                            value={points.on}
                            onValueChange={value => setPointsOff(current => ({ ...current, [card.animalId as number]: !value }))}
                            trackColor={{ false: PCOLORS.border, true: GOLD }}
                            thumbColor={PCOLORS.white}
                          />
                        </Pressable>
                      );
                    }

                    if (points.info.balance > 0) {
                      return (
                        <View style={[styles.pointsHint, isArabic && styles.rowRtl]}>
                          <Ionicons name="star-outline" size={13} color={PCOLORS.muted} />
                          <Text style={[styles.pointsHintText, textDir]} numberOfLines={1}>
                            {t.pointsMissing(points.info.balance, points.info.missing_points)}
                          </Text>
                        </View>
                      );
                    }

                    return null;
                  })()}
                </View>

                <View style={styles.orderCardActions}>
                  <Pressable onPress={card.onRemove} hitSlop={10} style={styles.orderCardRemove}>
                    <Ionicons name="close" size={18} color={PCOLORS.muted} />
                  </Pressable>
                  {!!card.onEdit && (
                    <Pressable onPress={card.onEdit} hitSlop={10} style={styles.orderCardRemove}>
                      <Ionicons name="pencil" size={16} color={PCOLORS.primary} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}

          {/* PREMIUM-... : told BEFORE paying (no recipes / days to choose) */}
          {orderCards.some(card => card.product?.requires_consultation) && (
            <ConsultationNote product={{ ...(product as any), requires_consultation: true }} isArabic={isArabic} compact />
          )}
        </Section>

        {/* New pet of this screen: small form only when something is missing or on "edit" */}
        <View>
          {/* New pets: the small form only when something is missing or on "edit" */}
          {lines
            .filter(line => !line.animalId)
            .filter(line => !newPetReady(line) || !!editNew[line.key])
            .map((line, index) => {
              const species = line.species ?? (product.species as "Cat" | "Dog");
              const otherSpecies = species !== product.species;
              const item = otherSpecies ? null : productFor(line);
              const placeholder =
                (species === "Dog" ? t.petNamePlaceholderDog : t.petNamePlaceholderCat) + (index > 0 ? ` ${index + 1}` : "");
              const ages = otherSpecies
                ? (SPECIES_AGES[species] ?? []).map(value => ({ value, label: t.ageLabels[value] ?? value }))
                : ageChoices;

              return (
                <View key={line.key} style={styles.newPetCard}>
                  <View style={[styles.newPetHeader, isArabic && styles.rowRtl]}>
                    <Ionicons name="paw-outline" size={18} color={PCOLORS.primary} />
                    <Text style={[styles.newPetTitle, textDir]}>
                      {t.newPetN}
                      {lines.filter(other => !other.animalId).length > 1 ? ` ${index + 1}` : ""}
                    </Text>
                    {!!item && line.age && (
                      <Text style={styles.newPetPrice}>
                        {formatPrice(item.current_price)} {item.currency}
                      </Text>
                    )}
                    <Pressable onPress={() => removeLine(line.key)} hitSlop={10}>
                      <Ionicons name="close-circle" size={22} color={PCOLORS.muted} />
                    </Pressable>
                  </View>

                  {/* Cat / Dog */}
                  <Chips
                    isArabic={isArabic}
                    items={[
                      { value: "Cat", label: t.cat },
                      { value: "Dog", label: t.dog },
                    ]}
                    value={species}
                    onChange={value => updateLine(line.key, { species: value as "Cat" | "Dog", age: null, size: null })}
                  />

                  <Text style={[styles.label, textDir]}>{t.age}</Text>
                  <Chips
                    isArabic={isArabic}
                    items={ages}
                    value={line.age}
                    onChange={value => updateLine(line.key, { age: value as LifeStage })}
                  />

                  {species === "Dog" && !item?.breed_size_category && (
                    <>
                      <Text style={[styles.label, textDir]}>{t.size}</Text>
                      <Chips
                        isArabic={isArabic}
                        items={SIZES.map(size => ({ value: size, label: t.sizes[size] }))}
                        value={line.size}
                        onChange={value => updateLine(line.key, { size: value as BreedSize })}
                      />
                    </>
                  )}

                  <Text style={[styles.label, textDir]}>{t.petName}</Text>
                  <TextInput
                    value={line.name}
                    onChangeText={value => updateLine(line.key, { name: value })}
                    placeholder={placeholder}
                    placeholderTextColor={PCOLORS.muted}
                    style={[styles.input, textDir]}
                    maxLength={100}
                  />

                  {otherSpecies ? (
                    // This pack is for the other species: choose a plan suited to this pet
                    <View style={styles.otherSpeciesBox}>
                      <Text style={[styles.otherSpeciesText, textDir]}>
                        {product.species === "Dog" ? t.packForDogs : t.packForCats}
                      </Text>
                      <Pressable
                        onPress={() => void choosePlanForNewPet(line)}
                        disabled={creatingPet}
                        style={({ pressed }) => [styles.otherSpeciesButton, isArabic && styles.rowRtl, (pressed || creatingPet) && { opacity: 0.8 }]}
                      >
                        {creatingPet ? (
                          <ActivityIndicator size="small" color={PCOLORS.white} />
                        ) : (
                          <>
                            <Ionicons name="sparkles-outline" size={16} color={PCOLORS.white} />
                            <Text style={styles.otherSpeciesButtonText}>{t.chooseSuitablePlan}</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <View style={[styles.newPetQty, isArabic && styles.rowRtl]}>
                      <Text style={styles.qtyLabel}>{t.packs}</Text>
                      <MiniStepper
                        value={line.quantity}
                        max={maxPacks}
                        isArabic={isArabic}
                        onChange={quantity => updateLine(line.key, { quantity })}
                      />
                    </View>
                  )}
                </View>
              );
            })}

          {/* ONE button: another pet (existing or new) + its plan, on its own page */}
          {orderPetsCount < maxPets && (
            <Pressable
              onPress={() => router.push("/add-pet-plan" as any)}
              style={({ pressed }) => [styles.addOtherPet, isArabic && styles.rowRtl, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="add-circle-outline" size={20} color={PCOLORS.primary} />
              <Text style={styles.addOtherPetText}>{t.addOtherPet}</Text>
            </Pressable>
          )}

          {discountPercent > 0 && (
            <View style={[styles.discountBox, discountActive && styles.discountBoxActive, isArabic && styles.rowRtl]}>
              <Ionicons name={discountActive ? "pricetag" : "pricetag-outline"} size={16} color={discountActive ? PCOLORS.white : PCOLORS.primary} />
              <Text style={[styles.discountText, discountActive && styles.discountTextActive, textDir]}>
                {discountActive ? t.discountApplied(percentLabel) : t.discountOffer(percentLabel)}
              </Text>
            </View>
          )}
        </View>

        {/* No address here: asked when the customer plans his deliveries */}

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

          {noteOpen ? (
            <>
              <Text style={[styles.label, textDir]}>{t.orderNote}</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholderTextColor={PCOLORS.muted}
                style={[styles.input, textDir]}
                maxLength={1000}
                autoFocus
              />
            </>
          ) : (
            <Pressable onPress={() => setNoteOpen(true)} hitSlop={6} style={[styles.linkButton, isArabic && styles.rowRtl]}>
              <Ionicons name="create-outline" size={18} color={PCOLORS.primary} />
              <Text style={styles.linkText}>{t.addNote}</Text>
            </Pressable>
          )}
        </Section>
      </ScrollView>

      {/* TOTAL + CONFIRM */}
      <View style={styles.footer}>
        {submitError !== "" && <Text style={[styles.submitError, textDir]}>{submitError}</Text>}

        {pricing.discount > 0 && (
          <View style={[styles.totalRow, isArabic && styles.rowRtl]}>
            <Text style={styles.discountLabel}>{t.discount}</Text>
            <Text style={styles.discountValue}>
              -{formatPrice(pricing.discount)} {product.currency}
            </Text>
          </View>
        )}
        {pointsDiscount > 0 && (
          <View style={[styles.totalRow, isArabic && styles.rowRtl]}>
            <Text style={styles.pointsTotalLabel}>⭐ {t.pointsLine}</Text>
            <Text style={styles.pointsTotalValue}>
              -{formatPrice(pointsDiscount)} {product.currency}
            </Text>
          </View>
        )}
        <View style={[styles.totalRow, isArabic && styles.rowRtl]}>
          <Text style={styles.totalLabel}>{t.total}</Text>
          <Text style={styles.totalValue}>
            {(pricing.discount > 0 || pointsDiscount > 0) && <Text style={styles.totalOld}>{formatPrice(pricing.subtotal)} </Text>}
            {formatPrice(grandTotal)} <Text style={styles.totalCurrency}>{product.currency}</Text>
          </Text>
        </View>

        <PrimaryButton label={t.confirm} icon="lock-closed-outline" loading={submitting} onPress={submit} />
      </View>

      {/* CARD PAYMENT (simulation) */}
      {!!paymentMethod && (
        <CardPaymentSheet
          visible={paySheetVisible}
          method={paymentMethod}
          amount={grandTotal}
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
  multi,
}: {
  multi?: boolean;
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
      <Ionicons
        name={multi ? (selected ? "checkbox" : "square-outline") : selected ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={selected ? PCOLORS.primary : PCOLORS.border}
      />
    </Pressable>
  );
}

/** Compact − 1 + (number of packs of a pet). */
function MiniStepper({
  value,
  max,
  isArabic,
  onChange,
}: {
  value: number;
  max: number;
  isArabic: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <View style={[styles.miniStepper, isArabic && styles.rowRtl]}>
      <Pressable onPress={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} hitSlop={8} style={[styles.miniStepButton, value <= 1 && styles.disabled]}>
        <Ionicons name="remove" size={16} color={PCOLORS.text} />
      </Pressable>
      <Text style={styles.miniStepValue}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} hitSlop={8} style={[styles.miniStepButton, value >= max && styles.disabled]}>
        <Ionicons name="add" size={16} color={PCOLORS.text} />
      </Pressable>
    </View>
  );
}

function QuantityRow({
  label,
  value,
  max,
  hint,
  isArabic,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
  isArabic: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.qtyWrap}>
      <View style={[styles.qtyRow, isArabic && styles.rowRtl]}>
        <Text style={styles.qtyLabel}>{label}</Text>
        <View style={[styles.qtyControls, isArabic && styles.rowRtl]}>
          <Pressable onPress={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} hitSlop={8} style={[styles.qtyButton, value <= 1 && styles.disabled]}>
            <Ionicons name="remove" size={18} color={PCOLORS.text} />
          </Pressable>
          <Text style={styles.qtyValue}>{value}</Text>
          <Pressable onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} hitSlop={8} style={[styles.qtyButton, value >= max && styles.disabled]}>
            <Ionicons name="add" size={18} color={PCOLORS.text} />
          </Pressable>
        </View>
      </View>
      {!!hint && <Text style={[styles.qtyHint, isArabic && styles.textRtl]}>{hint}</Text>}
    </View>
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
  addOtherPet: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: PCOLORS.primary,
  },
  addOtherPetText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.primary },
  otherSpeciesBox: {
    marginTop: 12,
    padding: 10,
    gap: 8,
    borderRadius: 8,
    backgroundColor: PCOLORS.warningLight,
  },
  otherSpeciesText: { fontFamily: FONTS.medium, fontSize: 12.5, lineHeight: 19, color: PCOLORS.text },
  otherSpeciesButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: PCOLORS.primary,
  },
  otherSpeciesButtonText: { fontFamily: FONTS.bold, fontSize: 12.5, color: PCOLORS.white },
  // Your order: same card for every pack
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  orderCardImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: PCOLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  orderCardPet: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  orderCardProduct: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },
  orderCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  orderCardPrice: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  orderCardHint: { marginTop: 4, fontFamily: FONTS.regular, fontSize: 11.5, lineHeight: 17, color: PCOLORS.muted },
  orderCardRemove: { padding: 2 },
  orderCardActions: { alignSelf: "stretch", justifyContent: "space-between", alignItems: "center" },
  emptyOrder: { fontFamily: FONTS.regular, fontSize: 13, color: PCOLORS.muted, paddingVertical: 6 },
  // Compact pet lines
  selectAll: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 8 },
  selectAllText: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.primary },
  petLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  petLineSelected: { borderColor: PCOLORS.primary, backgroundColor: PCOLORS.primaryLight },
  petLineName: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  petLineAge: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },
  petLinePrice: { fontFamily: FONTS.semiBold, fontSize: 12, color: PCOLORS.primary },
  miniStepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniStepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  miniStepValue: { minWidth: 16, textAlign: "center", fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  newPetQty: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  linksRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4, marginBottom: 6 },
  linkButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  linkText: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.primary },
  orderBox: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
    gap: 8,
  },
  orderBoxHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderBoxTitle: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: PCOLORS.border },
  orderPet: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.text },
  orderProduct: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },
  orderPrice: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.text },
  continuePets: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: PCOLORS.primary,
  },
  continuePetsTitle: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.primary },
  continuePetsText: { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 18, color: PCOLORS.muted },
  otherPetsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A8D7D1",
    backgroundColor: PCOLORS.primaryLight,
  },
  otherPetsTitle: { fontFamily: FONTS.bold, fontSize: 13, lineHeight: 20, color: PCOLORS.text },
  otherPetsText: { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 18, color: PCOLORS.muted },
  otherPetsButton: { paddingHorizontal: 12, height: 36, borderRadius: 8, backgroundColor: PCOLORS.primary, justifyContent: "center" },
  otherPetsButtonText: { fontFamily: FONTS.bold, fontSize: 12, color: PCOLORS.white },
  consultationWrap: { width: "100%", marginTop: 4 },
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

  newPetCard: {
    backgroundColor: PCOLORS.white,
    borderWidth: 1,
    borderColor: PCOLORS.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  newPetHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  newPetTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  newPetPrice: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.primary },
  addPet: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: PCOLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  addPetText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.primary },
  discountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: PCOLORS.primaryLight,
  },
  discountBoxActive: { backgroundColor: PCOLORS.primary },
  discountText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.primary },
  discountTextActive: { color: PCOLORS.white },
  qtyWrap: { marginTop: 10 },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtyLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: { minWidth: 18, textAlign: "center", fontFamily: FONTS.extraBold, fontSize: 16, color: PCOLORS.text },
  qtyHint: { marginTop: 4, fontFamily: FONTS.regular, fontSize: 11, color: PCOLORS.muted },
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
  totalValue: { fontFamily: FONTS.extraBold, fontSize: 20, color: PCOLORS.text },
  totalOld: { fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.muted, textDecorationLine: "line-through" },
  totalCurrency: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.muted },
  discountLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.primary },
  pointsTotalLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: "#9A6B00" },
  pointsTotalValue: { fontFamily: FONTS.bold, fontSize: 14, color: "#9A6B00" },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#EBD9A5",
    backgroundColor: "#FFFBF0",
  },
  pointsRowOn: { borderColor: GOLD, backgroundColor: "#FFF4D6" },
  pointsTitle: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.text },
  pointsSub: { fontFamily: FONTS.medium, fontSize: 12, color: "#9A6B00" },
  pointsHint: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  pointsHintText: { flex: 1, fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },
  pointsEarned: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFF4D6",
  },
  pointsEarnedText: { fontFamily: FONTS.bold, fontSize: 13, color: "#9A6B00" },
  discountValue: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.primary },

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
  receiptName: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  receiptLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
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