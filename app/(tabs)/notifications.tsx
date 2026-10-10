import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import {
  router,
} from "expo-router";

import {
  dismissNotificationSafe,
  getNotifications,
  markNotificationViewedSafe,
  type MobileNotification,
} from "../../services/notificationApi";

import {
  useAppLanguage,
} from "../../hooks/useAppLanguage";


const COLORS = {
  background: "#F7F4EF",
  primary: "#249B97",
  coral: "#EB6268",
  text: "#272727",
  muted: "#77736D",
  border: "#DDD5CA",
  danger: "#B42318",
};


export default function NotificationsScreen() {

  const {
    isArabic,
  } = useAppLanguage();

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      MobileNotification[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    removingId,
    setRemovingId,
  ] =
    useState<
      number | null
    >(null);

  const t =
    isArabic
      ? {
          title:
            "الإشعارات",
          back:
            "رجوع",
          markAllRead:
            "تحديد الكل كمقروء",
          empty:
            "لا توجد إشعارات حالياً",
          error:
            "تعذر تحميل الإشعارات",
          read:
            "مقروء",
          deleteTitle:
            "حذف الإشعار",
          deleteMessage:
            "هل تريد إزالة هذا الإشعار؟",
          cancel:
            "إلغاء",
          remove:
            "حذف",
        }
      : {
          title:
            "Notifications",
          back:
            "Back",
          markAllRead:
            "Mark All as Read",
          empty:
            "No notifications yet",
          error:
            "Unable to load notifications",
          read:
            "Read",
          deleteTitle:
            "Remove notification",
          deleteMessage:
            "Do you want to remove this notification?",
          cancel:
            "Cancel",
          remove:
            "Remove",
        };


  const getNotificationTitle = (
    notification:
      MobileNotification
  ) => {

    if (
      notification.title
    ) {
      return notification.title;
    }

    if (isArabic) {
      return (
        notification.title_ar
        ||
        notification.title_en
        ||
        ""
      );
    }

    return (
      notification.title_en
      ||
      notification.title_ar
      ||
      ""
    );
  };


  const getNotificationBody = (
    notification:
      MobileNotification
  ) => {

    if (
      notification.body
    ) {
      return notification.body;
    }

    if (isArabic) {
      return (
        notification.body_ar
        ||
        notification.body_en
        ||
        ""
      );
    }

    return (
      notification.body_en
      ||
      notification.body_ar
      ||
      ""
    );
  };


  const formatDate = (
    value?:
      string | null
  ) => {

    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    const now =
      new Date();

    const diffMs =
      now.getTime() -
      date.getTime();

    const diffMinutes =
      Math.floor(
        diffMs /
        60000
      );

    const diffHours =
      Math.floor(
        diffMs /
        3600000
      );

    const startToday =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

    const startDate =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

    const diffDays =
      Math.round(
        (
          startToday.getTime() -
          startDate.getTime()
        ) /
        86400000
      );

    if (
      diffMinutes >= 0 &&
      diffMinutes < 60
    ) {
      if (isArabic) {
        return diffMinutes <= 1
          ? "الآن"
          : `منذ ${diffMinutes} دقيقة`;
      }

      return diffMinutes <= 1
        ? "Just now"
        : `${diffMinutes} mins ago`;
    }

    if (
      diffHours >= 0 &&
      diffHours < 24 &&
      diffDays === 0
    ) {
      if (isArabic) {
        return `منذ ${diffHours} ساعة`;
      }

      return `${diffHours} ${
        diffHours === 1
          ? "hour"
          : "hours"
      } ago`;
    }

    if (diffDays === 1) {
      return isArabic
        ? "أمس"
        : "Yesterday";
    }

    return new Intl.DateTimeFormat(
      isArabic
        ? "ar"
        : "en",
      {
        day:
          "numeric",
        month:
          "short",
      }
    ).format(date);
  };


  const loadNotifications =
    useCallback(
      async (
        silent = false
      ) => {

        try {

          if (!silent) {
            setLoading(true);
          }

          setError(null);

          const data =
            await getNotifications();

          const list =
            Array.isArray(data)
              ? data
              : [];

          setNotifications(
            list
          );

        } catch (err) {

          console.error(
            "Notifications error:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : t.error
          );

        } finally {

          setLoading(false);

          setRefreshing(false);
        }
      },
      [
        isArabic,
      ]
    );


  useEffect(
    () => {
      void loadNotifications();
    },
    [
      loadNotifications,
    ]
  );


  const handleRefresh =
    async () => {

      setRefreshing(
        true
      );

      await loadNotifications(
        true
      );
    };


  const markAsViewed =
    async (
      notification:
        MobileNotification
    ) => {

      if (
        notification.viewed_at
      ) {
        return;
      }

      const viewedAt =
        new Date()
          .toISOString();

      setNotifications(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    viewed_at:
                      viewedAt,
                  }
                : item
          )
      );

      const success =
        await markNotificationViewedSafe(
          notification.id
        );

      if (!success) {
        setNotifications(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      viewed_at:
                        null,
                    }
                  : item
            )
        );
      }
    };


  const markAllAsRead =
    async () => {

      const unread =
        notifications.filter(
          (
            notification
          ) =>
            !notification
              .viewed_at
        );

      if (
        unread.length === 0
      ) {
        return;
      }

      const viewedAt =
        new Date()
          .toISOString();

      setNotifications(
        (
          current
        ) =>
          current.map(
            (
              notification
            ) =>
              notification
                .viewed_at
                ? notification
                : {
                    ...notification,
                    viewed_at:
                      viewedAt,
                  }
          )
      );

      const results =
        await Promise.all(
          unread.map(
            (
              notification
            ) =>
              markNotificationViewedSafe(
                notification.id
              )
          )
        );

      if (
        results.some(
          (
            success
          ) =>
            !success
        )
      ) {
        await loadNotifications(
          true
        );
      }
    };


  const removeNotification =
    async (
      notificationId:
        number
    ) => {

      if (
        removingId !==
        null
      ) {
        return;
      }

      setRemovingId(
        notificationId
      );

      const original =
        notifications;

      setNotifications(
        (
          current
        ) =>
          current.filter(
            (
              notification
            ) =>
              notification.id !==
              notificationId
          )
      );

      const success =
        await dismissNotificationSafe(
          notificationId
        );

      if (!success) {
        setNotifications(
          original
        );
      }

      setRemovingId(
        null
      );
    };


  const confirmRemove =
    (
      notificationId:
        number
    ) => {

      Alert.alert(
        t.deleteTitle,
        t.deleteMessage,
        [
          {
            text:
              t.cancel,
            style:
              "cancel",
          },
          {
            text:
              t.remove,
            style:
              "destructive",
            onPress:
              () => {
                void removeNotification(
                  notificationId
                );
              },
          },
        ]
      );
    };


  const getNotificationIcon = (
    notification:
      MobileNotification
  ) => {

    const text =
      `${getNotificationTitle(notification)} ${getNotificationBody(notification)}`
        .toLowerCase();

    if (
      text.includes("delivery") ||
      text.includes("توصيل")
    ) {
      return {
        family:
          "material" as const,
        name:
          "truck-outline" as const,
      };
    }

    if (
      text.includes("transition") ||
      text.includes("milestone") ||
      text.includes("انتقال")
    ) {
      return {
        family:
          "material" as const,
        name:
          "creation-outline" as const,
      };
    }

    if (
      text.includes("point") ||
      text.includes("credit") ||
      text.includes("نقاط")
    ) {
      return {
        family:
          "material" as const,
        name:
          "medal-outline" as const,
      };
    }

    if (
      text.includes("nutrition") ||
      text.includes("ticket") ||
      text.includes("reply") ||
      text.includes("تغذ")
    ) {
      return {
        family:
          "ion" as const,
        name:
          "headset-outline" as const,
      };
    }

    return {
      family:
        "ion" as const,
      name:
        "notifications-outline" as const,
    };
  };


  if (
    loading &&
    notifications.length ===
      0
  ) {

    return (
      <SafeAreaView
        edges={[
          "left",
          "right",
        ]}
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.loader
          }
        >
          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView
      edges={[
        "left",
        "right",
      ]}
      style={
        styles.safeArea
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.page
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor={
              COLORS.primary
            }
            colors={[
              COLORS.primary,
            ]}
          />
        }
      >

        <Pressable
          style={[
            styles.backButton,
            isArabic &&
              styles.rowRtl,
          ]}
          onPress={
            () => router.back()
          }
        >
          <Ionicons
            name={
              isArabic
                ? "arrow-forward"
                : "arrow-back"
            }
            size={19}
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.backText
            }
          >
            {t.back}
          </Text>
        </Pressable>


        <Text
          style={[
            styles.title,
            isArabic &&
              styles.textRtl,
          ]}
        >
          {t.title}
        </Text>


        <View
          style={[
            styles.markAllRow,
            isArabic &&
              styles.rowRtl,
          ]}
        >
          <Pressable
            style={[
              styles.markAllButton,
              isArabic &&
                styles.rowRtl,
            ]}
            onPress={
              markAllAsRead
            }
          >
            <Ionicons
              name="checkmark"
              size={22}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.markAllText
              }
            >
              {t.markAllRead}
            </Text>
          </Pressable>
        </View>


        <View
          style={
            styles.topDivider
          }
        />


        {!!error && (
          <View
            style={
              styles.errorBox
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={
                COLORS.coral
              }
            />

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        )}


        {notifications.length ===
        0 ? (

          <View
            style={
              styles.emptyBox
            }
          >
            <Ionicons
              name="notifications-off-outline"
              size={34}
              color={
                COLORS.primary
              }
            />

            <Text
              style={[
                styles.emptyText,
                isArabic &&
                  styles.textRtl,
              ]}
            >
              {t.empty}
            </Text>
          </View>

        ) : (

          <View
            style={
              styles.list
            }
          >
            {notifications.map(
              (
                notification,
                index
              ) => {

                const removing =
                  removingId ===
                  notification.id;

                const icon =
                  getNotificationIcon(
                    notification
                  );

                const dateText =
                  formatDate(
                    notification
                      .sent_at ||
                    notification
                      .created_at
                  );

                return (
                  <Pressable
                    key={
                      notification.id
                    }
                    onPress={
                      () =>
                        markAsViewed(
                          notification
                        )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.notificationItem,
                      index ===
                        notifications.length -
                          1 &&
                        styles.lastNotificationItem,
                      pressed &&
                        styles.notificationPressed,
                      removing &&
                        styles.notificationRemoving,
                    ]}
                  >
                    <View
                      style={[
                        styles.notificationRow,
                        isArabic &&
                          styles.rowRtl,
                      ]}
                    >

                      <View
                        style={
                          styles.notificationIcon
                        }
                      >
                        {icon.family ===
                        "material" ? (
                          <MaterialCommunityIcons
                            name={
                              icon.name as any
                            }
                            size={22}
                            color={
                              COLORS.muted
                            }
                          />
                        ) : (
                          <Ionicons
                            name={
                              icon.name as any
                            }
                            size={21}
                            color={
                              COLORS.muted
                            }
                          />
                        )}
                      </View>


                      <View
                        style={
                          styles.notificationContent
                        }
                      >
                        <Text
                          style={[
                            styles.notificationTitle,
                            isArabic &&
                              styles.textRtl,
                          ]}
                        >
                          {getNotificationTitle(
                            notification
                          )}
                        </Text>

                        <Text
                          style={[
                            styles.notificationBody,
                            isArabic &&
                              styles.textRtl,
                          ]}
                        >
                          {getNotificationBody(
                            notification
                          )}
                        </Text>

                        <View
                          style={[
                            styles.notificationMeta,
                            isArabic &&
                              styles.rowRtl,
                          ]}
                        >
                          {!!dateText && (
                            <Text
                              style={
                                styles.notificationDate
                              }
                            >
                              {dateText}
                            </Text>
                          )}

                          {!!dateText && (
                            <Text
                              style={
                                styles.metaDot
                              }
                            >
                              •
                            </Text>
                          )}

                          <Text
                            style={
                              styles.notificationDate
                            }
                          >
                            {t.read}
                          </Text>
                        </View>
                      </View>


                      <Pressable
                        hitSlop={12}
                        disabled={
                          removing
                        }
                        onPress={(
                          event
                        ) => {
                          event
                            .stopPropagation();

                          confirmRemove(
                            notification.id
                          );
                        }}
                        style={({
                          pressed,
                        }) => [
                          styles.deleteButton,
                          pressed &&
                            styles.deleteButtonPressed,
                        ]}
                      >
                        {removing ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              COLORS.muted
                            }
                          />
                        ) : (
                          <Ionicons
                            name="trash-outline"
                            size={19}
                            color={
                              COLORS.muted
                            }
                          />
                        )}
                      </Pressable>

                    </View>
                  </Pressable>
                );
              }
            )}
          </View>

        )}

      </ScrollView>
    </SafeAreaView>
  );
}


const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    page: {
      paddingHorizontal: 24,
      paddingTop: 36,
      paddingBottom: 60,
    },

    loader: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    rowRtl: {
      flexDirection:
        "row-reverse",
    },

    textRtl: {
      textAlign:
        "right",
      writingDirection:
        "rtl",
    },

    backButton: {
      alignSelf:
        "flex-start",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
      marginBottom: 43,
    },

    backText: {
      fontFamily:
        "Cairo_700Bold",
      fontSize: 14,
      color:
        COLORS.text,
    },

    title: {
      fontFamily:
        "Cairo_800ExtraBold",
      fontSize: 35,
      lineHeight: 45,
      color:
        COLORS.text,
    },

    markAllRow: {
      flexDirection:
        "row",
      justifyContent:
        "flex-end",
      marginTop: 29,
      marginBottom: 35,
    },

    markAllButton: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    markAllText: {
      fontFamily:
        "Cairo_700Bold",
      fontSize: 14,
      color:
        COLORS.text,
    },

    topDivider: {
      height: 1,
      backgroundColor:
        COLORS.border,
    },

    errorBox: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    errorText: {
      flex: 1,
      fontFamily:
        "Cairo_500Medium",
      fontSize: 12,
      color:
        COLORS.coral,
    },

    list: {
      width: "100%",
    },

    notificationItem: {
      paddingVertical: 38,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    lastNotificationItem: {
      borderBottomWidth: 0,
    },

    notificationPressed: {
      opacity: 0.7,
    },

    notificationRemoving: {
      opacity: 0.45,
    },

    notificationRow: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
    },

    notificationIcon: {
      width: 33,
      paddingTop: 4,
      alignItems:
        "flex-start",
      flexShrink: 0,
    },

    notificationContent: {
      flex: 1,
      paddingRight: 10,
    },

    notificationTitle: {
      fontFamily:
        "Cairo_700Bold",
      fontSize: 17,
      lineHeight: 25,
      color:
        COLORS.text,
    },

    notificationBody: {
      marginTop: 22,
      fontFamily:
        "Cairo_400Regular",
      fontSize: 15,
      lineHeight: 28,
      color:
        COLORS.muted,
    },

    notificationMeta: {
      marginTop: 20,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
    },

    notificationDate: {
      fontFamily:
        "Cairo_400Regular",
      fontSize: 12,
      color:
        COLORS.muted,
    },

    metaDot: {
      fontFamily:
        "Cairo_400Regular",
      fontSize: 12,
      color:
        COLORS.muted,
    },

    deleteButton: {
      width: 31,
      height: 31,
      alignItems:
        "flex-end",
      justifyContent:
        "flex-start",
      paddingTop: 2,
      flexShrink: 0,
    },

    deleteButtonPressed: {
      opacity: 0.5,
    },

    emptyBox: {
      minHeight: 260,
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 14,
      padding: 25,
    },

    emptyText: {
      fontFamily:
        "Cairo_500Medium",
      fontSize: 13,
      lineHeight: 22,
      color:
        COLORS.muted,
      textAlign:
        "center",
    },

  });
