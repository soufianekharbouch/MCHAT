import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/*
|--------------------------------------------------------------------------
| STORAGE (token, locale...)
|--------------------------------------------------------------------------
|
| expo-secure-store only exists on Android / iOS.
| In the browser (Expo web) its functions do not exist
| ("setValueWithKeyAsync is not a function"): localStorage is used instead.
| If the native module is missing (old build), a memory copy keeps
| the app working until it is closed.
|
*/

const memory = new Map<string, string>();
const isWeb = Platform.OS === "web";

function webStorage(): Storage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export async function getStoredItem(key: string): Promise<string | null> {
  if (isWeb) {
    return webStorage()?.getItem(key) ?? memory.get(key) ?? null;
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn("SecureStore read error:", error);
    return memory.get(key) ?? null;
  }
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  memory.set(key, value);

  if (isWeb) {
    webStorage()?.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn("SecureStore write error:", error);
  }
}

export async function deleteStoredItem(key: string): Promise<void> {
  memory.delete(key);

  if (isWeb) {
    webStorage()?.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn("SecureStore delete error:", error);
  }
}
