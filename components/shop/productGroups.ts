import type { LifeStage, ShopProduct } from "../../types/shop";

/*
|--------------------------------------------------------------------------
| PRODUCT GROUPS (same pack, one product per age)
|--------------------------------------------------------------------------
|
| In Laravel one pack exists once per age:
|   REG-CAT-KITTEN / REG-CAT-ADULT / REG-CAT-SENIOR
|   TP-CAT-KITTEN  / TP-CAT-ADULT  / TP-CAT-SENIOR
| The app shows ONE card per pack; the age is chosen on the product page
| (the price follows the chosen age).
|
| Group = species + code without its age part ("REG-CAT-SENIOR" -> "REG-CAT").
|
*/

export type ShopProductGroup = {
  key: string;
  title: string;
  /** Variants of the group, ordered Kitten/Puppy -> Adult -> Senior */
  products: ShopProduct[];
  /** Variant shown by default (pet of the customer, otherwise Adult) */
  main: ShopProduct;
  minPrice: number;
  maxPrice: number;
  ages: { value: LifeStage; label: string; productId: number }[];
};

const AGE_ORDER: Record<string, number> = { Kitten: 1, Puppy: 1, Adult: 2, Senior: 3 };

// Code segment of the age: KITTEN, KITTENS, KITTENT (typo), PUPPY, ADULT, SENIOR...
const AGE_SEGMENT = /^(kitten|puppy|pupp|adult|senior)/i;

// Age words removed from the names to build the title of the group
const AGE_WORDS_EN = /\b(kittens?|puppies|puppy|adults?|seniors?)\b/gi;
const AGE_WORDS_AR = /(صغار|صغيرة|صغير|كبار السن|كبيرة السن|مسنة|مسن|بالغة|بالغ|البالغة|البالغ)/g;

export function groupKey(product: ShopProduct): string {
  const base = String(product.code || "")
    .split(/[-_\s]+/)
    .filter(part => part && !AGE_SEGMENT.test(part))
    .join("-")
    .toUpperCase();

  return `${product.species}|${base || `ID-${product.id}`}`;
}

function ageOf(product: ShopProduct): LifeStage | null {
  return product.life_stages.length === 1 ? product.life_stages[0] : null;
}

function cleanName(name: string): string {
  return name
    .replace(AGE_WORDS_EN, " ")
    .replace(AGE_WORDS_AR, " ")
    .replace(/\s*[-–·|]\s*$/g, "")
    .replace(/^\s*[-–·|]\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function groupTitle(products: ShopProduct[], isArabic: boolean): string {
  if (products.length === 1) {
    return products[0].name;
  }

  // Words common to every name, once the age words are removed
  const names = products.map(product => cleanName(product.name));
  const first = names[0].split(" ");
  const common = first.filter(word => names.every(name => name.toLowerCase().split(" ").includes(word.toLowerCase())));
  const title = common.join(" ").trim();

  if (title.length >= 3) {
    return title;
  }

  // Nothing in common ("KITTENS" / "ADULTS"): generic title
  const sample = products[0];

  if (sample.is_trial) {
    return isArabic ? "باقة التذوق" : "Taste Pack";
  }

  return isArabic
    ? `اشتراك ${sample.duration_label} · ${sample.total_recipes} وجبة`
    : `${sample.duration_label} plan · ${sample.total_recipes} meals`;
}

/**
 * Variant to show first: the age of a pet of the customer, otherwise Adult.
 */
function mainVariant(products: ShopProduct[]): ShopProduct {
  const forPet = products.find(product => product.compatible_pet_ids.length > 0);

  return forPet ?? products.find(product => ageOf(product) === "Adult") ?? products[0];
}

export function groupProducts(products: ShopProduct[], isArabic: boolean): ShopProductGroup[] {
  const map = new Map<string, ShopProduct[]>();

  products.forEach(product => {
    const key = groupKey(product);
    map.set(key, [...(map.get(key) ?? []), product]);
  });

  return Array.from(map.entries()).map(([key, items]) => {
    const ordered = [...items].sort(
      (a, b) => (AGE_ORDER[ageOf(a) ?? ""] ?? 9) - (AGE_ORDER[ageOf(b) ?? ""] ?? 9)
    );
    const prices = ordered.map(product => product.current_price);

    return {
      key,
      title: groupTitle(ordered, isArabic),
      products: ordered,
      main: mainVariant(ordered),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      ages: ordered.flatMap(product =>
        product.age_options
          .filter(option => product.life_stages.includes(option.value))
          .slice(0, 1)
          .map(option => ({ value: option.value, label: option.label, productId: product.id }))
      ),
    };
  });
}

/** Group of a product inside a catalog (product page). */
export function findGroup(groups: ShopProductGroup[], productId: number): ShopProductGroup | null {
  return groups.find(group => group.products.some(product => product.id === productId)) ?? null;
}