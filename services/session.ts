import { useEffect, useState } from "react";
import { deleteStoredItem, getStoredItem, setStoredItem } from "./storage";

/*
|--------------------------------------------------------------------------
| SESSION (signed in customer / visitor)
|--------------------------------------------------------------------------
|
| WhatsApp sign in: the token has no expiry, it stays until "Logout".
| Every screen can know if the user is signed in with useSession(),
| and is notified when he signs in or out.
|
*/

type Listener = (signedIn: boolean) => void;

let signedInState: boolean | null = null; // null = not loaded yet
const listeners = new Set<Listener>();

function emit(value: boolean) {
  // Only real changes are announced (avoids reload loops)
  if (signedInState === value) return;

  signedInState = value;
  listeners.forEach(listener => listener(value));
}

/** Reads the token saved on the phone (once at start). */
export async function loadSession(): Promise<boolean> {
  try {
    const token = await getStoredItem("access_token");
    const expiresAt = await getStoredItem("access_token_expires_at");

    // Old password sessions (2h): expired -> visitor
    if (token && expiresAt) {
      const time = new Date(expiresAt).getTime();

      if (!Number.isNaN(time) && time <= Date.now()) {
        await clearSession();
        return false;
      }
    }

    emit(!!token);
    return !!token;
  } catch {
    emit(false);
    return false;
  }
}

export async function getSessionToken(): Promise<string | null> {
  try {
    return await getStoredItem("access_token");
  } catch {
    return null;
  }
}

/**
 * Saves the session returned by /auth/verify.
 * expires_at = far-future date (10 years) so the other screens and
 * services that still check this date accept the session.
 */
export async function saveSession(data: { access_token: string; expires_at?: string | null; locale?: string | null }) {
  await setStoredItem("access_token", data.access_token);

  if (data.expires_at) {
    await setStoredItem("access_token_expires_at", data.expires_at);
  } else {
    await deleteStoredItem("access_token_expires_at");
  }

  await setStoredItem("must_change_password", "0");

  if (data.locale === "ar" || data.locale === "en") {
    await setStoredItem("locale", data.locale);
  }

  emit(true);
}

/** Logout: the app goes back to visitor mode. */
export async function clearSession() {
  try {
    await deleteStoredItem("access_token");
    await deleteStoredItem("access_token_expires_at");
    await deleteStoredItem("must_change_password");
  } finally {
    emit(false);
  }
}

/**
 * "Logout" button: closes the session on the server (best effort)
 * then on the phone. The app goes back to the shop as a visitor.
 */
export async function logoutCustomer() {
  const token = await getSessionToken();

  if (token) {
    try {
      await fetch("https://animal-care2.kharbouch-soufiane.com/api/mobile/logout", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ access_token: token }),
      });
    } catch {
      // offline: the local session is removed anyway
    }
  }

  await clearSession();
}

export function isSignedInNow(): boolean {
  return signedInState === true;
}

/**
 * const { signedIn, ready } = useSession();
 */
export function useSession() {
  const [signedIn, setSignedIn] = useState<boolean>(signedInState === true);
  const [ready, setReady] = useState<boolean>(signedInState !== null);

  useEffect(() => {
    const listener: Listener = value => {
      setSignedIn(value);
      setReady(true);
    };

    listeners.add(listener);

    if (signedInState === null) {
      void loadSession();
    } else {
      listener(signedInState);
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { signedIn, ready };
}

export function onSessionChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
