import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import Constants from "expo-constants";

import { Platform } from "react-native";

const API_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

/*
|--------------------------------------------------------------------------
| Notification handler
|--------------------------------------------------------------------------
|
| Permet d'afficher la notification même lorsque l'application
| est ouverte au premier plan.
|
*/

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,

    shouldShowList: true,

    shouldPlaySound: true,

    shouldSetBadge: true,
  }),
});

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export type RegisterDeviceResult = {
  success: boolean;

  deviceId: string;

  expoPushToken?: string | null;

  permissionGranted: boolean;
};

type DeviceRegisterResponse = {
  success: boolean;

  message?: string;

  device?: {
    id?: number;

    device_id?: string;

    customer_account_id?: number | null;
  };
};

/*
|--------------------------------------------------------------------------
| Generate random device ID
|--------------------------------------------------------------------------
*/

function generateDeviceId() {
  return (
    "mchat_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substring(2, 12)
  );
}

/*
|--------------------------------------------------------------------------
| Get or create permanent device ID
|--------------------------------------------------------------------------
*/

export async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync("device_id");

  if (deviceId) {
    return deviceId;
  }

  deviceId = generateDeviceId();

  await SecureStore.setItemAsync("device_id", deviceId);

  return deviceId;
}

/*
|--------------------------------------------------------------------------
| Get locale
|--------------------------------------------------------------------------
*/

async function getDeviceLocale() {
  const storedLocale = await SecureStore.getItemAsync("locale");

  if (storedLocale === "ar" || storedLocale === "en") {
    return storedLocale;
  }

  return "en";
}

/*
|--------------------------------------------------------------------------
| Get push permission
|--------------------------------------------------------------------------
*/

export async function requestPushPermission() {
  /*
   * Les push notifications nécessitent
   * un vrai device.
   */

  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");

    return false;
  }

  const currentPermissions = await Notifications.getPermissionsAsync();

  let finalStatus = currentPermissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();

    finalStatus = requestedPermissions.status;
  }

  return finalStatus === "granted";
}

/*
|--------------------------------------------------------------------------
| Android notification channel
|--------------------------------------------------------------------------
*/

async function configureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "Maison Chat Notifications",

    importance: Notifications.AndroidImportance.MAX,

    vibrationPattern: [0, 250, 250, 250],

    lightColor: "#249B97",

    sound: "default",

    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,

    bypassDnd: false,

    enableVibrate: true,

    showBadge: true,
  });
}
export async function detachCustomerFromDevice(): Promise<void> {
  try {
    const deviceId = await SecureStore.getItemAsync("device_id");

    if (!deviceId) {
      return;
    }

    const response = await fetch(`${API_URL}/device/detach-customer`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id: deviceId,
      }),
    });

    const raw = await response.text();

    console.log("DEVICE DETACH STATUS:", response.status);

    console.log("DEVICE DETACH RESPONSE:", raw);
  } catch (error) {
    console.error("Device detach error:", error);
  }
}

/*
|--------------------------------------------------------------------------
| Get Expo Push Token
|--------------------------------------------------------------------------
*/

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Expo push token unavailable on simulator.");

    return null;
  }

  try {
    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error("Expo projectId not found.");

      return null;
    }

    const result = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return result.data;
  } catch (error) {
    console.error("Unable to get Expo push token:", error);

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Get device name
|--------------------------------------------------------------------------
*/

function getDeviceName() {
  const manufacturer = Device.manufacturer || "Unknown";

  const model = Device.modelName || "Device";

  return `${manufacturer} ${model}`;
}

/*
|--------------------------------------------------------------------------
| Register device in Laravel
|--------------------------------------------------------------------------
|
| Cette fonction fonctionne AVEC ou SANS customer connecté.
|
*/

export async function registerDevice(): Promise<RegisterDeviceResult> {
  const deviceId = await getOrCreateDeviceId();

  await configureAndroidChannel();

  const permissionGranted = await requestPushPermission();

  let expoPushToken: string | null = null;

  if (permissionGranted) {
    expoPushToken = await getExpoPushToken();
  }

  const accessToken = await SecureStore.getItemAsync("access_token");

  const locale = await getDeviceLocale();

  const payload = {
    device_id: deviceId,

    expo_push_token: expoPushToken,

    platform: Platform.OS,

    locale,

    device_name: getDeviceName(),

    access_token: accessToken || null,
  };

  try {
    console.log("DEVICE REGISTER REQUEST:", payload);

    const response = await fetch(`${API_URL}/device/register`, {
      method: "POST",

      headers: {
        Accept: "application/json",

        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    /*
     * Important :
     * lire d'abord la réponse brute
     * pour pouvoir voir les erreurs Laravel,
     * Imunify360, HTML 500, etc.
     */
    const rawResponse = await response.text();

    console.log("DEVICE REGISTER STATUS:", response.status);

    console.log("DEVICE REGISTER RESPONSE:", rawResponse);

    let data: DeviceRegisterResponse | null = null;

    try {
      data = rawResponse ? JSON.parse(rawResponse) : null;
    } catch (parseError) {
      console.error("DEVICE REGISTER JSON PARSE ERROR:", parseError);
    }

    if (!response.ok) {
      throw new Error(
        data?.message || `Unable to register device. HTTP ${response.status}`,
      );
    }

    if (!data || data.success !== true) {
      throw new Error(data?.message || "Unable to register device.");
    }

    console.log("DEVICE REGISTER SUCCESS:", data);

    return {
      success: true,

      deviceId,

      expoPushToken,

      permissionGranted,
    };
  } catch (error) {
    console.error("Device registration error:", error);

    return {
      success: false,

      deviceId,

      expoPushToken,

      permissionGranted,
    };
  }
}

/*
|--------------------------------------------------------------------------
| Associate device after login
|--------------------------------------------------------------------------
|
| Après login réussi, access_token existe maintenant dans SecureStore.
| On rappelle simplement registerDevice().
|
| Laravel retrouvera le device_id existant et lui associera
| customer_account_id.
|
*/

export async function associateDeviceWithCustomer() {
  return await registerDevice();
}

/*
|--------------------------------------------------------------------------
| Update device locale
|--------------------------------------------------------------------------
|
| À appeler après changement AR / EN.
|
*/

export async function updateNotificationLocale() {
  return await registerDevice();
}

/*
|--------------------------------------------------------------------------
| Disable device
|--------------------------------------------------------------------------
|
| À utiliser uniquement si l'utilisateur désactive explicitement
| les notifications depuis ton application.
|
| NE PAS appeler automatiquement au logout.
|
*/

export async function unregisterDevice() {
  const deviceId = await SecureStore.getItemAsync("device_id");

  if (!deviceId) {
    return;
  }

  const accessToken = await SecureStore.getItemAsync("access_token");

  try {
    await fetch(`${API_URL}/device/unregister`, {
      method: "POST",

      headers: {
        Accept: "application/json",

        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        device_id: deviceId,

        access_token: accessToken || null,
      }),
    });
  } catch (error) {
    console.error("Device unregister error:", error);
  }
}
