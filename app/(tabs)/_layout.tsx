import React from "react";
import AppUpdateChecker from "../../components/app-update-checker";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import { Tabs, router } from "expo-router";

import Svg, {
  Path,
} from "react-native-svg";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  CustomerDataProvider,
} from "../../context/CustomerDataContext";

import {
  useAppLanguage,
} from "../../context/LanguageContext";

import MchatHeader from "../../components/MchatHeader";

import {
  isSignedInNow,
  useSession,
} from "../../services/session";


/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/

const COLORS = {
  primary: "#249B97",
  text: "#272727",
  muted: "#77736D",

  background: "#f4f1ecf5",
  tabBackground: "#f4f1ecf5",

  border: "#E5E0D9",
};


/*
|--------------------------------------------------------------------------
| HOME ICON
|--------------------------------------------------------------------------
*/

function HomeIcon({
  color,
  size = 24,
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <Path
        d="M3 10l9-7 9 7v11h-6v-7H9v7H3z"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}


/*
|--------------------------------------------------------------------------
| MY PETS ICON
|--------------------------------------------------------------------------
*/

function PetsIcon({
  color,
  size = 24,
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <Path
        d="M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-5 4-1 9 8 16 9-7 13-12 8-16z"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}


/*
|--------------------------------------------------------------------------
| ACCOUNT ICON
|--------------------------------------------------------------------------
*/

function AccountIcon({
  color,
  size = 24,
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <Path
        d="M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}


/*
|--------------------------------------------------------------------------
| SHOP ICON
|--------------------------------------------------------------------------
*/

function ShopIcon({
  color,
  size = 24,
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <Path
        d="M4 7h16l-1.2 12.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8zM8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}


/*
|--------------------------------------------------------------------------
| PRIVATE TABS (visitor -> WhatsApp sign in)
|--------------------------------------------------------------------------
|
| Home, My Pets and Account need an account. A visitor who taps them
| opens the sign in screen and comes back to the tab after.
|
*/

function privateTab(redirect) {
  return {
    tabPress: event => {
      if (!isSignedInNow()) {
        event.preventDefault();

        router.push({
          pathname: "/login",
          params: { redirect },
        });
      }
    },
  };
}


/*
|--------------------------------------------------------------------------
| TAB ICON
|--------------------------------------------------------------------------
*/

function TabIcon({
  focused,
  type,
}) {
  const color = focused
    ? COLORS.primary
    : COLORS.muted;

  const renderIcon = () => {
    switch (type) {
      case "shop":
        return (
          <ShopIcon
            color={color}
            size={25}
          />
        );

      case "home":
        return (
          <HomeIcon
            color={color}
            size={25}
          />
        );

      case "pets":
        return (
          <PetsIcon
            color={color}
            size={25}
          />
        );

      case "account":
        return (
          <AccountIcon
            color={color}
            size={25}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.iconWrapper}>

      {/*
      |--------------------------------------------------------------------------
      | ACTIVE INDICATOR
      |--------------------------------------------------------------------------
      |
      | Positioned at the exact top of the tab bar.
      |
      */}

      {focused && (
        <View
          style={styles.activeIndicator}
        />
      )}


      {/*
      |--------------------------------------------------------------------------
      | ICON
      |--------------------------------------------------------------------------
      */}

      <View style={styles.iconContainer}>
        {renderIcon()}
      </View>

    </View>
  );
}


/*
|--------------------------------------------------------------------------
| TAB LABEL
|--------------------------------------------------------------------------
*/

function TabLabel({
  focused,
  children,
  isArabic,
}) {
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.tabLabel,

        isArabic &&
          styles.tabLabelArabic,

        focused &&
          styles.tabLabelActive,

        {
          color: focused
            ? COLORS.text
            : COLORS.muted,
        },
      ]}
    >
      {children}
    </Text>
  );
}


/*
|--------------------------------------------------------------------------
| TABS LAYOUT
|--------------------------------------------------------------------------
*/

export default function TabsLayout() {

  const {
    isArabic,
  } = useAppLanguage();

  const insets =
    useSafeAreaInsets();

  /*
   * Visitor: the Home tab shows the shop catalog
   * (label "Shop" + bag icon). Signed in: normal Home.
   */
  const {
    signedIn,
  } = useSession();

  const homeLabel =
    signedIn
      ? (isArabic ? "الرئيسية" : "Home")
      : (isArabic ? "المتجر" : "Shop");


  /*
  |--------------------------------------------------------------------------
  | BOTTOM SAFE AREA
  |--------------------------------------------------------------------------
  |
  | iPhone:
  | Keeps space for the Home Indicator.
  |
  | Android:
  | Keeps space for system navigation when required.
  |
  | Devices without a large inset:
  | Keep only 5px.
  |
  */

  const bottomPadding =
    Math.max(
      insets.bottom,
      5
    );


  return (
    <CustomerDataProvider>

      <Tabs
        backBehavior="history"
        screenOptions={{

          /*
          |--------------------------------------------------------------------------
          | HEADER
          |--------------------------------------------------------------------------
          */

          headerShown: true,

          header: () => (
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
          | TAB BAR
          |--------------------------------------------------------------------------
          */

          tabBarStyle: {

            /*
             * Background
             */

            backgroundColor:
              COLORS.tabBackground,


            /*
             * The top border is exactly
             * where the navigation starts.
             */

            borderTopWidth: 1,

            borderTopColor:
              COLORS.border,


            /*
             * 58px = actual navigation content.
             *
             * We add only the real safe area
             * required by the device.
             */

            height:
              58 + bottomPadding,


            /*
             * No empty area above
             * the active indicator.
             */

            paddingTop: 0,


            /*
             * Only system safe area below.
             */

            paddingBottom:
              bottomPadding,


            /*
             * Remove the old shadow that could
             * visually overlap page content.
             */

            elevation: 0,

            shadowOpacity: 0,

            shadowRadius: 0,

            shadowOffset: {
              width: 0,
              height: 0,
            },
          },


          /*
          |--------------------------------------------------------------------------
          | TAB ITEM
          |--------------------------------------------------------------------------
          */

          tabBarItemStyle: {

            paddingTop: 0,

            paddingBottom: 0,

            margin: 0,
          },


          /*
          |--------------------------------------------------------------------------
          | PAGE BACKGROUND
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
              homeLabel,


            tabBarIcon: ({
              focused,
            }) => (
              <TabIcon
                focused={focused}
                type={signedIn ? "home" : "shop"}
              />
            ),


            tabBarLabel: ({
              focused,
            }) => (
              <TabLabel
                focused={focused}
                isArabic={isArabic}
              >
                {homeLabel}
              </TabLabel>
            ),

          }}
        />


        {/*
        |--------------------------------------------------------------------------
        | MY PETS
        |--------------------------------------------------------------------------
        */}

        <Tabs.Screen
          name="pets"

          listeners={privateTab("/(tabs)/pets")}

          options={{

            title:
              isArabic
                ? "حيواناتي"
                : "My Pets",


            tabBarIcon: ({
              focused,
            }) => (
              <TabIcon
                focused={focused}
                type="pets"
              />
            ),


            tabBarLabel: ({
              focused,
            }) => (
              <TabLabel
                focused={focused}
                isArabic={isArabic}
              >
                {isArabic
                  ? "حيواناتي"
                  : "My Pets"}
              </TabLabel>
            ),

          }}
        />


        {/*
        |--------------------------------------------------------------------------
        | ACCOUNT
        |--------------------------------------------------------------------------
        */}

        <Tabs.Screen
          name="settings"

          listeners={privateTab("/(tabs)/settings")}

          options={{

            title:
              isArabic
                ? "حسابي"
                : "Account",


            tabBarIcon: ({
              focused,
            }) => (
              <TabIcon
                focused={focused}
                type="account"
              />
            ),


            tabBarLabel: ({
              focused,
            }) => (
              <TabLabel
                focused={focused}
                isArabic={isArabic}
              >
                {isArabic
                  ? "حسابي"
                  : "Account"}
              </TabLabel>
            ),

          }}
        />


        {/*
        |--------------------------------------------------------------------------
        | DELIVERIES
        |--------------------------------------------------------------------------
        |
        | Route available but hidden
        | from bottom navigation.
        |
        */}

        <Tabs.Screen
          name="orders"

          options={{
            href: null,

            title:
              isArabic
                ? "التوصيلات"
                : "Deliveries",
          }}
        />


        {/*
        |--------------------------------------------------------------------------
        | NOTIFICATIONS
        |--------------------------------------------------------------------------
        |
        | Route available but hidden
        | from bottom navigation.
        |
        */}

        <Tabs.Screen
          name="notifications"

          options={{
            href: null,

            title:
              isArabic
                ? "الإشعارات"
                : "Notifications",
          }}
        />
        <Tabs.Screen
          name="pet-form"
          options={{
            href: null,
            title: isArabic
              ? "الحيوان الأليف"
              : "Pet",
          }}
        />

        <Tabs.Screen
          name="saved-addresses"
          options={{
            href: null,
            title: isArabic
              ? "العناوين المحفوظة"
              : "Saved Addresses",
          }}
        />

        <Tabs.Screen
          name="personal-information"
          options={{
            href: null,
            title: isArabic
              ? "المعلومات الشخصية"
              : "Personal Information",
          }}
        />

        <Tabs.Screen
          name="change-password"
          options={{
            href: null,
            title: isArabic
              ? "تغيير كلمة المرور"
              : "Change Password",
          }}
        />
          <Tabs.Screen
          name="support-tickets"
          options={{
            href: null,
            title: isArabic
              ? "تذاكر الدعم"
              : "Support Tickets",
          }}
        />

                  <Tabs.Screen
          name="support-ticket"
          options={{
            href: null,
            title: isArabic
              ? "تذاكر الدعم"
              : "Support Tickets",
          }}
        />
          <Tabs.Screen
          name="help_knowledge-base"
          options={{
            href: null,
            title: isArabic
              ? "قاعدة المعرفة"
              : "Help Knowledge Base",
          }}
        />

        {/*
        |--------------------------------------------------------------------------
        | PLANS, PURCHASES & DELIVERIES
        |--------------------------------------------------------------------------
        |
        | Routes available but hidden from bottom navigation.
        |
        */}

        <Tabs.Screen
          name="plans"
          options={{
            href: null,
            title: isArabic
              ? "الباقات"
              : "Plans",
          }}
        />

        <Tabs.Screen
          name="purchase"
          options={{
            href: null,
            title: isArabic
              ? "الاشتراك"
              : "Subscription",
          }}
        />

        <Tabs.Screen
          name="distribute-package"
          options={{
            href: null,
            title: isArabic
              ? "توزيع الباقة"
              : "Distribute Package",
          }}
        />

        <Tabs.Screen
          name="manage-delivery"
          options={{
            href: null,
            title: isArabic
              ? "إدارة التوصيل"
              : "Manage Delivery",
          }}
        />

        <Tabs.Screen
          name="delivery-calendar"
          options={{
            href: null,
            title: isArabic
              ? "تقويم التوصيل"
              : "Delivery Calendar",
          }}
        />

        {/*
        |--------------------------------------------------------------------------
        | SHOP: CATALOG + PRODUCT + CHECKOUT (hidden)
        |--------------------------------------------------------------------------
        |
        | No "Shop" tab: visitors see the catalog on the Home tab.
        | /shop stays available for signed in customers.
        |
        */}

        <Tabs.Screen
          name="shop"
          options={{
            href: null,
            title: isArabic
              ? "المتجر"
              : "Shop",
          }}
        />

        <Tabs.Screen
          name="shop-product"
          options={{
            href: null,
            title: isArabic
              ? "الباقة"
              : "Plan",
          }}
        />

        <Tabs.Screen
          name="checkout"
          options={{
            href: null,
            title: isArabic
              ? "إتمام الطلب"
              : "Checkout",
          }}
        />

        <Tabs.Screen
          name="delivery-history"
          options={{
            href: null,
            title: isArabic
              ? "سجل التوصيل"
              : "Delivery History",
          }}
        />
      </Tabs>
      <AppUpdateChecker />
    </CustomerDataProvider>
  );
}


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({

  /*
  |--------------------------------------------------------------------------
  | ICON WRAPPER
  |--------------------------------------------------------------------------
  |
  | Important:
  |
  | There is no margin above this element.
  | The active indicator therefore starts
  | directly at the top of the navigation.
  |
  */

  iconWrapper: {

    width: 72,

    height: 32,

    alignItems: "center",

    justifyContent: "flex-end",

    position: "relative",

    paddingTop: 6,

    marginTop: 0,
  },


  /*
  |--------------------------------------------------------------------------
  | ICON
  |--------------------------------------------------------------------------
  */

  iconContainer: {

    height: 26,

    alignItems: "center",

    justifyContent: "center",
  },


  /*
  |--------------------------------------------------------------------------
  | ACTIVE INDICATOR
  |--------------------------------------------------------------------------
  */

  activeIndicator: {

    position: "absolute",

    top: 0,

    width: 28,

    height: 2,

    borderRadius: 2,

    backgroundColor:
      COLORS.primary,
  },


  /*
  |--------------------------------------------------------------------------
  | TAB LABEL
  |--------------------------------------------------------------------------
  */

  tabLabel: {

    fontFamily:
      "Cairo_400Regular",

    fontSize: 12,

    lineHeight: 17,

    textAlign: "center",

    /*
     * Space between icon and text.
     */

    marginTop: 5,

    marginBottom: 0,
  },


  /*
  |--------------------------------------------------------------------------
  | ACTIVE TAB LABEL
  |--------------------------------------------------------------------------
  |
  | Active text:
  | - Black
  | - Bold
  |
  */

  tabLabelActive: {

    fontFamily:
      "Cairo_700Bold",
  },


  /*
  |--------------------------------------------------------------------------
  | ARABIC
  |--------------------------------------------------------------------------
  */

  tabLabelArabic: {

    writingDirection: "rtl",
  },

});