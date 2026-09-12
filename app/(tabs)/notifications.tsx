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
} from "@expo/vector-icons";

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
  background:
    "#F7F4EF",

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

  unreadBg:
    "#ECF8F7",

  unreadBorder:
    "#BFE5E2",
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

          subtitle:
            "تابع آخر التنبيهات والمستجدات",

          empty:
            "لا توجد إشعارات حالياً",

          error:
            "تعذر تحميل الإشعارات",

          new:
            "جديد",

          read:
            "تمت القراءة",

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

          subtitle:
            "Stay updated with your latest notifications",

          empty:
            "No notifications yet",

          error:
            "Unable to load notifications",

          new:
            "New",

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


  /*
  |--------------------------------------------------------------------------
  | TITLE
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | BODY
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | DATE
  |--------------------------------------------------------------------------
  */

  const formatDate = (
    value?:
      string | null
  ) => {

    if (!value) {
      return "";
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;
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

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      date
    );
  };


  /*
  |--------------------------------------------------------------------------
  | LOAD
  |--------------------------------------------------------------------------
  */

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

        /*
        |--------------------------------------------------------------------------
        | MARK ALL UNREAD AS VIEWED
        |--------------------------------------------------------------------------
        */

        const unreadNotifications =
          list.filter(
            (
              notification
            ) =>
              !notification.viewed_at
          );

        if (
          unreadNotifications.length > 0
        ) {

          await Promise.all(
            unreadNotifications.map(
              (
                notification
              ) =>
                markNotificationViewedSafe(
                  notification.id
                )
            )
          );

          /*
           * Mise à jour locale immédiate.
           */

          const viewedAt =
            new Date()
              .toISOString();

          const updatedList =
            list.map(
              (
                notification
              ) => {

                if (
                  notification.viewed_at
                ) {
                  return notification;
                }

                return {
                  ...notification,

                  viewed_at:
                    viewedAt,
                };
              }
            );

          setNotifications(
            updatedList
          );

        } else {

          setNotifications(
            list
          );
        }

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

      loadNotifications();

    },
    [
      loadNotifications,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const handleRefresh =
    async () => {

      setRefreshing(
        true
      );


      await loadNotifications(
        true
      );
    };


  /*
  |--------------------------------------------------------------------------
  | MARK VIEWED
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | REMOVE
  |--------------------------------------------------------------------------
  */

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


      /*
       * Immediate UI removal.
       */

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

        /*
         * Restore if API fails.
         */

        setNotifications(
          original
        );
      }


      setRemovingId(
        null
      );
    };


  /*
  |--------------------------------------------------------------------------
  | CONFIRM REMOVE
  |--------------------------------------------------------------------------
  */

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

                removeNotification(
                  notificationId
                );
              },
          },
        ]
      );
    };


  /*
  |--------------------------------------------------------------------------
  | COUNT
  |--------------------------------------------------------------------------
  */

  const unreadCount =
    notifications
      .filter(
        (
          notification
        ) =>

          !notification
            .viewed_at
      )
      .length;


  /*
  |--------------------------------------------------------------------------
  | LOADER
  |--------------------------------------------------------------------------
  */

  if (
    loading
    &&
    notifications.length ===
      0
  ) {

    return (

      <SafeAreaView
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


  /*
  |--------------------------------------------------------------------------
  | SCREEN
  |--------------------------------------------------------------------------
  */

  return (

    <SafeAreaView
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

        {/* HEADER */}

        <View
          style={[
            styles.header,

            isArabic
            &&
            styles.rowRtl,
          ]}
        >

          <View
            style={
              styles.headerText
            }
          >

            <Text
              style={[
                styles.title,

                isArabic
                &&
                styles.textRtl,
              ]}
            >
              {t.title}
            </Text>


            <Text
              style={[
                styles.subtitle,

                isArabic
                &&
                styles.textRtl,
              ]}
            >
              {t.subtitle}
            </Text>

          </View>


          <View
            style={
              styles.headerIcon
            }
          >

            <Ionicons
              name=
                "notifications-outline"
              size={
                24
              }
              color={
                COLORS.primary
              }
            />


            {
              unreadCount > 0
              &&
              (

                <View
                  style={
                    styles.headerBadge
                  }
                >

                  <Text
                    style={
                      styles.headerBadgeText
                    }
                  >

                    {
                      unreadCount > 99
                        ? "99+"
                        : unreadCount
                    }

                  </Text>

                </View>
              )
            }

          </View>

        </View>


        {/* ERROR */}

        {
          !!error
          &&
          (

            <View
              style={[
                styles.errorBox,

                isArabic
                &&
                styles.rowRtl,
              ]}
            >

              <Ionicons
                name=
                  "alert-circle-outline"
                size={
                  20
                }
                color={
                  COLORS.coral
                }
              />


              <Text
                style={[
                  styles.errorText,

                  isArabic
                  &&
                  styles.textRtl,
                ]}
              >
                {error}
              </Text>

            </View>
          )
        }


        {/* EMPTY / LIST */}

        {
          notifications.length ===
          0

            ? (

              <View
                style={
                  styles.emptyBox
                }
              >

                <View
                  style={
                    styles.emptyIcon
                  }
                >

                  <Ionicons
                    name=
                      "notifications-off-outline"
                    size={
                      34
                    }
                    color={
                      COLORS.primary
                    }
                  />

                </View>


                <Text
                  style={[
                    styles.emptyText,

                    isArabic
                    &&
                    styles.textRtl,
                  ]}
                >
                  {t.empty}
                </Text>

              </View>
            )

            : (

              <View
                style={
                  styles.list
                }
              >

                {
                  notifications.map(
                    (
                      notification
                    ) => {

                      const unread =
                        !notification
                          .viewed_at;


                      const removing =
                        removingId ===
                        notification.id;


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

                            styles
                              .notificationCard,

                            unread
                            &&
                            styles
                              .notificationCardUnread,

                            pressed
                            &&
                            styles
                              .notificationCardPressed,

                            removing
                            &&
                            styles
                              .notificationCardRemoving,
                          ]}
                        >

                          <View
                            style={[
                              styles
                                .notificationRow,

                              isArabic
                              &&
                              styles
                                .rowRtl,
                            ]}
                          >

                            {/* ICON */}

                            <View
                              style={[
                                styles
                                  .notificationIcon,

                                unread
                                &&
                                styles
                                  .notificationIconUnread,
                              ]}
                            >

                              <Ionicons

                                name={
                                  unread
                                    ? "notifications"
                                    : "notifications-outline"
                                }

                                size={
                                  21
                                }

                                color={
                                  COLORS.primary
                                }
                              />

                            </View>


                            {/* CONTENT */}

                            <View
                              style={
                                styles
                                  .notificationContent
                              }
                            >

                              <View
                                style={[
                                  styles
                                    .notificationTitleRow,

                                  isArabic
                                  &&
                                  styles
                                    .rowRtl,
                                ]}
                              >

                                <Text
                                  style={[
                                    styles
                                      .notificationTitle,

                                    unread
                                    &&
                                    styles
                                      .notificationTitleUnread,

                                    isArabic
                                    &&
                                    styles
                                      .textRtl,
                                  ]}
                                >

                                  {
                                    getNotificationTitle(
                                      notification
                                    )
                                  }

                                </Text>


                                {
                                  unread
                                  &&
                                  (

                                    <View
                                      style={
                                        styles
                                          .unreadDot
                                      }
                                    />

                                  )
                                }


                                {/* REMOVE */}

                                <Pressable

                                  hitSlop={
                                    12
                                  }

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

                                    styles
                                      .deleteButton,

                                    pressed
                                    &&
                                    styles
                                      .deleteButtonPressed,
                                  ]}
                                >

                                  {
                                    removing
                                      ? (

                                        <ActivityIndicator
                                          size="small"
                                          color={
                                            COLORS.muted
                                          }
                                        />

                                      )
                                      : (

                                        <Ionicons
                                          name=
                                            "close"
                                          size={
                                            18
                                          }
                                          color={
                                            COLORS.muted
                                          }
                                        />

                                      )
                                  }

                                </Pressable>

                              </View>


                              <Text
                                style={[
                                  styles
                                    .notificationBody,

                                  isArabic
                                  &&
                                  styles
                                    .textRtl,
                                ]}
                              >

                                {
                                  getNotificationBody(
                                    notification
                                  )
                                }

                              </Text>


                              <View
                                style={[
                                  styles
                                    .notificationFooter,

                                  isArabic
                                  &&
                                  styles
                                    .rowRtl,
                                ]}
                              >

                                <Text
                                  style={
                                    styles
                                      .notificationDate
                                  }
                                >

                                  {
                                    formatDate(
                                      notification
                                        .sent_at
                                      ||
                                      notification
                                        .created_at
                                    )
                                  }

                                </Text>


                                <View
                                  style={[
                                    styles
                                      .statusBadge,

                                    unread
                                      ? styles
                                          .statusBadgeUnread
                                      : styles
                                          .statusBadgeRead,
                                  ]}
                                >

                                  <Text
                                    style={[
                                      styles
                                        .statusBadgeText,

                                      unread
                                        ? styles
                                            .statusBadgeTextUnread
                                        : styles
                                            .statusBadgeTextRead,
                                    ]}
                                  >

                                    {
                                      unread
                                        ? t.new
                                        : t.read
                                    }

                                  </Text>

                                </View>

                              </View>

                            </View>

                          </View>

                        </Pressable>
                      );
                    }
                  )
                }

              </View>
            )
        }

      </ScrollView>

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
      flex: 1,

      backgroundColor:
        COLORS.background,
    },


    page: {
      padding: 18,

      paddingBottom: 35,
    },


    loader: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    header: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 20,

      gap: 15,
    },


    headerText: {
      flex: 1,
    },


    title: {
      fontFamily:
        "Cairo_800ExtraBold",

      fontSize: 25,

      lineHeight: 36,

      color:
        COLORS.text,
    },


    subtitle: {
      marginTop: 2,

      fontFamily:
        "Cairo_400Regular",

      fontSize: 13,

      lineHeight: 22,

      color:
        COLORS.muted,
    },


    headerIcon: {
      width: 50,

      height: 50,

      borderRadius: 17,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems:
        "center",

      justifyContent:
        "center",

      position:
        "relative",
    },


    headerBadge: {
      position:
        "absolute",

      top: -5,

      right: -5,

      minWidth: 21,

      height: 21,

      borderRadius: 11,

      paddingHorizontal: 4,

      backgroundColor:
        COLORS.coral,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderWidth: 2,

      borderColor:
        COLORS.background,
    },


    headerBadgeText: {
      fontFamily:
        "Cairo_700Bold",

      fontSize: 8,

      lineHeight: 12,

      color:
        COLORS.white,
    },


    textRtl: {
      textAlign:
        "right",

      writingDirection:
        "rtl",
    },


    rowRtl: {
      flexDirection:
        "row-reverse",
    },


    errorBox: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      padding: 13,

      marginBottom: 15,

      borderRadius: 15,

      backgroundColor:
        "#FEF3F2",
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
      gap: 13,
    },


    notificationCard: {
      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 21,

      padding: 15,
    },


    notificationCardUnread: {
      backgroundColor:
        COLORS.unreadBg,

      borderColor:
        COLORS.unreadBorder,
    },


    notificationCardPressed: {
      opacity: 0.8,
    },


    notificationCardRemoving: {
      opacity: 0.55,
    },


    notificationRow: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 12,
    },


    notificationIcon: {
      width: 45,

      height: 45,

      borderRadius: 15,

      backgroundColor:
        "#F3F1EE",

      alignItems:
        "center",

      justifyContent:
        "center",

      flexShrink: 0,
    },


    notificationIconUnread: {
      backgroundColor:
        COLORS.white,
    },


    notificationContent: {
      flex: 1,
    },


    notificationTitleRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,
    },


    notificationTitle: {
      flex: 1,

      fontFamily:
        "Cairo_600SemiBold",

      fontSize: 14,

      lineHeight: 22,

      color:
        COLORS.text,
    },


    notificationTitleUnread: {
      fontFamily:
        "Cairo_700Bold",
    },


    unreadDot: {
      width: 8,

      height: 8,

      borderRadius: 4,

      backgroundColor:
        COLORS.coral,

      flexShrink: 0,
    },


    deleteButton: {
      width: 30,

      height: 30,

      borderRadius: 10,

      backgroundColor:
        "#F3F1EE",

      alignItems:
        "center",

      justifyContent:
        "center",

      flexShrink: 0,
    },


    deleteButtonPressed: {
      opacity: 0.6,
    },


    notificationBody: {
      marginTop: 3,

      fontFamily:
        "Cairo_400Regular",

      fontSize: 12,

      lineHeight: 20,

      color:
        COLORS.muted,
    },


    notificationFooter: {
      marginTop: 11,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      gap: 10,
    },


    notificationDate: {
      flexShrink: 1,

      fontFamily:
        "Cairo_400Regular",

      fontSize: 10,

      color:
        "#98938C",
    },


    statusBadge: {
      paddingHorizontal: 9,

      paddingVertical: 3,

      borderRadius: 10,
    },


    statusBadgeUnread: {
      backgroundColor:
        "#FFF1F2",
    },


    statusBadgeRead: {
      backgroundColor:
        "#EDF8F7",
    },


    statusBadgeText: {
      fontFamily:
        "Cairo_600SemiBold",

      fontSize: 9,
    },


    statusBadgeTextUnread: {
      color:
        COLORS.coral,
    },


    statusBadgeTextRead: {
      color:
        COLORS.primary,
    },


    emptyBox: {
      minHeight: 230,

      backgroundColor:
        COLORS.white,

      borderRadius: 22,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems:
        "center",

      justifyContent:
        "center",

      padding: 25,

      gap: 14,
    },


    emptyIcon: {
      width: 64,

      height: 64,

      borderRadius: 22,

      backgroundColor:
        "#ECF8F7",

      alignItems:
        "center",

      justifyContent:
        "center",
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