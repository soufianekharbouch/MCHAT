/*
|--------------------------------------------------------------------------
| SERVER OF THE APP (the ONLY place where the address is written)
|--------------------------------------------------------------------------
|
| npm start          -> .env.development -> test server
| gradlew release    -> .env.production  -> https://mchatops.com
|
*/

export const TEST_API_ORIGIN = "https://animal-care2.kharbouch-soufiane.com";
export const PRODUCTION_API_ORIGIN = "https://mchatops.com";

/** https://<server> (without / at the end) */
export const API_ORIGIN = String(process.env.EXPO_PUBLIC_API_URL || TEST_API_ORIGIN).replace(/\/+$/, "");

/** https://<server>/api */
export const API_URL = `${API_ORIGIN}/api`;

/** https://<server>/api/mobile (all the routes of the app) */
export const API_MOBILE_URL = `${API_URL}/mobile`;

/** true when the app talks to the production server */
export const IS_PRODUCTION_SERVER = API_ORIGIN === PRODUCTION_API_ORIGIN;