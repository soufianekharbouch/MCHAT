import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CustomerDataProvider,
} from "../context/CustomerDataContext";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  View,
} from "react-native";

import {
  Stack,
  router,
} from "expo-router";

import {
  SafeAreaProvider,
} from "react-native-safe-area-context";

import * as Notifications
  from "expo-notifications";

import * as SplashScreen
  from "expo-splash-screen";

import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/cairo";

import {
  getStoredItem,
  setStoredItem,
} from "../services/storage";

import {
  loadSession,
} from "../services/session";

import {
  LanguageProvider,
} from "../context/LanguageContext";

import {
  registerDevice,
} from "../services/pushNotifications";

import {
  markNotificationViewedSafe,
} from "../services/notificationApi";

import {
  getCustomerSettings,
} from "../services/customerApi";

import {
  clearOrderCart,
} from "../services/orderCart";


/*
|--------------------------------------------------------------------------
| SPLASH SCREEN
|--------------------------------------------------------------------------
|
| Stays visible until the Cairo fonts are loaded (see RootLayout).
| The fonts are loaded HERE for the whole app: before, only the login
| screen loaded them, so the installed app (Play Store) opened on the
| shop / Home with the system font.
|
*/

SplashScreen.preventAutoHideAsync().catch(() => undefined);


/*
|--------------------------------------------------------------------------
| DEVICE REGISTRATION GUARD
|--------------------------------------------------------------------------
|
| In development, React / Expo can mount or re-run the root tree more than
| once (Fast Refresh, development checks, route remounts).
|
| Keep the existing notification system unchanged, but make device
| registration idempotent for the current JS runtime:
|
| - first caller starts registerDevice()
| - concurrent/later callers reuse the same Promise
| - if registration fails, the guard resets so a future retry is possible
|
*/

let deviceRegistrationPromise:
  Promise<any> | null = null;


const registerDeviceOnce =
  async () => {

    if (
      deviceRegistrationPromise
    ) {

      return deviceRegistrationPromise;
    }


    deviceRegistrationPromise =
      registerDevice()
        .catch(
          (
            error
          ) => {

            /*
             * Allow a future retry if the first registration failed.
             */

            deviceRegistrationPromise =
              null;

            throw error;
          }
        );


    return deviceRegistrationPromise;
  };



/*
|--------------------------------------------------------------------------
| APP ACTIVITY TRACKING
|--------------------------------------------------------------------------
|
| POST /api/mobile/activity
|
| Activity is counted only when:
| - the customer has an access_token
| - the app is in foreground
|
*/

const MOBILE_API_URL =
  "https://animal-care2.kharbouch-soufiane.com/api/mobile";


const sendAppActivity =
  async (
    seconds: number
  ): Promise<void> => {

    try {

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
        await getStoredItem(
          "access_token"
        );


      if (!accessToken) {
        return;
      }


      const response =
        await fetch(
          `${MOBILE_API_URL}/activity`,
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


      if (!response.ok) {

        let responseBody:
          any = null;


        try {

          responseBody =
            await response.json();

        } catch {

          responseBody =
            null;
        }


        console.warn(
          "App activity tracking failed:",
          response.status,
          responseBody
        );

        return;
      }


      if (__DEV__) {

        console.log(
          "APP ACTIVITY:",
          `+${normalizedSeconds}s`
        );
      }


    } catch (
      error
    ) {

      console.warn(
        "App activity tracking error:",
        error
      );
    }
  };


export default function RootLayout() {

  /*
  |--------------------------------------------------------------------------
  | FONTS (whole app)
  |--------------------------------------------------------------------------
  */

  const [
    fontsLoaded,
    fontError,
  ] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  const [
    appReady,
    setAppReady,
  ] = useState(false);


  /*
  |--------------------------------------------------------------------------
  | APP ACTIVITY REFS
  |--------------------------------------------------------------------------
  */

  const appStateRef =
    useRef<AppStateStatus>(
      AppState.currentState
    );


  const activityStartedAtRef =
    useRef<number | null>(
      AppState.currentState === "active"
        ? Date.now()
        : null
    );


  const activityIntervalRef =
    useRef<
      ReturnType<
        typeof setInterval
      >
      | null
    >(
      null
    );


  /*
  |--------------------------------------------------------------------------
  | CHECK LOCAL SESSION
  |--------------------------------------------------------------------------
  */

  const hasValidSession =
    async (): Promise<boolean> => {

      /*
       * WhatsApp session: no expiry (until logout).
       * Old password sessions: removed when expired.
       */

      try {

        return await loadSession();

      } catch (
        error
      ) {

        console.warn(
          "Session check error:",
          error
        );

        return false;
      }
    };


  /*
  |--------------------------------------------------------------------------
  | CHECK IF INITIAL PASSWORD MUST BE CHANGED
  |--------------------------------------------------------------------------
  */

  const mustChangeInitialPassword =
    async (): Promise<boolean> => {

      try {

        const value =
          await getStoredItem(
            "must_change_password"
          );

        return value === "1";

      } catch (
        error
      ) {

        console.warn(
          "Password status check error:",
          error
        );

        return false;
      }
    };


  /*
  |--------------------------------------------------------------------------
  | HANDLE PUSH CLICK
  |--------------------------------------------------------------------------
  |
  | Only marks the notification as viewed.
  | The app always opens on Home (no redirection to the notifications page).
  |
  */

const handleNotificationResponse =
  async (
    response:
      Notifications.NotificationResponse
  ) => {

    try {

      /*
      |--------------------------------------------------------------------------
      | ENSURE DEVICE IS REGISTERED
      |--------------------------------------------------------------------------
      */

      try {

        await registerDeviceOnce();

      } catch (
        deviceError
      ) {

        console.warn(
          "Unable to register device before notification tracking:",
          deviceError
        );
      }


      /*
      |--------------------------------------------------------------------------
      | GET NOTIFICATION DATA
      |--------------------------------------------------------------------------
      */

      const data =
        response
          .notification
          .request
          .content
          .data;


      const notificationId =
        Number(
          data?.notification_id
        );


      /*
      |--------------------------------------------------------------------------
      | TRACK VIEW
      |--------------------------------------------------------------------------
      */

      if (
        Number.isFinite(
          notificationId
        )
        &&
        notificationId > 0
      ) {

        await markNotificationViewedSafe(
          notificationId
        );
      }


      /*
       * No redirection anymore: the app stays on its current page
       * (at start: Home). The notifications stay in the bell / list.
       */

    } catch (
      error
    ) {

      console.warn(
        "Notification click error:",
        error
      );
    }
  };


  /*
  |--------------------------------------------------------------------------
  | TRACK TIME SPENT IN APP
  |--------------------------------------------------------------------------
  |
  | Sends about 60 seconds every minute while the app is active.
  | Any remaining partial minute is flushed when the app goes background.
  |
  */

  useEffect(() => {

    const stopActivityInterval =
      () => {

        if (
          activityIntervalRef.current
        ) {

          clearInterval(
            activityIntervalRef.current
          );

          activityIntervalRef.current =
            null;
        }
      };


    const flushCurrentActivity =
      async () => {

        const startedAt =
          activityStartedAtRef.current;


        activityStartedAtRef.current =
          null;


        if (!startedAt) {
          return;
        }


        const elapsedSeconds =
          Math.floor(
            (
              Date.now()
              -
              startedAt
            )
            /
            1000
          );


        if (
          elapsedSeconds <= 0
        ) {
          return;
        }


        let remaining =
          elapsedSeconds;


        while (
          remaining > 0
        ) {

          const chunk =
            Math.min(
              remaining,
              300
            );


          await sendAppActivity(
            chunk
          );


          remaining -=
            chunk;
        }
      };


    const startActivityInterval =
      () => {

        if (
          appStateRef.current
          !==
          "active"
        ) {
          return;
        }


        if (
          activityIntervalRef.current
        ) {
          return;
        }


        activityStartedAtRef.current =
          Date.now();


        activityIntervalRef.current =
          setInterval(
            async () => {

              if (
                appStateRef.current
                !==
                "active"
              ) {
                return;
              }


              const startedAt =
                activityStartedAtRef.current;


              if (!startedAt) {

                activityStartedAtRef.current =
                  Date.now();

                return;
              }


              const now =
                Date.now();


              const elapsedSeconds =
                Math.floor(
                  (
                    now
                    -
                    startedAt
                  )
                  /
                  1000
                );


              if (
                elapsedSeconds <= 0
              ) {
                return;
              }


              activityStartedAtRef.current =
                now;


              await sendAppActivity(
                Math.min(
                  elapsedSeconds,
                  300
                )
              );

            },
            60_000
          );
      };


    if (
      AppState.currentState
      ===
      "active"
    ) {

      appStateRef.current =
        "active";

      startActivityInterval();
    }


    const appStateSubscription =
      AppState.addEventListener(
        "change",
        (
          nextState
        ) => {

          const previousState =
            appStateRef.current;


          appStateRef.current =
            nextState;


          if (
            previousState ===
              "active"
            &&
            nextState !==
              "active"
          ) {

            stopActivityInterval();

            void flushCurrentActivity();

            return;
          }


          if (
            previousState !==
              "active"
            &&
            nextState ===
              "active"
          ) {

            startActivityInterval();
          }
        }
      );


    return () => {

      stopActivityInterval();

      appStateSubscription.remove();


      if (
        appStateRef.current
        ===
        "active"
      ) {

        void flushCurrentActivity();
      }
    };

  }, []);


  useEffect(() => {

    let mounted = true;


    /*
    |--------------------------------------------------------------------------
    | REGISTER DEVICE
    |--------------------------------------------------------------------------
    */

    registerDeviceOnce()
      .catch(
        (
          error
        ) => {

          console.warn(
            "Device registration error:",
            error
          );
        }
      );


    /*
    |--------------------------------------------------------------------------
    | PUSH CLICK WHILE APP IS RUNNING
    |--------------------------------------------------------------------------
    */

    const subscription =
      Notifications
        .addNotificationResponseReceivedListener(
          async (
            response
          ) => {

            await handleNotificationResponse(
              response
            );
          }
        );


    /*
    |--------------------------------------------------------------------------
    | INITIAL APPLICATION ROUTING
    |--------------------------------------------------------------------------
    */

const initializeApp =
  async () => {

    try {

      /*
      |--------------------------------------------------------------------------
      | EMPTY CART AT EACH START
      |--------------------------------------------------------------------------
      |
      | The order in progress never survives a restart of the app.
      |
      */

      await clearOrderCart().catch(
        () => undefined
      );


      /*
      |--------------------------------------------------------------------------
      | REGISTER DEVICE FIRST
      |--------------------------------------------------------------------------
      */

      try {

        await registerDeviceOnce();

      } catch (
        deviceError
      ) {

        console.warn(
          "Initial device registration error:",
          deviceError
        );
      }


      /*
      |--------------------------------------------------------------------------
      | CHECK INITIAL PUSH
      |--------------------------------------------------------------------------
      */

      const response =
        await Notifications
          .getLastNotificationResponseAsync();


      /*
      |--------------------------------------------------------------------------
      | CHECK LOGIN
      |--------------------------------------------------------------------------
      */

      const loggedIn =
        await hasValidSession();


      /*
      |--------------------------------------------------------------------------
      | APP STARTED FROM PUSH: view counted, the app still opens on Home
      |--------------------------------------------------------------------------
      */

      if (response) {

        // Count the view, then normal start on Home
        void handleNotificationResponse(
          response
        );

        try {

          await Notifications
            .clearLastNotificationResponseAsync();

        } catch (
          clearError
        ) {

          console.warn(
            "Unable to clear last notification response:",
            clearError
          );
        }
      }


      /*
      |--------------------------------------------------------------------------
      | NORMAL START
      |--------------------------------------------------------------------------
      */

      /*
       * Visitor: no forced login anymore.
       * The Home tab shows the shop catalog.
       */

      if (!loggedIn) {

        if (mounted) {

          setAppReady(
            true
          );


          setTimeout(
            () => {

              router.replace(
                "/(tabs)" as any
              );

            },
            0
          );
        }


        return;
      }


      const mustChangePassword =
        await mustChangeInitialPassword();


      /*
      |--------------------------------------------------------------------------
      | LOAD CUSTOMER LANGUAGE
      |--------------------------------------------------------------------------
      |
      | When the customer already has a valid session, the language saved in
      | customer settings becomes the local application language.
      |
      | Failure to load settings must never block application startup.
      |
      */

      try {

        const customerSettings =
          await getCustomerSettings();

        const customerLanguage =
          customerSettings
            ?.settings
            ?.language;

        if (
          customerLanguage === "ar"
          ||
          customerLanguage === "en"
        ) {

          await setStoredItem(
            "locale",
            customerLanguage
          );
        }

      } catch (
        languageError
      ) {

        console.warn(
          "Unable to load customer language:",
          languageError
        );
      }


      if (mounted) {

        setAppReady(
          true
        );


        setTimeout(
          () => {

            router.replace(
              mustChangePassword
                ? "/change-password"
                : "/(tabs)"
            );

          },
          0
        );
      }


    } catch (
      error
    ) {

      console.warn(
        "Application initialization error:",
        error
      );


      if (mounted) {

        setAppReady(
          true
        );


        setTimeout(
          () => {

            router.replace(
              "/(tabs)" as any
            );

          },
          0
        );
      }
    }
  };

    initializeApp();


    /*
    |--------------------------------------------------------------------------
    | CLEANUP
    |--------------------------------------------------------------------------
    */

    return () => {

      mounted = false;

      subscription.remove();

    };

  }, []);


  /*
  |--------------------------------------------------------------------------
  | HIDE THE SPLASH SCREEN WHEN THE FONTS ARE READY
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    if (
      fontsLoaded ||
      fontError
    ) {

      SplashScreen
        .hideAsync()
        .catch(() => undefined);
    }

  }, [
    fontsLoaded,
    fontError,
  ]);


  if (
    !fontsLoaded &&
    !fontError
  ) {

    // Splash screen still visible
    return null;
  }


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  |
  | Empêche Expo Router d'afficher brièvement
  | une mauvaise page avant la vérification.
  |
  */

  if (!appReady) {

    return (

      <SafeAreaProvider>

        <View
          style={{
            flex: 1,
            alignItems:
              "center",
            justifyContent:
              "center",
            backgroundColor:
              "#F4F1EC",
          }}
        >

          <ActivityIndicator
            size="large"
            color="#249B97"
          />

        </View>

      </SafeAreaProvider>
    );
  }


/*
|--------------------------------------------------------------------------
| ROUTER
|--------------------------------------------------------------------------
*/

return (

  <SafeAreaProvider>

    <LanguageProvider>

      <CustomerDataProvider>

        <Stack
          initialRouteName="(tabs)"
          screenOptions={{
            headerShown: false,
          }}
        >

          <Stack.Screen
            name="(tabs)"
          />

          {/* WhatsApp sign in / sign up */}

          <Stack.Screen
            name="login"
          />

          <Stack.Screen
            name="register"
          />

          {/* Password screens kept (not used for now) */}

          <Stack.Screen
            name="login-password"
          />

          <Stack.Screen
            name="register-full"
          />

          <Stack.Screen
            name="forgot-password"
          />

          <Stack.Screen
            name="reset-password"
          />

          <Stack.Screen
            name="change-password"
          />

          <Stack.Screen
            name="pet-form"
          />

        </Stack>

      </CustomerDataProvider>

    </LanguageProvider>

  </SafeAreaProvider>

);
}