import React, {
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useAppLanguage,
} from '../../hooks/useAppLanguage';

import {
  useCustomerData,
} from '../../context/CustomerDataContext';


const COLORS = {
  background: '#F7F4EF',
  primary: '#249B97',
  coral: '#EB6268',
  text: '#272727',
  muted: '#77736D',
  white: '#FFFFFF',
  border: '#E5E0D9',

  greenBg: '#ECF8F7',
  greenText: '#249B97',

  redBg: '#FFF1F2',
  redText: '#EB6268',

  orangeBg: '#FFF7E8',
  orangeText: '#D97706',

  activeTabBg: '#249B97',
};


type OrderTab =
  | 'upcoming'
  | 'delivered'
  | 'overdue';


export default function OrdersScreen() {

  const {
    isArabic,
  } = useAppLanguage();


  const {
    subscription,
    loading,
    error,
    refresh,
  } = useCustomerData();


  const [
    activeTab,
    setActiveTab,
  ] = useState<OrderTab>(
    'upcoming'
  );


  const t = isArabic
    ? {
        title: 'الطلبات',

        subtitle:
          'تابع طلباتك الحالية والسابقة',

        upcoming:
          'القادمة',

        delivered:
          'تم التوصيل',

        overdue:
          'المتأخرة',

        order:
          'طلب',

        planned:
          'مجدول',

        preparing:
          'قيد التحضير',

        outForDelivery:
          'قيد التوصيل',

        deliveredStatus:
          'تم التوصيل',

        overdueStatus:
          'متأخر',

        noUpcoming:
          'لا توجد طلبات قادمة',

        noDelivered:
          'لا توجد طلبات تم توصيلها',

        noOverdue:
          'لا توجد طلبات متأخرة',

        unknownDate:
          'تاريخ غير محدد',

        loadError:
          'تعذر تحميل الطلبات',
      }
    : {
        title:
          'Orders',

        subtitle:
          'Track your current and previous orders',

        upcoming:
          'Upcoming',

        delivered:
          'Delivered',

        overdue:
          'Overdue',

        order:
          'Order',

        planned:
          'Planned',

        preparing:
          'Preparing',

        outForDelivery:
          'Out for delivery',

        deliveredStatus:
          'Delivered',

        overdueStatus:
          'Overdue',

        noUpcoming:
          'No upcoming orders',

        noDelivered:
          'No delivered orders',

        noOverdue:
          'No overdue orders',

        unknownDate:
          'Date not available',

        loadError:
          'Unable to load orders',
      };


  const orders =
    subscription?.orders || [];


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  const getOrderDate = (
    value?: string | null
  ) => {

    if (!value) {
      return null;
    }


    const date =
      new Date(
        `${value}T00:00:00`
      );


    date.setHours(
      0,
      0,
      0,
      0
    );


    return date;

  };


  const isToday = (
    value?: string | null
  ) => {

    const date =
      getOrderDate(value);


    if (!date) {
      return false;
    }


    return (
      date.getTime() ===
      today.getTime()
    );

  };


  const upcomingOrders =
    useMemo(() => {

      return orders
        .filter((order) => {

          const date =
            getOrderDate(
              order.scheduled_for
            );


          if (!date) {
            return false;
          }


          const status =
            String(
              order.status || ''
            ).toLowerCase();


          /*
           * Planned + today/future
           */
          if (
            status === 'planned'
            &&
            date.getTime() >=
              today.getTime()
          ) {
            return true;
          }


          /*
           * Prepared + today
           * => still upcoming,
           * but "Out for delivery"
           */
          if (
            status === 'prepared'
            &&
            date.getTime() ===
              today.getTime()
          ) {
            return true;
          }


          return false;

        })
        .sort((a, b) => {

          const dateA =
            getOrderDate(
              a.scheduled_for
            );

          const dateB =
            getOrderDate(
              b.scheduled_for
            );


          return (
            (
              dateA?.getTime()
              ??
              Number.MAX_SAFE_INTEGER
            )
            -
            (
              dateB?.getTime()
              ??
              Number.MAX_SAFE_INTEGER
            )
          );

        });

    }, [
      orders,
      today.getTime(),
    ]);


  const deliveredOrders =
    useMemo(() => {

      return orders
        .filter((order) => {

          const date =
            getOrderDate(
              order.scheduled_for
            );


          if (!date) {
            return false;
          }


          const status =
            String(
              order.status || ''
            ).toLowerCase();


          return (
            status === 'prepared'
            &&
            date.getTime() <
              today.getTime()
          );

        })
        .sort((a, b) => {

          const dateA =
            getOrderDate(
              a.scheduled_for
            );

          const dateB =
            getOrderDate(
              b.scheduled_for
            );


          return (
            (
              dateB?.getTime()
              ??
              0
            )
            -
            (
              dateA?.getTime()
              ??
              0
            )
          );

        });

    }, [
      orders,
      today.getTime(),
    ]);


  const overdueOrders =
    useMemo(() => {

      return orders
        .filter((order) => {

          const date =
            getOrderDate(
              order.scheduled_for
            );


          if (!date) {
            return false;
          }


          const status =
            String(
              order.status || ''
            ).toLowerCase();


          return (
            status === 'planned'
            &&
            date.getTime() <
              today.getTime()
          );

        })
        .sort((a, b) => {

          const dateA =
            getOrderDate(
              a.scheduled_for
            );

          const dateB =
            getOrderDate(
              b.scheduled_for
            );


          return (
            (
              dateB?.getTime()
              ??
              0
            )
            -
            (
              dateA?.getTime()
              ??
              0
            )
          );

        });

    }, [
      orders,
      today.getTime(),
    ]);


  const displayedOrders =
    activeTab === 'upcoming'
      ? upcomingOrders
      : activeTab === 'delivered'
        ? deliveredOrders
        : overdueOrders;


  const getEmptyText = () => {

    if (
      activeTab ===
      'upcoming'
    ) {
      return t.noUpcoming;
    }


    if (
      activeTab ===
      'delivered'
    ) {
      return t.noDelivered;
    }


    return t.noOverdue;

  };


  const formatDate = (
    value?: string | null
  ) => {

    if (!value) {
      return t.unknownDate;
    }


    const date =
      getOrderDate(value);


    if (!date) {
      return value;
    }


    return new Intl.DateTimeFormat(
      isArabic
        ? 'ar'
        : 'en',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    ).format(date);

  };


  const getStatusInfo = (
    order: any
  ) => {

    const status =
      String(
        order.status || ''
      ).toLowerCase();


    /*
     * Prepared today
     */
    if (
      status === 'prepared'
      &&
      isToday(
        order.scheduled_for
      )
    ) {

      return {
        label:
          t.outForDelivery,

        badgeStyle:
          styles.statusDelivery,

        textStyle:
          styles.deliveryText,
      };

    }


    if (
      activeTab ===
      'delivered'
    ) {

      return {
        label:
          t.deliveredStatus,

        badgeStyle:
          styles.statusDelivered,

        textStyle:
          styles.deliveredText,
      };

    }


    if (
      activeTab ===
      'overdue'
    ) {

      return {
        label:
          t.overdueStatus,

        badgeStyle:
          styles.statusOverdue,

        textStyle:
          styles.overdueText,
      };

    }


    return {
      label:
        t.planned,

      badgeStyle:
        styles.statusPreparing,

      textStyle:
        styles.preparingText,
    };

  };


  const handleTabPress =
    async (
      tab: OrderTab
    ) => {

      setActiveTab(tab);

      /*
       * Reload data from API
       * every time user changes tab
       */
      await refresh();

    };


  if (
    loading &&
    !subscription
  ) {

    return (

      <SafeAreaView
        style={styles.safeArea}
      >

        <View
          style={styles.loader}
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
      style={styles.safeArea}
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
            refreshing={loading}
            onRefresh={refresh}
            tintColor={
              COLORS.primary
            }
            colors={[
              COLORS.primary,
            ]}
          />
        }

      >

        <Text
          style={[
            styles.title,
            isArabic &&
              styles.textRtl,
          ]}
        >
          {t.title}
        </Text>


        <Text
          style={[
            styles.subtitle,
            isArabic &&
              styles.textRtl,
          ]}
        >
          {t.subtitle}
        </Text>


        {!!error && (

          <View
            style={styles.errorBox}
          >

            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={
                COLORS.coral
              }
            />

            <Text
              style={[
                styles.errorText,
                isArabic &&
                  styles.textRtl,
              ]}
            >
              {error ||
                t.loadError}
            </Text>

          </View>

        )}


        <View
          style={[
            styles.tabs,
            isArabic &&
              styles.rowRtl,
          ]}
        >

<OrderTabButton
  icon="time-outline"
  label={t.upcoming}
  count={upcomingOrders.length}
  active={
    activeTab === 'upcoming'
  }
  onPress={() =>
    handleTabPress('upcoming')
  }
/>

<OrderTabButton
  icon="checkmark-circle-outline"
  label={t.delivered}
  count={deliveredOrders.length}
  active={
    activeTab === 'delivered'
  }
  onPress={() =>
    handleTabPress('delivered')
  }
/>

<OrderTabButton
  icon="alert-circle-outline"
  label={t.overdue}
  count={overdueOrders.length}
  active={
    activeTab === 'overdue'
  }
  onPress={() =>
    handleTabPress('overdue')
  }
/>

        </View>


        {loading && (

          <View
            style={
              styles.refreshLoader
            }
          >

            <ActivityIndicator
              size="small"
              color={
                COLORS.primary
              }
            />

          </View>

        )}


        {displayedOrders.length ===
        0 ? (

          <View
            style={
              styles.emptyBox
            }
          >

            <Ionicons
              name="bag-handle-outline"
              size={40}
              color={
                COLORS.muted
              }
            />

            <Text
              style={[
                styles.emptyText,
                isArabic &&
                  styles.textRtl,
              ]}
            >
              {getEmptyText()}
            </Text>

          </View>

        ) : (

          <View
            style={
              styles.list
            }
          >

            {displayedOrders.map(
              (order) => {

                const statusInfo =
                  getStatusInfo(
                    order
                  );


                return (

                  <View
                    key={
                      order.id
                    }
                    style={
                      styles.orderCard
                    }
                  >

                    <View
                      style={[
                        styles.orderTop,
                        isArabic &&
                          styles.rowRtl,
                      ]}
                    >

                      <View
                        style={
                          styles.iconBox
                        }
                      >

                        <Ionicons
                          name="bag-handle-outline"
                          size={23}
                          color={
                            COLORS.primary
                          }
                        />

                      </View>


                      <View
                        style={
                          styles.orderMain
                        }
                      >

                        <Text
                          style={[
                            styles.orderId,
                            isArabic &&
                              styles.textRtl,
                          ]}
                        >
                          {t.order}{' '}
                          #{order.id}
                        </Text>


                        <Text
                          style={[
                            styles.orderDate,
                            isArabic &&
                              styles.textRtl,
                          ]}
                        >
                          {formatDate(
                            order.scheduled_for
                          )}
                        </Text>

                      </View>

                    </View>


                    <View
                      style={[
                        styles.statusBadge,
                        statusInfo
                          .badgeStyle,
                        isArabic &&
                          styles.statusBadgeRtl,
                      ]}
                    >

                      <Text
                        style={[
                          styles.statusText,
                          statusInfo
                            .textStyle,
                        ]}
                      >
                        {
                          statusInfo
                            .label
                        }
                      </Text>

                    </View>

                  </View>

                );

              }
            )}

          </View>

        )}

      </ScrollView>

    </SafeAreaView>

  );

}


function OrderTabButton({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon:
    | 'time-outline'
    | 'checkmark-circle-outline'
    | 'alert-circle-outline';

  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabButton,
        active &&
          styles.tabButtonActive,
      ]}
    >

      <View style={styles.tabIconWrap}>

        <Ionicons
          name={icon}
          size={21}
          color={
            active
              ? COLORS.white
              : COLORS.primary
          }
        />

      </View>

      <Text
        style={[
          styles.tabLabel,
          active &&
            styles.tabLabelActive,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>

      <View
        style={[
          styles.tabCount,
          active &&
            styles.tabCountActive,
        ]}
      >
        <Text
          style={[
            styles.tabCountText,
            active &&
              styles.tabCountTextActive,
          ]}
        >
          {count}
        </Text>
      </View>

    </Pressable>
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
      padding: 18,

      paddingBottom: 30,
    },


    loader: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    title: {
      fontFamily:
        'Cairo_800ExtraBold',

      fontSize: 25,

      lineHeight: 36,

      color:
        COLORS.text,
    },


    subtitle: {
      marginTop: 2,

      marginBottom: 18,

      fontFamily:
        'Cairo_400Regular',

      fontSize: 13,

      lineHeight: 22,

      color:
        COLORS.muted,
    },


    textRtl: {
      textAlign:
        'right',

      writingDirection:
        'rtl',
    },


    rowRtl: {
      flexDirection:
        'row-reverse',
    },


tabs: {
  flexDirection: 'row',
  gap: 7,
  marginBottom: 18,
},

tabButton: {
  flex: 1,

  minHeight: 82,

  position: 'relative',

  borderRadius: 16,

  backgroundColor:
    COLORS.white,

  borderWidth: 1,

  borderColor:
    COLORS.border,

  alignItems: 'center',

  justifyContent: 'center',

  paddingHorizontal: 5,

  paddingVertical: 9,
},

tabButtonActive: {
  backgroundColor:
    COLORS.activeTabBg,

  borderColor:
    COLORS.activeTabBg,
},

tabIconWrap: {
  height: 25,

  alignItems: 'center',

  justifyContent: 'center',

  marginBottom: 3,
},

tabLabel: {
  width: '100%',

  fontFamily:
    'Cairo_700Bold',

  fontSize: 12,

  lineHeight: 19,

  textAlign: 'center',

  color:
    COLORS.muted,
},

tabLabelActive: {
  color:
    COLORS.white,
},

tabCount: {
  position: 'absolute',

  top: 6,

  right: 6,

  minWidth: 20,

  height: 20,

  paddingHorizontal: 5,

  borderRadius: 10,

  backgroundColor:
    '#F0EEEB',

  alignItems: 'center',

  justifyContent: 'center',
},

tabCountActive: {
  backgroundColor:
    'rgba(255,255,255,0.22)',
},

tabCountText: {
  fontFamily:
    'Cairo_700Bold',

  fontSize: 9,

  lineHeight: 14,

  color:
    COLORS.text,
},

tabCountTextActive: {
  color:
    COLORS.white,
},


 

    refreshLoader: {
      height: 30,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    list: {
      gap: 14,
    },


    orderCard: {
      backgroundColor:
        COLORS.white,

      borderRadius: 22,

      padding: 17,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    orderTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 12,
    },


    iconBox: {
      width: 48,

      height: 48,

      borderRadius: 16,

      backgroundColor:
        '#ECF8F7',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    orderMain: {
      flex: 1,
    },


    orderId: {
      fontFamily:
        'Cairo_700Bold',

      fontSize: 15,

      color:
        COLORS.text,
    },


    orderDate: {
      marginTop: 2,

      fontFamily:
        'Cairo_400Regular',

      fontSize: 12,

      color:
        COLORS.muted,
    },


    statusBadge: {
      alignSelf:
        'flex-start',

      marginTop: 14,

      paddingHorizontal: 12,

      paddingVertical: 6,

      borderRadius: 12,
    },


    statusBadgeRtl: {
      alignSelf:
        'flex-end',
    },


    statusPreparing: {
      backgroundColor:
        COLORS.greenBg,
    },


    statusDelivered: {
      backgroundColor:
        COLORS.greenBg,
    },


    statusOverdue: {
      backgroundColor:
        COLORS.redBg,
    },


    statusDelivery: {
      backgroundColor:
        COLORS.orangeBg,
    },


    statusText: {
      fontFamily:
        'Cairo_600SemiBold',

      fontSize: 11,
    },


    preparingText: {
      color:
        COLORS.greenText,
    },


    deliveredText: {
      color:
        COLORS.greenText,
    },


    overdueText: {
      color:
        COLORS.redText,
    },


    deliveryText: {
      color:
        COLORS.orangeText,
    },


    emptyBox: {
      minHeight: 200,

      backgroundColor:
        COLORS.white,

      borderRadius: 22,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 12,

      padding: 25,
    },


    emptyText: {
      fontFamily:
        'Cairo_500Medium',

      fontSize: 13,

      color:
        COLORS.muted,

      textAlign:
        'center',
    },


    errorBox: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      padding: 12,

      marginBottom: 14,

      borderRadius: 14,

      backgroundColor:
        '#FEF3F2',
    },


    errorText: {
      flex: 1,

      fontFamily:
        'Cairo_500Medium',

      fontSize: 12,

      color:
        COLORS.coral,
    },

  });