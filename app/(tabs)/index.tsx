import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import {
  router,
} from 'expo-router';
import * as SecureStore
  from 'expo-secure-store';
import {
  useAppLanguage,
} from '../../context/LanguageContext';
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
  border: '#DDD5CA',
  card: '#F5EBDD',
  delivery: '#EFF3EC',
  danger: '#B42318',
  dark: '#292929',
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
        } catch (error) {
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
    void checkPasswordStatus();
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
        welcomeBack: 'مرحباً بعودتك،',
        tasteLabel: 'عرض باقة التذوق',
        tasteTitle:
          'اكتشف المفضل لديهم. جرّب الوصفات الأربع.',
        tasteDescription:
          'أربع عبوات من الوصفات الطازجة، خطوة أولى لذيذة.',
        offerEnds: 'ينتهي العرض خلال',
        previewCountdown: 'معاينة العد التنازلي',
        days: 'أيام',
        hours: 'ساعات',
        mins: 'دقائق',
        secs: 'ثوانٍ',
        tasteButton: 'احصل على باقة التذوق · 49 KW',
        upcomingDelivery: 'التوصيل الطازج القادم',
        meals: 'وجبات',
        expectedWindow: 'الوقت المتوقع:',
        homeVilla: 'المنزل (فيلا)',
        editCutoff: 'آخر وقت للتعديل:',
        awaiting: '(بانتظار التأكيد النهائي)',
        manageDelivery: 'إدارة التوصيل',
        skipDate: 'تخطي التاريخ',
        yourPets: 'حيواناتك الأليفة',
        viewDetails: 'عرض التفاصيل',
        active: 'نشط',
        noSubscription: 'لا يوجد اشتراك',
        nextFreshDelivery: 'التوصيل الطازج القادم:',
        noScheduledMeals: 'لا توجد وجبات مجدولة',
        transitionEyebrow:
          'جديد على الطعام الطازج؟ ابدأ هنا',
        transitionTitle:
          'بداية لطيفة، وجبة واحدة في كل مرة.',
        transitionDescription:
          'اتبع دليل الانتقال خطوة بخطوة قبل أول وجبة طازجة لحيوانك.',
        transitionButton: 'فتح دليل الانتقال',
        recentUpdates: 'آخر التحديثات',
        viewAllNotifications: 'عرض كل الإشعارات',
        updateDeliveryTitle:
          'توصيل بارد قادم لـ',
        updateDeliveryBody:
          'وجبات مجدولة للتوصيل',
        transitionUpdate:
          'تقدم مرحلة الانتقال',
        twoHoursAgo: 'منذ ساعتين',
        yesterday: 'أمس',
        loadError:
          'تعذر تحميل بيانات الحساب',
      }
    : {
        welcomeBack: 'Welcome back,',
        tasteLabel: 'TASTE PACK OFFER',
        tasteTitle:
          'Find their favorite. Try all 4 recipes.',
        tasteDescription:
          'Four fresh recipe pouches, one delicious first step.',
        offerEnds: 'Offer ends in',
        previewCountdown: 'Preview countdown',
        days: 'days',
        hours: 'hours',
        mins: 'mins',
        secs: 'secs',
        tasteButton: 'Get the Taste Pack · KW 49',
        upcomingDelivery: 'UPCOMING FRESH DELIVERY',
        meals: 'meals',
        expectedWindow: 'Expected Window:',
        homeVilla: 'Home (Villa)',
        editCutoff: 'Edit cutoff:',
        awaiting: '(Awaiting final confirmation)',
        manageDelivery: 'Manage Delivery',
        skipDate: 'Skip Date',
        yourPets: 'Your Pets',
        viewDetails: 'View Details',
        active: 'Active',
        noSubscription: 'No Subscription',
        nextFreshDelivery: 'Next fresh delivery:',
        noScheduledMeals: 'No scheduled meals',
        transitionEyebrow:
          'NEW TO FRESH FOOD? START HERE',
        transitionTitle:
          'A gentle start, one meal at a time.',
        transitionDescription:
          'Follow your pet’s step-by-step transition guide before their first fresh meal.',
        transitionButton: 'Open Transition Guide',
        recentUpdates: 'Recent Updates',
        viewAllNotifications: 'View All Notifications',
        updateDeliveryTitle:
          'Upcoming Cold Delivery for',
        updateDeliveryBody:
          'meals scheduled for delivery',
        transitionUpdate:
          'Transition Milestone Progress',
        twoHoursAgo: '2 hours ago',
        yesterday: 'Yesterday',
        loadError:
          'Unable to load account data',
      };
  const pets =
    subscription?.animals || [];
  const orders =
    subscription?.orders || [];
  const firstName =
    subscription?.first_name || '';
  const lastName =
    subscription?.last_name || '';
  const fullName =
    `${firstName} ${lastName}`.trim();
  const upcomingOrders =
    useMemo(() => {
      return orders
        .filter((order: any) => {
          return (
            order.dashboard_status ===
              'planned' ||
            order.dashboard_status ===
              'prepared'
          );
        })
        .sort((a: any, b: any) => {
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
    }, [orders]);
  const nextOrder =
    upcomingOrders.length > 0
      ? upcomingOrders[0]
      : null;
  const nextPet =
    useMemo(() => {
      if (!nextOrder) {
        return pets[0] || null;
      }
      const orderAnimalId =
        (nextOrder as any)?.animal_id ??
        (nextOrder as any)?.animal?.id;
      if (orderAnimalId) {
        return (
          pets.find(
            (pet: any) =>
              Number(pet.id) ===
              Number(orderAnimalId)
          ) ||
          pets[0] ||
          null
        );
      }
      return pets[0] || null;
    }, [nextOrder, pets]);
  const mealCount =
    useMemo(() => {
      if (!nextOrder) {
        return 0;
      }
      const items =
        (nextOrder as any)?.items || [];
      return items.reduce(
        (
          total: number,
          item: any
        ) =>
          total +
          Number(item?.quantity || 0),
        0
      );
    }, [nextOrder]);
  const deliveryAddress =
    (nextOrder as any)?.address ||
    (nextOrder as any)?.delivery_address ||
    (subscription as any)?.subscriber_address ||
    '';
  const deliveryWindow =
    (nextOrder as any)?.delivery_window ||
    (nextOrder as any)?.time_slot ||
    '';
  const formatShortDate = (
    value?: string | null
  ) => {
    if (!value) {
      return '—';
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
      isArabic ? 'ar' : 'en',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }
    ).format(date);
  };
  const formatIsoDate = (
    value?: string | null
  ) => {
    return value || t.noScheduledMeals;
  };
  const petNextDate = (
    pet: any
  ) => {
    return (
      pet?.next_order?.scheduled_for ||
      pet?.orders?.find(
        (order: any) =>
          order?.dashboard_status ===
            'planned' ||
          order?.dashboard_status ===
            'prepared'
      )?.scheduled_for ||
      null
    );
  };
  const petIsActive = (
    pet: any
  ) =>
    pet?.subscription_status ===
      'active';
  const openPets = () => {
    router.push('/pets' as any);
  };
  const openNotifications = () => {
    router.push('/notifications' as any);
  };
  const openPet = (
    pet: any
  ) => {
    if (!pet?.id) {
      return;
    }
    router.push({
      pathname: '/pet-form',
      params: {
        id: String(pet.id),
      },
    } as any);
  };
  if (
    !passwordGuardReady ||
    (loading && !subscription)
  ) {
    return (
      <SafeAreaView
        edges={[
          'left',
          'right',
        ]}
        style={styles.safeArea}
      >
        <View
          style={styles.loader}
        >
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView
      edges={[
        'left',
        'right',
      ]}
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
            styles.welcome,
            isArabic &&
              styles.rowRtl,
          ]}
        >
          <View style={styles.flex}>
            <Text
              style={[
                styles.welcomeSmall,
                isArabic &&
                  styles.textRtl,
              ]}
            >
              {t.welcomeBack}
            </Text>
            <Text
              style={[
                styles.welcomeName,
                isArabic &&
                  styles.textRtl,
              ]}
            >
              {fullName || '—'}
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
              color={COLORS.danger}
            />
            <Text
              style={styles.errorText}
            >
              {error ||
                t.loadError}
            </Text>
          </View>
        )}
        <View
          style={styles.tasteCard}
        >
          <View
            style={[
              styles.tasteTop,
              isArabic &&
                styles.rowRtl,
            ]}
          >
            <Text
              style={styles.eyebrow}
            >
              {t.tasteLabel}
            </Text>
            <Text
              style={styles.price}
            >
              KW 49
            </Text>
          </View>
          <Text
            style={[
              styles.tasteTitle,
              isArabic &&
                styles.textRtl,
            ]}
          >
            {t.tasteTitle}
          </Text>
          <Text
            style={[
              styles.tasteDescription,
              isArabic &&
                styles.textRtl,
            ]}
          >
            {t.tasteDescription}
          </Text>
          <View
            style={[
              styles.countdownHeader,
              isArabic &&
                styles.rowRtl,
            ]}
          >
            <Text
              style={styles.countdownLabel}
            >
              {t.offerEnds}
            </Text>
            <Text
              style={styles.previewText}
            >
              {t.previewCountdown}
            </Text>
          </View>
          <View
            style={[
              styles.countdownRow,
              isArabic &&
                styles.rowRtl,
            ]}
          >
            <CountdownBox
              value="01"
              label={t.days}
            />
            <CountdownBox
              value="21"
              label={t.hours}
            />
            <CountdownBox
              value="23"
              label={t.mins}
            />
            <CountdownBox
              value="07"
              label={t.secs}
            />
          </View>
          <Pressable
            style={
              styles.tasteButton
            }
          >
            <Text
              style={
                styles.tasteButtonText
              }
            >
              {t.tasteButton}
            </Text>
          </Pressable>
        </View>
        {nextOrder && (
          <View
            style={
              styles.deliveryCard
            }
          >
            <View
              style={[
                styles.deliveryHeading,
                isArabic &&
                  styles.rowRtl,
              ]}
            >
              <Text
                style={
                  styles.deliveryEyebrow
                }
              >
                {t.upcomingDelivery}
              </Text>
              <Pressable
                style={[
                  styles.petMiniLink,
                  isArabic &&
                    styles.rowRtl,
                ]}
                onPress={() =>
                  nextPet &&
                  openPet(nextPet)
                }
              >
                <Ionicons
                  name={
                    isArabic
                      ? 'arrow-back'
                      : 'arrow-forward'
                  }
                  size={19}
                  color={
                    COLORS.primary
                  }
                />
                <Text
                  style={
                    styles.petMiniName
                  }
                >
                  {nextPet?.name ||
                    ''}
                </Text>
              </Pressable>
            </View>
            <View
              style={[
                styles.deliveryMain,
                isArabic &&
                  styles.rowRtl,
              ]}
            >
              <View style={styles.flex}>
                <Text
                  style={[
                    styles.deliveryDate,
                    isArabic &&
                      styles.textRtl,
                  ]}
                >
                  {formatShortDate(
                    (nextOrder as any)
                      .scheduled_for
                  )}
                </Text>
                <Text
                  style={[
                    styles.deliveryWindow,
                    isArabic &&
                      styles.textRtl,
                  ]}
                >
                  {t.expectedWindow}{' '}
                  {deliveryWindow ||
                    '—'}
                </Text>
              </View>
              <View
                style={
                  styles.mealCount
                }
              >
                <Text
                  style={
                    styles.mealNumber
                  }
                >
                  {mealCount || '—'}
                </Text>
                <Text
                  style={
                    styles.mealLabel
                  }
                >
                  {t.meals}
                </Text>
              </View>
            </View>
            <View
              style={
                styles.deliveryDivider
              }
            />
            <View
              style={[
                styles.addressRow,
                isArabic &&
                  styles.rowRtl,
              ]}
            >
              <Ionicons
                name="location-outline"
                size={23}
                color={
                  COLORS.primary
                }
              />
              <View style={styles.flex}>
                <Text
                  style={[
                    styles.addressTitle,
                    isArabic &&
                      styles.textRtl,
                  ]}
                >
                  {t.homeVilla}
                </Text>
                {!!deliveryAddress && (
                  <Text
                    style={[
                      styles.addressText,
                      isArabic &&
                        styles.textRtl,
                    ]}
                  >
                    {String(
                      deliveryAddress
                    )}
                  </Text>
                )}
              </View>
            </View>
            <View
              style={[
                styles.cutoffRow,
                isArabic &&
                  styles.rowRtl,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={18}
                color={COLORS.muted}
              />
              <Text
                style={[
                  styles.cutoffText,
                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {t.editCutoff}{' '}
                {(nextOrder as any)
                  ?.edit_cutoff ||
                  '—'}{' '}
                {t.awaiting}
              </Text>
            </View>
            <View
              style={[
                styles.deliveryActions,
                isArabic &&
                  styles.rowRtl,
              ]}
            >
              <Pressable
                style={
                  styles.manageButton
                }
              >
                <Ionicons
                  name={
                    isArabic
                      ? 'arrow-back'
                      : 'arrow-forward'
                  }
                  size={22}
                  color="#FFFFFF"
                />
                <Text
                  style={
                    styles.manageButtonText
                  }
                >
                  {t.manageDelivery}
                </Text>
              </Pressable>
              <Pressable
                style={
                  styles.skipButton
                }
                disabled
              >
                <Text
                  style={
                    styles.skipText
                  }
                >
                  {t.skipDate}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        <View
          style={styles.section}
        >
          <View
            style={[
              styles.sectionHeading,
              isArabic &&
                styles.rowRtl,
            ]}
          >
            <Text
              style={styles.sectionTitle}
            >
              {t.yourPets}
            </Text>
            <Pressable
              style={[
                styles.sectionLink,
                isArabic &&
                  styles.rowRtl,
              ]}
              onPress={openPets}
            >
              <Ionicons
                name={
                  isArabic
                    ? 'arrow-back'
                    : 'arrow-forward'
                }
                size={20}
                color={
                  COLORS.primary
                }
              />
              <Text
                style={
                  styles.sectionLinkText
                }
              >
                {t.viewDetails}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.petRow
            }
          >
            {pets.map(
              (pet: any) => {
                const active =
                  petIsActive(pet);
                const date =
                  petNextDate(pet);
                return (
                  <Pressable
                    key={String(
                      pet.id
                    )}
                    style={
                      styles.petCard
                    }
                    onPress={() =>
                      openPet(pet)
                    }
                  >
                    <View
                      style={
                        styles.petImage
                      }
                    >
                      {pet.photo_url ? (
                        <Image
                          source={{
                            uri:
                              pet.photo_url,
                          }}
                          style={
                            styles.fillImage
                          }
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="cat"
                          size={46}
                          color={
                            COLORS.primary
                          }
                        />
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={
                        styles.petName
                      }
                    >
                      {pet.name}
                    </Text>
                    <View
                      style={
                        styles.petStatusRow
                      }
                    >
                      <View
                        style={[
                          styles.petStatusDot,
                          !active &&
                            styles.petStatusDotOff,
                        ]}
                      />
                      <Text
                        numberOfLines={1}
                        style={
                          styles.petStatusText
                        }
                      >
                        {active
                          ? t.active
                          : t.noSubscription}
                      </Text>
                    </View>
                    <Text
                      style={
                        styles.petNextLabel
                      }
                    >
                      {t.nextFreshDelivery}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={
                        styles.petNextDate
                      }
                    >
                      {formatIsoDate(
                        date
                      )}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </ScrollView>
        </View>
        <View
          style={
            styles.transitionSection
          }
        >
          <View
            style={
              styles.transitionLine
            }
          />
          <Text
            style={[
              styles.transitionEyebrow,
              isArabic &&
                styles.textRtl,
            ]}
          >
            {t.transitionEyebrow}
          </Text>
          <Text
            style={[
              styles.transitionTitle,
              isArabic &&
                styles.textRtl,
            ]}
          >
            {t.transitionTitle}
          </Text>
          <Text
            style={[
              styles.transitionDescription,
              isArabic &&
                styles.textRtl,
            ]}
          >
            {t.transitionDescription}
          </Text>
          <Pressable
            style={
              styles.transitionButton
            }
          >
            <Ionicons
              name={
                isArabic
                  ? 'arrow-back'
                  : 'arrow-forward'
              }
              size={22}
              color="#FFFFFF"
            />
            <Text
              style={
                styles.transitionButtonText
              }
            >
              {t.transitionButton}
            </Text>
          </Pressable>
        </View>
        <View
          style={
            styles.updatesSection
          }
        >
          <View
            style={[
              styles.sectionHeading,
              isArabic &&
                styles.rowRtl,
            ]}
          >
            <Text
              style={styles.sectionTitle}
            >
              {t.recentUpdates}
            </Text>
            <Pressable
              onPress={
                openNotifications
              }
            >
              <Text
                style={
                  styles.notificationsLink
                }
              >
                {t.viewAllNotifications}
              </Text>
            </Pressable>
          </View>
          {nextOrder && (
            <UpdateRow
              icon="truck-outline"
              title={`${t.updateDeliveryTitle} ${nextPet?.name || ''}`}
              body={`${mealCount || '—'} ${t.updateDeliveryBody} ${formatIsoDate((nextOrder as any).scheduled_for)}${deliveryAddress ? ` to ${String(deliveryAddress)}` : ''}.`}
              time={t.twoHoursAgo}
              isArabic={isArabic}
            />
          )}
          {pets.length > 1 && (
            <UpdateRow
              customIcon="creation-outline"
              title={`${pets[1]?.name || ''}’s ${t.transitionUpdate}`}
              body={
                isArabic
                  ? 'تابع دليل الانتقال ونصائح التغذية الخاصة بحيوانك.'
                  : 'Check your guided feeding tips and fresh-food transition progress.'
              }
              time={t.yesterday}
              isArabic={isArabic}
              last
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function CountdownBox({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View
      style={styles.countdownBox}
    >
      <Text
        style={
          styles.countdownValue
        }
      >
        {value}
      </Text>
      <Text
        style={
          styles.countdownUnit
        }
      >
        {label}
      </Text>
    </View>
  );
}
function UpdateRow({
  icon,
  customIcon,
  title,
  body,
  time,
  isArabic,
  last = false,
}: {
  icon?: React.ComponentProps<
    typeof Ionicons
  >['name'];
  customIcon?: React.ComponentProps<
    typeof MaterialCommunityIcons
  >['name'];
  title: string;
  body: string;
  time: string;
  isArabic: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.updateRow,
        !last &&
          styles.updateBorder,
      ]}
    >
      <View
        style={[
          styles.updateMain,
          isArabic &&
            styles.rowRtl,
        ]}
      >
        <View
          style={
            styles.updateIcon
          }
        >
          {customIcon ? (
            <MaterialCommunityIcons
              name={customIcon}
              size={25}
              color={
                COLORS.primary
              }
            />
          ) : (
            <Ionicons
              name={
                icon ||
                'notifications-outline'
              }
              size={23}
              color={
                COLORS.primary
              }
            />
          )}
        </View>
        <View style={styles.flex}>
          <Text
            style={[
              styles.updateTitle,
              isArabic &&
                styles.textRtl,
            ]}
          >
            {title}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.updateBody,
              isArabic &&
                styles.textRtl,
            ]}
          >
            {body}
          </Text>
          <Text
            style={[
              styles.updateTime,
              isArabic &&
                styles.textRtl,
            ]}
          >
            {time}
          </Text>
        </View>
        <Ionicons
          name={
            isArabic
              ? 'arrow-back'
              : 'arrow-forward'
          }
          size={18}
          color={COLORS.muted}
        />
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
    flex: {
      flex: 1,
    },
    page: {
      paddingHorizontal: 23,
      paddingTop: 30,
      paddingBottom: 65,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowRtl: {
      flexDirection:
        'row-reverse',
    },
    textRtl: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    welcome: {
      flexDirection: 'row',
      marginBottom: 28,
    },
    welcomeSmall: {
      fontFamily:
        'Cairo_600SemiBold',
      fontSize: 15,
      lineHeight: 24,
      color: COLORS.muted,
    },
    welcomeName: {
      marginTop: 1,
      fontFamily:
        'Cairo_800ExtraBold',
      fontSize: 31,
      lineHeight: 41,
      color: COLORS.text,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      marginBottom: 16,
      borderRadius: 12,
      backgroundColor:
        '#FEF3F2',
    },
    errorText: {
      flex: 1,
      fontFamily:
        'Cairo_500Medium',
      fontSize: 12,
      color: COLORS.danger,
    },
    tasteCard: {
      paddingHorizontal: 25,
      paddingTop: 30,
      paddingBottom: 26,
      borderWidth: 1,
      borderColor: '#D8CBBB',
      borderRadius: 11,
      backgroundColor:
        COLORS.card,
      marginBottom: 34,
    },
    tasteTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 20,
    },
    eyebrow: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 12,
      letterSpacing: 1.6,
      color: COLORS.text,
    },
    price: {
      fontFamily:
        'Cairo_800ExtraBold',
      fontSize: 25,
      lineHeight: 32,
      color: COLORS.text,
    },
    tasteTitle: {
      maxWidth: 320,
      fontFamily:
        'Cairo_700Bold',
      fontSize: 25,
      lineHeight: 34,
      color: COLORS.text,
    },
    tasteDescription: {
      marginTop: 10,
      maxWidth: 315,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 15,
      lineHeight: 26,
      color: COLORS.muted,
    },
    countdownHeader: {
      marginTop: 24,
      marginBottom: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },
    countdownLabel: {
      fontFamily:
        'Cairo_500Medium',
      fontSize: 13,
      color: COLORS.text,
    },
    previewText: {
      fontFamily:
        'Cairo_400Regular',
      fontSize: 10,
      color: COLORS.muted,
    },
    countdownRow: {
      flexDirection: 'row',
      gap: 10,
    },
    countdownBox: {
      flex: 1,
      height: 80,
      borderWidth: 1,
      borderColor: '#D8D0C5',
      borderRadius: 8,
      backgroundColor:
        '#FBF9F5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    countdownValue: {
      fontFamily:
        'Cairo_500Medium',
      fontSize: 30,
      lineHeight: 37,
      color: COLORS.text,
    },
    countdownUnit: {
      marginTop: 2,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 10,
      color: COLORS.muted,
    },
    tasteButton: {
      minHeight: 61,
      marginTop: 22,
      borderWidth: 1,
      borderColor:
        '#B8D7D0',
      borderRadius: 10,
      backgroundColor:
        '#E8ECE3',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    tasteButtonText: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 14,
      color: COLORS.text,
      textAlign: 'center',
    },
    deliveryCard: {
      paddingHorizontal: 22,
      paddingTop: 29,
      paddingBottom: 22,
      borderWidth: 1,
      borderTopWidth: 3,
      borderColor: '#A8D7D1',
      borderTopColor:
        COLORS.primary,
      borderRadius: 5,
      backgroundColor:
        COLORS.delivery,
      marginBottom: 37,
    },
    deliveryHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 23,
    },
    deliveryEyebrow: {
      flexShrink: 1,
      fontFamily:
        'Cairo_700Bold',
      fontSize: 10,
      letterSpacing: 1.35,
      color: COLORS.text,
    },
    petMiniLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginLeft: 10,
    },
    petMiniName: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 14,
      color: COLORS.text,
    },
    deliveryMain: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deliveryDate: {
      fontFamily:
        'Cairo_800ExtraBold',
      fontSize: 34,
      lineHeight: 43,
      color: COLORS.text,
    },
    deliveryWindow: {
      marginTop: 10,
      fontFamily:
        'Cairo_600SemiBold',
      fontSize: 12,
      lineHeight: 20,
      color: COLORS.text,
    },
    mealCount: {
      width: 57,
      minHeight: 55,
      marginLeft: 12,
      borderLeftWidth: 1,
      borderLeftColor:
        '#A7D0CB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealNumber: {
      fontFamily:
        'Cairo_500Medium',
      fontSize: 31,
      lineHeight: 36,
      color: COLORS.text,
    },
    mealLabel: {
      fontFamily:
        'Cairo_400Regular',
      fontSize: 11,
      color: COLORS.text,
    },
    deliveryDivider: {
      height: 1,
      backgroundColor:
        '#C9DDD7',
      marginVertical: 19,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 10,
    },
    addressTitle: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 14,
      color: COLORS.text,
    },
    addressText: {
      marginTop: 2,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 12,
      lineHeight: 20,
      color: COLORS.muted,
    },
    cutoffRow: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 9,
      marginTop: 18,
    },
    cutoffText: {
      flex: 1,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 11,
      lineHeight: 19,
      color: COLORS.muted,
    },
    deliveryActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 20,
    },
    manageButton: {
      flex: 1,
      minHeight: 61,
      borderRadius: 10,
      backgroundColor:
        COLORS.dark,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 13,
      paddingHorizontal: 12,
    },
    manageButtonText: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 14,
      color: '#FFFFFF',
    },
    skipButton: {
      minWidth: 72,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipText: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 12,
      color: '#C9C9C5',
    },
    section: {
      marginBottom: 36,
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 12,
      marginBottom: 26,
    },
    sectionTitle: {
      flexShrink: 1,
      fontFamily:
        'Cairo_800ExtraBold',
      fontSize: 25,
      lineHeight: 34,
      color: COLORS.text,
    },
    sectionLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    sectionLinkText: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 13,
      color: COLORS.text,
    },
    petRow: {
      gap: 15,
      paddingRight: 1,
    },
    petCard: {
      width: 117,
    },
    petImage: {
      width: 117,
      height: 124,
      borderRadius: 56,
      borderBottomLeftRadius: 7,
      borderBottomRightRadius: 7,
      overflow: 'hidden',
      backgroundColor:
        '#E7F0ED',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fillImage: {
      width: '100%',
      height: '100%',
    },
    petName: {
      marginTop: 13,
      fontFamily:
        'Cairo_700Bold',
      fontSize: 20,
      lineHeight: 27,
      color: COLORS.text,
    },
    petStatusRow: {
      marginTop: 5,
      minHeight: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    petStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        COLORS.primary,
    },
    petStatusDotOff: {
      backgroundColor:
        '#D7D0C7',
    },
    petStatusText: {
      flexShrink: 1,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 9,
      color: COLORS.text,
    },
    petNextLabel: {
      marginTop: 14,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 10,
      color: COLORS.muted,
    },
    petNextDate: {
      marginTop: 2,
      fontFamily:
        'Cairo_500Medium',
      fontSize: 11,
      color: COLORS.text,
    },
    transitionSection: {
      marginBottom: 61,
    },
    transitionLine: {
      height: 2,
      backgroundColor:
        COLORS.primary,
      marginBottom: 27,
    },
    transitionEyebrow: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 11,
      letterSpacing: 1.8,
      color: COLORS.primary,
    },
    transitionTitle: {
      marginTop: 17,
      maxWidth: 355,
      fontFamily:
        'Cairo_800ExtraBold',
      fontSize: 30,
      lineHeight: 40,
      color: COLORS.text,
    },
    transitionDescription: {
      marginTop: 13,
      maxWidth: 355,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 15,
      lineHeight: 26,
      color: COLORS.muted,
    },
    transitionButton: {
      minHeight: 60,
      marginTop: 22,
      borderRadius: 10,
      backgroundColor:
        COLORS.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: 15,
    },
    transitionButtonText: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 14,
      color: '#FFFFFF',
    },
    updatesSection: {
      marginBottom: 10,
    },
    notificationsLink: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 12,
      color: COLORS.text,
      textAlign: 'right',
    },
    updateRow: {
      paddingVertical: 25,
    },
    updateBorder: {
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },
    updateMain: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 13,
    },
    updateIcon: {
      width: 26,
      alignItems: 'center',
      paddingTop: 3,
    },
    updateTitle: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 15,
      lineHeight: 22,
      color: COLORS.text,
    },
    updateBody: {
      marginTop: 3,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 14,
      lineHeight: 24,
      color: COLORS.muted,
    },
    updateTime: {
      marginTop: 8,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 11,
      color: COLORS.muted,
    },
  });
