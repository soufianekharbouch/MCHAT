import { getSessionToken } from "./session";

import { API_MOBILE_URL } from "./apiConfig";

const API_BASE_URL = API_MOBILE_URL;

export type Lang = "ar" | "en";

export type TrackingStepKey = "scheduled" | "prepared" | "on_the_way" | "delivered";

export type TrackingStep = {
  key: TrackingStepKey;
  label: string;
  done: boolean;
  current: boolean;
  at: string | null;
};

export type TrackedDelivery = {
  number: string;
  date: string;
  is_today: boolean;
  delivery_slot: string | null;
  step: TrackingStepKey;
  step_label: string;
  steps: TrackingStep[];
  pets: {
    order_id: number;
    pet_id: number;
    name: string | null;
    species: string | null;
    recipes: { name: string | null; quantity: number }[];
  }[];
  recipes_count: number;
};

export type TrackingResponse = {
  success: boolean;
  upcoming: TrackedDelivery[];
  recent: TrackedDelivery[];
  current: TrackedDelivery | null;
};

export class TrackingApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "TrackingApiError";
    this.status = status;
  }
}

async function request<T>(endpoint: string, lang: Lang, body: Record<string, unknown> = {}): Promise<T> {
  const token = await getSessionToken();

  if (!token) {
    throw new TrackingApiError(lang === "ar" ? "يرجى تسجيل الدخول." : "Please sign in.", 401);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...body, lang, access_token: token }),
    });
  } catch {
    throw new TrackingApiError(lang === "ar" ? "حدث خطأ في الاتصال بالخادم." : "Unable to connect to the server.");
  }

  const data: any = await response.json().catch(() => null);

  if (!response.ok || !data || data.success === false) {
    throw new TrackingApiError(data?.message || "Request failed", response.status);
  }

  return data as T;
}

/** Upcoming + recent deliveries of the customer, with their status. */
export function fetchOrderTracking(lang: Lang, daysBack = 14, daysAhead = 60): Promise<TrackingResponse> {
  return request<TrackingResponse>("/orders/tracking", lang, { days_back: daysBack, days_ahead: daysAhead });
}

/** One delivery by its number (DL-261021-1234). */
export async function fetchDeliveryTracking(lang: Lang, number: string): Promise<TrackedDelivery> {
  const data = await request<{ success: boolean; delivery: TrackedDelivery }>(
    `/orders/tracking/${encodeURIComponent(number)}`,
    lang
  );

  return data.delivery;
}