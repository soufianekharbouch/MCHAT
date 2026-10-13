import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { fetchProducts, fetchPurchase, schedulePurchase } from "../../services/purchaseApi";
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
      }
    : {
        title: "Distribute Package",
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
      };

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [petOptions, setPetOptions] = useState<CatalogAnimal[]>([]);
  const [animalId, setAnimalId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const initialized = useRef(false);

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

        if (params.date && !detail.deliveries.some(d => d.date === params.date)) {
          editable.push(emptyDraft(detail, params.date));
        } else if (editable.length === 0 && detail.usage.remaining_recipes > 0) {
          editable.push(emptyDraft(detail, null));
        }

        setDrafts(editable);
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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
    const remove = () => setDrafts(current => current.filter(d => d.key !== draft.key));

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

      Alert.alert(base.success, result.message || "", [
        {
          text: "OK",
          onPress: () => router.replace({ pathname: "/purchase", params: { id: String(purchase.id) } }),
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

        {/* NO ADDRESS */}
        {purchase.addresses.length === 0 && (
          <View style={[styles.warning, isArabic && styles.rowRtl]}>
            <Ionicons name="location-outline" size={20} color={PCOLORS.danger} />
            <Text style={[styles.warningText, rtl]}>{t.noAddress}</Text>
            <Pressable onPress={() => router.push("/saved-addresses")}>
              <Text style={styles.warningLink}>{t.addAddress}</Text>
            </Pressable>
          </View>
        )}

        {/* LOCKED */}
        {locked.length > 0 && (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, rtl]}>{t.locked}</Text>
            {locked.map(delivery => (
              <LockedRow key={delivery.id} delivery={delivery} isArabic={isArabic} mealsLabel={base.meals} />
            ))}
          </View>
        )}

        {/* EDITABLE */}
        {drafts.map((draft, index) => {
          const count = sumItems(draft.items);
          const countOk = count >= rules.min_recipes_per_delivery && count <= rules.max_recipes_per_delivery;

          return (
            <View key={draft.key} style={styles.draftCard}>
              <View style={[styles.draftHeader, isArabic && styles.rowRtl]}>
                <Text style={styles.draftTitle}>
                  {t.delivery} {locked.length + index + 1}
                </Text>
                <Pressable hitSlop={10} onPress={() => removeDraft(draft)} style={[styles.removeButton, isArabic && styles.rowRtl]}>
                  <Ionicons name="trash-outline" size={18} color={PCOLORS.danger} />
                  <Text style={styles.removeText}>{t.remove}</Text>
                </Pressable>
              </View>

              <DateField
                label={t.date}
                value={draft.date}
                onChange={date => updateDraft(draft.key, { date })}
                minDate={minDate}
                maxDate={rules.latest_date}
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
                onChange={slot => updateDraft(draft.key, { slot })}
                isArabic={isArabic}
              />

              <View style={[styles.mealsHeader, isArabic && styles.rowRtl]}>
                <Text style={styles.mealsTitle}>{t.meals}</Text>
                <Text style={[styles.mealsCount, !countOk && { color: PCOLORS.danger }]}>
                  {count} {base.meals}
                </Text>
              </View>

              {purchase.recipes.map((recipe, recipeIndex) => {
                const quantity = draft.items[recipe.id] ?? 0;
                const recipeTotal = recipeTotals[recipe.id] ?? 0;

                const canIncrement =
                  count < rules.max_recipes_per_delivery &&
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
          );
        })}

        {canAddDelivery && (
          <View style={{ marginTop: 6 }}>
            <SecondaryButton label={t.addDelivery} icon="add" onPress={addDraft} />
          </View>
        )}

        <View style={{ marginTop: 18 }}>
          <PrimaryButton
            label={t.saveDistribution}
            onPress={save}
            loading={saving}
            disabled={drafts.length === 0 || total > rules.total_recipes || purchase.addresses.length === 0}
          />
        </View>
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