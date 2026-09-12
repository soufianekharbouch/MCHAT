import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import * as SecureStore
  from "expo-secure-store";

import {
  router,
  usePathname,
} from "expo-router";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  detachCustomerFromDevice,
} from "../services/pushNotifications";

import {
  getUnreadNotificationCount,
} from "../services/notificationApi";

import {
  useAppLanguage,
} from "../context/LanguageContext";


const COLORS = {
  background: "#F7F4EF",
  primary: "#249B97",
  coral: "#EB6268",
  text: "#272727",
  muted: "#77736D",
  white: "#FFFFFF",
  border: "#E5E0D9",
};


export default function MchatHeader() {

  const {
    isArabic,
  } = useAppLanguage();


  const pathname =
    usePathname();


  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);


  const [
    unreadNotifications,
    setUnreadNotifications,
  ] =
    useState(0);


  /*
   * Static for now.
   */

  const points = 125;

  const unreadMessages = 0;


  /*
  |--------------------------------------------------------------------------
  | LOAD NOTIFICATION BADGE
  |--------------------------------------------------------------------------
  */

  const loadUnreadNotifications =
    useCallback(
      async () => {

        try {

          const count =
            await getUnreadNotificationCount();

          setUnreadNotifications(
            count
          );

        } catch (error) {

          console.warn(
            "Unread notifications error:",
            error
          );
        }
      },
      []
    );


  /*
   * Reload whenever navigation changes.
   */

  useEffect(
    () => {

      loadUnreadNotifications();

    },
    [
      loadUnreadNotifications,
      pathname,
    ]
  );


  /*
   * Reload when application returns
   * to foreground.
   */

  useEffect(
    () => {

      const subscription =
        AppState.addEventListener(
          "change",
          (
            state
          ) => {

            if (
              state ===
              "active"
            ) {

              loadUnreadNotifications();
            }
          }
        );


      return () => {

        subscription.remove();

      };

    },
    [
      loadUnreadNotifications,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const logout =
    async () => {

      if (loggingOut) {
        return;
      }

      setLoggingOut(
        true
      );


      try {

        const token =
          await SecureStore.getItemAsync(
            "access_token"
          );


        /*
         * Laravel logout.
         */

        if (token) {

          try {

            await fetch(
              "https://animal-care2.kharbouch-soufiane.com/api/mobile/logout",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",
                },

                body:
                  JSON.stringify({
                    access_token:
                      token,
                  }),
              }
            );

          } catch (
            networkError
          ) {

            console.warn(
              "Server logout failed:",
              networkError
            );
          }
        }


        /*
         * Detach customer.
         */

        try {

          await detachCustomerFromDevice();

        } catch (
          deviceError
        ) {

          console.warn(
            "Device detach failed:",
            deviceError
          );
        }


        /*
         * Delete local session.
         */

        await SecureStore
          .deleteItemAsync(
            "access_token"
          );


        await SecureStore
          .deleteItemAsync(
            "access_token_expires_at"
          );


        /*
         * Reset badge.
         */

        setUnreadNotifications(
          0
        );


        router.replace(
          "/login"
        );

      } catch (
        error
      ) {

        console.error(
          "Logout error:",
          error
        );


        Alert.alert(
          isArabic
            ? "خطأ"
            : "Error",

          isArabic
            ? "تعذر تسجيل الخروج. حاول مرة أخرى."
            : "Unable to sign out. Please try again."
        );

      } finally {

        setLoggingOut(
          false
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | SCREEN
  |--------------------------------------------------------------------------
  */

  return (

    <SafeAreaView
      edges={[
        "top",
      ]}
      style={
        styles.safeArea
      }
    >

      <View
        style={
          styles.wrapper
        }
      >

        <View
          style={[
            styles.header,

            isArabic
            &&
            styles.headerRtl,
          ]}
        >

          {/* BRAND */}

          <View
            style={[
              styles.brand,

              isArabic
              &&
              styles.brandRtl,
            ]}
          >

            <View
              style={
                styles.brandIcon
              }
            >

              <Ionicons
                name="paw"
                size={
                  19
                }
                color={
                  COLORS.white
                }
              />

            </View>


            <Text
              style={
                styles.brandText
              }
            >
              Mchat
            </Text>

          </View>


          {/* ACTIONS */}

          <View
            style={[
              styles.actions,

              isArabic
              &&
              styles.actionsRtl,
            ]}
          >

            {/* NOTIFICATIONS */}

            <Pressable

              style={({
                pressed,
              }) => [

                styles.iconButton,

                pressed
                &&
                styles.iconButtonPressed,
              ]}

              onPress={
                () => {

                  router.push(
                    "/notifications"
                  );
                }
              }
            >

              <Ionicons
                name=
                  "notifications-outline"
                size={
                  23
                }
                color={
                  COLORS.text
                }
              />


              {
                unreadNotifications > 0
                &&
                (

                  <View
                    style={
                      styles.badge
                    }
                  >

                    <Text
                      style={
                        styles.badgeText
                      }
                    >

                      {
                        unreadNotifications >
                        99
                          ? "99+"
                          : unreadNotifications
                      }

                    </Text>

                  </View>
                )
              }

            </Pressable>


            {/* MESSAGES */}

            <Pressable
              style={
                styles.iconButton
              }
              onPress={() => {}}
            >

              <Ionicons
                name=
                  "chatbubble-ellipses-outline"
                size={
                  22
                }
                color={
                  COLORS.text
                }
              />


              {
                unreadMessages > 0
                &&
                (

                  <View
                    style={
                      styles.badge
                    }
                  >

                    <Text
                      style={
                        styles.badgeText
                      }
                    >

                      {
                        unreadMessages
                      }

                    </Text>

                  </View>
                )
              }

            </Pressable>


            {/* POINTS */}

            <View
              style={
                styles.points
              }
            >

              <Ionicons
                name=
                  "gift-outline"
                size={
                  18
                }
                color={
                  COLORS.primary
                }
              />


              <View>

                <Text
                  style={
                    styles.pointsValue
                  }
                >
                  {points}
                </Text>


                <Text
                  style={
                    styles.pointsLabel
                  }
                >

                  {
                    isArabic
                      ? "نقطة"
                      : "pts"
                  }

                </Text>

              </View>

            </View>


            {/* LOGOUT */}

            <Pressable

              style={({
                pressed,
              }) => [

                styles.logoutButton,

                pressed
                &&
                styles.logoutButtonPressed,
              ]}

              disabled={
                loggingOut
              }

              onPress={
                logout
              }
            >

              {
                loggingOut
                  ? (

                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.coral
                      }
                    />

                  )
                  : (

                    <Ionicons
                      name=
                        "log-out-outline"
                      size={
                        22
                      }
                      color={
                        COLORS.coral
                      }
                    />

                  )
              }

            </Pressable>

          </View>

        </View>

      </View>

    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    safeArea: {
      backgroundColor:
        COLORS.text,
    },


    wrapper: {
      backgroundColor:
        COLORS.background,
    },


    header: {
      minHeight: 72,

      paddingHorizontal: 18,

      paddingVertical: 12,

      backgroundColor:
        COLORS.white,

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },


    headerRtl: {
      flexDirection:
        "row-reverse",
    },


    brand: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 9,
    },


    brandRtl: {
      flexDirection:
        "row-reverse",
    },


    brandIcon: {
      width: 36,

      height: 36,

      borderRadius: 12,

      backgroundColor:
        COLORS.primary,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    brandText: {
      fontFamily:
        "Cairo_800ExtraBold",

      fontSize: 18,

      color:
        COLORS.text,
    },


    actions: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,
    },


    actionsRtl: {
      flexDirection:
        "row-reverse",
    },


    iconButton: {
      width: 40,

      height: 40,

      borderRadius: 13,

      backgroundColor:
        COLORS.background,

      alignItems:
        "center",

      justifyContent:
        "center",

      position:
        "relative",
    },


    iconButtonPressed: {
      opacity: 0.7,
    },


    badge: {
      position:
        "absolute",

      top: 4,

      right: 3,

      minWidth: 16,

      height: 16,

      paddingHorizontal: 4,

      borderRadius: 8,

      backgroundColor:
        COLORS.coral,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    badgeText: {
      color:
        COLORS.white,

      fontSize: 9,

      fontWeight:
        "700",
    },


    points: {
      minHeight: 40,

      paddingHorizontal: 10,

      borderRadius: 13,

      backgroundColor:
        "#ECF8F7",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 6,
    },


    pointsValue: {
      fontFamily:
        "Cairo_700Bold",

      fontSize: 12,

      lineHeight: 16,

      color:
        COLORS.primary,
    },


    pointsLabel: {
      fontFamily:
        "Cairo_500Medium",

      fontSize: 9,

      lineHeight: 12,

      color:
        COLORS.muted,
    },


    logoutButton: {
      width: 40,

      height: 40,

      borderRadius: 13,

      backgroundColor:
        "#FFF1F2",

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    logoutButtonPressed: {
      opacity: 0.7,
    },
  });