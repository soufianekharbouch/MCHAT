import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import PlanReminderBanner from '../../components/purchase/PlanReminderBanner';
import {
  formatDate,
} from '../../components/purchase/purchaseUtils';
import ShopCatalog from "../../components/shop/ShopCatalog";
import LoyaltyBanner from "../../components/loyalty/LoyaltyBanner";
import { fetchLoyalty, levelIcon, type LoyaltyResponse } from "../../services/loyaltyApi";
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
  /*
   * Notifications of the customer (Recent updates, last ones first).
   */
  const [
    notifications,
    setNotifications,
  ] = useState<any[]>([]);
  const loadNotifications =
    useCallback(async () => {
      if (isGuest) {
        setNotifications([]);
        return;
      }
      try {
        const token = await getStoredItem('access_token');
        if (!token) {
          return;
        }
        const response = await fetch(
          'https://animal-care2.kharbouch-soufiane.com/api/mobile/notifications',
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
        if (response.ok && Array.isArray(data?.notifications)) {
          setNotifications(data.notifications);
        }
      } catch (notificationError) {
        console.error('Unable to load notifications:', notificationError);
      }
    }, [isArabic, isGuest]);
  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );
  /*
   * Loyalty points (per pet): total, badge of each pet, bottom banner.
   */
  const [
    loyalty,
    setLoyalty,
  ] = useState<LoyaltyResponse | null>(null);
  const loadLoyalty =
    useCallback(async () => {
      if (isGuest) {
        setLoyalty(null);
        return;
      }
      try {
        setLoyalty(await fetchLoyalty(isArabic ? 'ar' : 'en'));
      } catch (loyaltyError) {
        console.warn('Unable to load loyalty points:', loyaltyError);
      }
    }, [isArabic, isGuest]);
  useFocusEffect(
    useCallback(() => {
      void loadLoyalty();
    }, [loadLoyalty])
  );
  const loyaltyOn = !!loyalty?.program?.enabled;
  const petLoyalty = (pet: any) =>
    loyalty?.pets.find(item => Number(item.pet.id) === Number(pet?.id)) ?? null;
  // Best level of the customer's pets (shown with his total)
  const bestLevel = useMemo(
    () =>
      (loyalty?.pets ?? [])
        .map(item => item.level)
        .filter(Boolean)
        .sort((a: any, b: any) => b.min_points - a.min_points)[0] ?? null,
    [loyalty]
  );
  const openLoyalty = () => {
    router.push('/loyalty' as any);
  };
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
    void loadNotifications();
    void loadLoyalty();
  };

  /*
   * Each time the Home page is opened again (back from planning,
   * checkout, pet...): customer data (pets, orders) reloaded too.
   * The first opening is already loaded by the context.
   */
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }

      if (!isGuest) {
        void refreshRef.current();
      }
    }, [isGuest])
  );
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
        noUpdates: 'لا توجد تحديثات بعد.',
        justNow: 'الآن',
        minutesAgo: (n: number) => `منذ ${n} د`,
        hoursAgo: (n: number) => `منذ ${n} س`,
        yesterday: 'أمس',
        upConfirmed: (pet: string) => `تم تأكيد طلبك${pet ? ` لـ ${pet}` : ''}`,
        upConfirmedBody: (pack: string) => `${pack} · تم الدفع`,
        upToPlan: (pet: string) => `اختر أيام التوصيل${pet ? ` لـ ${pet}` : ''}`,
        upToPlanBody: (n: number) => `${n} وجبة بانتظار جدولتها.`,
        upPremium: (pet: string) => `باقة مخصصة${pet ? ` لـ ${pet}` : ''} قيد التحضير`,
        upPremiumBody: 'سيتواصل معك فريق التغذية لاختيار الوصفات.',
        upPlanned: (pet: string) => `تمت جدولة توصيل${pet ? ` لـ ${pet}` : ''}`,
        upPrepared: (pet: string) => `يتم تحضير وجبات${pet ? ` ${pet}` : ''}`,
        upDelivered: (pet: string) => `تم توصيل وجبات${pet ? ` ${pet}` : ''}`,
        upDeliveryBody: (n: number, date: string) => `${n} وجبة · ${date}`,
        deliveryOn: (date: string) => `التوصيل ${date}`,
        loadError:
          'تعذر تحميل بيانات الحساب',
        shopEyebrow: 'ابدأ من هنا',
        shopTitle: 'وجبات طازجة لقطتك أو كلبك',
        shopText: 'اكتشف باقات التذوق والاشتراك، واختر عمر حيوانك عند الطلب.',
        shopButton: 'تسوّق باقاتنا',
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
        noUpdates: 'No updates yet.',
        justNow: 'Just now',
        minutesAgo: (n: number) => `${n} min ago`,
        hoursAgo: (n: number) => `${n} h ago`,
        yesterday: 'Yesterday',
        upConfirmed: (pet: string) => `Order confirmed${pet ? ` for ${pet}` : ''}`,
        upConfirmedBody: (pack: string) => `${pack} · payment received`,
        upToPlan: (pet: string) => `Choose the delivery days${pet ? ` for ${pet}` : ''}`,
        upToPlanBody: (n: number) => `${n} meals waiting to be planned.`,
        upPremium: (pet: string) => `${pet ? `${pet}'s` : 'Your'} personalized pack is being prepared`,
        upPremiumBody: 'Our nutrition team will contact you to choose the recipes.',
        upPlanned: (pet: string) => `Delivery planned${pet ? ` for ${pet}` : ''}`,
        upPrepared: (pet: string) => `${pet ? `${pet}'s` : 'Your'} meals are being prepared`,
        upDelivered: (pet: string) => `${pet ? `${pet}'s` : 'Your'} meals were delivered`,
        upDeliveryBody: (n: number, date: string) => `${n} meals · ${date}`,
        deliveryOn: (date: string) => `Delivery ${date}`,
        loadError:
          'Unable to load account data',
        shopEyebrow: 'START HERE',
        shopTitle: 'Fresh meals for your cat or dog',
        shopText: 'Discover our taste packs and plans, pick your pet’s age at checkout.',
        shopButton: 'Shop our plans',
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
  /*
   * UPCOMING DELIVERIES: the next delivery of EACH pet
   * (pack deliveries + old back-office orders), earliest first.
   * Several pets: one chip per pet in the widget.
   */
  const upcomingByPet = useMemo(() => {
    const byKey = new Map<string, any>();

    const keep = (key: string, order: any) => {
      const current = byKey.get(key);
      if (!current || String(order.scheduled_for) < String(current.scheduled_for)) {
        byKey.set(key, order);
      }
    };

    // Packs (new system)
    purchases.forEach(purchase => {
      const delivery = purchase.next_delivery;
      if (!delivery || delivery.status === 'cancelled' || delivery.status === 'delivered') {
        return;
      }
      const animalId = purchase.animal?.id ?? null;
      keep(animalId ? `pet-${animalId}` : `purchase-${purchase.id}`, {
        id: delivery.id,
        purchase_id: purchase.id,
        delivery_id: delivery.id,
        scheduled_for: delivery.date,
        delivery_slot: delivery.delivery_slot ?? null,
        items: delivery.items,
        address: delivery.address ?? null,
        animal_id: animalId,
        is_editable: delivery.is_editable,
      });
    });

    // Old back-office orders
    upcomingOrders.forEach((order: any) => {
      if (!order?.scheduled_for) {
        return;
      }
      const animalId = order.animal_id ?? order.animal?.id ?? null;
      keep(animalId ? `pet-${animalId}` : `order-${order.id}`, order);
    });

    return Array.from(byKey.entries())
      .map(([key, order]) => ({
        key,
        order,
        pet:
          pets.find((pet: any) => Number(pet.id) === Number(order.animal_id ?? order.animal?.id)) ||
          null,
      }))
      .sort((a, b) => String(a.order.scheduled_for).localeCompare(String(b.order.scheduled_for)));
  }, [purchases, upcomingOrders, pets]);

  // Pet shown in the widget (the earliest delivery by default)
  const [
    upcomingKey,
    setUpcomingKey,
  ] = useState<string | null>(null);

  const selectedUpcoming =
    upcomingByPet.find(item => item.key === upcomingKey) ??
    upcomingByPet[0] ??
    null;

  const nextOrder = selectedUpcoming?.order ?? null;

  /*
   * "Manage Delivery": the delivery of the pack -> its management page,
   * otherwise the deliveries page.
   */
  const openManageDelivery = () => {
    const order = nextOrder as any;

    if (order?.purchase_id && order?.delivery_id) {
      router.push({
        pathname: '/manage-delivery',
        params: {
          purchaseId: String(order.purchase_id),
          deliveryId: String(order.delivery_id),
        },
      } as any);
      return;
    }

    router.push('/orders' as any);
  };
  const nextPet =
    useMemo(() => {
      if (selectedUpcoming?.pet) {
        return selectedUpcoming.pet;
      }
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
    }, [nextOrder, pets, selectedUpcoming]);
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
    router.push({ pathname: '/pet-form', params: { id: '' } } as any);
  };
  // Signed in without pets: the shop (catalog + checkout creates the pet)
  const openShop = () => {
    router.push('/shop' as any);
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
   * RECENT UPDATES (all pets): notifications + pack events
   * (order confirmed, to plan, planned, prepared, delivered).
   * The 5 most recent, newest first.
   */
  const timeAgo = (time: number): string => {
    const diff = Date.now() - time;
    if (diff < 60 * 1000) return t.justNow;
    if (diff < 3600 * 1000) return t.minutesAgo(Math.floor(diff / 60000));
    if (diff < 24 * 3600 * 1000) return t.hoursAgo(Math.floor(diff / 3600000));
    if (diff < 48 * 3600 * 1000) return t.yesterday;
    return new Intl.DateTimeFormat(isArabic ? 'ar' : 'en', { day: 'numeric', month: 'short' }).format(new Date(time));
  };

  const parseTime = (value?: string | null): number | null => {
    if (!value) return null;
    const time = new Date(String(value).replace(' ', 'T')).getTime();
    return Number.isNaN(time) ? null : time;
  };

  const recentUpdates = useMemo(() => {
    type Update = {
      key: string;
      time: number;
      timeLabel?: string;
      title: string;
      body: string;
      icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
      onPress?: () => void;
    };

    const list: Update[] = [];
    const now = Date.now();
    const packDeliveryKeys = new Set<string>();

    // Notifications
    notifications.forEach((item: any) => {
      const time = parseTime(item.sent_at) ?? parseTime(item.created_at);
      if (!time) return;
      list.push({
        key: `notif-${item.id}`,
        time,
        title: String(item.title || ''),
        body: String(item.body || ''),
        icon: item.viewed_at ? 'bell-outline' : 'bell-ring-outline',
        onPress: openNotifications,
      });
    });

    // Packs
    purchases.forEach(purchase => {
      const p = purchase as any;
      const pet = purchase.animal?.name ?? '';
      const paidAt = parseTime(p.payment?.paid_at) ?? parseTime(p.period?.purchased_at);

      if (purchase.is_active && paidAt) {
        list.push({
          key: `paid-${purchase.id}`,
          time: paidAt,
          title: t.upConfirmed(pet),
          body: t.upConfirmedBody(String(p.product?.name ?? '')),
          icon: 'check-decagram-outline',
        });
      }

      // Current state of the pack (shown as the latest event)
      if (purchase.is_active && p.needs_consultation) {
        list.push({
          key: `premium-${purchase.id}`,
          time: now - 1000,
          timeLabel: t.justNow,
          title: t.upPremium(pet),
          body: t.upPremiumBody,
          icon: 'crown-outline',
        });
      } else if (purchase.is_active && (purchase.usage?.remaining_recipes ?? 0) > 0 && !purchase.next_delivery) {
        list.push({
          key: `toplan-${purchase.id}`,
          time: now - 2000,
          timeLabel: t.justNow,
          title: t.upToPlan(pet),
          body: t.upToPlanBody(purchase.usage.remaining_recipes),
          icon: 'calendar-plus',
          onPress: () =>
            router.push({ pathname: '/distribute-package', params: { id: String(purchase.id) } } as any),
        });
      }

      const delivery = purchase.next_delivery as any;
      if (purchase.is_active && delivery && delivery.status !== 'cancelled') {
        const meals = (delivery.items || []).reduce((sum: number, item: any) => sum + Number(item?.quantity || 0), 0);
        const prepared = delivery.status === 'prepared';
        packDeliveryKeys.add(`${purchase.animal?.id ?? ''}-${delivery.date}`);

        list.push({
          key: `delivery-${delivery.id}`,
          time: now - (prepared ? 500 : 3000),
          timeLabel: t.deliveryOn(formatShortDate(delivery.date)),
          title: prepared ? t.upPrepared(pet) : t.upPlanned(pet),
          body: t.upDeliveryBody(meals, formatShortDate(delivery.date)),
          icon: prepared ? 'chef-hat' : 'calendar-check-outline',
          onPress: () =>
            router.push({
              pathname: '/manage-delivery',
              params: { purchaseId: String(purchase.id), deliveryId: String(delivery.id) },
            } as any),
        });
      }
    });

    // Orders of the subscription (prepared / delivered), not already shown by a pack
    orders.forEach((order: any) => {
      const status = String(order.dashboard_status || order.status || '').toLowerCase();
      const animalId = order.animal_id ?? order.animal?.id ?? '';
      if (!order.scheduled_for || packDeliveryKeys.has(`${animalId}-${order.scheduled_for}`)) return;
      if (status !== 'prepared' && status !== 'delivered') return;

      const time =
        parseTime(status === 'delivered' ? order.delivered_at : order.prepared_at) ??
        parseTime(`${order.scheduled_for}T09:00:00`);
      if (!time || time > now) return;

      const pet = pets.find((item: any) => Number(item.id) === Number(animalId))?.name ?? '';
      const meals = (order.items || []).reduce((sum: number, item: any) => sum + Number(item?.quantity || 0), 0);

      list.push({
        key: `order-${order.id}`,
        time,
        title: status === 'delivered' ? t.upDelivered(pet) : t.upPrepared(pet),
        body: t.upDeliveryBody(meals, formatShortDate(order.scheduled_for)),
        icon: status === 'delivered' ? 'truck-check-outline' : 'chef-hat',
      });
    });

    return list.sort((a, b) => b.time - a.time).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, purchases, orders, pets, isArabic]);

  /*
   * 1 or 2 pets: cards share the screen width.
   * 3 pets or more: horizontal scrolling.
   */
  const fitPets =
    pets.length > 0 &&
    pets.length <= 2;
  /*
   * Premium pet: a PREMIUM-... pack paid / running (API flag is_personalized).
   */
  const petIsPremium = (pet: any) =>
    purchases.some(
      purchase =>
        Number(purchase.animal?.id) === Number(pet?.id) &&
        purchase.is_active &&
        !!(purchase as any).is_personalized
    );
  const renderPetCard = (pet: any) => {
    const active = petIsActive(pet);
    const premium = petIsPremium(pet);
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
          premium && styles.petImagePremium,
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

        {/* Premium: badge on the photo (cards stay aligned) */}
        {premium && (
          <View style={styles.premiumBadge}>
            <MaterialCommunityIcons
              name="crown"
              size={11}
              color="#FFFFFF"
            />
            <Text style={styles.premiumBadgeText}>
              {isArabic ? 'بريميوم' : 'Premium'}
            </Text>
          </View>
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

    // Loyalty points of the pet (green: usable now)
    const points = loyaltyOn ? petLoyalty(pet) : null;

    return (
      <Pressable
        key={String(pet.id)}
        style={[
          styles.petCard,
          fitPets && styles.petCardFit,
        ]}
        onPress={() => openPet(pet)}
      >
        {!!points && points.balance > 0 && (
          <Pressable
            onPress={openLoyalty}
            hitSlop={6}
            style={[
              styles.petPoints,
              isArabic ? styles.petPointsRtl : null,
              points.usable_points > 0 && styles.petPointsUsable,
            ]}
          >
            <MaterialCommunityIcons
              name={(points.level ? levelIcon(points.level.icon) : 'star') as any}
              size={12}
              color={points.usable_points > 0 ? '#FFFFFF' : '#9A6B00'}
            />
            <Text
              style={[
                styles.petPointsText,
                points.usable_points > 0 && styles.petPointsTextUsable,
              ]}
            >
              {points.balance}
            </Text>
          </Pressable>
        )}
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
            {/* Loyalty points of all the pets */}
            {loyaltyOn && pets.length > 0 && (
              <Pressable
                onPress={openLoyalty}
                hitSlop={6}
                style={[
                  styles.pointsTotal,
                  isArabic && styles.pointsTotalRtl,
                ]}
              >
                <Ionicons name="star" size={14} color="#D4A017" />
                <Text style={styles.pointsTotalText}>
                  {loyalty?.total_points ?? 0} {isArabic ? 'نقطة' : 'points'}
                  {bestLevel ? ` · ${bestLevel.name}` : ''}
                </Text>
                <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={14} color="#9A6B00" />
              </Pressable>
            )}
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
         * NO PET YET: always a way to start shopping, at the top
         */}
        {pets.length === 0 && (
          <View style={styles.shopCard}>
            <Text style={[styles.shopEyebrow, isArabic && styles.textRtl]}>{t.shopEyebrow}</Text>
            <Text style={[styles.shopTitle, isArabic && styles.textRtl]}>{t.shopTitle}</Text>
            <Text style={[styles.shopText, isArabic && styles.textRtl]}>{t.shopText}</Text>
            <Pressable
              onPress={openShop}
              style={({ pressed }) => [
                styles.shopButton,
                isArabic && styles.rowRtl,
                pressed && styles.addPetButtonPressed,
              ]}
            >
              <Ionicons name="basket-outline" size={22} color="#FFFFFF" />
              <Text style={styles.shopButtonText}>{t.shopButton}</Text>
            </Pressable>
          </View>
        )}
        {/*
         * PLAN REMINDER: paid packs with meals not planned yet
         * (taste pack: choose the day / other packs: plan the deliveries)
         */}
        <PlanReminderBanner
          purchases={purchases}
          isArabic={isArabic}
          onPlanned={() => {
            void loadPurchases();
            void refresh();
          }}
        />
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
              {upcomingByPet.length <= 1 && (
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
              )}
            </View>
            {/* Several pets with an upcoming delivery: one chip each */}
            {upcomingByPet.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.upcomingChips,
                  isArabic && styles.rowRtl,
                ]}
                style={styles.upcomingChipsScroll}
              >
                {upcomingByPet.map(item => {
                  const selected = item.key === selectedUpcoming?.key;
                  const isDogPet = String(item.pet?.species || '').toLowerCase() === 'dog';

                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => {
                        setUpcomingKey(item.key);
                        setAddressInfoVisible(false);
                      }}
                      style={[
                        styles.upcomingChip,
                        selected && styles.upcomingChipActive,
                        isArabic && styles.rowRtl,
                      ]}
                    >
                      {item.pet?.photo_url ? (
                        <Image
                          source={{ uri: item.pet.photo_url }}
                          style={styles.upcomingChipPhoto}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name={isDogPet ? 'dog' : 'cat'}
                          size={16}
                          color={selected ? COLORS.white : COLORS.primary}
                        />
                      )}
                      <View>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.upcomingChipName,
                            selected && styles.upcomingChipTextActive,
                          ]}
                        >
                          {item.pet?.name || '—'}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.upcomingChipDate,
                            selected && styles.upcomingChipTextActive,
                          ]}
                        >
                          {formatShortDate(item.order.scheduled_for)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
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
                onPress={openManageDelivery}
                style={({ pressed }) => [
                  styles.manageButton,
                  pressed && styles.addPetButtonPressed,
                ]}
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
              <Pressable onPress={openShop} hitSlop={8} style={[styles.noPetsShopLink, isArabic && styles.rowRtl]}>
                <Ionicons name="basket-outline" size={18} color={COLORS.primary} />
                <Text style={styles.noPetsShopText}>{t.shopButton}</Text>
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
          {recentUpdates.length === 0 ? (
            <Text style={[styles.updateBody, isArabic && styles.textRtl]}>{t.noUpdates}</Text>
          ) : (
            recentUpdates.map((update, index) => (
              <UpdateRow
                key={update.key}
                customIcon={update.icon}
                title={update.title}
                body={update.body}
                time={update.timeLabel ?? timeAgo(update.time)}
                isArabic={isArabic}
                onPress={update.onPress}
                first={index === 0}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* From time to time: points usable / lost soon */}
      <LoyaltyBanner data={loyalty} isArabic={isArabic} />
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
  first = false,
  onPress,
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
  first?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.updateRow,
        !first &&
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
        {!!onPress && (
          <Ionicons
            name={
              isArabic
                ? 'arrow-back'
                : 'arrow-forward'
            }
            size={18}
            color={COLORS.muted}
          />
        )}
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
    shopCard: {
      padding: 18,
      marginBottom: 28,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#B7DAD4',
      backgroundColor: '#E8F2EF',
    },
    shopEyebrow: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 11,
      letterSpacing: 1.5,
      color: COLORS.primary,
    },
    shopTitle: {
      marginTop: 4,
      fontFamily: 'Cairo_800ExtraBold',
      fontSize: 22,
      lineHeight: 31,
      color: COLORS.text,
    },
    shopText: {
      marginTop: 4,
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      lineHeight: 22,
      color: COLORS.muted,
    },
    shopButton: {
      minHeight: 54,
      marginTop: 16,
      borderRadius: 10,
      backgroundColor: COLORS.dark,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    shopButtonText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 15,
      color: '#FFFFFF',
    },
    noPetsShopLink: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    noPetsShopText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 14,
      color: COLORS.primary,
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
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      borderWidth: 1,
      borderTopWidth: 3,
      borderColor: '#A8D7D1',
      borderTopColor:
        COLORS.primary,
      borderRadius: 8,
      backgroundColor:
        COLORS.delivery,
      marginBottom: 28,
    },
    deliveryHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 10,
    },
    deliveryEyebrow: {
      flexShrink: 1,
      fontFamily:
        'Cairo_700Bold',
      fontSize: 10,
      letterSpacing: 1.35,
      color: COLORS.text,
    },
    upcomingChipsScroll: {
      marginBottom: 12,
    },
    upcomingChips: {
      gap: 8,
    },
    upcomingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 40,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#A8D7D1',
      backgroundColor: COLORS.white,
    },
    upcomingChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    upcomingChipPhoto: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    upcomingChipName: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 12,
      lineHeight: 16,
      color: COLORS.text,
    },
    upcomingChipDate: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 10,
      lineHeight: 14,
      color: COLORS.muted,
    },
    upcomingChipTextActive: {
      color: COLORS.white,
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
      fontSize: 24,
      lineHeight: 32,
      color: COLORS.text,
    },
    deliveryWindow: {
      marginTop: 2,
      fontFamily:
        'Cairo_600SemiBold',
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.text,
    },
    mealCount: {
      width: 54,
      minHeight: 44,
      marginLeft: 10,
      borderLeftWidth: 1,
      borderLeftColor:
        '#A7D0CB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealNumber: {
      fontFamily:
        'Cairo_500Medium',
      fontSize: 24,
      lineHeight: 30,
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
      marginVertical: 12,
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
      gap: 8,
      marginTop: 8,
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
      marginTop: 12,
    },
    manageButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 10,
      backgroundColor:
        COLORS.dark,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 12,
    },
    manageButtonText: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 14,
      color: '#FFFFFF',
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
    petImagePremium: {
      borderWidth: 2,
      borderColor: '#C9A227',
    },
    pointsTotal: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E8C66A',
      backgroundColor: '#FFF8E5',
    },
    pointsTotalRtl: {
      alignSelf: 'flex-end',
      flexDirection: 'row-reverse',
    },
    pointsTotalText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 12.5,
      color: '#9A6B00',
    },
    petPoints: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E8C66A',
      backgroundColor: '#FFF8E5',
    },
    petPointsRtl: {
      right: undefined,
      left: 8,
    },
    petPointsUsable: {
      borderColor: '#15803D',
      backgroundColor: '#16A34A',
    },
    petPointsText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 11,
      lineHeight: 17,
      color: '#9A6B00',
    },
    petPointsTextUsable: {
      color: '#FFFFFF',
    },
    premiumBadge: {
      position: 'absolute',
      bottom: 6,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 1,
      borderRadius: 999,
      backgroundColor: '#B8860B',
    },
    premiumBadgeText: {
      fontFamily: 'Cairo_700Bold',
      fontSize: 10,
      lineHeight: 15,
      color: '#FFFFFF',
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
      paddingVertical: 14,
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