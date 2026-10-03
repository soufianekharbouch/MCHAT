import React from "react";

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomerDataProvider } from "../../context/CustomerDataContext";
import { useAppLanguage } from "../../context/LanguageContext";
import MchatHeader from "../../components/MchatHeader";

const COLORS = {
  primary: "#2D6F5E",
  muted: "#7D7B70",
  white: "#FFFEFA",
  border: "#E7E2DA",
  background: "#F7F5F1",
};

export default function TabsLayout() {
  const { isArabic } = useAppLanguage();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <CustomerDataProvider>
      <Tabs
        screenOptions={{
          headerShown: true,
          header: () => <MchatHeader />,

          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.muted,

          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 58 + bottomPadding,
            paddingTop: 7,
            paddingBottom: bottomPadding,
            elevation: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
          },

          tabBarLabelStyle: {
            fontFamily: "Cairo_500Medium",
            fontSize: 10,
            lineHeight: 15,
            marginTop: 1,
          },

          tabBarItemStyle: {
            paddingVertical: 0,
          },

          sceneStyle: {
            backgroundColor: COLORS.background,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: isArabic ? "الرئيسية" : "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="pets"
          options={{
            title: isArabic ? "حيواناتي" : "My pets",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "paw" : "paw-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: isArabic ? "التوصيلات" : "Deliveries",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "car" : "car-outline"}
                size={23}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: isArabic ? "حسابي" : "My account",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={23}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="notifications"
          options={{
            title: isArabic ? "الإشعارات" : "Notifications",
            href: null,
          }}
        />
      </Tabs>
    </CustomerDataProvider>
  );
}
