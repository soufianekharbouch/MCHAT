import React from 'react';

import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useAppLanguage,
} from '../../context/LanguageContext';


const COLORS = {
  background: '#F7F4EF',
  primary: '#249B97',
  coral: '#EB6268',
  text: '#272727',
  muted: '#77736D',
  white: '#FFFFFF',
  border: '#E5E0D9',
};


export default function SettingsScreen() {

  const {
    language,
    isArabic,
    setLanguage,
  } = useAppLanguage();


  return (
    <SafeAreaView
      style={styles.safeArea}
    >

      <View style={styles.page}>

        {/* PAGE TITLE */}

        <View
          style={[
            styles.pageHeader,

            isArabic &&
              styles.rtl,
          ]}
        >

          <View
            style={
              styles.titleIcon
            }
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={
                COLORS.primary
              }
            />
          </View>


          <View
            style={
              styles.titleContent
            }
          >

            <Text
              style={[
                styles.title,

                isArabic &&
                  styles.textRtl,
              ]}
            >
              {
                isArabic
                  ? 'الإعدادات'
                  : 'Settings'
              }
            </Text>


            <Text
              style={[
                styles.subtitle,

                isArabic &&
                  styles.textRtl,
              ]}
            >
              {
                isArabic
                  ? 'إدارة إعدادات التطبيق'
                  : 'Manage your app settings'
              }
            </Text>

          </View>

        </View>


        {/* LANGUAGE CARD */}

        <View
          style={
            styles.settingsCard
          }
        >

          <View
            style={[
              styles.settingHeader,

              isArabic &&
                styles.rtl,
            ]}
          >

            <View
              style={
                styles.settingIcon
              }
            >
              <Ionicons
                name="language-outline"
                size={22}
                color={
                  COLORS.primary
                }
              />
            </View>


            <View
              style={
                styles.settingText
              }
            >

              <Text
                style={[
                  styles.settingTitle,

                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {
                  isArabic
                    ? 'اللغة'
                    : 'Language'
                }
              </Text>


              <Text
                style={[
                  styles.settingDescription,

                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {
                  isArabic
                    ? 'اختر لغة التطبيق'
                    : 'Choose the application language'
                }
              </Text>

            </View>

          </View>


          {/* LANGUAGE SWITCHER */}

          <View
            style={
              styles.languageSwitcher
            }
          >

            <Pressable
              style={[
                styles.languageOption,

                language === 'ar' &&
                  styles.languageOptionActive,
              ]}
              onPress={() =>
                setLanguage('ar')
              }
            >

              <Text
                style={[
                  styles.languageText,

                  language === 'ar' &&
                    styles.languageTextActive,
                ]}
              >
                العربية
              </Text>

            </Pressable>


            <Pressable
              style={[
                styles.languageOption,

                language === 'en' &&
                  styles.languageOptionActive,
              ]}
              onPress={() =>
                setLanguage('en')
              }
            >

              <Text
                style={[
                  styles.languageText,

                  language === 'en' &&
                    styles.languageTextActive,
                ]}
              >
                English
              </Text>

            </Pressable>

          </View>

        </View>

      </View>

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
      flex: 1,

      paddingHorizontal: 18,

      paddingTop: 22,
    },


    /*
     * Header
     */

    pageHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 12,

      marginBottom: 24,
    },


    rtl: {
      flexDirection:
        'row-reverse',
    },


    titleIcon: {
      width: 48,

      height: 48,

      borderRadius: 16,

      backgroundColor:
        '#ECF8F7',

      alignItems: 'center',

      justifyContent:
        'center',
    },


    titleContent: {
      flex: 1,
    },


    title: {
      fontFamily:
        'Cairo_800ExtraBold',

      fontSize: 23,

      lineHeight: 34,

      color:
        COLORS.text,
    },


    subtitle: {
      fontFamily:
        'Cairo_400Regular',

      fontSize: 12,

      lineHeight: 20,

      color:
        COLORS.muted,
    },


    textRtl: {
      textAlign: 'right',

      writingDirection:
        'rtl',
    },


    /*
     * Settings card
     */

    settingsCard: {
      backgroundColor:
        COLORS.white,

      borderRadius: 22,

      padding: 18,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    settingHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 12,

      marginBottom: 18,
    },


    settingIcon: {
      width: 44,

      height: 44,

      borderRadius: 14,

      backgroundColor:
        '#ECF8F7',

      alignItems: 'center',

      justifyContent:
        'center',
    },


    settingText: {
      flex: 1,
    },


    settingTitle: {
      fontFamily:
        'Cairo_700Bold',

      fontSize: 15,

      color:
        COLORS.text,
    },


    settingDescription: {
      marginTop: 1,

      fontFamily:
        'Cairo_400Regular',

      fontSize: 11,

      color:
        COLORS.muted,
    },


    /*
     * Language switcher
     */

    languageSwitcher: {
      flexDirection: 'row',

      backgroundColor:
        COLORS.background,

      borderRadius: 16,

      padding: 4,
    },


    languageOption: {
      flex: 1,

      minHeight: 48,

      borderRadius: 13,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    languageOptionActive: {
      backgroundColor:
        COLORS.primary,
    },


    languageText: {
      fontFamily:
        'Cairo_600SemiBold',

      fontSize: 13,

      color:
        COLORS.muted,
    },


    languageTextActive: {
      color:
        COLORS.white,
    },

  });