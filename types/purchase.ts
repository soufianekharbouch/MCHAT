/*
|--------------------------------------------------------------------------
| PRODUCTS (PACKS) & PURCHASES
|--------------------------------------------------------------------------
|
| Same shapes as the Laravel API (MobilePurchaseController).
|
*/

export type Species = "Cat" | "Dog";

export type PurchaseStatus =
  | "pending"
  | "paid"
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | "refunded";

export type DeliveryStatus = "scheduled" | "prepared" | "delivered" | "cancelled";

export type PaymentMethod = "bank_transfer" | "cash" | "knet" | "card" | "shopify" | "free" | "other";

/*
|--------------------------------------------------------------------------
| CATALOG
|--------------------------------------------------------------------------
*/

export type PackRules = {
  min_deliveries: number;
  max_deliveries: number;
  min_recipes_per_delivery: number;
  max_recipes_per_delivery: number;
  min_days_between_deliveries: number | null;
};

export type PackRecipe = {
  id: number;
  name: string;
  code?: string | null;
  is_premium: boolean;
  max_quantity: number | null;
  is_default: boolean;
};

export type Product = {
  id: number;
  code: string;
  name: string;
  name_en: string;
  name_ar?: string | null;
  description?: string | null;
  image_url?: string | null;

  species: Species;
  breed_size_category?: string | null;
  product_type: "regular" | "premium";
  is_premium: boolean;
  is_trial: boolean;

  price: number;
  current_price: number;
  has_promo: boolean;
  discount_percent: number;
  promo_ends_at?: string | null;
  currency: string;
  price_per_recipe: number;

  duration_value: number;
  duration_unit: "day" | "week" | "month" | "year";
  duration_label: string;

  total_recipes: number;
  rules: PackRules;
  recipes: PackRecipe[];

  purchases_count: number;
  max_purchases_per_customer: number | null;
  can_purchase: boolean;
};

export type CatalogAnimal = {
  id: number;
  name: string;
  species: Species;
  breed_size_category?: string | null;
  photo_url?: string | null;
  products: Product[];
};

export type PaymentMethodOption = {
  value: PaymentMethod;
  label: string;
};

export type ProductsResponse = {
  success: boolean;
  animals: CatalogAnimal[];
  payment_methods: PaymentMethodOption[];
};

/*
|--------------------------------------------------------------------------
| PURCHASES
|--------------------------------------------------------------------------
*/

export type DeliveryItem = {
  recipe_id: number | null;
  name: string;
  quantity: number;
};

export type PurchaseDelivery = {
  id: number;
  number: number;
  date: string; // YYYY-MM-DD
  delivery_slot?: string | null;
  status: DeliveryStatus;
  status_label: string;
  recipes_count: number;
  items: DeliveryItem[];
  address?: {
    id: number;
    label?: string | null;
    address: string;
  } | null;
  is_editable: boolean;
  is_delayed?: boolean;
  edit_cutoff: string;
};

export type PurchaseSummary = {
  id: number;
  reference: string;

  status: PurchaseStatus;
  status_label: string;
  is_active: boolean;

  product: {
    id: number | null;
    code: string;
    name: string;
    image_url?: string | null;
    species: Species;
    product_type: "regular" | "premium";
    is_premium: boolean;
    is_trial: boolean;
  };

  animal: {
    id: number;
    name: string;
    photo_url?: string | null;
  } | null;

  price: {
    unit_price: number;
    discount_amount: number;
    total: number;
    currency: string;
  };

  payment: {
    method: PaymentMethod | null;
    method_label?: string | null;
    reference?: string | null;
    proof_uploaded: boolean;
    paid_at?: string | null;
  };

  period: {
    purchased_at?: string | null;
    starts_on?: string | null;
    ends_on?: string | null;
    duration_label: string;
    days_left: number | null;
  };

  usage: {
    total_recipes: number;
    scheduled_recipes: number;
    delivered_recipes: number;
    remaining_recipes: number;
    deliveries_count: number;
    max_deliveries: number;
  };

  next_delivery: PurchaseDelivery | null;

  can_schedule: boolean;
  can_upload_payment_proof: boolean;
  can_cancel: boolean;
};

export type CustomerAddressOption = {
  id: number;
  label?: string | null;
  address: string;
  is_default: boolean | number;
  delivery_slot?: string | null;
  zone_label?: string | null;
  province_label?: string | null;
};

export type PurchaseDetail = PurchaseSummary & {
  rules: PackRules & {
    total_recipes: number;
    edit_cutoff_hour: number;
    rest_days?: number[]; // 0 = Sunday, no delivery
    earliest_date: string;
    latest_date: string;
  };
  deliveries: PurchaseDelivery[];
  recipes: PackRecipe[];
  addresses: CustomerAddressOption[];
  delivery_slots: string[];
  notes?: {
    customer?: string | null;
  };
};

/*
|--------------------------------------------------------------------------
| SCHEDULE PAYLOAD
|--------------------------------------------------------------------------
*/

export type ScheduleDeliveryInput = {
  id?: number | null;
  date: string;
  delivery_slot?: string | null;
  address_id?: number | null;
  items: { recipe_id: number; quantity: number }[];
};

export type SchedulePayload = {
  animal_id?: number | null;
  deliveries: ScheduleDeliveryInput[];
};

/*
|--------------------------------------------------------------------------
| CALENDAR / HISTORY
|--------------------------------------------------------------------------
*/

export type DeliveryWithPurchase = {
  purchase: PurchaseDetail;
  delivery: PurchaseDelivery;
};