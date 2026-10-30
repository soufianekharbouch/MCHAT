import React, { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { fetchShopProducts } from "../../services/shopApi";
import { addToOrderCart, getOrderCart, newPetCartId, type OrderCartItem } from "../../services/orderCart";
import type { ShopCatalogResponse, ShopProduct } from "../../types/shop";

import { BackRow, CenteredLoader, ErrorState, PrimaryButton } from "../../components/purchase/ScreenParts";
import { FONTS, PCOLORS } from "../../components/purchase/purchaseUtils";
import { formatPrice } from "../../components/purchase/SubscriptionCard";

/*
|--------------------------------------------------------------------------
| ADD A PET TO THE ORDER (from the checkout)
|--------------------------------------------------------------------------
|
| 1. Top: which pet? one of the customer's pets (not in the order yet) or
|    a new pet (Cat / Dog, name, age, size for dogs).
| 2. Below: the plans that suit this pet (species, age, size, premium pets
|    never get a taste pack), by kind: Subscription / Taste / Custom.
| 3. "Add to my order": the pack is kept in the order, back to the checkout
|    where the pet appears with the others (packs adjustable there).
|
*/

type Species = "Cat" | "Dog";
type Kind = "REG" | "TP" | "PREMIUM" | "OTHER";

const AGES: Record<Species, string[]> = { Cat: ["Kitten", "Adult", "Senior"], Dog: ["Puppy", "Adult", "Senior"] };
const SIZES = ["Small", "Medium", "Large"];

function kindOf(code?: string | null): Kind {
  const value = String(code || "").toUpperCase();
  if (value.startsWith("REG-")) return "REG";
  if (value.startsWith("TP-")) return "TP";
  if (value.startsWith("PREMIUM-")) return "PREMIUM";
  return "OTHER";
}

export default function AddPetPlanScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";

  const t = isArabic
    ? {
        back: "رجوع",
        title: "إضافة حيوان إلى الطلب",
        whichPet: "لأي حيوان؟",
        newPet: "حيوان جديد",
        cat: "قط",
        dog: "كلب",
        name: "الاسم",
        namePlaceholderCat: "قطتي",
        namePlaceholderDog: "كلبي",
        age: "العمر",
        size: "الحجم",
        ages: { Kitten: "صغير", Puppy: "جرو", Adult: "بالغ", Senior: "كبير السن" } as Record<string, string>,
        sizes: { Small: "صغير", Medium: "متوسط", Large: "كبير" } as Record<string, string>,
        plans: "الباقات المناسبة",
        choosePetFirst: "اختر العمر (والحجم للكلب) لعرض الباقات.",
        noPlans: "لا توجد باقة مناسبة لهذا الحيوان حالياً.",
        sections: {
          REG: "باقات الاشتراك",
          TP: "باقات التذوق",
          PREMIUM: "وصفات مخصصة",
          OTHER: "باقات أخرى",
        } as Record<Kind, string>,
        meals: "وجبة",
        add: "إضافة إلى طلبي",
        inOrder: "في الطلب",
        retry: "إعادة المحاولة",
      }
    : {
        back: "Back",
        title: "Add a pet to my order",
        whichPet: "Which pet?",
        newPet: "New pet",
        cat: "Cat",
        dog: "Dog",
        name: "Name",
        namePlaceholderCat: "My Cat",
        namePlaceholderDog: "My Dog",
        age: "Age",
        size: "Size",
        ages: { Kitten: "Kitten", Puppy: "Puppy", Adult: "Adult", Senior: "Senior" } as Record<string, string>,
        sizes: { Small: "Small", Medium: "Medium", Large: "Large" } as Record<string, string>,
        plans: "Plans for this pet",
        choosePetFirst: "Choose the age (and the size for a dog) to see the plans.",
        noPlans: "No plan suits this pet right now.",
        sections: {
          REG: "Subscription packs",
          TP: "Taste packs",
          PREMIUM: "Custom recipes",
          OTHER: "Other packs",
        } as Record<Kind, string>,
        meals: "meals",
        add: "Add to my order",
        inOrder: "In order",
        retry: "Try again",
      };

  const [catalog, setCatalog] = useState<ShopCatalogResponse | null>(null);
  const [cart, setCart] = useState<OrderCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Chosen pet: existing id, or "new"
  const [petChoice, setPetChoice] = useState<number | "new" | null>(null);
  const [species, setSpecies] = useState<Species>("Cat");
  const [name, setName] = useState("");
  const [age, setAge] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [data, items] = await Promise.all([fetchShopProducts(lang), getOrderCart()]);
      setCatalog(data);
      setCart(items);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Pets of the customer not in the order yet
  const freePets = useMemo(
    () => (catalog?.pets ?? []).filter(pet => !cart.some(item => item.animalId === pet.id)),
    [catalog, cart]
  );

  const chosenPet = typeof petChoice === "number" ? freePets.find(pet => pet.id === petChoice) ?? null : null;
  const isNew = petChoice === "new" || (petChoice === null && freePets.length === 0);

  // Plans that suit the chosen pet
  const plans = useMemo(() => {
    const products = catalog?.products ?? [];

    if (chosenPet) {
      return products.filter(product => product.compatible_pet_ids.includes(chosenPet.id));
    }

    if (!isNew || !age || (species === "Dog" && !size)) {
      return [];
    }

    return products.filter(
      product =>
        product.species === species &&
        (product.life_stages.length === 0 || product.life_stages.includes(age as any)) &&
        (species !== "Dog" || !product.breed_size_category || product.breed_size_category === size)
    );
  }, [catalog, chosenPet, isNew, species, age, size]);

  const sections = useMemo(() => {
    const list: { kind: Kind; products: ShopProduct[] }[] = [];
    plans.forEach(product => {
      const kind = kindOf(product.code);
      const section = list.find(item => item.kind === kind);
      if (section) section.products.push(product);
      else list.push({ kind, products: [product] });
    });
    return list;
  }, [plans]);

  const addToOrder = async (product: ShopProduct) => {
    if (adding) return;

    setAdding(product.id);

    const petName = chosenPet
      ? chosenPet.name
      : name.trim() || (species === "Dog" ? t.namePlaceholderDog : t.namePlaceholderCat);

    const item: OrderCartItem = {
      productId: product.id,
      animalId: chosenPet ? chosenPet.id : newPetCartId(),
      newPet: chosenPet ? null : { name: petName, species, age: age as string, size: species === "Dog" ? size : null },
      quantity: 1,
      productName: product.name,
      code: product.code,
      totalRecipes: product.total_recipes,
      petName,
      species: product.species,
      price: product.current_price,
      currency: product.currency,
      isTrial: !!product.is_trial,
      addedAt: Date.now(),
    };

    await addToOrderCart([item]);
    setAdding(null);

    // Back to the checkout: the pet is in "Your order"
    router.back();
  };

  if (loading && !catalog) return <CenteredLoader />;

  if (error && !catalog) {
    return <ErrorState message={error} retryLabel={t.retry} onRetry={() => void load()} />;
  }

  const rtl = isArabic ? styles.textRtl : null;
  const row = isArabic ? styles.rowRtl : null;

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackRow label={t.back} isArabic={isArabic} />
        <Text style={[styles.title, rtl]}>{t.title}</Text>

        {/* 1. WHICH PET */}
        <View style={styles.card}>
          <Text style={[styles.label, rtl]}>{t.whichPet}</Text>
          <View style={[styles.chips, row]}>
            {freePets.map(pet => {
              const active = petChoice === pet.id;
              return (
                <Pressable key={pet.id} onPress={() => setPetChoice(pet.id)} style={[styles.chip, active && styles.chipActive, row]}>
                  {pet.photo_url ? (
                    <Image source={{ uri: pet.photo_url }} style={styles.chipPhoto} />
                  ) : (
                    <MaterialCommunityIcons name={pet.species === "Dog" ? "dog" : "cat"} size={16} color={active ? PCOLORS.white : PCOLORS.primary} />
                  )}
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{pet.name}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setPetChoice("new")} style={[styles.chip, isNew && styles.chipActive, row]}>
              <Ionicons name="add" size={16} color={isNew ? PCOLORS.white : PCOLORS.primary} />
              <Text style={[styles.chipText, isNew && styles.chipTextActive]}>{t.newPet}</Text>
            </Pressable>
          </View>

          {/* Existing pet: name, age, size */}
          {!!chosenPet && (
            <Text style={[styles.petLine, rtl]}>
              {[chosenPet.name, chosenPet.age_label, chosenPet.breed_size_category ? t.sizes[chosenPet.breed_size_category] : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}

          {/* New pet: Cat / Dog, name, age, size */}
          {isNew && (
            <>
              <View style={[styles.chips, row, { marginTop: 12 }]}>
                {(["Cat", "Dog"] as Species[]).map(value => (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setSpecies(value);
                      setAge(null);
                      setSize(null);
                    }}
                    style={[styles.chip, species === value && styles.chipActive, row]}
                  >
                    <MaterialCommunityIcons name={value === "Dog" ? "dog" : "cat"} size={16} color={species === value ? PCOLORS.white : PCOLORS.primary} />
                    <Text style={[styles.chipText, species === value && styles.chipTextActive]}>{value === "Dog" ? t.dog : t.cat}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, rtl, { marginTop: 12 }]}>{t.name}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={species === "Dog" ? t.namePlaceholderDog : t.namePlaceholderCat}
                placeholderTextColor={PCOLORS.muted}
                style={[styles.input, rtl]}
                maxLength={100}
              />

              <Text style={[styles.label, rtl, { marginTop: 12 }]}>{t.age}</Text>
              <View style={[styles.chips, row]}>
                {AGES[species].map(value => (
                  <Pressable key={value} onPress={() => setAge(value)} style={[styles.chip, age === value && styles.chipActive]}>
                    <Text style={[styles.chipText, age === value && styles.chipTextActive]}>{t.ages[value]}</Text>
                  </Pressable>
                ))}
              </View>

              {species === "Dog" && (
                <>
                  <Text style={[styles.label, rtl, { marginTop: 12 }]}>{t.size}</Text>
                  <View style={[styles.chips, row]}>
                    {SIZES.map(value => (
                      <Pressable key={value} onPress={() => setSize(value)} style={[styles.chip, size === value && styles.chipActive]}>
                        <Text style={[styles.chipText, size === value && styles.chipTextActive]}>{t.sizes[value]}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* 2. PLANS FOR THIS PET */}
        <Text style={[styles.sectionTitle, rtl]}>{t.plans}</Text>

        {!chosenPet && (!isNew || !age || (species === "Dog" && !size)) ? (
          <Text style={[styles.empty, rtl]}>{t.choosePetFirst}</Text>
        ) : sections.length === 0 ? (
          <Text style={[styles.empty, rtl]}>{t.noPlans}</Text>
        ) : (
          sections.map(section => (
            <View key={section.kind} style={{ marginBottom: 8 }}>
              <Text style={[styles.kindTitle, section.kind === "PREMIUM" && { color: "#6B4E00" }, rtl]}>{t.sections[section.kind]}</Text>

              {section.products.map(product => (
                <View key={product.id} style={[styles.productCard, section.kind === "PREMIUM" && styles.productCardPremium, row]}>
                  <View style={styles.productThumb}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={styles.productImage} />
                    ) : (
                      <MaterialCommunityIcons name="food-variant" size={26} color={PCOLORS.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.productName, rtl]} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={[styles.productMeta, rtl]} numberOfLines={1}>
                      {product.total_recipes} {t.meals} · {product.duration_label}
                    </Text>
                    <Text style={[styles.productPrice, rtl]}>
                      {formatPrice(product.current_price)} {product.currency}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void addToOrder(product)}
                    disabled={!!adding}
                    style={({ pressed }) => [styles.addButton, (pressed || adding === product.id) && { opacity: 0.8 }]}
                  >
                    <Ionicons name="add" size={20} color={PCOLORS.white} />
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 60 },
  title: { marginTop: 6, marginBottom: 14, fontFamily: FONTS.extraBold, fontSize: 24, lineHeight: 34, color: PCOLORS.text },

  card: {
    padding: 14,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  label: { marginBottom: 8, fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.background,
  },
  chipActive: { backgroundColor: PCOLORS.primary, borderColor: PCOLORS.primary },
  chipPhoto: { width: 22, height: 22, borderRadius: 11 },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text },
  chipTextActive: { color: PCOLORS.white },
  petLine: { marginTop: 12, fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.muted },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.background,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: PCOLORS.text,
  },

  sectionTitle: { marginBottom: 10, fontFamily: FONTS.extraBold, fontSize: 18, color: PCOLORS.text },
  kindTitle: { marginBottom: 8, fontFamily: FONTS.bold, fontSize: 13, letterSpacing: 0.5, color: PCOLORS.muted },
  empty: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 20, color: PCOLORS.muted },

  productCard: {
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
  productCardPremium: { borderColor: "#C9A227", backgroundColor: "#FFF9EC" },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: PCOLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: { width: "100%", height: "100%" },
  productName: { fontFamily: FONTS.bold, fontSize: 14, lineHeight: 20, color: PCOLORS.text },
  productMeta: { fontFamily: FONTS.regular, fontSize: 12, color: PCOLORS.muted },
  productPrice: { marginTop: 2, fontFamily: FONTS.extraBold, fontSize: 15, color: PCOLORS.text },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PCOLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});