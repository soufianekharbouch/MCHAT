import * as SecureStore
  from "expo-secure-store";


const API_URL =
  "https://animal-care2.kharbouch-soufiane.com/api/mobile";


export type AppActivityResponse = {
  success: boolean;

  message?: string;

  added_seconds?: number;

  total_app_seconds?: number;

  last_app_activity_at?: string | null;
};


export class AppActivityApiError extends Error {

  status: number;


  constructor(
    message: string,
    status: number
  ) {

    super(
      message
    );

    this.name =
      "AppActivityApiError";

    this.status =
      status;
  }
}


/*
|--------------------------------------------------------------------------
| GET ACCESS TOKEN
|--------------------------------------------------------------------------
*/

async function getAccessToken():
  Promise<string | null> {

  return await SecureStore.getItemAsync(
    "access_token"
  );
}


/*
|--------------------------------------------------------------------------
| PARSE RESPONSE
|--------------------------------------------------------------------------
*/

async function parseResponse<T>(
  response: Response
): Promise<T> {

  const raw =
    await response.text();


  if (!raw) {

    throw new AppActivityApiError(
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
      "Invalid app activity API response:",
      raw
    );


    throw new AppActivityApiError(
      "Invalid response from server",
      response.status
    );
  }
}


/*
|--------------------------------------------------------------------------
| SEND APP ACTIVITY
|--------------------------------------------------------------------------
*/

export async function sendAppActivity(
  seconds: number
): Promise<AppActivityResponse | null> {

  /*
   * Normalize seconds.
   *
   * Backend accepts:
   * 1 -> 300 seconds
   */

  const normalizedSeconds =
    Math.min(
      300,
      Math.max(
        1,
        Math.floor(
          seconds
        )
      )
    );


  const accessToken =
    await getAccessToken();


  /*
   * Anonymous device:
   *
   * do not track customer app time.
   */

  if (!accessToken) {

    return null;
  }


  const response =
    await fetch(
      `${API_URL}/activity`,
      {
        method:
          "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            access_token:
              accessToken,

            seconds:
              normalizedSeconds,
          }),
      }
    );


  const data =
    await parseResponse<
      AppActivityResponse
    >(
      response
    );


  if (
    !response.ok
    ||
    data.success !== true
  ) {

    throw new AppActivityApiError(
      data.message ||
        "Unable to register app activity",
      response.status
    );
  }


  if (__DEV__) {

    console.log(
      "APP ACTIVITY:",
      {
        added_seconds:
          data.added_seconds,

        total_app_seconds:
          data.total_app_seconds,

        last_app_activity_at:
          data.last_app_activity_at,
      }
    );
  }


  return data;
}


/*
|--------------------------------------------------------------------------
| SEND ACTIVITY SAFELY
|--------------------------------------------------------------------------
|
| Useful for heartbeat calls.
|
| A network error should never crash the app.
|
*/

export async function sendAppActivitySafe(
  seconds: number
): Promise<boolean> {

  try {

    await sendAppActivity(
      seconds
    );

    return true;

  } catch (
    error
  ) {

    console.warn(
      "Unable to track app activity:",
      error
    );

    return false;
  }
}