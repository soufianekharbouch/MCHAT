import type {
  AuthSendResponse,
  AuthVerifyResponse,
  CheckoutPayload,
  ShopCatalogResponse,
  ShopPaymentMethod,
  ShopProductResponse,
  ShopSpecies,
} from "../types/shop";
import { getSessionToken } from "./session";

const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

export type Lang = "ar" | "en";

export class ShopApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status = 0, data: any = null) {
    super(message);
    this.name = "ShopApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * POST to the mobile API. The token is sent when the user is signed in
 * (optional for the public catalog).
 */
async function request<T>(endpoint: string, lang: Lang, body: Record<string, unknown> = {}): Promise<T> {
  const token = await getSessionToken();

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...body, lang, ...(token ? { access_token: token } : {}) }),
    });
  } catch {
    throw new ShopApiError(
      lang === "ar" ? "حدث خطأ في الاتصال بالخادم." : "Unable to connect to the server.",
      0
    );
  }

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    throw new ShopApiError(lang === "ar" ? "استجابة غير صالحة من الخادم." : "Invalid response from server.", response.status);
  }

  if (!response.ok || data?.success === false) {
    const firstError = data?.errors ? (Object.values(data.errors).flat()[0] as string | undefined) : undefined;

    throw new ShopApiError(
      data?.message || firstError || (response.status === 429
        ? (lang === "ar" ? "محاولات كثيرة جداً. حاول لاحقاً." : "Too many attempts. Please try again later.")
        : "Request failed"),
      response.status,
      data
    );
  }

  return data as T;
}

/*
| CATALOG (public)
*/

export function fetchShopProducts(lang: Lang, species?: ShopSpecies | null) {
  return request<ShopCatalogResponse>("/shop/products", lang, species ? { species } : {});
}

export function fetchShopProduct(lang: Lang, productId: number) {
  return request<ShopProductResponse>(`/shop/products/${productId}`, lang);
}

/*
| CHECKOUT (signed in)
*/

export function shopCheckout(lang: Lang, payload: CheckoutPayload) {
  return request<{ success: boolean; message?: string; purchase: { id: number }; paid?: boolean; animal_created?: boolean; requires_login?: boolean }>(
    "/shop/checkout",
    lang,
    payload as unknown as Record<string, unknown>
  );
}

/**
 * Card payment of a pending purchase (KNET / Visa / Mastercard).
 * SIMULATION for now: the server accepts the payment (only the last 4 digits are sent).
 */
export function payShopPurchase(lang: Lang, purchaseId: number, paymentMethod: ShopPaymentMethod, cardLast4?: string | null) {
  return request<{ success: boolean; message?: string; already_paid?: boolean; purchase: { id: number } }>(
    `/purchases/${purchaseId}/pay`,
    lang,
    { payment_method: paymentMethod, card_last4: cardLast4 || null }
  );
}

/*
| WHATSAPP SIGN IN / SIGN UP
*/

export function sendAuthCode(lang: Lang, phone: string) {
  return request<AuthSendResponse>("/auth/send-code", lang, { phone });
}

export function verifyAuthCode(lang: Lang, phone: string, code: string, fullName?: string | null) {
  return request<AuthVerifyResponse>("/auth/verify", lang, {
    phone,
    code,
    full_name: fullName || null,
  });
}

/*
| PROVINCES & ZONES (public)
*/

export type Zone = { id: number; province_id: number; name: string; name_ar?: string | null };
export type Province = { id: number; name: string; name_ar?: string | null; zones: Zone[] };

export async function fetchProvinces(lang: Lang = "en"): Promise<Province[]> {
  const response = await fetch(`${API_BASE_URL}/provinces-zones?lang=${lang}`, { headers: { Accept: "application/json" } });
  const data = await response.json();
  return Array.isArray(data?.provinces) ? data.provinces : [];
}

/*
| SAVED ADDRESSES (signed in)
*/

export type SavedAddress = {
  id: number;
  label?: string | null;
  address: string;
  is_default: boolean | number;
  province_label?: string | null;
  zone_label?: string | null;
  delivery_slot?: string | null;
};

export async function fetchSavedAddresses(lang: Lang): Promise<SavedAddress[]> {
  const data = await request<{ addresses?: SavedAddress[] }>("/settings/addresses", lang);
  return Array.isArray(data?.addresses) ? data.addresses : [];
}