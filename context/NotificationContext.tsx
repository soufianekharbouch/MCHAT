import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import * as SecureStore from "expo-secure-store";

import { useAppLanguage } from "../hooks/useAppLanguage";

const API_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

export type MobileNotification = {
  id: number;

  title?: string | null;
  body?: string | null;

  title_en?: string | null;
  title_ar?: string | null;

  body_en?: string | null;
  body_ar?: string | null;

  created_at?: string | null;
  sent_at?: string | null;

  viewed_at?: string | null;
};

type NotificationContextType = {
  notifications: MobileNotification[];

  loading: boolean;

  refreshing: boolean;

  error: string | null;

  unreadCount: number;

  refreshNotifications: () => Promise<void>;

  loadNotifications: (silent?: boolean) => Promise<void>;

  markAsViewed: (notificationId: number) => Promise<void>;

  getNotificationTitle: (notification: MobileNotification) => string;

  getNotificationBody: (notification: MobileNotification) => string;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isArabic } = useAppLanguage();

  const [notifications, setNotifications] = useState<MobileNotification[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const getNotificationTitle = useCallback(
    (notification: MobileNotification) => {
      if (notification.title) {
        return notification.title;
      }

      if (isArabic) {
        return notification.title_ar || notification.title_en || "";
      }

      return notification.title_en || notification.title_ar || "";
    },
    [isArabic],
  );

  const getNotificationBody = useCallback(
    (notification: MobileNotification) => {
      if (notification.body) {
        return notification.body;
      }

      if (isArabic) {
        return notification.body_ar || notification.body_en || "";
      }

      return notification.body_en || notification.body_ar || "";
    },
    [isArabic],
  );

  const loadNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      setError(null);

      const accessToken = await SecureStore.getItemAsync("access_token");

      const response = await fetch(`${API_URL}/notifications`, {
        method: "POST",

        headers: {
          Accept: "application/json",

          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          access_token: accessToken || null,
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid response from server");
      }

      if (!response.ok || data.success !== true) {
        throw new Error(data.message || "Unable to load notifications");
      }

      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : [],
      );
    } catch (err) {
      console.error("Load notifications error:", err);

      setError(
        err instanceof Error ? err.message : "Unable to load notifications",
      );
    } finally {
      setLoading(false);

      setRefreshing(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    setRefreshing(true);

    await loadNotifications(true);
  }, [loadNotifications]);

  const markAsViewed = useCallback(
    async (notificationId: number) => {
      const notification = notifications.find(
        (item) => item.id === notificationId,
      );

      if (!notification) {
        return;
      }

      if (notification.viewed_at) {
        return;
      }

      const temporaryViewedAt = new Date().toISOString();

      /*
       * Mise à jour immédiate de l'interface.
       */

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,

                viewed_at: temporaryViewedAt,
              }
            : item,
        ),
      );

      try {
        const accessToken = await SecureStore.getItemAsync("access_token");

        const response = await fetch(
          `${API_URL}/notifications/${notificationId}/view`,
          {
            method: "POST",

            headers: {
              Accept: "application/json",

              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              access_token: accessToken || null,
            }),
          },
        );

        let data;

        try {
          data = await response.json();
        } catch {
          throw new Error("Invalid response from server");
        }

        if (!response.ok || data.success !== true) {
          throw new Error(
            data.message || "Unable to mark notification as viewed",
          );
        }

        /*
         * Si Laravel retourne la vraie
         * date viewed_at, on l'utilise.
         */

        if (data.viewed_at) {
          setNotifications((current) =>
            current.map((item) =>
              item.id === notificationId
                ? {
                    ...item,

                    viewed_at: data.viewed_at,
                  }
                : item,
            ),
          );
        }
      } catch (err) {
        console.error("Mark notification viewed error:", err);

        /*
         * Rollback si Laravel échoue.
         */

        setNotifications((current) =>
          current.map((item) =>
            item.id === notificationId
              ? {
                  ...item,

                  viewed_at: null,
                }
              : item,
          ),
        );
      }
    },
    [notifications],
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.viewed_at).length,
    [notifications],
  );

  /*
   * Chargement initial.
   */

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /*
   * Quand la langue change,
   * les titres/body seront
   * automatiquement recalculés
   * par getNotificationTitle/body.
   *
   * Pas besoin de refaire l'API.
   */

  return (
    <NotificationContext.Provider
      value={{
        notifications,

        loading,

        refreshing,

        error,

        unreadCount,

        refreshNotifications,

        loadNotifications,

        markAsViewed,

        getNotificationTitle,

        getNotificationBody,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }

  return context;
}
