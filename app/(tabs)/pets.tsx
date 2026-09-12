import React from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useAppLanguage,
} from '../../hooks/useAppLanguage';

import {
  useCustomerData,
} from '../../context/CustomerDataContext';


const COLORS = {
  background: '#F7F4EF',
  primary: '#249B97',
  text: '#272727',
  muted: '#77736D',
  white: '#FFFFFF',
  border: '#E5E0D9',
  danger: '#B42318',
};


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


  const t = isArabic
    ? {
        title: 'حيواناتي الأليفة',
        subtitle: 'معلومات حيواناتك الأليفة',

        age: 'العمر',
        health: 'الحالة الصحية',
        note: 'ملاحظات',

        noPets: 'لا توجد حيوانات مسجلة حالياً',
        loadError: 'تعذر تحميل بيانات الحيوانات',
        unknown: 'غير محدد',

        cat: 'قط',
        dog: 'كلب',
      }
    : {
        title: 'My pets',
        subtitle: 'Information about your pets',

        age: 'Age',
        health: 'Health status',
        note: 'Notes',

        noPets: 'No pets found',
        loadError: 'Unable to load pets',
        unknown: 'Not specified',

        cat: 'Cat',
        dog: 'Dog',
      };


  const pets =
    subscription?.animals || [];


  const getSpeciesLabel = (
    species?: string | null
  ) => {

    if (!species) {
      return t.unknown;
    }


    const normalized =
      species
        .trim()
        .toLowerCase();


    if (normalized === 'cat') {
      return t.cat;
    }

    if (normalized === 'dog') {
      return t.dog;
    }


    return species;

  };


  const getValue = (
    value:
      | string
      | number
      | null
      | undefined
  ) => {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return t.unknown;
    }

    return String(value);

  };


  if (
    loading &&
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

            <Ionicons
              name="paw-outline"
              size={42}
              color={COLORS.muted}
            />

            <Text
              style={[
                styles.emptyText,
                isArabic &&
                  styles.textRtl,
              ]}
            >
              {t.noPets}
            </Text>

          </View>

        ) : (

          <View
            style={styles.list}
          >

            {pets.map((pet) => (

              <View
                key={pet.id}
                style={styles.petCard}
              >

                <View
                  style={[
                    styles.petTop,
                    isArabic &&
                      styles.rowRtl,
                  ]}
                >

                  <View
                    style={styles.petIcon}
                  >

                    <Ionicons
                      name="paw"
                      size={24}
                      color={
                        COLORS.primary
                      }
                    />

                  </View>


                  <View
                    style={
                      styles.petIdentity
                    }
                  >

                    <Text
                      style={[
                        styles.petName,
                        isArabic &&
                          styles.textRtl,
                      ]}
                    >
                      {pet.name ||
                        t.unknown}
                    </Text>


                    <Text
                      style={[
                        styles.petSpecies,
                        isArabic &&
                          styles.textRtl,
                      ]}
                    >
                      {getSpeciesLabel(
                        pet.species
                      )}
                    </Text>

                  </View>

                </View>


                <View
                  style={[
                    styles.infoRow,
                    isArabic &&
                      styles.rowRtl,
                  ]}
                >

                  <InfoBox
                    label={t.age}
                    value={getValue(
                      pet.age
                    )}
                    rtl={isArabic}
                  />


                  <InfoBox
                    label={t.health}
                    value={getValue(
                      pet.health_status
                    )}
                    rtl={isArabic}
                  />

                </View>


                <View
                  style={styles.noteBox}
                >

                  <Text
                    style={[
                      styles.infoLabel,
                      isArabic &&
                        styles.textRtl,
                    ]}
                  >
                    {t.note}
                  </Text>


                  <Text
                    style={[
                      styles.infoValue,
                      isArabic &&
                        styles.textRtl,
                    ]}
                  >
                    {getValue(
                      pet.note
                    )}
                  </Text>

                </View>

              </View>

            ))}

          </View>

        )}

      </ScrollView>

    </SafeAreaView>

  );

}


function InfoBox({
  label,
  value,
  rtl,
}: {
  label: string;
  value: string;
  rtl: boolean;
}) {

  return (

    <View
      style={styles.infoBox}
    >

      <Text
        style={[
          styles.infoLabel,
          rtl &&
            styles.textRtl,
        ]}
      >
        {label}
      </Text>


      <Text
        style={[
          styles.infoValue,
          rtl &&
            styles.textRtl,
        ]}
      >
        {value}
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
      alignItems: 'center',
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
      textAlign: 'right',

      writingDirection:
        'rtl',
    },


    list: {
      gap: 14,
    },


    petCard: {
      backgroundColor:
        COLORS.white,

      borderRadius: 22,

      padding: 17,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    petTop: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 12,

      marginBottom: 15,
    },


    rowRtl: {
      flexDirection:
        'row-reverse',
    },


    petIcon: {
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


    petIdentity: {
      flex: 1,
    },


    petName: {
      fontFamily:
        'Cairo_700Bold',

      fontSize: 17,

      color:
        COLORS.text,
    },


    petSpecies: {
      fontFamily:
        'Cairo_400Regular',

      fontSize: 12,

      color:
        COLORS.muted,
    },


    infoRow: {
      flexDirection: 'row',

      gap: 10,
    },


    infoBox: {
      flex: 1,

      backgroundColor:
        '#F8F8F7',

      borderRadius: 15,

      padding: 13,
    },


    noteBox: {
      marginTop: 10,

      backgroundColor:
        '#F8F8F7',

      borderRadius: 15,

      padding: 13,
    },


    infoLabel: {
      fontFamily:
        'Cairo_500Medium',

      fontSize: 10,

      color:
        COLORS.muted,
    },


    infoValue: {
      marginTop: 4,

      fontFamily:
        'Cairo_700Bold',

      fontSize: 12,

      color:
        COLORS.text,
    },


    emptyBox: {
      minHeight: 220,

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

      padding: 25,

      gap: 12,
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
        COLORS.danger,
    },

  });