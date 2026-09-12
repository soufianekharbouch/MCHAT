import React from "react";

import {
  Tabs,
} from "expo-router";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  CustomerDataProvider,
} from "../../context/CustomerDataContext";

import {
  useAppLanguage,
} from "../../context/LanguageContext";

import MchatHeader
  from "../../components/MchatHeader";


const COLORS = {
  primary:
    "#249B97",

  coral:
    "#EB6268",

  text:
    "#272727",

  muted:
    "#77736D",

  white:
    "#FFFFFF",

  border:
    "#E5E0D9",

  background:
    "#F7F4EF",
};


export default function TabsLayout() {

  const {
    isArabic,
  } = useAppLanguage();

  const insets =
    useSafeAreaInsets();


  return (

    <CustomerDataProvider>

      <Tabs
        screenOptions={{
          /*
          |--------------------------------------------------------------------------
          | CUSTOM HEADER
          |--------------------------------------------------------------------------
          */

          headerShown:
            true,

          header:
            () => (
              <MchatHeader />
            ),


          /*
          |--------------------------------------------------------------------------
          | TAB COLORS
          |--------------------------------------------------------------------------
          */

          tabBarActiveTintColor:
            COLORS.primary,

          tabBarInactiveTintColor:
            COLORS.muted,


          /*
          |--------------------------------------------------------------------------
          | SAFE AREA BOTTOM
          |--------------------------------------------------------------------------
          |
          | On ajoute la hauteur de la zone système Android.
          |
          */

          tabBarStyle: {
            backgroundColor:
              COLORS.white,

            borderTopColor:
              COLORS.border,

            borderTopWidth:
              1,

            /*
             * 58px pour le contenu du menu
             * +
             * safe area Android
             */

            height:
              58
              +
              Math.max(
                insets.bottom,
                8
              ),

            paddingTop:
              6,

            paddingBottom:
              Math.max(
                insets.bottom,
                8
              ),
          },


          /*
          |--------------------------------------------------------------------------
          | LABELS
          |--------------------------------------------------------------------------
          */

          tabBarLabelStyle: {
            fontFamily:
              "Cairo_600SemiBold",

            fontSize:
              10,

            marginBottom:
              2,
          },


          /*
          |--------------------------------------------------------------------------
          | TAB ITEMS
          |--------------------------------------------------------------------------
          */

          tabBarItemStyle: {
            paddingVertical:
              2,
          },


          /*
          |--------------------------------------------------------------------------
          | SCREEN BACKGROUND
          |--------------------------------------------------------------------------
          */

          sceneStyle: {
            backgroundColor:
              COLORS.background,
          },
        }}
      >

        {/*
        |--------------------------------------------------------------------------
        | HOME
        |--------------------------------------------------------------------------
        */}

        <Tabs.Screen
          name="index"
          options={{
            title:
              isArabic
                ? "الرئيسية"
                : "Home",

            tabBarIcon:
              ({
                color,
                size,
                focused,
              }) => (

                <Ionicons
                  name={
                    focused
                      ? "home"
                      : "home-outline"
                  }
                  size={
                    size
                  }
                  color={
                    color
                  }
                />

              ),
          }}
        />


        {/*
        |--------------------------------------------------------------------------
        | PETS
        |--------------------------------------------------------------------------
        */}

        <Tabs.Screen
          name="pets"
          options={{
            title:
              isArabic
                ? "حيواناتي"
                : "My Pets",

            tabBarIcon:
              ({
                color,
                size,
                focused,
              }) => (

                <Ionicons
                  name={
                    focused
                      ? "paw"
                      : "paw-outline"
                  }
                  size={
                    size
                  }
                  color={
                    color
                  }
                />

              ),
          }}
        />


        {/*
        |--------------------------------------------------------------------------
        | ORDERS
        |--------------------------------------------------------------------------
        */}

        <Tabs.Screen
          name="orders"
          options={{
            title:
              isArabic
                ? "الطلبات"
                : "Orders",

            tabBarIcon:
              ({
                color,
                size,
                focused,
              }) => (

                <Ionicons
                  name={
                    focused
                      ? "cube"
                      : "cube-outline"
                  }
                  size={
                    size
                  }
                  color={
                    color
                  }
                />

              ),
          }}
        />


        {/*
        |--------------------------------------------------------------------------
        | SETTINGS
        |--------------------------------------------------------------------------
        */}

        <Tabs.Screen
          name="settings"
          options={{
            title:
              isArabic
                ? "الإعدادات"
                : "Settings",

            tabBarIcon:
              ({
                color,
                size,
                focused,
              }) => (

                <Ionicons
                  name={
                    focused
                      ? "settings"
                      : "settings-outline"
                  }
                  size={
                    size
                  }
                  color={
                    color
                  }
                />

              ),
          }}
        />


        {/*
        |--------------------------------------------------------------------------
        | NOTIFICATIONS
        |--------------------------------------------------------------------------
        |
        | Écran accessible via le header / push,
        | mais pas affiché dans la barre du bas.
        |
        */}

        <Tabs.Screen
          name="notifications"
          options={{
            title:
              isArabic
                ? "الإشعارات"
                : "Notifications",

            href:
              null,
          }}
        />

      </Tabs>

    </CustomerDataProvider>

  );
}