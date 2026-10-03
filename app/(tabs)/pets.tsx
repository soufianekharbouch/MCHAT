import React, {
  useCallback,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useAppLanguage,
} from '../../hooks/useAppLanguage';

import {
  useCustomerData,
} from '../../context/CustomerDataContext';

import {
  deletePet,
} from '../../services/customerApi';

import type {
  Pet,
} from '../../types/customer';


const COLORS = {
  background: '#F7F4EF',
  primary: '#249B97',
  primaryLight: '#ECF8F7',
  text: '#272727',
  muted: '#77736D',
  white: '#FFFFFF',
  border: '#E5E0D9',
  danger: '#B42318',
  dangerLight: '#FEF3F2',
  premium: '#A66A00',
  premiumLight: '#FFF5D9',
};


/*
|--------------------------------------------------------------------------
| PETS SCREEN
|--------------------------------------------------------------------------
*/

export default function PetsScreen() {

  const {
    isArabic,
  } = useAppLanguage();


  const {
    subscription,
    loading,
    error,
    refresh,
  } = useCustomerData();


  useFocusEffect(
    useCallback(() => {

      void refresh();

    }, [refresh])
  );


  const t = isArabic
    ? {
        title: 'حيواناتي الأليفة',
        subtitle: 'معلومات حيواناتك الأليفة',
        addPet: 'إضافة حيوان',
        edit: 'تعديل',
        delete: 'حذف',
        premium: 'مميز',
        noPets: 'لا توجد حيوانات مسجلة حالياً',
        noPetsDescription: 'يمكنك إضافة حيوانك الأليف للبدء.',
        addFirstPet: 'إضافة أول حيوان',
        loadError: 'تعذر تحميل بيانات الحيوانات',
        unknown: 'غير محدد',
        deleteTitle: 'حذف الحيوان',
        deleteMessage: 'هل أنت متأكد أنك تريد حذف هذا الحيوان؟',
        cancel: 'إلغاء',
        deleteError: 'تعذر حذف الحيوان.',
        active: 'نشط', inactive: 'لا يوجد اشتراك', manage: 'إدارة', next: 'التالي:', none: 'لا يوجد', meals: 'وجبة',
      }
    : {
        title: 'My pets',
        subtitle: 'Information about your pets',
        addPet: 'Add pet',
        edit: 'Edit',
        delete: 'Delete',
        premium: 'Premium',
        noPets: 'No pets found',
        noPetsDescription: 'Add your first pet to get started.',
        addFirstPet: 'Add your first pet',
        loadError: 'Unable to load pets',
        unknown: 'Not specified',
        deleteTitle: 'Delete pet',
        deleteMessage: 'Are you sure you want to delete this pet?',
        cancel: 'Cancel',
        deleteError: 'Unable to delete this pet.',
        active: 'Active', inactive: 'No subscription', manage: 'Manage', next: 'Next:', none: 'None', meals: 'Meals',
      };


  const pets =
    subscription?.animals || [];


  const openAddPet = () => {

    router.push('/pet-form');

  };


  const openEditPet = (
    pet: Pet
  ) => {

    router.push({
      pathname: '/pet-form',
      params: {
        id: String(pet.id),
      },
    });

  };


  const confirmDeletePet = (
    pet: Pet
  ) => {

    Alert.alert(
      t.deleteTitle,
      t.deleteMessage,
      [
        {
          text: t.cancel,
          style: 'cancel',
        },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {

            try {

              await deletePet(pet.id);
              await refresh();

            } catch (deleteError: any) {

              Alert.alert(
                '',
                deleteError?.message
                  || t.deleteError
              );

            }

          },
        },
      ]
    );

  };


  if (
    loading
    &&
    pets.length === 0
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
            color={COLORS.primary}
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
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >

        <View
          style={[
            styles.header,
            isArabic &&
              styles.rowRtl,
          ]}
        >

          <View
            style={styles.headerContent}
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
          </View>


          <Pressable
            style={[
              styles.addButton,
              isArabic &&
                styles.rowRtl,
            ]}
            onPress={openAddPet}
          >
            <Ionicons
              name="add"
              size={19}
              color={COLORS.white}
            />

            <Text
              style={styles.addButtonText}
            >
              {t.addPet}
            </Text>
          </Pressable>

        </View>


        {!!error && (
          <View
            style={[
              styles.errorBox,
              isArabic &&
                styles.rowRtl,
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={COLORS.danger}
            />

            <Text
              style={[
                styles.errorText,
                isArabic &&
                  styles.textRtl,
              ]}
            >
              {error || t.loadError}
            </Text>
          </View>
        )}


        {pets.length === 0 ? (

          <View
            style={styles.emptyBox}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="paw-outline"
                size={40}
                color={COLORS.primary}
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                isArabic &&
                  styles.textRtl,
              ]}
            >
              {t.noPets}
            </Text>

            <Text
              style={[
                styles.emptyText,
                isArabic &&
                  styles.textRtl,
              ]}
            >
              {t.noPetsDescription}
            </Text>

            <Pressable
              style={[
                styles.emptyButton,
                isArabic &&
                  styles.rowRtl,
              ]}
              onPress={openAddPet}
            >
              <Ionicons
                name="add-circle-outline"
                size={19}
                color={COLORS.white}
              />

              <Text
                style={styles.emptyButtonText}
              >
                {t.addFirstPet}
              </Text>
            </Pressable>
          </View>

        ) : (

          <View
            style={styles.list}
          >

            {pets.map((pet) => {
              const p = pet as Pet & { subscription_status?: string; next_order?: any; orders?: any[] };
              const active = p.subscription_status === 'active';
              const nextDate = p.next_order?.scheduled_for || null;
              const sourceOrder = p.next_order || p.orders?.[0];
              const recipe = sourceOrder?.items?.[0]?.recipe?.name || null;
              const meals = sourceOrder?.items?.reduce((n: number, i: any) => n + Number(i.quantity || 0), 0) || 0;
              const plan = recipe ? `${recipe}${meals ? ` (${meals} ${t.meals})` : ''}` : null;

              return (
                <View key={pet.id} style={styles.petCard}>
                  <View style={[styles.petTopRow, isArabic && styles.rowRtl]}>
                    <View style={styles.petInfo}>
                      <View style={[styles.nameStatusRow, isArabic && styles.rowRtl]}>
                        <Text numberOfLines={1} style={[styles.petName, isArabic && styles.textRtl]}>{pet.name || t.unknown}</Text>
                        <View style={[styles.statusBadge, active ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                          <Text style={[styles.statusText, active ? styles.statusTextActive : styles.statusTextInactive]}>
                            {active ? t.active : t.inactive}
                          </Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={[styles.petDetails, isArabic && styles.textRtl]}>
                        {[pet.age || null, pet.breed_size_category || null, pet.health_status || null].filter(Boolean).join(' · ')}
                      </Text>
                      {!!plan && <Text numberOfLines={1} style={[styles.planText, isArabic && styles.textRtl]}>{plan}</Text>}
                    </View>
                    <PetAvatar pet={pet} />
                  </View>
                  <View style={styles.divider} />
                  <View style={[styles.petFooter, isArabic && styles.rowRtl]}>
                    <Pressable style={[styles.manageButton, isArabic && styles.rowRtl]} onPress={() => openEditPet(pet)}>
                      <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={17} color={COLORS.primary} />
                      <Text style={styles.manageText}>{t.manage}</Text>
                    </Pressable>
                    <View style={[styles.nextOrder, isArabic && styles.rowRtl]}>
                      <Text style={styles.nextLabel}>{t.next} <Text style={styles.nextDate}>{nextDate || t.none}</Text></Text>
                      <Ionicons name="calendar-clear-outline" size={19} color={COLORS.primary} />
                    </View>
                  </View>
                </View>
              );
            })}

          </View>

        )}

      </ScrollView>

    </SafeAreaView>
  );

}


/*
|--------------------------------------------------------------------------
| PET AVATAR
|--------------------------------------------------------------------------
*/

function PetAvatar({
  pet,
}: {
  pet: Pet;
}) {

  if (pet.photo_url) {

    return (
      <View
        style={styles.petAvatar}
      >
        <Image
          source={{
            uri: pet.photo_url,
          }}
          style={
            styles.petAvatarImage
          }
          resizeMode="cover"
        />
      </View>
    );

  }


  const species =
    pet.species
      ?.trim()
      .toLowerCase();


  const isCat =
    species === 'cat';


  const isDog =
    species === 'dog';


  return (
    <View
      style={
        styles.petAvatarFallback
      }
    >
      <MaterialCommunityIcons
        name={
          isCat
            ? 'cat'
            : isDog
              ? 'dog'
              : 'paw'
        }
        size={34}
        color={COLORS.primary}
      />
    </View>
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
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 28,
    },


    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },


    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 10,
      marginBottom: 12,
    },


    headerContent: {
      flex: 1,
    },


    title: {
      fontFamily:
        'Cairo_800ExtraBold',
      fontSize: 23,
      lineHeight: 31,
      color: COLORS.text,
    },


    subtitle: {
      marginTop: 0,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 11,
      lineHeight: 17,
      color: COLORS.muted,
    },


    addButton: {
      minHeight: 38,
      paddingHorizontal: 11,
      borderRadius: 12,
      backgroundColor:
        COLORS.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },


    addButtonText: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 11,
      color: COLORS.white,
    },


    textRtl: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },


    rowRtl: {
      flexDirection:
        'row-reverse',
    },


    /*
    |--------------------------------------------------------------------------
    | COMPACT PET LIST
    |--------------------------------------------------------------------------
    */

    list: { gap: 16 },
    petCard: { minHeight: 180, backgroundColor: COLORS.white, borderRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 7, elevation: 2 },
    petTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    petInfo: { flex: 1, minWidth: 0 },
    nameStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 32 },
    petName: { flexShrink: 1, fontFamily: 'Cairo_700Bold', fontSize: 20, lineHeight: 30, color: COLORS.text },
    statusBadge: { minHeight: 28, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    statusBadgeActive: { backgroundColor: COLORS.primaryLight },
    statusBadgeInactive: { backgroundColor: '#F4F0EC' },
    statusText: { fontFamily: 'Cairo_700Bold', fontSize: 11, lineHeight: 18 },
    statusTextActive: { color: COLORS.primary },
    statusTextInactive: { color: COLORS.muted },
    petDetails: { marginTop: 3, fontFamily: 'Cairo_400Regular', fontSize: 13, lineHeight: 21, color: COLORS.muted },
    planText: { marginTop: 8, fontFamily: 'Cairo_500Medium', fontSize: 13, lineHeight: 21, color: COLORS.primary },
    petAvatar: { width: 98, height: 98, borderRadius: 22, overflow: 'hidden', backgroundColor: COLORS.primaryLight, flexShrink: 0 },
    petAvatarImage: { width: '100%', height: '100%' },
    petAvatarFallback: { width: 98, height: 98, borderRadius: 22, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    divider: { height: 1, backgroundColor: COLORS.border, marginTop: 16, marginBottom: 11 },
    petFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    manageButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 30 },
    manageText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, lineHeight: 20, color: COLORS.primary },
    nextOrder: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
    nextLabel: { fontFamily: 'Cairo_400Regular', fontSize: 12, lineHeight: 19, color: COLORS.muted },
    nextDate: { fontFamily: 'Cairo_700Bold', color: COLORS.muted },

    /*
    |--------------------------------------------------------------------------
    | EMPTY
    |--------------------------------------------------------------------------
    */

    emptyBox: {
      minHeight: 260,
      backgroundColor:
        COLORS.white,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },


    emptyIcon: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor:
        COLORS.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },


    emptyTitle: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 15,
      color: COLORS.text,
      textAlign: 'center',
    },


    emptyText: {
      marginTop: 3,
      fontFamily:
        'Cairo_400Regular',
      fontSize: 11,
      lineHeight: 18,
      color: COLORS.muted,
      textAlign: 'center',
    },


    emptyButton: {
      marginTop: 15,
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: 13,
      backgroundColor:
        COLORS.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },


    emptyButtonText: {
      fontFamily:
        'Cairo_700Bold',
      fontSize: 11,
      color: COLORS.white,
    },


    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      marginBottom: 10,
      borderRadius: 12,
      backgroundColor:
        COLORS.dangerLight,
    },


    errorText: {
      flex: 1,
      fontFamily:
        'Cairo_500Medium',
      fontSize: 11,
      color: COLORS.danger,
    },

  });
