import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
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
  router,
} from 'expo-router';

import * as SecureStore
  from 'expo-secure-store';


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
  danger: '#B42318',
};


export default function HomeScreen() {

  const [
    passwordGuardReady,
    setPasswordGuardReady,
  ] = useState(false);


  useEffect(() => {

    let mounted = true;


    const checkPasswordStatus =
      async () => {

        try {

          const mustChangePassword =
            await SecureStore.getItemAsync(
              'must_change_password'
            );


          if (
            mustChangePassword === '1'
          ) {

            router.replace(
              '/change-password'
            );

            return;
          }

        } catch (
          error
        ) {

          console.warn(
            'Password guard error:',
            error
          );

        } finally {

          if (mounted) {

            setPasswordGuardReady(
              true
            );
          }
        }
      };


    checkPasswordStatus();


    return () => {

      mounted = false;

    };

  }, []);


  const {
    isArabic,
  } = useAppLanguage();


  const {
    subscription,
    loading,
    error,
    refresh,
  } = useCustomerData();


  const t = isArabic
    ? {
        welcome: 'مرحباً',
        subtitle: 'إليك ملخص حسابك',

        pets: 'حيواناتي',

        orders: 'الطلبات القادمة',

        points: 'نقاط الوفاء',

        nextOrder: 'الطلب القادم',

        noUpcomingOrder:
          'لا يوجد طلب قادم حالياً',

        unknownDate:
          'تاريخ غير محدد',

        planned:
          'مجدول',

        prepared:
          'قيد التحضير',

        shipped:
          'تم الشحن',

        delivered:
          'تم التوصيل',

        overdue:
          'متأخر',

        loadError:
          'تعذر تحميل بيانات الحساب',
      }
    : {
        welcome: 'Hello',
        subtitle: 'Here is your account summary',

        pets: 'My pets',

        orders: 'Upcoming orders',

        points: 'Loyalty points',

        nextOrder: 'Next order',

        noUpcomingOrder:
          'No upcoming order',

        unknownDate:
          'Date not available',

        planned:
          'Planned',

        prepared:
          'Preparing',

        shipped:
          'Shipped',

        delivered:
          'Delivered',

        overdue:
          'Overdue',

        loadError:
          'Unable to load account data',
      };


  const pets =
    subscription?.animals || [];


  const orders =
    subscription?.orders || [];


  const points =
    subscription?.valid_loyalty_points || 0;


  const firstName =
    subscription?.first_name || '';


  const lastName =
    subscription?.last_name || '';


  const fullName =
    `${firstName} ${lastName}`.trim();


  const upcomingOrders =
    orders
      .filter((order) => {

        return (
          order.dashboard_status ===
            'planned' ||
          order.dashboard_status ===
            'prepared'
        );

      })
      .sort((a, b) => {

        const dateA =
          a.scheduled_for
            ? new Date(
                `${a.scheduled_for}T00:00:00`
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

        const dateB =
          b.scheduled_for
            ? new Date(
                `${b.scheduled_for}T00:00:00`
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

        return dateA - dateB;

      });


  const nextOrder =
    upcomingOrders.length > 0
      ? upcomingOrders[0]
      : null;


  const getStatusLabel = (
    status?: string
  ) => {

    switch (status) {

      case 'prepared':
        return t.prepared;

      case 'shipped':
        return t.shipped;

      case 'delivered':
        return t.delivered;

      case 'overdue':
        return t.overdue;

      case 'planned':
      default:
        return t.planned;

    }

  };


  const formatDate = (
    value?: string | null
  ) => {

    if (!value) {
      return t.unknownDate;
    }


    const date =
      new Date(
        `${value}T00:00:00`
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
        ? 'ar'
        : 'en',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    ).format(date);

  };


  if (!passwordGuardReady) {

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

        <View
          style={[
            styles.intro,
            isArabic &&
              styles.rtl,
          ]}
        >

          <View
            style={
              styles.introText
            }
          >

            <Text
              style={[
                styles.title,
                isArabic &&
                  styles.textRtl,
              ]}
            >

              {t.welcome}
              {fullName
                ? ` ${fullName}`
                : ''}

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

          </View>

        </View>


        {!!error && (

          <View
            style={styles.errorBox}
          >

            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={
                COLORS.danger
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
          style={
            styles.statsGrid
          }
        >

          <StatCard
            icon="paw"
            label={t.pets}
            value={String(
              pets.length
            )}
          />


          <StatCard
            icon="bag-handle"
            label={t.orders}
            value={String(
              upcomingOrders.length
            )}
          />


          <StatCard
            icon="gift"
            label={t.points}
            value={String(
              points
            )}
          />

        </View>


        {nextOrder ? (

          <View
            style={
              styles.orderCard
            }
          >

            <View
              style={[
                styles.orderHeader,
                isArabic &&
                  styles.rtl,
              ]}
            >

              <View
                style={
                  styles.orderIcon
                }
              >

                <Ionicons
                  name="cube-outline"
                  size={24}
                  color={
                    COLORS.primary
                  }
                />

              </View>


              <View
                style={
                  styles.orderText
                }
              >

                <Text
                  style={[
                    styles.orderTitle,
                    isArabic &&
                      styles.textRtl,
                  ]}
                >
                  {t.nextOrder}
                </Text>


                <Text
                  style={[
                    styles.orderDate,
                    isArabic &&
                      styles.textRtl,
                  ]}
                >
                  {formatDate(
                    nextOrder
                      .scheduled_for
                  )}
                </Text>

              </View>

            </View>


            <View
              style={[
                styles.statusBadge,
                isArabic &&
                  styles.statusBadgeRtl,
              ]}
            >

              <Text
                style={
                  styles.statusText
                }
              >
                {getStatusLabel(
                  nextOrder
                    .dashboard_status
                )}
              </Text>

            </View>

          </View>

        ) : (

          <View
            style={
              styles.orderCard
            }
          >

            <View
              style={[
                styles.emptyOrder,
                isArabic &&
                  styles.rtl,
              ]}
            >

              <View
                style={
                  styles.orderIcon
                }
              >

                <Ionicons
                  name="cube-outline"
                  size={24}
                  color={
                    COLORS.primary
                  }
                />

              </View>


              <Text
                style={[
                  styles.emptyOrderText,
                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {t.noUpcomingOrder}
              </Text>

            </View>

          </View>

        )}

      </ScrollView>

    </SafeAreaView>

  );

}


function StatCard({
  icon,
  label,
  value,
}: {
  icon:
    | 'paw'
    | 'bag-handle'
    | 'gift';

  label: string;

  value: string;
}) {

  return (

    <View
      style={styles.statCard}
    >

      <View
        style={styles.statIcon}
      >

        <Ionicons
          name={icon}
          size={21}
          color={
            COLORS.primary
          }
        />

      </View>


      <Text
        style={styles.statValue}
      >
        {value}
      </Text>


      <Text
        style={styles.statLabel}
      >
        {label}
      </Text>

    </View>

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


    intro: {
      marginBottom: 20,
    },


    introText: {
      flex: 1,
    },


    rtl: {
      flexDirection:
        'row-reverse',
    },


    textRtl: {
      textAlign:
        'right',

      writingDirection:
        'rtl',
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

      fontFamily:
        'Cairo_400Regular',

      fontSize: 13,

      lineHeight: 22,

      color:
        COLORS.muted,
    },


    statsGrid: {
      flexDirection:
        'row',

      gap: 4,

      marginBottom: 12,
    },


    statCard: {
      flex: 1,

      minHeight: 132,

      backgroundColor:
        COLORS.white,

      borderRadius: 20,

      padding: 13,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    statIcon: {
      width: 38,

      height: 38,

      borderRadius: 13,

      backgroundColor:
        '#ECF8F7',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 8,
    },


    statValue: {
      fontFamily:
        'Cairo_800ExtraBold',

      fontSize: 20,

      color:
        COLORS.text,
    },


    statLabel: {
      marginTop: 1,

      fontFamily:
        'Cairo_500Medium',

      fontSize: 10,

      textAlign:
        'center',

      color:
        COLORS.muted,
    },


    orderCard: {
      backgroundColor:
        COLORS.white,

      borderRadius: 22,

      padding: 18,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    orderHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 12,
    },


    orderIcon: {
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


    orderText: {
      flex: 1,
    },


    orderTitle: {
      fontFamily:
        'Cairo_700Bold',

      fontSize: 16,

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
      marginTop: 15,

      alignSelf:
        'flex-start',

      backgroundColor:
        '#FFF1F2',

      paddingHorizontal: 12,

      paddingVertical: 6,

      borderRadius: 12,
    },


    statusBadgeRtl: {
      alignSelf:
        'flex-end',
    },


    statusText: {
      fontFamily:
        'Cairo_600SemiBold',

      fontSize: 11,

      color:
        COLORS.coral,
    },


    emptyOrder: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 12,
    },


    emptyOrderText: {
      flex: 1,

      fontFamily:
        'Cairo_500Medium',

      fontSize: 13,

      color:
        COLORS.muted,
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
        COLORS.danger,
    },

  });