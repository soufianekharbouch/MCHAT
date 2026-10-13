import * as SecureStore from "expo-secure-store";

import type {
  DeliveryWithPurchase,
  PaymentMethod,
  ProductsResponse,
  PurchaseDetail,
  PurchaseStatus,
  PurchaseSummary,
  SchedulePayload,
} from "../types/purchase";

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

export type Lang = "ar" | "en";

/**
 * Error with the Laravel validation details (errors) and HTTP status.
 */
export class PurchaseApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status = 0, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "PurchaseApiError";
    this.status = status;
    this.errors = errors;
  }
}

/*
|--------------------------------------------------------------------------
| REQUEST HELPERS
|--------------------------------------------------------------------------
*/

async function getToken(): Promise<string> {
  const token = await SecureStore.getItemAsync("access_token");

  if (!token) {
    throw new PurchaseApiError("Unauthenticated", 401);
  }

  return token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  let data: any = null;

  try {
    data = await response.json();
  } catch {
    throw new PurchaseApiError("Invalid server response", response.status);
  }

  if (!response.ok || data?.success === false) {
    const firstError = data?.errors
      ? (Object.values(data.errors).flat()[0] as string | undefined)
      : undefined;

    throw new PurchaseApiError(
      data?.message || firstError || "Request failed",
      response.status,
      data?.errors || {}
    );
  }

  return data as T;
}

async function post<T>(endpoint: string, lang: Lang, body: Record<string, unknown> = {}): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...body, lang, access_token: token }),
  });

  return parseResponse<T>(response);
}

/*
|--------------------------------------------------------------------------
| CATALOG
|--------------------------------------------------------------------------
*/

export function fetchProducts(lang: Lang, animalId?: number | null) {
  return post<ProductsResponse>("/products", lang, animalId ? { animal_id: animalId } : {});
}

/*
|--------------------------------------------------------------------------
| PURCHASES
|--------------------------------------------------------------------------
*/

export async function fetchPurchases(
  lang: Lang,
  filters: { animalId?: number | null; status?: PurchaseStatus } = {}
): Promise<PurchaseSummary[]> {
  const data = await post<{ purchases: PurchaseSummary[] }>("/purchases", lang, {
    ...(filters.animalId ? { animal_id: filters.animalId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  });

  return Array.isArray(data.purchases) ? data.purchases : [];
}

export async function fetchPurchase(id: number, lang: Lang): Promise<PurchaseDetail> {
  const data = await post<{ purchase: PurchaseDetail }>(`/purchases/${id}`, lang);
  return data.purchase;
}

export async function createPurchase(
  lang: Lang,
  payload: {
    product_id: number;
    animal_id: number;
    payment_method: PaymentMethod;
    customer_note?: string | null;
  }
): Promise<{ purchase: PurchaseDetail; message?: string; already_pending?: boolean }> {
  return post("/purchases/create", lang, payload);
}

export async function cancelPurchase(id: number, lang: Lang, reason?: string): Promise<PurchaseDetail> {
  const data = await post<{ purchase: PurchaseDetail }>(`/purchases/${id}/cancel`, lang, {
    reason: reason || null,
  });
  return data.purchase;
}

/**
 * Bank transfer receipt (image picked with expo-image-picker).
 */
export async function uploadPaymentProof(
  id: number,
  lang: Lang,
  file: { uri: string; name?: string; mimeType?: string | null },
  paymentReference?: string
): Promise<{ purchase: PurchaseDetail; message?: string }> {
  const token = await getToken();

  const extension = (file.uri.split(".").pop() || "jpg").toLowerCase();
  const mimeType = file.mimeType || (extension === "png" ? "image/png" : extension === "pdf" ? "application/pdf" : "image/jpeg");

  const form = new FormData();

  form.append("proof", {
    uri: file.uri,
    name: file.name || `receipt.${extension}`,
    type: mimeType,
  } as any);

  form.append("lang", lang);
  form.append("access_token", token);

  if (paymentReference) {
    form.append("payment_reference", paymentReference);
  }

  // No Content-Type: fetch adds the multipart boundary itself
  const response = await fetch(`${API_BASE_URL}/purchases/${id}/payment-proof`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  return parseResponse(response);
}

/*
|--------------------------------------------------------------------------
| DELIVERIES
|--------------------------------------------------------------------------
*/

export async function schedulePurchase(
  id: number,
  lang: Lang,
  payload: SchedulePayload
): Promise<{ purchase: PurchaseDetail; message?: string }> {
  return post(`/purchases/${id}/schedule`, lang, payload as unknown as Record<string, unknown>);
}

export async function skipDelivery(
  purchaseId: number,
  deliveryId: number,
  lang: Lang
): Promise<{ purchase: PurchaseDetail; message?: string }> {
  return post(`/purchases/${purchaseId}/deliveries/${deliveryId}/cancel`, lang);
}

/**
 * All deliveries of the customer (optionally for one pet), with their purchase.
 * Used by the calendar and the history screens.
 */
export async function fetchAllDeliveries(
  lang: Lang,
  animalId?: number | null
): Promise<{ purchases: PurchaseDetail[]; deliveries: DeliveryWithPurchase[] }> {
  const summaries = await fetchPurchases(lang, { animalId });

  const withDeliveries = summaries.filter(purchase =>
    ["paid", "active", "completed", "expired"].includes(purchase.status)
  );

  const purchases = await Promise.all(withDeliveries.map(purchase => fetchPurchase(purchase.id, lang)));

  const deliveries = purchases
    .flatMap(purchase => purchase.deliveries.map(delivery => ({ purchase, delivery })))
    .sort((a, b) => a.delivery.date.localeCompare(b.delivery.date));

  return { purchases, deliveries };
}