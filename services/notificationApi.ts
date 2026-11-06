import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

/*
|--------------------------------------------------------------------------
| NOTIFICATIONS API
|--------------------------------------------------------------------------
|
| List, unread badge, viewed, opened (tap), removed.
|
| Each notification says WHERE the app goes when the customer taps it
| (destination + params, chosen in the back-office "Notifications"):
|   openNotificationDestination() opens the right screen.
|
| The token / device id are read with getStoredItem(): works on the phone AND
| in the browser (Expo web), where expo-secure-store does not exist.
|
*/
import { API_MOBILE_URL } from "./apiConfig";
const API_URL = API_MOBILE_URL;

/*
 * Storage of the token / device id. expo-secure-store does not exist in
 * the browser (Expo web): localStorage is used there.
 */
const IS_WEB_STORAGE = Platform.OS === "web";

async function getStoredItem(key: string): Promise<string | null> {
  try {
    if (IS_WEB_STORAGE) {
      return typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem(key) : null;
    }

    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

/** Screens of the app (same keys as Laravel NotificationDestinations) */
export type NotificationDestination =
  | "notifications"
  | "home"
  | "shop"
  | "product"
  | "pets"
  | "pet"
  | "pet_plans"
  | "plan_deliveries"
  | "deliveries"
  | "delivery"
  | "loyalty"
  | "support"
  | string;

export type NotificationParams = {
  product_id?: number | string;
  animal_id?: number | string;
  purchase_id?: number | string;
  planned_order_id?: number | string;
  date?: string;
  [key: string]: unknown;
};

export type MobileNotification = {
  id: number;

  title?: string | null;
  body?: string | null;

  title_en?: string | null;
  title_ar?: string | null;

  body_en?: string | null;
  body_ar?: string | null;

  /** general / delivery / loyalty / nutrition / promotion / support_ticket */
  type?: string | null;

  destination?: NotificationDestination | null;
  params?: NotificationParams | null;

  created_at?: string | null;
  sent_at?: string | null;

  viewed_at?: string | null;
  opened_at?: string | null;
  dismissed_at?: string | null;
};

export type NotificationsResponse = {
  success: boolean;
  message?: string;
  notifications?: MobileNotification[];
};

export type MarkViewedResponse = {
  success: boolean;
  message?: string;
  viewed_at?: string | null;
};

export type OpenNotificationResponse = {
  success: boolean;
  message?: string;
  opened_at?: string | null;
  destination?: NotificationDestination | null;
  params?: NotificationParams | null;
};

export type DismissNotificationResponse = {
  success: boolean;
  message?: string;
  dismissed_at?: string | null;
};

export type UnreadCountResponse = {
  success: boolean;
  message?: string;
  unread_count?: number;
};

/*
|--------------------------------------------------------------------------
| API ERROR
|--------------------------------------------------------------------------
*/

export class NotificationApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NotificationApiError";
    this.status = status;
  }
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

async function getAuthPayload() {
  const [accessToken, deviceId] = await Promise.all([
    getStoredItem("access_token").catch(() => null),
    getStoredItem("device_id").catch(() => null),
  ]);

  return {
    access_token: accessToken || null,
    device_id: deviceId || null,
  };
}

/** Signed in customer (token saved on the phone / browser) */
export async function hasNotificationSession(): Promise<boolean> {
  const token = await getStoredItem("access_token").catch(() => null);

  return !!token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw) {
    throw new NotificationApiError("Empty response from server", response.status);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error("Invalid notification API response:", raw.slice(0, 300));

    throw new NotificationApiError("Invalid response from server", response.status);
  }
}

async function post<T extends { success: boolean; message?: string }>(path: string, fallbackError: string): Promise<T> {
  const auth = await getAuthPayload();

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(auth),
  });

  const data = await parseResponse<T>(response);

  if (!response.ok || data.success !== true) {
    throw new NotificationApiError(data.message || fallbackError, response.status);
  }

  return data;
}

function validId(notificationId: number) {
  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    throw new NotificationApiError("Invalid notification ID", 0);
  }
}

/*
|--------------------------------------------------------------------------
| GET NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export async function getNotifications(): Promise<MobileNotification[]> {
  const data = await post<NotificationsResponse>("/notifications", "Unable to load notifications");

  return Array.isArray(data.notifications) ? data.notifications : [];
}

/*
|--------------------------------------------------------------------------
| MARK VIEWED (seen in the list)
|--------------------------------------------------------------------------
*/

export async function markNotificationViewed(notificationId: number): Promise<MarkViewedResponse> {
  validId(notificationId);

  return post<MarkViewedResponse>(`/notifications/${notificationId}/view`, "Unable to mark notification as viewed");
}

export async function markNotificationSeenSafe(notificationId: number): Promise<boolean> {
  try {
    await markNotificationViewed(notificationId);
    return true;
  } catch (error) {
    console.warn("Unable to track notification view:", error);
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| MARK OPENED (tap: the app opens its destination)
|--------------------------------------------------------------------------
|
| Also marks it viewed. Answers the destination of the notification.
|
*/

export async function markNotificationOpened(notificationId: number): Promise<OpenNotificationResponse> {
  validId(notificationId);

  return post<OpenNotificationResponse>(`/notifications/${notificationId}/open`, "Unable to mark notification as opened");
}

export async function markNotificationOpenedSafe(notificationId: number): Promise<OpenNotificationResponse | null> {
  try {
    return await markNotificationOpened(notificationId);
  } catch (error) {
    console.warn("Unable to track notification opening:", error);

    // Server without the "open" route yet: at least counted as viewed
    await markNotificationSeenSafe(notificationId);

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| PUSH TAPPED (called by app/_layout.tsx)
|--------------------------------------------------------------------------
|
| app/_layout.tsx calls markNotificationViewedSafe(id) when the customer
| taps a push (app open, in background, or started by the push).
|
| Now: counted as OPENED, then the app goes to the destination of the
| notification. The navigation is done by the header (MchatHeader) once
| the app is ready, so it is never cancelled by the start of the app.
|
*/

export type PendingNotificationOpen = {
  id: number;
  destination: NotificationDestination;
  params: NotificationParams;
};

let pendingOpen: PendingNotificationOpen | null = null;
const pendingListeners = new Set<() => void>();
const handledPushIds = new Set<number>();

/** Header: called when a push was tapped (navigate after the app start). */
export function onPendingNotificationOpen(listener: () => void): () => void {
  pendingListeners.add(listener);

  return () => {
    pendingListeners.delete(listener);
  };
}

/** Taken once (the first header that asks navigates). */
export function takePendingNotificationOpen(): PendingNotificationOpen | null {
  const value = pendingOpen;
  pendingOpen = null;

  return value;
}

export async function markNotificationViewedSafe(notificationId: number, pushData?: Record<string, unknown> | null): Promise<boolean> {
  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    return false;
  }

  // The same push can be received twice (listener + start of the app)
  if (handledPushIds.has(notificationId)) {
    return true;
  }

  handledPushIds.add(notificationId);

  const opened = await markNotificationOpenedSafe(notificationId);

  const destination = String(opened?.destination || pushData?.destination || "notifications");
  const params = (opened?.params || (pushData?.params as NotificationParams | undefined) || {}) as NotificationParams;

  pendingOpen = { id: notificationId, destination, params };
  pendingListeners.forEach(listener => listener());

  return opened !== null;
}

/*
|--------------------------------------------------------------------------
| DESTINATION -> SCREEN
|--------------------------------------------------------------------------
|
| Same keys as Laravel (NotificationDestinations). Unknown key or missing
| value: the list of notifications.
|
*/

function idParam(value: unknown): string | null {
  const id = Number(value);

  return Number.isFinite(id) && id > 0 ? String(id) : null;
}

export function notificationRoute(destination?: NotificationDestination | null, params?: NotificationParams | null): any {
  const p = params || {};

  switch (destination) {
    case "home":
      return "/(tabs)";

    case "shop":
      return "/(tabs)/shop";

    case "product": {
      const id = idParam(p.product_id);
      return id ? { pathname: "/shop-product", params: { id } } : "/(tabs)/shop";
    }

    case "pets":
    case "pet":
      return "/(tabs)/pets";

    case "pet_plans": {
      const animalId = idParam(p.animal_id);
      return animalId ? { pathname: "/plans", params: { animalId } } : "/plans";
    }

    case "plan_deliveries": {
      const id = idParam(p.purchase_id);
      return id ? { pathname: "/distribute-package", params: { id } } : "/(tabs)/orders";
    }

    case "deliveries":
    case "delivery":
      return "/(tabs)/orders";

    case "loyalty":
      return "/(tabs)/loyalty";

    case "support":
      return "/(tabs)/support-tickets";

    default:
      return "/(tabs)/notifications";
  }
}

/** True when tapping the notification leaves the list of notifications. */
export function hasNotificationDestination(destination?: NotificationDestination | null): boolean {
  return !!destination && destination !== "notifications" && notificationRoute(destination) !== "/(tabs)/notifications";
}

export function openNotificationDestination(destination?: NotificationDestination | null, params?: NotificationParams | null) {
  try {
    router.push(notificationRoute(destination, params));
  } catch (error) {
    console.warn("Unable to open notification destination:", error);
  }
}

/** Text of the action shown under the notification in the list. */
export function notificationActionLabel(destination: NotificationDestination | null | undefined, isArabic: boolean): string | null {
  const labels: Record<string, [string, string]> = {
    home: ["Open the app", "افتح التطبيق"],
    shop: ["Visit the shop", "زيارة المتجر"],
    product: ["View the product", "عرض المنتج"],
    pets: ["My pets", "حيواناتي"],
    pet: ["View my pet", "عرض حيواني"],
    pet_plans: ["Choose a plan", "اختيار باقة"],
    plan_deliveries: ["Plan my deliveries", "تنظيم مواعيد التوصيل"],
    deliveries: ["My deliveries", "توصيلاتي"],
    delivery: ["Follow my delivery", "تتبع التوصيل"],
    loyalty: ["My loyalty points", "نقاط الولاء"],
    support: ["Help & support", "المساعدة والدعم"],
  };

  const label = destination ? labels[destination] : undefined;

  return label ? (isArabic ? label[1] : label[0]) : null;
}

/*
|--------------------------------------------------------------------------
| DISMISS NOTIFICATION
|--------------------------------------------------------------------------
*/

export async function dismissNotification(notificationId: number): Promise<DismissNotificationResponse> {
  validId(notificationId);

  return post<DismissNotificationResponse>(`/notifications/${notificationId}/dismiss`, "Unable to dismiss notification");
}

export async function dismissNotificationSafe(notificationId: number): Promise<boolean> {
  try {
    await dismissNotification(notificationId);
    return true;
  } catch (error) {
    console.warn("Unable to dismiss notification:", error);
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| UNREAD COUNT
|--------------------------------------------------------------------------
*/

export async function getUnreadNotificationCount(): Promise<number> {
  // Visitor: no notification
  if (!(await hasNotificationSession())) {
    return 0;
  }

  const data = await post<UnreadCountResponse>("/notifications/unread-count", "Unable to load unread notifications");

  return Number(data.unread_count || 0);
}