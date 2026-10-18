/*
|--------------------------------------------------------------------------
| SHOP (public catalog + checkout)
|--------------------------------------------------------------------------
*/

export type ShopSpecies = "Cat" | "Dog";
export type LifeStage = "Kitten" | "Puppy" | "Adult" | "Senior";
export type BreedSize = "Small" | "Medium" | "Large";
export type ShopPaymentMethod = "knet" | "card";

export type ShopProduct = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  image_url?: string | null;

  species: ShopSpecies;
  breed_size_category?: BreedSize | null;
  life_stages: LifeStage[];
  life_stages_label: string;
  age_options: { value: LifeStage; label: string }[];

  product_type: "regular" | "premium";
  is_premium: boolean;
  is_trial: boolean;

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
  rules: {
    min_deliveries: number;
    max_deliveries: number;
    min_recipes_per_delivery: number;
    max_recipes_per_delivery: number;
  };
  recipes: { id: number; name: string; is_premium: boolean }[];

  compatible_pet_ids: number[];
};

export type ShopPet = {
  id: number;
  name: string;
  species: ShopSpecies;
  age?: string | null;
  age_label?: string | null;
  breed_size_category?: BreedSize | null;
  photo_url?: string | null;
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
};

export type ShopProductResponse = {
  success: boolean;
  signed_in: boolean;
  product: ShopProduct;
  pets: ShopPet[];
  has_address: boolean;
};

export type CheckoutPayload = {
  product_id: number;
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