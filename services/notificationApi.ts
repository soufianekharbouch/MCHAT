import * as SecureStore from "expo-secure-store";

const API_URL =
  "https://animal-care2.kharbouch-soufiane.com/api/mobile";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export type MobileNotification = {
  id: number;

  title?: string | null;
  body?: string | null;

  title_en?: string | null;
  title_ar?: string | null;

  body_en?: string | null;
  body_ar?: string | null;

  created_at?: string | null;
  sent_at?: string | null;

  viewed_at?: string | null;
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

  constructor(
    message: string,
    status: number
  ) {
    super(message);

    this.name =
      "NotificationApiError";

    this.status =
      status;
  }
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

async function getAccessToken():
  Promise<string | null> {

  return await SecureStore.getItemAsync(
    "access_token"
  );
}

async function getDeviceId():
  Promise<string | null> {

  return await SecureStore.getItemAsync(
    "device_id"
  );
}

async function getAuthPayload() {

  const [
    accessToken,
    deviceId,
  ] = await Promise.all([
    getAccessToken(),
    getDeviceId(),
  ]);

  return {
    access_token:
      accessToken || null,

    device_id:
      deviceId || null,
  };
}

async function parseResponse<T>(
  response: Response
): Promise<T> {

  const raw =
    await response.text();

  if (!raw) {

    throw new NotificationApiError(
      "Empty response from server",
      response.status
    );
  }

  try {

    return JSON.parse(
      raw
    ) as T;

  } catch {

    console.error(
      "Invalid notification API response:",
      raw
    );

    throw new NotificationApiError(
      "Invalid response from server",
      response.status
    );
  }
}

/*
|--------------------------------------------------------------------------
| GET NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export async function getNotifications():
  Promise<MobileNotification[]> {

  const auth =
    await getAuthPayload();

  const response =
    await fetch(
      `${API_URL}/notifications`,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            auth
          ),
      }
    );

  const data =
    await parseResponse<
      NotificationsResponse
    >(response);

  if (
    !response.ok
    ||
    data.success !== true
  ) {

    throw new NotificationApiError(
      data.message ||
        "Unable to load notifications",
      response.status
    );
  }

  return Array.isArray(
    data.notifications
  )
    ? data.notifications
    : [];
}

/*
|--------------------------------------------------------------------------
| MARK VIEWED
|--------------------------------------------------------------------------
*/

export async function markNotificationViewed(
  notificationId: number
): Promise<MarkViewedResponse> {

  if (
    !Number.isFinite(
      notificationId
    )
    ||
    notificationId <= 0
  ) {

    throw new NotificationApiError(
      "Invalid notification ID",
      0
    );
  }

  const auth =
    await getAuthPayload();

  const response =
    await fetch(
      `${API_URL}/notifications/${notificationId}/view`,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            auth
          ),
      }
    );

  const data =
    await parseResponse<
      MarkViewedResponse
    >(response);

  if (
    !response.ok
    ||
    data.success !== true
  ) {

    throw new NotificationApiError(
      data.message ||
        "Unable to mark notification as viewed",
      response.status
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| MARK VIEWED SAFELY
|--------------------------------------------------------------------------
*/

export async function markNotificationViewedSafe(
  notificationId: number
): Promise<boolean> {

  try {

    await markNotificationViewed(
      notificationId
    );

    return true;

  } catch (error) {

    console.warn(
      "Unable to track notification view:",
      error
    );

    return false;
  }
}

/*
|--------------------------------------------------------------------------
| DISMISS NOTIFICATION
|--------------------------------------------------------------------------
*/

export async function dismissNotification(
  notificationId: number
): Promise<DismissNotificationResponse> {

  if (
    !Number.isFinite(notificationId)
    ||
    notificationId <= 0
  ) {
    throw new NotificationApiError(
      "Invalid notification ID",
      0
    );
  }

  const auth =
    await getAuthPayload();

  console.log(
    "DISMISS REQUEST:",
    {
      notificationId,
      auth,
    }
  );

  const response =
    await fetch(
      `${API_URL}/notifications/${notificationId}/dismiss`,
      {
        method: "POST",

        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },

        body:
          JSON.stringify(auth),
      }
    );

  const data =
    await parseResponse<any>(
      response
    );

  console.log(
    "DISMISS RESPONSE:",
    data
  );

  if (
    !response.ok
    ||
    data.success !== true
  ) {

    throw new NotificationApiError(
      data.message ||
        "Unable to dismiss notification",
      response.status
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| DISMISS SAFELY
|--------------------------------------------------------------------------
*/

export async function dismissNotificationSafe(
  notificationId: number
): Promise<boolean> {

  try {

    await dismissNotification(
      notificationId
    );

    return true;

  } catch (error) {

    console.warn(
      "Unable to dismiss notification:",
      error
    );

    return false;
  }
}

/*
|--------------------------------------------------------------------------
| UNREAD COUNT
|--------------------------------------------------------------------------
*/

export async function getUnreadNotificationCount():
  Promise<number> {

  const auth =
    await getAuthPayload();

  const response =
    await fetch(
      `${API_URL}/notifications/unread-count`,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            auth
          ),
      }
    );

  const data =
    await parseResponse<
      UnreadCountResponse
    >(response);

  if (
    !response.ok
    ||
    data.success !== true
  ) {

    throw new NotificationApiError(
      data.message ||
        "Unable to load unread notifications",
      response.status
    );
  }

  return Number(
    data.unread_count || 0
  );
}