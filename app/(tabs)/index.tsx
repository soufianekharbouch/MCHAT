import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  useFocusEffect,
} from 'expo-router';
import { getStoredItem } from '../../services/storage';
import {
  useAppLanguage,
} from '../../context/LanguageContext';
import {
  useCustomerData,
} from '../../context/CustomerDataContext';
import {
  fetchProducts,
  fetchPurchases,
} from '../../services/purchaseApi';
import type {
  CatalogAnimal,
  Product,
  PurchaseSummary,
} from '../../types/purchase';
import TrialOfferCard from '../../components/purchase/TrialOfferCard';
import {
  formatDate,
} from '../../components/purchase/purchaseUtils';
import ShopCatalog from "../../components/shop/ShopCatalog";
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
            await getStoredItem(
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
    isGuest,
  } = useCustomerData();

  /*
   * Packs (purchases) of all pets: status, next delivery
   * and "Choose a plan" button of each pet card.
   */
  const [
    purchases,
    setPurchases,
  ] = useState<PurchaseSummary[]>([]);
  const loadPurchases =
    useCallback(async () => {
      if (isGuest) {
        setPurchases([]);
        return;
      }
      try {
        setPurchases(
          await fetchPurchases(
            isArabic ? 'ar' : 'en'
          )
        );
      } catch (purchaseError) {
        console.error(
          'Unable to load purchases:',
          purchaseError
        );
      }
    }, [isArabic, isGuest]);
  useFocusEffect(
    useCallback(() => {
      void loadPurchases();
    }, [loadPurchases])
  );
  /*
   * Saved addresses (label of the delivery address).
   */
  const [
    addresses,
    setAddresses,
  ] = useState<any[]>([]);
  const loadAddresses =
    useCallback(async () => {
      try {
        const token =
          await getStoredItem(
            'access_token'
          );
        if (!token) {
          return;
        }
        const response = await fetch(
          'https://animal-care2.kharbouch-soufiane.com/api/mobile/settings/addresses',
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              access_token: token,
              lang: isArabic ? 'ar' : 'en',
            }),
          }
        );
        const data = await response.json();
        if (
          response.ok &&
          Array.isArray(data?.addresses)
        ) {
          setAddresses(data.addresses);
        }
      } catch (addressError) {
        console.error(
          'Unable to load addresses:',
          addressError
        );
      }
    }, [isArabic]);
  useFocusEffect(
    useCallback(() => {
      void loadAddresses();
    }, [loadAddresses])
  );
  /*
   * Trial offers: pets with a trial pack still running
   * + packs with a "price during trial" (same API as the plans page).
   */
  const [
    catalog,
    setCatalog,
  ] = useState<CatalogAnimal[]>([]);
  const loadCatalog =
    useCallback(async () => {
      if (isGuest) {
        setCatalog([]);
        return;
      }
      try {
        const data = await fetchProducts(
          isArabic ? 'ar' : 'en'
        );
        setCatalog(data.animals || []);
      } catch (catalogError) {
        console.error(
          'Unable to load trial offers:',
          catalogError
        );
      }
    }, [isArabic, isGuest]);
  useFocusEffect(
    useCallback(() => {
      void loadCatalog();
    }, [loadCatalog])
  );
  const trialOffers = useMemo(
    () =>
      catalog
        .filter(animal => !!animal.trial)
        .map(animal => ({
          animal,
          offers: animal.products
            .filter((product: Product) => product.trial_offer?.active && product.can_purchase)
            .sort((a: Product, b: Product) => b.discount_percent - a.discount_percent),
        }))
        .filter(item => item.offers.length > 0),
    [catalog]
  );
  const refreshAll = () => {
    void refresh();
    void loadPurchases();
    void loadAddresses();
    void loadCatalog();
  };
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
        deliveryAddressLabel: 'عنوان التوصيل',
        editCutoff: 'آخر وقت للتعديل:',
        awaiting: '(لا يزال بإمكانك التعديل)',
        cutoffPassed: '(انتهت مهلة التعديل)',
        at: 'الساعة',
        sixPm: '6:00 مساءً',
        fullAddress: 'العنوان الكامل',
        notes: 'ملاحظات',
        deliveryTime: 'وقت التوصيل',
        manageDelivery: 'إدارة التوصيل',
        skipDate: 'تخطي التاريخ',
        yourPets: 'حيواناتك الأليفة',
        noPetsTitle: 'لا توجد حيوانات أليفة بعد',
        noPetsText: 'أضف حيوانك الأليف لاختيار باقة وجباته الطازجة.',
        addNewPet: 'إضافة حيوان أليف جديد',
        viewDetails: 'عرض التفاصيل',
        active: 'نشط',
        noSubscription: 'لا يوجد اشتراك نشط',
        pendingPayment: 'بانتظار الدفع',
        choosePlan: 'اختيار باقة',
        planDeliveries: 'جدولة التوصيل',
        viewOrder: 'عرض الطلب',
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
        deliveryAddressLabel: 'Delivery address',
        editCutoff: 'Edit cutoff:',
        awaiting: '(you can still edit)',
        cutoffPassed: '(editing closed)',
        at: 'at',
        sixPm: '6:00 PM',
        fullAddress: 'Full address',
        notes: 'Notes',
        deliveryTime: 'Delivery time',
        manageDelivery: 'Manage Delivery',
        skipDate: 'Skip Date',
        yourPets: 'Your Pets',
        noPetsTitle: 'No pets yet',
        noPetsText: 'Add your pet to choose their fresh meal plan.',
        addNewPet: 'Add New Pet',
        viewDetails: 'View Details',
        active: 'Active',
        noSubscription: 'No active plan',
        pendingPayment: 'Awaiting payment',
        choosePlan: 'Choose a plan',
        planDeliveries: 'Plan deliveries',
        viewOrder: 'View order',
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
  /*
   * Address of the next delivery:
   *  1. address object sent with the order (label, address...)
   *  2. saved address with the same id as the order
   *  3. default saved address
   *  4. old subscription address (text)
   */
  const orderAddress =
    (nextOrder as any)?.address ??
    (nextOrder as any)?.delivery_address ??
    null;
  const orderAddressId =
    (nextOrder as any)?.customer_address_id ??
    (nextOrder as any)?.address_id ??
    (typeof orderAddress === 'object'
      ? orderAddress?.id
      : null) ??
    null;
  const savedAddress =
    (orderAddressId
      ? addresses.find(
          (address: any) =>
            Number(address.id) ===
            Number(orderAddressId)
        )
      : null) ??
    addresses.find(
      (address: any) =>
        Boolean(address.is_default)
    ) ??
    addresses[0] ??
    null;
  const addressSource =
    orderAddress &&
    typeof orderAddress === 'object'
      ? orderAddress
      : savedAddress;
  const deliveryAddressTitle =
    addressSource?.label ||
    (nextOrder as any)?.address_label ||
    t.deliveryAddressLabel;
  const deliveryAddress =
    addressSource
      ? [
          addressSource.address,
          addressSource.zone_label ??
            addressSource.city,
          addressSource.province_label ??
            addressSource.province,
        ]
          .filter(
            (value: any) =>
              typeof value === 'string' &&
              value.trim()
          )
          .join(isArabic ? '، ' : ', ')
      : typeof orderAddress === 'string'
        ? orderAddress
        : (subscription as any)?.subscriber_address ||
          '';
  /*
   * Expected window = delivery slot of the address
   * ("09:00-12:00" -> "09:00 - 12:00").
   */
  const deliveryWindow = String(
    addressSource?.delivery_slot ||
    (nextOrder as any)?.delivery_slot ||
    (nextOrder as any)?.delivery_window ||
    (nextOrder as any)?.time_slot ||
    ''
  ).replace('-', ' - ');

  /*
   * Edit cutoff = 18:00 the day before the delivery.
   */
  const cutoffDate = useMemo(() => {
    const value = (nextOrder as any)?.scheduled_for;
    if (!value) {
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (!match) {
      return null;
    }
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]) - 1,
      18,
      0,
      0
    );
  }, [nextOrder]);
  const cutoffPassed =
    !!cutoffDate &&
    Date.now() >= cutoffDate.getTime();
  const cutoffLabel = cutoffDate
    ? `${new Intl.DateTimeFormat(
        isArabic ? 'ar' : 'en',
        {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }
      ).format(cutoffDate)} ${t.at} ${t.sixPm}`
    : '—';

  /*
   * Info bubble with the full address (tap on the label).
   */
  const [
    addressInfoVisible,
    setAddressInfoVisible,
  ] = useState(false);
  const fullAddressLines = addressSource
    ? [
        addressSource.address,
        addressSource.zone_label ??
          addressSource.city,
        addressSource.province_label ??
          addressSource.province,
        addressSource.postal_code,
        addressSource.country,
      ].filter(
        (value: any) =>
          typeof value === 'string' &&
          value.trim()
      )
    : deliveryAddress
      ? [String(deliveryAddress)]
      : [];
  const addressNote =
    typeof addressSource?.note === 'string'
      ? addressSource.note.trim()
      : '';
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
  /*
   * Best plan of a pet: active/paid first, then pending.
   */
  const planFor = (
    pet: any
  ): PurchaseSummary | null => {
    const ofPet = purchases.filter(
      purchase =>
        Number(purchase.animal?.id) ===
        Number(pet?.id)
    );
    return (
      ofPet.find(purchase => purchase.is_active) ??
      ofPet.find(purchase => purchase.status === 'pending') ??
      null
    );
  };
  /*
   * Old back-office subscription: "active" only if the pet
   * still has an upcoming planned order.
   */
  const legacyNextDate = (
    pet: any
  ): string | null =>
    pet?.subscription_status === 'active'
      ? pet?.next_order?.scheduled_for ||
        pet?.orders?.find(
          (order: any) =>
            order?.dashboard_status ===
              'planned' ||
            order?.dashboard_status ===
              'prepared'
        )?.scheduled_for ||
        null
      : null;
  const petIsActive = (
    pet: any
  ) =>
    !!planFor(pet)?.is_active ||
    !!legacyNextDate(pet);
  const petIsPending = (
    pet: any
  ) =>
    !petIsActive(pet) &&
    planFor(pet)?.status === 'pending';
  const petNextDate = (
    pet: any
  ): string | null => {
    const date =
      planFor(pet)?.next_delivery?.date ||
      legacyNextDate(pet);
    return date
      ? formatDate(date, isArabic)
      : null;
  };
  const openPlans = (
    pet: any
  ) => {
    router.push({
      pathname: '/plans',
      params: {
        animalId: String(pet.id),
      },
    } as any);
  };
  const openOrder = (
    purchase: PurchaseSummary
  ) => {
    router.push({
      pathname: '/purchase',
      params: {
        id: String(purchase.id),
      },
    } as any);
  };
  const openPets = () => {
    router.push('/pets' as any);
  };
  const openAddPet = () => {
    router.push('/pet-form' as any);
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
  /*
   * 1 or 2 pets: cards share the screen width.
   * 3 pets or more: horizontal scrolling.
   */
  const fitPets =
    pets.length > 0 &&
    pets.length <= 2;
  const renderPetCard = (pet: any) => {
    const active = petIsActive(pet);
    const pending = petIsPending(pet);
    const plan = planFor(pet);
    const date = petNextDate(pet);

    // One pet: photo (50%) + info side by side, button full width below
    const single = pets.length === 1;

    const isDog =
      String(pet.species || '').toLowerCase() === 'dog';

    const onPlanPress = () => {
      if (active && plan) {
        router.push({
          pathname: '/distribute-package',
          params: { id: String(plan.id) },
        } as any);
      } else if (pending && plan) {
        openOrder(plan);
      } else {
        openPlans(pet);
      }
    };

    const photo = (
      <View
        style={[
          styles.petImage,
          fitPets && styles.petImageFit,
          single && styles.petImageSingle,
        ]}
      >
        {pet.photo_url ? (
          <Image
            source={{ uri: pet.photo_url }}
            style={styles.fillImage}
          />
        ) : (
          <MaterialCommunityIcons
            name={isDog ? 'dog' : 'cat'}
            size={single ? 56 : 46}
            color={COLORS.primary}
          />
        )}
      </View>
    );

    const info = (
      <View style={single ? styles.petInfoSingle : null}>
        <Text
          numberOfLines={1}
          style={[
            styles.petName,
            single && styles.petNameSingle,
            single && isArabic && styles.textRtl,
          ]}
        >
          {pet.name}
        </Text>

        <View
          style={[
            styles.petStatusRow,
            single && isArabic && styles.rowRtl,
          ]}
        >
          <View
            style={[
              styles.petStatusDot,
              !active && styles.petStatusDotOff,
              pending && styles.petStatusDotPending,
            ]}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.petStatusText,
              single && styles.petStatusTextSingle,
            ]}
          >
            {active
              ? t.active
              : pending
                ? t.pendingPayment
                : t.noSubscription}
          </Text>
        </View>

        {!!date && (
          <>
            <Text
              style={[
                styles.petNextLabel,
                single && isArabic && styles.textRtl,
              ]}
            >
              {t.nextFreshDelivery}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.petNextDate,
                single && styles.petNextDateSingle,
                single && isArabic && styles.textRtl,
              ]}
            >
              {date}
            </Text>
          </>
        )}
      </View>
    );

    /*
     * No next delivery:
     *  - no plan       -> Choose a plan (plans page)
     *  - pending plan  -> View order (payment)
     *  - active plan   -> Plan deliveries
     */
    const planButton = !date ? (
      <Pressable
        onPress={onPlanPress}
        style={({ pressed }) => [
          styles.choosePlanButton,
          single && styles.choosePlanButtonSingle,
          single && isArabic && styles.rowRtl,
          pending && styles.choosePlanButtonPending,
          pressed && styles.addPetButtonPressed,
        ]}
      >
        <MaterialCommunityIcons
          name={
            pending
              ? 'receipt-text-outline'
              : active
                ? 'calendar-check-outline'
                : 'creation'
          }
          size={single ? 24 : 22}
          color="#FFFFFF"
        />
        <Text
          numberOfLines={2}
          style={[
            styles.choosePlanText,
            single && styles.choosePlanTextSingle,
          ]}
        >
          {pending
            ? t.viewOrder
            : active
              ? t.planDeliveries
              : t.choosePlan}
        </Text>
      </Pressable>
    ) : null;

    return (
      <Pressable
        key={String(pet.id)}
        style={[
          styles.petCard,
          fitPets && styles.petCardFit,
        ]}
        onPress={() => openPet(pet)}
      >
        {single ? (
          <View
            style={[
              styles.petSingleRow,
              isArabic && styles.rowRtl,
            ]}
          >
            {photo}
            {info}
          </View>
        ) : (
          <>
            {photo}
            {info}
          </>
        )}

        {planButton}
      </Pressable>
    );
  };

  /*
   * Visitor: the Home tab shows the shop catalog.
   * Signed in: the normal Home.
   */
  if (isGuest && !loading) {
    return <ShopCatalog />;
  }

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
            onRefresh={refreshAll}
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
        {/*
         * TRIAL OFFER: live countdown until the end of the pet's trial
         */}
        {trialOffers.map(({ animal, offers }) => (
          <TrialOfferCard
            key={animal.id}
            animal={animal}
            offers={offers}
            isArabic={isArabic}
            onOpen={() =>
              router.push({
                pathname: '/plans',
                params: { animalId: String(animal.id) },
              } as any)
            }
            onExpired={() => void loadCatalog()}
          />
        ))}
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
                <Pressable
                  onPress={() =>
                    setAddressInfoVisible(
                      value => !value
                    )
                  }
                  hitSlop={8}
                  style={[
                    styles.addressTitleRow,
                    isArabic &&
                      styles.rowRtl,
                  ]}
                >
                  <Text
                    style={[
                      styles.addressTitle,
                      styles.addressTitleLink,
                    ]}
                  >
                    {deliveryAddressTitle}
                  </Text>
                  <Ionicons
                    name={
                      addressInfoVisible
                        ? 'information-circle'
                        : 'information-circle-outline'
                    }
                    size={17}
                    color={COLORS.primary}
                  />
                </Pressable>
                {!!deliveryAddress && !addressInfoVisible && (
                  <Text
                    numberOfLines={1}
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
                {addressInfoVisible && (
                  <View
                    style={[
                      styles.addressBubble,
                      isArabic &&
                        styles.addressBubbleRtl,
                    ]}
                  >
                    <View
                      style={[
                        styles.addressBubbleArrow,
                        isArabic &&
                          styles.addressBubbleArrowRtl,
                      ]}
                    />
                    <View
                      style={[
                        styles.addressBubbleHeader,
                        isArabic &&
                          styles.rowRtl,
                      ]}
                    >
                      <Text
                        style={[
                          styles.addressBubbleTitle,
                          isArabic &&
                            styles.textRtl,
                        ]}
                      >
                        {t.fullAddress}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setAddressInfoVisible(false)
                        }
                        hitSlop={10}
                      >
                        <Ionicons
                          name="close"
                          size={18}
                          color={COLORS.muted}
                        />
                      </Pressable>
                    </View>
                    {fullAddressLines.map(
                      (line: string, index: number) => (
                        <Text
                          key={index}
                          style={[
                            styles.addressBubbleText,
                            index === 0 &&
                              styles.addressBubbleMain,
                            isArabic &&
                              styles.textRtl,
                          ]}
                        >
                          {line}
                        </Text>
                      )
                    )}
                    {!!deliveryWindow && (
                      <Text
                        style={[
                          styles.addressBubbleMeta,
                          isArabic &&
                            styles.textRtl,
                        ]}
                      >
                        {t.deliveryTime}: {deliveryWindow}
                      </Text>
                    )}
                    {!!addressNote && (
                      <Text
                        style={[
                          styles.addressBubbleMeta,
                          isArabic &&
                            styles.textRtl,
                        ]}
                      >
                        {t.notes}: {addressNote}
                      </Text>
                    )}
                  </View>
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
                <Text style={styles.cutoffStrong}>
                  {cutoffLabel}
                </Text>{' '}
                {cutoffPassed
                  ? t.cutoffPassed
                  : t.awaiting}
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
            {pets.length > 0 && (
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
            )}
          </View>
          {pets.length === 0 ? (
            <View style={styles.noPetsBox}>
              <View style={styles.noPetsIcon}>
                <Ionicons
                  name="paw-outline"
                  size={34}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.noPetsTitle}>
                {t.noPetsTitle}
              </Text>
              <Text style={styles.noPetsText}>
                {t.noPetsText}
              </Text>
              <Pressable
                onPress={openAddPet}
                style={({ pressed }) => [
                  styles.addPetButton,
                  isArabic && styles.rowRtl,
                  pressed && styles.addPetButtonPressed,
                ]}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.addPetButtonText}>
                  {t.addNewPet}
                </Text>
              </Pressable>
            </View>
          ) : (
          fitPets ? (
            /*
             * 1 pet: full width / 2 pets: 50% - 50%
             */
            <View
              style={[
                styles.petRowFit,
                isArabic &&
                  styles.rowRtl,
              ]}
            >
              {pets.map(renderPetCard)}
            </View>
          ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.petRow
            }
          >
            {pets.map(renderPetCard)}
          </ScrollView>
          )
          )}
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
    addressTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
    },
    addressTitleLink: {
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
    },
    addressBubble: {
      marginTop: 10,
      padding: 14,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#C9DDD7',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    addressBubbleRtl: {},
    addressBubbleArrow: {
      position: 'absolute',
      top: -7,
      left: 18,
      width: 12,
      height: 12,
      backgroundColor: '#FFFFFF',
      borderLeftWidth: 1,
      borderTopWidth: 1,
      borderColor: '#C9DDD7',
      transform: [{ rotate: '45deg' }],
    },
    addressBubbleArrowRtl: {
      left: undefined,
      right: 18,
    },
    addressBubbleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    addressBubbleTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 11,
      letterSpacing: 1,
      color: COLORS.primary,
    },
    addressBubbleText: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 13,
      lineHeight: 21,
      color: COLORS.text,
    },
    addressBubbleMain: {
      fontFamily: 'Cairo_600SemiBold',
    },
    addressBubbleMeta: {
      marginTop: 6,
      fontFamily: 'Cairo_400Regular',
      fontSize: 12,
      lineHeight: 19,
      color: COLORS.muted,
    },
    cutoffStrong: {
      fontFamily: 'Cairo_700Bold',
      color: COLORS.text,
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
    noPetsBox: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#BFDCD6',
      borderRadius: 14,
      backgroundColor: '#F1F6F3',
    },
    noPetsIcon: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: '#E1EEEA',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    noPetsTitle: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
      lineHeight: 27,
      color: COLORS.text,
      textAlign: 'center',
    },
    noPetsText: {
      marginTop: 4,
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      lineHeight: 22,
      color: COLORS.muted,
      textAlign: 'center',
    },
    addPetButton: {
      alignSelf: 'stretch',
      minHeight: 61,
      marginTop: 20,
      borderRadius: 10,
      backgroundColor: COLORS.dark,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 16,
    },
    addPetButtonPressed: {
      opacity: 0.88,
    },
    addPetButtonText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 15,
      color: '#FFFFFF',
    },
    petRow: {
      gap: 15,
      paddingRight: 1,
    },
    petCard: {
      width: 117,
    },
    petCardFit: {
      width: undefined,
      flex: 1,
    },
    petImageFit: {
      width: '100%',
      height: 150,
    },
    petImageSingle: {
      width: '50%',
      height: 165,
    },
    petSingleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
    },
    petInfoSingle: {
      flex: 1,
      minWidth: 0,
    },
    petNameSingle: {
      marginTop: 0,
      fontSize: 24,
      lineHeight: 32,
    },
    petStatusTextSingle: {
      fontSize: 12,
    },
    petNextDateSingle: {
      fontSize: 14,
    },
    choosePlanButtonSingle: {
      marginTop: 18,
      minHeight: 58,
      flexDirection: 'row',
      gap: 10,
    },
    choosePlanTextSingle: {
      fontSize: 15,
    },
    petRowFit: {
      flexDirection: 'row',
      gap: 15,
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
    petStatusDotPending: {
      backgroundColor:
        '#E9A23B',
    },
    choosePlanButton: {
      marginTop: 14,
      minHeight: 64,
      borderRadius: 12,
      backgroundColor:
        COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingVertical: 8,
      paddingHorizontal: 8,
      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 4,
    },
    choosePlanButtonPending: {
      backgroundColor:
        '#E9A23B',
      shadowColor: '#E9A23B',
    },
    choosePlanText: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 13,
      lineHeight: 18,
      color: '#FFFFFF',
      textAlign: 'center',
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