import { getSessionToken } from "./session";

/*
|--------------------------------------------------------------------------
| LOYALTY POINTS (per pet)
|--------------------------------------------------------------------------
|
| POST /api/mobile/loyalty -> points, level, points usable now, history
|
*/

const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

export type LoyaltyLevel = {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  description?: string | null;
  min_points: number;
  color: string;
  /** Font Awesome name (fa-crown...) */
  icon: string;
};

export type LoyaltyHistoryRow = {
  id: number;
  type: "trial" | "regular" | "premium" | "redeem" | "trial_lost" | "expired" | "adjust" | string;
  label: string;
  points: number;
  balance_after: number;
  date: string | null;
};

export type PetLoyalty = {
  pet: { id: number; name: string; species: string };
  balance: number;
  lifetime_earned: number;
  usable_points: number;
  usable_discount: number;
  missing_points: number;
  expires_on: string | null;
  days_left: number | null;
  trial_status: "none" | "pending" | "confirmed" | "lost";
  trial_deadline: string | null;
  next_points: { regular: number; premium: number };
  level: LoyaltyLevel | null;
  next_level: (LoyaltyLevel & { points_needed: number }) | null;
  history: LoyaltyHistoryRow[];
};

export type LoyaltyResponse = {
  success: boolean;
  program: {
    enabled: boolean;
    point_value: number;
    currency: string;
    min_points_to_use: number;
    max_points_per_pack: number;
    trial_bonus_days: number;
    grace_days: number;
  };
  levels: LoyaltyLevel[];
  rules?: { kind: "trial" | "regular" | "premium"; from: number; to: number | null; points: number }[];
  total_points: number;
  pets: PetLoyalty[];
};

/*
 * Several screens show the points (Home, My Pets, pet, Account): one call
 * shared by all of them, kept 60 seconds (less load on the server).
 * force = true: always a new call (pull to refresh, "My points" page).
 */
const CACHE_MS = 60 * 1000;
let cache: { key: string; at: number; data: LoyaltyResponse | null } | null = null;
let pending: { key: string; promise: Promise<LoyaltyResponse | null> } | null = null;

export function clearLoyaltyCache() {
  cache = null;
  pending = null;
}

export async function fetchLoyalty(lang: "ar" | "en", force = false): Promise<LoyaltyResponse | null> {
  const token = await getSessionToken();

  if (!token) {
    clearLoyaltyCache();
    return null;
  }

  const key = `${lang}-${token.slice(-12)}`;

  if (!force && cache && cache.key === key && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  // Same call already running: wait for it
  if (pending && pending.key === key) {
    return pending.promise;
  }

  const promise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/loyalty`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ access_token: token, lang }),
      });

      const data = await response.json().catch(() => null);

      // Program not installed / server busy: no points shown (kept briefly)
      const result = response.ok && data?.success ? (data as LoyaltyResponse) : null;
      cache = { key, at: Date.now(), data: result };

      return result;
    } finally {
      pending = null;
    }
  })();

  pending = { key, promise };

  return promise;
}

/** Icon of a level for the app (MaterialCommunityIcons) from its Font Awesome name. */
export function levelIcon(icon?: string | null): string {
  const name = String(icon || "").replace(/^fa-/, "");

  const map: Record<string, string> = {
    paw: "paw",
    medal: "medal",
    award: "trophy-award",
    crown: "crown",
    gem: "diamond-stone",
    star: "star",
    trophy: "trophy",
    heart: "heart",
    gift: "gift",
    fire: "fire",
    bolt: "lightning-bolt",
    rocket: "rocket-launch",
  };

  return map[name] ?? "star-circle";
}