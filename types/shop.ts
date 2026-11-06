/*
|--------------------------------------------------------------------------
| SHOP (public catalog + checkout)
|--------------------------------------------------------------------------
*/

export type ShopSpecies = "Cat" | "Dog";
export type LifeStage = "Kitten" | "Puppy" | "Adult" | "Senior";
export type BreedSize = "Small" | "Medium" | "Large";
export type ShopPaymentMethod = "knet" | "card";

/** One slide of the product carousel (main image first, then the gallery) */
export type ProductMedia = {
  id: string;
  type: "image" | "video";
  url: string;
  /** video: image shown before it plays */
  poster?: string | null;
};

export type ProductFeature = {
  key: "fresh" | "natural" | "chilled" | "human_grade" | "no_preservatives" | "grain_free" | "vet_approved" | string;
  label: string;
};

export type ProductContentItem = {
  label: string;
  quantity?: number | null;
  image_url?: string | null;
};

export type ShopProduct = {
  id: number;
  code: string;
  name: string;
  /** Short line under the name ("Try our fresh meals") */
  subtitle?: string | null;
  description?: string | null;
  image_url?: string | null;
  /** images + videos of the carousel (empty / missing: image_url only) */
  media?: ProductMedia[];

  species: ShopSpecies;
  breed_size_category?: BreedSize | null;
  life_stages: LifeStage[];
  life_stages_label: string;
  age_options: { value: LifeStage; label: string }[];

  product_type: "regular" | "premium";
  is_premium: boolean;
  is_trial: boolean;
  /** PREMIUM-... pack: recipes chosen by our team after a call */
  requires_consultation?: boolean;
  consultation_message?: string | null;

  price: number;
  current_price: number;
  has_promo: boolean;
  discount_percent: number;
  price_source: "regular" | "promo" | "trial_offer";
  promo_ends_at?: string | null;
  currency: string;
  price_per_recipe: number;

  duration_label: string;
  total_recipes: number;

  /** Product page: badge "5 bags", bag weight, free delivery */
  bags_count?: number | null;
  bag_weight_grams?: number | null;
  free_delivery?: boolean;
  /** Qualities with an icon (fresh, natural, chilled...) */
  features?: ProductFeature[];
  /** "What's inside the pack" */
  contents?: ProductContentItem[];
  rules: {
    min_deliveries: number;
    max_deliveries: number;
    min_recipes_per_delivery: number;
    max_recipes_per_delivery: number;
  };
  recipes: { id: number; name: string; is_premium: boolean }[];

  compatible_pet_ids: number[];
};

/** Loyalty points of a pet (checkout: "use my points") */
export type PetLoyaltyInfo = {
  balance: number;
  /** balance minus the points kept on orders not paid yet */
  available: number;
  /** points usable now on one pack (0 = not enough) */
  usable_points: number;
  discount: number;
  missing_points: number;
  expires_on?: string | null;
  level?: { name_en: string; name_ar: string; color: string; icon: string } | null;
};

export type LoyaltyProgram = {
  enabled: boolean;
  point_value: number;
  currency: string;
  min_points: number;
  max_points: number;
};

export type ShopPet = {
  id: number;
  name: string;
  species: ShopSpecies;
  age?: string | null;
  age_label?: string | null;
  breed_size_category?: BreedSize | null;
  photo_url?: string | null;
  loyalty?: PetLoyaltyInfo | null;
};

export type ShopCatalogResponse = {
  success: boolean;
  signed_in: boolean;
  products: ShopProduct[];
  counts: Record<ShopSpecies, number>;
  pets: ShopPet[];
  has_address: boolean;
  /** Shop: card payment only */
  payment_methods: { value: ShopPaymentMethod; label: string }[];
  delivery_slots: string[];
  /** several pets in one order: discount on every pack */
  multi_pet_discount?: MultiPetDiscount;
  max_pets?: number;
  max_packs_per_pet?: number;
  loyalty_program?: LoyaltyProgram | null;
};

export type ShopProductResponse = {
  success: boolean;
  signed_in: boolean;
  product: ShopProduct;
  pets: ShopPet[];
  has_address: boolean;
  /** "Any question? WhatsApp" (international digits, null = hidden) */
  whatsapp_number?: string | null;
};

/** One line of the order = one pet (existing or new) + its pack + number of packs */
export type CheckoutItem = {
  product_id: number;
  animal_id?: number | null;
  pet?: { name?: string | null; age: LifeStage; breed_size_category?: BreedSize | null } | null;
  /** 1-3: packs one after the other for this pet */
  quantity: number;
  /** loyalty points of the pet used on its first pack */
  use_points?: boolean;
};

export type MultiPetDiscount = {
  percent: number;
  min_pets: number;
  applies_to_trial: boolean;
};

export type CheckoutResult = {
  success: boolean;
  message?: string;
  paid?: boolean;
  requires_login?: boolean;
  animal_created?: boolean;
  /** first purchase (old versions) */
  purchase: { id: number; status?: string };
  purchases?: {
    id: number;
    reference: string;
    status: string;
    product_name: string;
    animal_id: number;
    animal_name: string;
    unit_price: number;
    discount_amount: number;
    total_amount: number;
    loyalty?: { points_used: number; discount: number; points_earned: number };
  }[];
  pets_count?: number;
  subtotal_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  currency?: string;
  /** loyalty points used on the whole order + their discount */
  loyalty_points_used?: number;
  loyalty_discount?: number;
};

export type CheckoutPayload = {
  /** several pets / packs (new) */
  items?: CheckoutItem[];
  /** one pet (old format) */
  product_id?: number;
  payment_method: ShopPaymentMethod;
  /** card typed in the app (SIMULATION): the purchase is paid at once */
  card_paid?: boolean;
  card_last4?: string | null;
  customer_note?: string | null;
  animal_id?: number | null;
  pet?: { name?: string | null; age: LifeStage; breed_size_category?: BreedSize | null } | null;
  address_id?: number | null;
  address?: {
    province_id: number;
    zone_id: number;
    address: string;
    delivery_slot: string;
    note?: string | null;
    label?: string | null;
  } | null;
};

export type AuthSendResponse = {
  success: boolean;
  message?: string;
  account_status: "account" | "legacy" | "new";
  requires_name: boolean;
  resend_in?: number;
};

export type AuthVerifyResponse = {
  success: boolean;
  message?: string;
  access_token: string;
  expires_at?: string | null;
  is_new_customer: boolean;
  locale?: string;
  customer?: { id: number; phone: string; first_name?: string | null; last_name?: string | null };
};