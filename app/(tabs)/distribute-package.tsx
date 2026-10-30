import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { fetchProducts, fetchPurchase, schedulePurchase } from "../../services/purchaseApi";
import { createSavedAddress, fetchProvinces, type Province } from "../../services/shopApi";
import type { CatalogAnimal, PurchaseDelivery, PurchaseDetail } from "../../types/purchase";

import RecipeQuantityRow from "../../components/purchase/RecipeQuantityRow";
import { AddressField, DateField, SlotChips } from "../../components/purchase/DeliveryFields";
import { BackRow, CenteredLoader, ErrorState, PageTitle, PrimaryButton, SecondaryButton } from "../../components/purchase/ScreenParts";
import {
  CalendarMarker,
  FONTS,
  PCOLORS,
  addDays,
  formatLongDate,
  purchaseTexts,
  skipRestDay,
  todayISO,
} from "../../components/purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| DISTRIBUTE THE PACKAGE INTO DELIVERIES
|--------------------------------------------------------------------------
|
| Params: id (purchase), date? (pre-fills a new delivery on this date)
|
| Locked deliveries (prepared, delivered, past the cutoff) are shown
| read-only. All editable deliveries are sent together to /schedule.
|
| 1. The customer chooses HOW MANY deliveries (only the numbers the pack
|    rules allow), the dates are spaced (days between deliveries).
| 2. Each delivery can never take meals the next ones need: with 30 meals,
|    3 deliveries and 10 meals minimum each, each one is 10 at most.
| 3. Less work for the customer:
|    - only one possible number (taste pack: 1 delivery) -> no choice
|    - several numbers -> the first one is pre-selected (can be changed)
|    - the meals of the new deliveries are FILLED automatically (recipes
|      shared out, pack limits respected): the customer can just confirm
|    - first address: governorate + area in dropdown lists
|
*/

type Draft = {
  key: string;
  id: number | null;
  date: string | null;
  slot: string | null;
  addressId: number | null;
  items: Record<number, number>;
};

let draftCounter = 0;
const newKey = () => `draft-${Date.now()}-${draftCounter++}`;

export default function DistributePackageScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";
  const base = purchaseTexts(isArabic);

  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const purchaseId = Number(params.id);

  const t = isArabic
    ? {
        title: "توزيع الباقة",
        howMany: "كم توصيلاً تريد؟",
        howManyHint: (n: number, gap: number) =>
          `${n} وجبة للتوزيع${gap > 1 ? ` · ${gap} أيام على الأقل بين كل توصيل` : ""}`,
        deliveriesN: (n: number) => (n === 1 ? "توصيل واحد" : `${n} توصيلات`),
        mealsEach: (a: number, b: number) => (a === b ? `${a} وجبة لكل توصيل` : `${a}-${b} وجبة لكل توصيل`),
        target: (n: number) => `حتى ${n}`,
        forPet: "لـ",
        errGap: (gap: number) => `يجب أن يفصل ${gap} أيام على الأقل بين توصيلين.`,
        modify: "تعديل هذا التوصيل",
        plannedOn: "مجدول",
        subtitle: (total: number, max: number) =>
          `يمكن تقسيم باقة ${total} وجبة على ${max} توصيلات كحد أقصى. لا يمكن أن يتجاوز المجموع ${total}.`,
        scheduled: "وجبات موزعة",
        deliveriesCount: "توصيلات",
        locked: "توصيلات مؤكدة (لا يمكن تعديلها)",
        delivery: "التوصيل",
        date: "تاريخ التوصيل",
        selectDate: "اختر تاريخاً",
        address: "عنوان التوصيل",
        selectAddress: "اختر عنواناً",
        slot: "وقت التوصيل",
        meals: "الوجبات",
        perDeliveryHint: (min: number, max: number) => `بين ${min} و ${max} وجبة`,
        addDelivery: "إضافة توصيل",
        remove: "حذف",
        removeTitle: "حذف التوصيل",
        removeMessage: "ستعود وجبات هذا التوصيل إلى الرصيد المتبقي.",
        saveDistribution: "تأكيد التوزيع",
        choosePet: "اختر الحيوان لهذه الباقة",
        errDate: (n: number) => `التوصيل ${n}: اختر تاريخاً.`,
        errSameDate: "لا يمكن أن يكون توصيلان في نفس اليوم.",
        errCount: (n: number, min: number, max: number) => `التوصيل ${n}: يجب أن يحتوي على ${min} إلى ${max} وجبات.`,
        errPet: "اختر الحيوان أولاً.",
        noAddress: "أضف عنوان توصيل من الإعدادات أولاً.",
        addAddress: "إضافة عنوان",
        addressTitle: "أين نوصل الوجبات؟",
        addressHint: "أضف عنوان التوصيل مرة واحدة، ثم نظّم مواعيدك.",
        province: "المحافظة",
        zone: "المنطقة",
        addressLine: "العنوان (القطعة، الشارع، المنزل...)",
        addressNote: "ملاحظة للسائق (اختياري)",
        slotOptional: "وقت التوصيل المفضل (اختياري)",
        saveAddress: "حفظ العنوان",
        errAddress: "اختر المحافظة والمنطقة وأدخل العنوان.",
        previousTitle: "وزّع باقتك السابقة أولاً",
        previousText: (n: number, name: string) => `لا تزال ${n} وجبة من «${name}» بدون موعد. نوزعها أولاً، ثم تبدأ هذه الباقة بعدها.`,
        previousButton: "توزيع الباقة السابقة",
        startsAfter: (date: string) => `تبدأ هذه الباقة بعد انتهاء وجبات باقتك الحالية: ابتداءً من ${date}.`,
        autoFilled: "وزّعنا الوجبات والتواريخ لك. يمكنك التعديل أو التأكيد مباشرة.",
        chooseProvince: "اختر المحافظة",
        chooseZone: "اختر المنطقة",
        close: "إغلاق",
      }
    : {
        title: "Distribute Package",
        howMany: "How many deliveries do you want?",
        howManyHint: (n: number, gap: number) =>
          `${n} meals to plan${gap > 1 ? ` · at least ${gap} days between deliveries` : ""}`,
        deliveriesN: (n: number) => (n === 1 ? "1 delivery" : `${n} deliveries`),
        mealsEach: (a: number, b: number) => (a === b ? `${a} meals each` : `${a}-${b} meals each`),
        target: (n: number) => `up to ${n}`,
        forPet: "For",
        errGap: (gap: number) => `Deliveries must be at least ${gap} days apart.`,
        modify: "Modify this delivery",
        plannedOn: "Planned",
        subtitle: (total: number, max: number) =>
          `A ${total}-meal package can be divided into a maximum of ${max} deliveries. Totals cannot exceed ${total}.`,
        scheduled: "Meals distributed",
        deliveriesCount: "deliveries",
        locked: "Confirmed deliveries (cannot be changed)",
        delivery: "Delivery",
        date: "Delivery Date",
        selectDate: "Select a date",
        address: "Delivery Address",
        selectAddress: "Select an address",
        slot: "Delivery Time Slot",
        meals: "Meals",
        perDeliveryHint: (min: number, max: number) => `Between ${min} and ${max} meals`,
        addDelivery: "Add a delivery",
        remove: "Remove",
        removeTitle: "Remove delivery",
        removeMessage: "The meals of this delivery go back to your remaining balance.",
        saveDistribution: "Confirm Distribution",
        choosePet: "Choose the pet for this pack",
        errDate: (n: number) => `Delivery ${n}: choose a date.`,
        errSameDate: "Two deliveries cannot be on the same day.",
        errCount: (n: number, min: number, max: number) => `Delivery ${n}: it must contain ${min} to ${max} meals.`,
        errPet: "Choose the pet first.",
        noAddress: "Add a delivery address in your settings first.",
        addAddress: "Add an address",
        addressTitle: "Where should we deliver?",
        addressHint: "Add your delivery address once, then plan your deliveries.",
        province: "Governorate",
        zone: "Area",
        addressLine: "Address (block, street, house...)",
        addressNote: "Note for the driver (optional)",
        slotOptional: "Preferred delivery time (optional)",
        saveAddress: "Save address",
        errAddress: "Choose the governorate and the area, then enter the address.",
        previousTitle: "Plan your previous pack first",
        previousText: (n: number, name: string) => `${n} meals of "${name}" are not planned yet. We plan them first, then this pack starts right after.`,
        previousButton: "Plan my previous pack",
        startsAfter: (date: string) => `This pack starts when the meals of your current pack are eaten: from ${date}.`,
        autoFilled: "We prepared the meals and dates for you. Change anything you like, or just confirm.",
        chooseProvince: "Choose the governorate",
        chooseZone: "Choose the area",
        close: "Close",
      };

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [petOptions, setPetOptions] = useState<CatalogAnimal[]>([]);
  const [animalId, setAnimalId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const initialized = useRef(false);

  // First address (no address saved yet): small form, the slot is optional
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [addressSlot, setAddressSlot] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  // Deliveries already planned: closed + read only until "Modify"
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});
  const [lockedOpen, setLockedOpen] = useState(false);
  const [editKeys, setEditKeys] = useState<Record<string, boolean>>({});

  // Number of deliveries chosen by the customer (null = to choose)
  const [deliveryCount, setDeliveryCount] = useState<number | null>(null);

  // Meals / dates prepared automatically (small hint shown)
  const [autoFilled, setAutoFilled] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD
  |--------------------------------------------------------------------------
  */

  const load = useCallback(async () => {
    try {
      setError("");
      const detail = await fetchPurchase(purchaseId, lang);
      setPurchase(detail);

      // Drafts are built once (a refresh must not erase the customer's changes)
      if (!initialized.current) {
        initialized.current = true;

        const editable = detail.deliveries.filter(d => d.is_editable).map(deliveryToDraft);
        const lockedOnes = detail.deliveries.filter(d => !d.is_editable);

        if (editable.length > 0) {
          // Deliveries already planned: kept as they are
          if (params.date && !detail.deliveries.some(d => d.date === params.date)) {
            editable.push(emptyDraft(detail, params.date));
          }

          setDrafts(autoFill(detail, editable));
          setDeliveryCount(editable.length);
        } else if (detail.usage.remaining_recipes > 0) {
          // Nothing planned yet: first possible number of deliveries, meals filled
          const possible = countOptions(
            detail,
            lockedOnes.length,
            lockedOnes.reduce((sum, d) => sum + d.recipes_count, 0)
          );
          const n = possible[0] ?? 1;

          setDrafts(autoFill(detail, planDrafts(detail, n, [], params.date ?? null)));
          setDeliveryCount(n);
          setAutoFilled(true);
        } else {
          setDrafts([]);
          setDeliveryCount(null);
        }
      }

      // No address yet: governorates / areas for the form
      if (detail.addresses.length === 0) {
        fetchProvinces(lang).then(setProvinces).catch(() => undefined);
      }

      // Purchase without pet (added in the back-office): ask which pet
      if (!detail.animal) {
        const catalog = await fetchProducts(lang);
        setPetOptions(catalog.animals.filter(a => a.species === detail.product.species));
      }
    } catch (e: any) {
      setError(e?.message || base.error);
    } finally {
      setLoading(false);
    }
  }, [purchaseId, lang, params.date]);

  // Another pack opened on the same screen (e.g. "Plan my previous pack"): new drafts
  const loadedFor = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (loadedFor.current !== purchaseId) {
        loadedFor.current = purchaseId;
        initialized.current = false;
        setDrafts([]);
        setDeliveryCount(null);
        setLoading(true);
      }

      void load();
    }, [load, purchaseId])
  );

  /*
  |--------------------------------------------------------------------------
  | FIRST ADDRESS
  |--------------------------------------------------------------------------
  */

  const saveAddress = async () => {
    if (savingAddress) return;

    if (!provinceId || !zoneId || addressLine.trim().length < 3) {
      Alert.alert("", t.errAddress);
      return;
    }

    try {
      setSavingAddress(true);

      const address = await createSavedAddress(lang, {
        province_id: provinceId,
        zone_id: zoneId,
        address: addressLine.trim(),
        note: addressNote.trim() || null,
        delivery_slot: addressSlot,
      });

      // The deliveries already drafted use this address
      setDrafts(current =>
        current.map(draft => ({
          ...draft,
          addressId: draft.addressId ?? address.id,
          slot: draft.slot ?? addressSlot ?? null,
        }))
      );

      await load();
    } catch (e: any) {
      Alert.alert("", e?.message || base.error);
    } finally {
      setSavingAddress(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | NUMBER OF DELIVERIES (pack rules)
  |--------------------------------------------------------------------------
  */

  /** The customer chooses n deliveries: drafts added / the extra ones removed, meals filled again. */
  const chooseCount = (n: number) => {
    if (!purchase) return;

    setDeliveryCount(n);
    setAutoFilled(true);
    setDrafts(current => autoFill(purchase, planDrafts(purchase, n, current, null), true));
  };

  /*
  |--------------------------------------------------------------------------
  | TOTALS
  |--------------------------------------------------------------------------
  */

  const locked = useMemo(() => (purchase ? purchase.deliveries.filter(d => !d.is_editable) : []), [purchase]);

  const lockedTotal = locked.reduce((sum, d) => sum + d.recipes_count, 0);
  const draftsTotal = drafts.reduce((sum, d) => sum + sumItems(d.items), 0);
  const total = lockedTotal + draftsTotal;

  const recipeTotals = useMemo(() => {
    const totals: Record<number, number> = {};

    locked.forEach(d =>
      d.items.forEach(item => {
        if (item.recipe_id) totals[item.recipe_id] = (totals[item.recipe_id] ?? 0) + item.quantity;
      })
    );

    drafts.forEach(d =>
      Object.entries(d.items).forEach(([recipeId, quantity]) => {
        totals[Number(recipeId)] = (totals[Number(recipeId)] ?? 0) + quantity;
      })
    );

    return totals;
  }, [locked, drafts]);

  /*
  |--------------------------------------------------------------------------
  | DRAFT CHANGES
  |--------------------------------------------------------------------------
  */

  const updateDraft = (key: string, change: Partial<Draft>) =>
    setDrafts(current => current.map(d => (d.key === key ? { ...d, ...change } : d)));

  const changeQuantity = (draft: Draft, recipeId: number, delta: number) => {
    const next = Math.max(0, (draft.items[recipeId] ?? 0) + delta);
    const items = { ...draft.items, [recipeId]: next };

    if (next === 0) delete items[recipeId];

    updateDraft(draft.key, { items });
  };

  const addDraft = () => {
    if (!purchase) return;

    const lastDate = [...locked.map(d => d.date), ...drafts.map(d => d.date).filter(Boolean) as string[]]
      .sort()
      .pop();

    const gap = Math.max(1, purchase.rules.min_days_between_deliveries ?? 1);
    let date = lastDate ? addDays(lastDate, gap) : purchase.rules.earliest_date;

    if (date < purchase.rules.earliest_date) date = purchase.rules.earliest_date;
    date = skipRestDay(date, purchase.rules.rest_days ?? [0]);
    if (date > purchase.rules.latest_date) date = purchase.rules.latest_date;

    setDrafts(current => [...current, emptyDraft(purchase, date)]);
  };

  const removeDraft = (draft: Draft) => {
    const remove = () => {
      setDrafts(current => current.filter(d => d.key !== draft.key));
      setDeliveryCount(current => (current && current > 1 ? current - 1 : current));
    };

    if (!draft.id && sumItems(draft.items) === 0) {
      remove();
      return;
    }

    Alert.alert(t.removeTitle, t.removeMessage, [
      { text: base.cancel, style: "cancel" },
      { text: t.remove, style: "destructive", onPress: remove },
    ]);
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */

  const save = async () => {
    if (!purchase || saving) return;

    const rules = purchase.rules;

    if (!purchase.animal && !animalId) {
      Alert.alert("", t.errPet);
      return;
    }

    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      const count = sumItems(draft.items);

      if (!draft.date) {
        Alert.alert("", t.errDate(i + 1));
        return;
      }

      if (count < rules.min_recipes_per_delivery || count > rules.max_recipes_per_delivery) {
        Alert.alert("", t.errCount(i + 1, rules.min_recipes_per_delivery, rules.max_recipes_per_delivery));
        return;
      }
    }

    const allDates = [...locked.map(d => d.date), ...drafts.map(d => d.date as string)];

    if (new Set(allDates).size !== allDates.length) {
      Alert.alert("", t.errSameDate);
      return;
    }

    // Days between deliveries (pack rule)
    const minGap = rules.min_days_between_deliveries ?? 0;
    if (minGap > 0) {
      const sorted = [...allDates].sort();
      for (let i = 1; i < sorted.length; i++) {
        if (daysBetween(sorted[i - 1], sorted[i]) < minGap) {
          Alert.alert("", t.errGap(minGap));
          return;
        }
      }
    }

    try {
      setSaving(true);

      const result = await schedulePurchase(purchase.id, lang, {
        animal_id: purchase.animal ? null : animalId,
        deliveries: drafts.map(draft => ({
          id: draft.id,
          date: draft.date as string,
          delivery_slot: draft.slot,
          address_id: draft.addressId,
          items: Object.entries(draft.items)
            .filter(([, quantity]) => quantity > 0)
            .map(([recipeId, quantity]) => ({ recipe_id: Number(recipeId), quantity })),
        })),
      });

      // Planned: back to Home (upcoming delivery shown at the top)
      Alert.alert(base.success, result.message || "", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)" as any),
        },
      ]);
    } catch (e: any) {
      Alert.alert("", e?.message || base.error);
    } finally {
      setSaving(false);
    }
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

  if (error || !purchase) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <View style={styles.page}>
          <BackRow label={base.back} isArabic={isArabic} />
          <ErrorState message={error || base.error} retryLabel={base.retry} onRetry={load} />
        </View>
      </SafeAreaView>
    );
  }

  const rules = purchase.rules;
  const rtl = isArabic ? styles.textRtl : null;

  // Sent by the API: older pack of the pet to plan first / start after the previous packs
  const previous = (purchase as any).previous_to_plan as
    | { id: number; product_name: string; remaining_recipes: number }
    | null
    | undefined;
  const startsAfter = (purchase as any).starts_after_previous as string | null | undefined;
  const canPlan = !previous && purchase.addresses.length > 0;

  // Meals still to share between the editable deliveries
  const minPer = Math.max(1, rules.min_recipes_per_delivery);
  const maxPer = Math.max(minPer, rules.max_recipes_per_delivery);
  const mealsLeft = Math.max(0, rules.total_recipes - lockedTotal);
  const options = countOptions(purchase, locked.length, lockedTotal);
  const minGap = Math.max(1, rules.min_days_between_deliveries ?? 1);

  /**
   * Most meals a delivery can take: the other deliveries keep their
   * minimum (30 meals, 3 deliveries, 10 minimum -> 10 at most each).
   */
  const maxFor = (draftKey: string): number => {
    const othersNeed = drafts
      .filter(d => d.key !== draftKey)
      .reduce((sum, d) => sum + Math.max(sumItems(d.items), minPer), 0);

    return Math.max(0, Math.min(maxPer, mealsLeft - othersNeed));
  };

  // Dates: each delivery after the previous one + the days between deliveries
  const dateLimits = (index: number): { min: string; max: string } => {
    const prev = drafts[index - 1]?.date;
    const next = drafts[index + 1]?.date;
    const floor = rules.earliest_date > todayISO() ? rules.earliest_date : todayISO();
    const min = prev && addDays(prev, minGap) > floor ? addDays(prev, minGap) : floor;
    const max = next && addDays(next, -minGap) < rules.latest_date ? addDays(next, -minGap) : rules.latest_date;

    return { min, max: max < min ? min : max };
  };

  // Only one possible number (e.g. taste pack: 1 delivery): no choice to make
  const showDrafts = deliveryCount !== null || (options.length === 1 && drafts.length === options[0]);

  const pet = purchase.animal as (typeof purchase.animal & { photo_url?: string | null; species?: string }) | null;
  const deliveriesCount = locked.length + drafts.length;
  const canAddDelivery =
    deliveriesCount < rules.max_deliveries && rules.total_recipes - total >= rules.min_recipes_per_delivery;

  // Dates already taken (shown in the date pickers)
  const takenMarkers = (exceptKey?: string): Record<string, CalendarMarker> => {
    const markers: Record<string, CalendarMarker> = {};
    locked.forEach(d => (markers[d.date] = d.status === "delivered" ? "delivered" : "scheduled"));
    drafts.forEach(d => {
      if (d.date && d.key !== exceptKey) markers[d.date] = "scheduled";
    });
    return markers;
  };

  const minDate = rules.earliest_date > todayISO() ? rules.earliest_date : todayISO();

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackRow label={base.back} isArabic={isArabic} />

        <PageTitle
          title={t.title}
          subtitle={t.subtitle(rules.total_recipes, rules.max_deliveries)}
          isArabic={isArabic}
        />

        {/* PET OF THE PACK */}
        {!!pet && (
          <View style={[styles.petCard, isArabic && styles.rowRtl]}>
            {pet.photo_url ? (
              <Image source={{ uri: pet.photo_url }} style={styles.petPhoto} />
            ) : (
              <View style={[styles.petPhoto, styles.petPhotoEmpty]}>
                <MaterialCommunityIcons
                  name={(pet.species ?? purchase.product.species) === "Dog" ? "dog" : "cat"}
                  size={22}
                  color={PCOLORS.primary}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.petCardLabel, rtl]}>{t.forPet}</Text>
              <Text style={[styles.petCardName, rtl]} numberOfLines={1}>
                {pet.name}
              </Text>
            </View>
          </View>
        )}

        {/* SUMMARY */}
        <View style={styles.summary}>
          <View style={[styles.summaryRow, isArabic && styles.rowRtl]}>
            <Text style={styles.summaryLabel}>{t.scheduled}</Text>
            <Text style={[styles.summaryValue, total > rules.total_recipes && { color: PCOLORS.danger }]}>
              {total} / {rules.total_recipes}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (total / Math.max(1, rules.total_recipes)) * 100)}%` as `${number}%` },
              ]}
            />
          </View>
          <Text style={[styles.summaryHint, rtl]}>
            {deliveriesCount} / {rules.max_deliveries} {t.deliveriesCount} ·{" "}
            {t.perDeliveryHint(rules.min_recipes_per_delivery, rules.max_recipes_per_delivery)}
          </Text>
        </View>

        {/* PET (purchase without pet) */}
        {!purchase.animal && (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, rtl]}>{t.choosePet}</Text>
            <View style={[styles.petRow, isArabic && styles.rowRtl]}>
              {petOptions.map(pet => (
                <Pressable
                  key={pet.id}
                  onPress={() => setAnimalId(pet.id)}
                  style={[styles.petChip, animalId === pet.id && styles.petChipActive]}
                >
                  <MaterialCommunityIcons
                    name={pet.species === "Dog" ? "dog" : "cat"}
                    size={18}
                    color={animalId === pet.id ? PCOLORS.white : PCOLORS.primary}
                  />
                  <Text style={[styles.petChipText, animalId === pet.id && { color: PCOLORS.white }]}>{pet.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* OLDER PACK OF THIS PET WITH MEALS NOT PLANNED: that one first */}
        {!!previous && (
          <View style={styles.previousBox}>
            <View style={[styles.previousHeader, isArabic && styles.rowRtl]}>
              <Ionicons name="layers-outline" size={20} color={PCOLORS.primary} />
              <Text style={[styles.previousTitle, rtl]}>{t.previousTitle}</Text>
            </View>
            <Text style={[styles.previousText, rtl]}>{t.previousText(previous.remaining_recipes, previous.product_name)}</Text>
            <PrimaryButton
              label={t.previousButton}
              icon="arrow-forward"
              onPress={() => router.replace({ pathname: "/distribute-package", params: { id: String(previous.id) } } as any)}
            />
          </View>
        )}

        {/* NEW PACK: starts when the meals of the previous one are eaten */}
        {!previous && !!startsAfter && (
          <View style={[styles.infoBox, isArabic && styles.rowRtl]}>
            <Ionicons name="calendar-outline" size={18} color={PCOLORS.primary} />
            <Text style={[styles.infoText, rtl]}>{t.startsAfter(formatLongDate(startsAfter, isArabic))}</Text>
          </View>
        )}

        {/* NO ADDRESS YET: small form (the slot is optional) */}
        {!previous && purchase.addresses.length === 0 && (
          <View style={styles.addressForm}>
            <View style={[styles.previousHeader, isArabic && styles.rowRtl]}>
              <Ionicons name="location-outline" size={20} color={PCOLORS.primary} />
              <Text style={[styles.previousTitle, rtl]}>{t.addressTitle}</Text>
            </View>
            <Text style={[styles.previousText, rtl]}>{t.addressHint}</Text>

            <SelectField
              label={t.province}
              placeholder={t.chooseProvince}
              closeLabel={t.close}
              loading={provinces.length === 0}
              options={provinces.map(item => ({ id: item.id, label: isArabic && item.name_ar ? item.name_ar : item.name }))}
              value={provinceId}
              onChange={id => {
                setProvinceId(id);
                setZoneId(null);
              }}
              isArabic={isArabic}
            />

            <SelectField
              label={t.zone}
              placeholder={t.chooseZone}
              closeLabel={t.close}
              disabled={!provinceId}
              options={(provinces.find(item => item.id === provinceId)?.zones ?? []).map(zone => ({
                id: zone.id,
                label: isArabic && zone.name_ar ? zone.name_ar : zone.name,
              }))}
              value={zoneId}
              onChange={setZoneId}
              isArabic={isArabic}
            />

            <Text style={[styles.formLabel, rtl]}>{t.addressLine}</Text>
            <TextInput
              value={addressLine}
              onChangeText={setAddressLine}
              multiline
              maxLength={500}
              style={[styles.formInput, styles.formInputMulti, rtl]}
              placeholderTextColor={PCOLORS.muted}
            />

            <Text style={[styles.formLabel, rtl]}>{t.addressNote}</Text>
            <TextInput
              value={addressNote}
              onChangeText={setAddressNote}
              maxLength={1000}
              style={[styles.formInput, rtl]}
              placeholderTextColor={PCOLORS.muted}
            />

            <SlotChips
              label={t.slotOptional}
              slots={purchase.delivery_slots}
              value={addressSlot}
              onChange={slot => setAddressSlot(current => (current === slot ? null : slot))}
              isArabic={isArabic}
            />

            <View style={{ marginTop: 14 }}>
              <PrimaryButton label={t.saveAddress} icon="checkmark" onPress={saveAddress} loading={savingAddress} />
            </View>
          </View>
        )}

        {/* LOCKED */}
        {locked.length > 0 && (
          <View style={styles.block}>
            {/* Closed by default: number of deliveries + meals */}
            <Pressable onPress={() => setLockedOpen(value => !value)} style={[styles.lockedHeader, isArabic && styles.rowRtl]}>
              <Ionicons name="lock-closed-outline" size={18} color={PCOLORS.muted} />
              <Text style={[styles.blockTitle, { flex: 1, marginBottom: 0 }, rtl]}>
                {t.locked} · {locked.length} ({lockedTotal} {base.meals})
              </Text>
              <Ionicons name={lockedOpen ? "chevron-up" : "chevron-down"} size={20} color={PCOLORS.muted} />
            </Pressable>
            {lockedOpen &&
              locked.map(delivery => (
                <LockedRow key={delivery.id} delivery={delivery} isArabic={isArabic} mealsLabel={base.meals} />
              ))}
          </View>
        )}

        {/* 1. HOW MANY DELIVERIES (only the numbers the pack allows) */}
        {canPlan && mealsLeft > 0 && options.length > 0 && (options.length > 1 || !showDrafts) && (
          <View style={styles.countBox}>
            <Text style={[styles.blockTitle, rtl]}>{t.howMany}</Text>
            <Text style={[styles.countHint, rtl]}>{t.howManyHint(mealsLeft, rules.min_days_between_deliveries ?? 0)}</Text>
            <View style={[styles.chipsWrap, isArabic && styles.rowRtl]}>
              {options.map(n => {
                const active = deliveryCount === n;
                const low = Math.max(minPer, Math.ceil(mealsLeft / n));
                const high = Math.min(maxPer, Math.floor(mealsLeft / n));

                return (
                  <Pressable key={n} onPress={() => chooseCount(n)} style={[styles.countChip, active && styles.countChipActive]}>
                    <Text style={[styles.countChipTitle, active && styles.choiceChipTextActive]}>{t.deliveriesN(n)}</Text>
                    <Text style={[styles.countChipSub, active && styles.choiceChipTextActive]}>
                      {t.mealsEach(Math.min(low, high), Math.max(low, high))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Prepared for the customer: he can just confirm */}
        {canPlan && showDrafts && autoFilled && drafts.some(d => !d.id) && (
          <View style={[styles.infoBox, isArabic && styles.rowRtl]}>
            <Ionicons name="sparkles-outline" size={18} color={PCOLORS.primary} />
            <Text style={[styles.infoText, rtl]}>{t.autoFilled}</Text>
          </View>
        )}

        {/* 2. EDITABLE DELIVERIES (after the number is chosen) */}
        {canPlan && showDrafts && drafts.map((draft, index) => {
          const count = sumItems(draft.items);
          const countOk = count >= rules.min_recipes_per_delivery && count <= rules.max_recipes_per_delivery;
          const maxHere = maxFor(draft.key);
          const limits = dateLimits(index);

          // Already planned (saved): closed and read only until "Modify"
          const saved = !!draft.id;
          const open = !saved || !!openKeys[draft.key];
          const editing = !saved || !!editKeys[draft.key];

          return (
            <View key={draft.key} style={[styles.draftCard, saved && !open && styles.draftCardClosed]}>
              <Pressable
                disabled={!saved}
                onPress={() => setOpenKeys(current => ({ ...current, [draft.key]: !current[draft.key] }))}
                style={[styles.draftHeader, !open && { marginBottom: 0 }, isArabic && styles.rowRtl]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.draftTitle, rtl]}>
                    {t.delivery} {locked.length + index + 1}
                  </Text>
                  {saved && (
                    <Text style={[styles.draftSummary, rtl]}>
                      {draft.date ? formatLongDate(draft.date, isArabic) : "—"} · {count} {base.meals}
                      {draft.slot ? ` · ${draft.slot}` : ""}
                    </Text>
                  )}
                </View>

                {editing ? (
                  <Pressable hitSlop={10} onPress={() => removeDraft(draft)} style={[styles.removeButton, isArabic && styles.rowRtl]}>
                    <Ionicons name="trash-outline" size={18} color={PCOLORS.danger} />
                    <Text style={styles.removeText}>{t.remove}</Text>
                  </Pressable>
                ) : (
                  <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={PCOLORS.muted} />
                )}
              </Pressable>

              {open && (
              <View pointerEvents={editing ? "auto" : "none"} style={!editing && styles.readOnly}>

              <DateField
                label={t.date}
                value={draft.date}
                onChange={date => updateDraft(draft.key, { date })}
                minDate={limits.min}
                maxDate={limits.max}
                markers={takenMarkers(draft.key)}
                isArabic={isArabic}
                placeholder={t.selectDate}
              />

              <AddressField
                label={t.address}
                addresses={purchase.addresses}
                value={draft.addressId}
                onChange={address =>
                  updateDraft(draft.key, {
                    addressId: address.id,
                    slot: draft.slot ?? address.delivery_slot ?? null,
                  })
                }
                isArabic={isArabic}
                placeholder={t.selectAddress}
              />

              <SlotChips
                label={t.slot}
                slots={purchase.delivery_slots}
                value={draft.slot}
                onChange={slot => updateDraft(draft.key, { slot: draft.slot === slot ? null : slot })}
                isArabic={isArabic}
              />

              <View style={[styles.mealsHeader, isArabic && styles.rowRtl]}>
                <Text style={styles.mealsTitle}>{t.meals}</Text>
                <Text style={[styles.mealsCount, !countOk && { color: PCOLORS.danger }]}>
                  {count} / {maxHere} {base.meals}
                </Text>
              </View>

              {purchase.recipes.map((recipe, recipeIndex) => {
                const quantity = draft.items[recipe.id] ?? 0;
                const recipeTotal = recipeTotals[recipe.id] ?? 0;

                // Never more than this delivery can take (the next ones keep their minimum)
                const canIncrement =
                  count < maxHere &&
                  total < rules.total_recipes &&
                  (recipe.max_quantity === null || recipeTotal < recipe.max_quantity);

                return (
                  <RecipeQuantityRow
                    key={recipe.id}
                    index={recipeIndex + 1}
                    name={recipe.name}
                    subtitle={
                      recipe.max_quantity !== null
                        ? `${recipeTotal} / ${recipe.max_quantity}${recipe.is_premium ? " · Premium" : ""}`
                        : recipe.is_premium
                          ? "Premium"
                          : null
                    }
                    quantity={quantity}
                    editable
                    canIncrement={canIncrement}
                    canDecrement={quantity > 0}
                    onIncrement={() => changeQuantity(draft, recipe.id, 1)}
                    onDecrement={() => changeQuantity(draft, recipe.id, -1)}
                    isArabic={isArabic}
                    isLast={recipeIndex === purchase.recipes.length - 1}
                  />
                );
              })}
              </View>
              )}

              {/* Read only: the customer asks to change it */}
              {open && !editing && (
                <Pressable
                  onPress={() => setEditKeys(current => ({ ...current, [draft.key]: true }))}
                  style={[styles.modifyButton, isArabic && styles.rowRtl]}
                >
                  <Ionicons name="create-outline" size={18} color={PCOLORS.primary} />
                  <Text style={styles.modifyText}>{t.modify}</Text>
                </Pressable>
              )}
            </View>
          );
        })}


        {canPlan && showDrafts && (
          <View style={{ marginTop: 18 }}>
            <PrimaryButton
              label={t.saveDistribution}
              onPress={save}
              loading={saving}
              disabled={drafts.length === 0 || total > rules.total_recipes}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| LOCKED DELIVERY ROW
|--------------------------------------------------------------------------
*/

function LockedRow({
  delivery,
  isArabic,
  mealsLabel,
}: {
  delivery: PurchaseDelivery;
  isArabic: boolean;
  mealsLabel: string;
}) {
  return (
    <View style={[styles.lockedRow, isArabic && styles.rowRtl]}>
      <Ionicons name="lock-closed-outline" size={18} color={PCOLORS.muted} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.lockedDate, isArabic && styles.textRtl]}>{formatLongDate(delivery.date, isArabic)}</Text>
        <Text style={[styles.lockedMeta, isArabic && styles.textRtl]}>
          {delivery.recipes_count} {mealsLabel} · {delivery.status_label}
        </Text>
      </View>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

/** Numbers of deliveries possible for the meals left (min / max per delivery). */
function countOptions(detail: PurchaseDetail, lockedCount: number, lockedMeals: number): number[] {
  const r = detail.rules;
  const left = Math.max(0, r.total_recipes - lockedMeals);
  const minPer = Math.max(1, r.min_recipes_per_delivery);
  const maxPer = Math.max(minPer, r.max_recipes_per_delivery);

  if (left <= 0) return [];

  const from = Math.max(1, Math.ceil(left / maxPer), (r.min_deliveries ?? 1) - lockedCount);
  const to = Math.min(r.max_deliveries - lockedCount, Math.floor(left / minPer));
  const options: number[] = [];

  for (let n = from; n <= to; n++) options.push(n);

  // Not possible to plan all the meals: at least one delivery of what is left
  return options.length > 0 ? options : [Math.max(1, Math.min(r.max_deliveries - lockedCount, 1))];
}

/** Days between two deliveries: the pack rule, or the period shared out. */
function spacingFor(detail: PurchaseDetail, count: number): number {
  const r = detail.rules;
  const minGap = Math.max(1, r.min_days_between_deliveries ?? 1);
  const period = Math.max(0, daysBetween(r.earliest_date, r.latest_date));

  return count > 1 ? Math.max(minGap, Math.floor(period / count)) : minGap;
}

/**
 * n editable deliveries: the current ones are kept (the extra ones go),
 * the missing ones are added after the last date (+ days between deliveries).
 */
function planDrafts(detail: PurchaseDetail, n: number, current: Draft[], firstDate: string | null): Draft[] {
  const r = detail.rules;
  const lockedDates = detail.deliveries.filter(d => !d.is_editable).map(d => d.date);
  const gap = spacingFor(detail, n);

  let next = current.length > n ? current.slice(0, n) : [...current];

  while (next.length < n) {
    const last = [...lockedDates, ...(next.map(d => d.date).filter(Boolean) as string[])].sort().pop();
    let date = next.length === 0 && !last && firstDate ? firstDate : last ? addDays(last, gap) : r.earliest_date;

    if (date < r.earliest_date) date = r.earliest_date;
    date = skipRestDay(date, r.rest_days ?? [0]);
    if (date > r.latest_date) date = r.latest_date;

    next.push(emptyDraft(detail, date));
  }

  return next;
}

/**
 * Fills the meals of the new deliveries (not saved yet): the meals left are
 * shared between them (min / max per delivery), the recipes taken in turn
 * (max per recipe in the pack respected). Saved deliveries are not changed.
 * refill = true: the new deliveries are filled again (number changed).
 */
function autoFill(detail: PurchaseDetail, drafts: Draft[], refill = false): Draft[] {
  const r = detail.rules;
  const minPer = Math.max(1, r.min_recipes_per_delivery);
  const maxPer = Math.max(minPer, r.max_recipes_per_delivery);
  const recipes = detail.recipes ?? [];

  if (recipes.length === 0) return drafts;

  // Deliveries to fill: new ones (empty, or all new ones when refill)
  const toFill = drafts.filter(d => !d.id && (refill || sumItems(d.items) === 0));
  if (toFill.length === 0) return drafts;

  const fillKeys = new Set(toFill.map(d => d.key));

  // Meals already used: locked deliveries + deliveries kept as they are
  const used: Record<number, number> = {};
  let usedMeals = 0;

  detail.deliveries
    .filter(d => !d.is_editable)
    .forEach(d =>
      d.items.forEach(item => {
        if (item.recipe_id) used[item.recipe_id] = (used[item.recipe_id] ?? 0) + item.quantity;
        usedMeals += item.quantity;
      })
    );

  drafts
    .filter(d => !fillKeys.has(d.key))
    .forEach(d =>
      Object.entries(d.items).forEach(([recipeId, quantity]) => {
        used[Number(recipeId)] = (used[Number(recipeId)] ?? 0) + quantity;
        usedMeals += quantity;
      })
    );

  const left = Math.max(0, r.total_recipes - usedMeals);
  if (left <= 0) return drafts;

  // Still available per recipe (null max = no limit)
  const available: Record<number, number> = {};
  recipes.forEach(recipe => {
    available[recipe.id] =
      recipe.max_quantity === null || recipe.max_quantity === undefined
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, recipe.max_quantity - (used[recipe.id] ?? 0));
  });

  // Meals of each delivery: shared out, the first ones get the extra meal
  const k = toFill.length;
  const targets = toFill.map((_, index) =>
    Math.min(maxPer, Math.floor(left / k) + (index < left % k ? 1 : 0))
  );

  let turn = 0;

  const filled = new Map<string, Record<number, number>>();

  toFill.forEach((draft, index) => {
    const items: Record<number, number> = {};
    let count = 0;
    let idle = 0;

    while (count < targets[index] && idle < recipes.length) {
      const recipe = recipes[turn % recipes.length];
      turn++;

      if (available[recipe.id] > 0) {
        items[recipe.id] = (items[recipe.id] ?? 0) + 1;
        available[recipe.id]--;
        count++;
        idle = 0;
      } else {
        idle++;
      }
    }

    filled.set(draft.key, items);
  });

  return drafts.map(d => (filled.has(d.key) ? { ...d, items: filled.get(d.key) as Record<number, number> } : d));
}

/*
|--------------------------------------------------------------------------
| DROPDOWN (governorate / area)
|--------------------------------------------------------------------------
*/

function SelectField({
  label,
  placeholder,
  closeLabel,
  options,
  value,
  onChange,
  isArabic,
  disabled = false,
  loading = false,
}: {
  label: string;
  placeholder: string;
  closeLabel: string;
  options: { id: number; label: string }[];
  value: number | null;
  onChange: (id: number) => void;
  isArabic: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.id === value);
  const rtl = isArabic ? styles.textRtl : null;

  return (
    <>
      <Text style={[styles.formLabel, rtl]}>{label}</Text>

      <Pressable
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        style={[styles.select, isArabic && styles.rowRtl, (disabled || loading) && styles.selectDisabled]}
      >
        <Text numberOfLines={1} style={[styles.selectText, !selected && styles.selectPlaceholder, rtl]}>
          {selected ? selected.label : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={PCOLORS.primary} />
        ) : (
          <Ionicons name="chevron-down" size={18} color={PCOLORS.muted} />
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.selectOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.selectSheet} onPress={() => undefined}>
            <Text style={[styles.selectTitle, rtl]}>{placeholder}</Text>

            <FlatList
              data={options}
              keyExtractor={item => String(item.id)}
              style={{ maxHeight: 380 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.id === value;

                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    style={[styles.selectOption, active && styles.selectOptionActive, isArabic && styles.rowRtl]}
                  >
                    <Text style={[styles.selectOptionText, active && styles.selectOptionTextActive, rtl]}>{item.label}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={PCOLORS.primary} />}
                  </Pressable>
                );
              }}
            />

            <Pressable onPress={() => setOpen(false)} style={styles.selectClose}>
              <Text style={styles.selectCloseText}>{closeLabel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Days from a to b (YYYY-MM-DD). */
function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);

  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function sumItems(items: Record<number, number>): number {
  return Object.values(items).reduce((sum, quantity) => sum + quantity, 0);
}

function deliveryToDraft(delivery: PurchaseDelivery): Draft {
  const items: Record<number, number> = {};

  delivery.items.forEach(item => {
    if (item.recipe_id) items[item.recipe_id] = (items[item.recipe_id] ?? 0) + item.quantity;
  });

  return {
    key: newKey(),
    id: delivery.id,
    date: delivery.date,
    slot: delivery.delivery_slot ?? null,
    addressId: delivery.address?.id ?? null,
    items,
  };
}

function emptyDraft(purchase: PurchaseDetail, date: string | null): Draft {
  const defaultAddress =
    purchase.addresses.find(address => Boolean(address.is_default)) ?? purchase.addresses[0] ?? null;

  return {
    key: newKey(),
    id: null,
    date: skipRestDay(date ?? purchase.rules.earliest_date, purchase.rules.rest_days ?? [0]),
    slot: defaultAddress?.delivery_slot ?? null,
    addressId: defaultAddress?.id ?? null,
    items: {},
  };
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 60 },

  summary: {
    padding: 18,
    marginBottom: 22,
    borderRadius: 10,
    backgroundColor: "#E5ECE8",
    borderWidth: 1,
    borderColor: "#B7DAD4",
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  summaryLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: PCOLORS.text },
  summaryValue: { fontFamily: FONTS.bold, fontSize: 22, color: PCOLORS.text },
  progressTrack: {
    height: 6,
    marginTop: 10,
    borderRadius: 3,
    backgroundColor: PCOLORS.white,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: PCOLORS.primary },
  summaryHint: { marginTop: 10, fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },

  block: { marginBottom: 22 },

  petCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  petPhoto: { width: 46, height: 46, borderRadius: 23 },
  petPhotoEmpty: { backgroundColor: PCOLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  petCardLabel: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },
  petCardName: { fontFamily: FONTS.bold, fontSize: 16, color: PCOLORS.text },

  countBox: { marginBottom: 20 },
  countHint: { marginTop: -4, marginBottom: 10, fontFamily: FONTS.regular, fontSize: 12.5, color: PCOLORS.muted },
  countChip: {
    minWidth: 104,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  countChipActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  countChipTitle: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  countChipSub: { fontFamily: FONTS.regular, fontSize: 11.5, color: PCOLORS.muted },
  blockTitle: { marginBottom: 10, fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },

  petRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  petChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: PCOLORS.border,
  },
  petChipActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  petChipText: { fontFamily: FONTS.semiBold, fontSize: 14, color: PCOLORS.text },

  previousBox: {
    gap: 10,
    padding: 16,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A8D7D1",
    backgroundColor: PCOLORS.primaryLight,
  },
  previousHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  previousTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: PCOLORS.text },
  previousText: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.muted },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginBottom: 18,
    borderRadius: 9,
    backgroundColor: PCOLORS.primaryLight,
  },
  infoText: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, lineHeight: 20, color: PCOLORS.text },
  addressForm: {
    gap: 4,
    padding: 16,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  formLabel: { marginTop: 10, marginBottom: 6, fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  zoneList: { maxHeight: 160 },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.background,
  },
  choiceChipActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  choiceChipText: { fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.text },
  choiceChipTextActive: { color: PCOLORS.white },
  formInput: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.background,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: PCOLORS.text,
  },
  formInputMulti: { minHeight: 70, textAlignVertical: "top" },

  select: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.background,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectDisabled: { opacity: 0.5 },
  selectText: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.text },
  selectPlaceholder: { color: PCOLORS.muted },
  selectOverlay: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.35)" },
  selectSheet: { borderRadius: 12, padding: 14, backgroundColor: PCOLORS.white },
  selectTitle: { marginBottom: 8, fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  selectOption: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectOptionActive: { backgroundColor: PCOLORS.primaryLight },
  selectOptionText: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.text },
  selectOptionTextActive: { fontFamily: FONTS.bold, color: PCOLORS.primary },
  selectClose: { marginTop: 8, minHeight: 42, alignItems: "center", justifyContent: "center" },
  selectCloseText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.muted },

  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginBottom: 20,
    borderRadius: 9,
    backgroundColor: PCOLORS.dangerLight,
  },
  warningText: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.text },
  warningLink: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.primary },

  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
  lockedDate: { fontFamily: FONTS.semiBold, fontSize: 14, color: PCOLORS.text },
  lockedMeta: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },

  draftCard: {
    marginBottom: 18,
    padding: 20,
    borderTopWidth: 3,
    borderTopColor: PCOLORS.primary,
    backgroundColor: PCOLORS.card,
  },
  draftHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  draftTitle: { fontFamily: FONTS.bold, fontSize: 20, color: PCOLORS.text },
  draftSummary: { marginTop: 2, fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.muted },
  draftCardClosed: { paddingVertical: 14 },
  readOnly: { opacity: 0.5 },
  lockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: PCOLORS.card,
  },
  modifyButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: PCOLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modifyText: { fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.primary },
  removeButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  removeText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.danger },

  mealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
  mealsTitle: { fontFamily: FONTS.bold, fontSize: 18, color: PCOLORS.text },
  mealsCount: { fontFamily: FONTS.medium, fontSize: 14, color: PCOLORS.primary },
});