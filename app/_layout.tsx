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

import * as SecureStore
  from "expo-secure-store";

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
        await SecureStore.getItemAsync(
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

      try {

        const accessToken =
          await SecureStore.getItemAsync(
            "access_token"
          );


        if (!accessToken) {
          return false;
        }


        /*
         * Vérifier aussi l'expiration
         * si elle est enregistrée.
         */

        const expiresAt =
          await SecureStore.getItemAsync(
            "access_token_expires_at"
          );


        if (expiresAt) {

          const expiresTime =
            new Date(
              expiresAt
            ).getTime();


          if (
            !Number.isNaN(
              expiresTime
            )
            &&
            expiresTime <= Date.now()
          ) {

            /*
             * Session expirée :
             * supprimer les anciennes données.
             */

            await SecureStore.deleteItemAsync(
              "access_token"
            );

            await SecureStore.deleteItemAsync(
              "access_token_expires_at"
            );

            return false;
          }
        }


        return true;

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
          await SecureStore.getItemAsync(
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
      |--------------------------------------------------------------------------
      | CHECK SESSION
      |--------------------------------------------------------------------------
      */

      const loggedIn =
        await hasValidSession();


      if (!loggedIn) {

        router.replace(
          "/login"
        );

        return;
      }


      const mustChangePassword =
        await mustChangeInitialPassword();


      if (mustChangePassword) {

        router.replace(
          "/change-password"
        );

        return;
      }


      router.replace(
        "/notifications"
      );

    } catch (
      error
    ) {

      console.warn(
        "Notification click error:",
        error
      );


      const loggedIn =
        await hasValidSession();


      if (loggedIn) {

        const mustChangePassword =
          await mustChangeInitialPassword();


        if (mustChangePassword) {

          router.replace(
            "/change-password"
          );

        } else {

          router.replace(
            "/notifications"
          );
        }

      } else {

        router.replace(
          "/login"
        );
      }
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
      | APP STARTED FROM PUSH
      |--------------------------------------------------------------------------
      */

      if (response) {

        if (mounted) {

          setAppReady(
            true
          );


          setTimeout(
            async () => {

              await handleNotificationResponse(
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

            },
            0
          );
        }


        return;
      }


      /*
      |--------------------------------------------------------------------------
      | NORMAL START
      |--------------------------------------------------------------------------
      */

      if (!loggedIn) {

        if (mounted) {

          setAppReady(
            true
          );


          setTimeout(
            () => {

              router.replace(
                "/login"
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

          await SecureStore.setItemAsync(
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
              "/login"
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
              "#FFFFFF",
          }}
        >

          <ActivityIndicator
            size="large"
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
          initialRouteName="login"
          screenOptions={{
            headerShown: false,
          }}
        >

          <Stack.Screen
            name="login"
          />

          <Stack.Screen
            name="change-password"
          />

          <Stack.Screen
            name="(tabs)"
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