import { deleteStoredItem, getStoredItem, setStoredItem } from "./storage";

/*
|--------------------------------------------------------------------------
| ORDER IN PROGRESS (several pets, one payment)
|--------------------------------------------------------------------------
|
| Checkout -> "Choose a plan for my other pets": the packs already chosen
| are kept here, the customer picks a plan for another pet, comes back to
| the checkout and pays everything at once (multi-pet discount included).
| Kept on the phone for 24 hours, emptied after the payment.
|
*/

export type OrderCartItem = {
  productId: number;
  /** Existing pet id, or a NEGATIVE id for a new pet (created at checkout) */
  animalId: number;
  /** New pet (no account pet yet): created by the checkout */
  newPet?: { name: string; species: "Cat" | "Dog"; age: string; size?: string | null } | null;
  quantity: number;
  productName: string;
  /** Product code (REG- / TP- / PREMIUM-): name shown from it */
  code?: string;
  totalRecipes?: number;
  petName: string;
  species: string;
  price: number;
  currency: string;
  isTrial: boolean;
  addedAt: number;
};

const KEY = "order_cart_v1";
const MAX_AGE_MS = 24 * 3600 * 1000;

export async function getOrderCart(): Promise<OrderCartItem[]> {
  try {
    const raw = await getStoredItem(KEY);
    if (!raw) return [];

    const items = JSON.parse(raw) as OrderCartItem[];
    const fresh = Array.isArray(items) ? items.filter(item => Date.now() - Number(item.addedAt || 0) < MAX_AGE_MS) : [];

    if (fresh.length !== (Array.isArray(items) ? items.length : 0)) {
      await saveOrderCart(fresh);
    }

    return fresh;
  } catch {
    return [];
  }
}

export async function saveOrderCart(items: OrderCartItem[]): Promise<void> {
  try {
    if (items.length === 0) {
      await deleteStoredItem(KEY);
      return;
    }

    // Compact: only what the checkout needs
    await setStoredItem(KEY, JSON.stringify(items));
  } catch {
    // storage unavailable: the order stays on this screen only
  }
}

/** Adds / replaces the packs of these pets (one line per pet). */
export async function addToOrderCart(items: OrderCartItem[]): Promise<OrderCartItem[]> {
  const current = await getOrderCart();
  const ids = items.map(item => item.animalId);
  const next = [...current.filter(item => !ids.includes(item.animalId)), ...items];

  await saveOrderCart(next);

  return next;
}

export async function removeFromOrderCart(animalId: number): Promise<OrderCartItem[]> {
  const next = (await getOrderCart()).filter(item => item.animalId !== animalId);

  await saveOrderCart(next);

  return next;
}

/** Temporary id of a new pet in the order (negative = not created yet). */
export function newPetCartId(): number {
  return -Math.floor(Date.now() % 1000000000);
}

export async function clearOrderCart(): Promise<void> {
  await saveOrderCart([]);
}