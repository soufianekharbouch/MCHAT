import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type AppLanguage = 'ar' | 'en';

export function useAppLanguage() {
  const [language, setLanguage] =
    useState<AppLanguage>('ar');

  useEffect(() => {
    let mounted = true;

    const loadLanguage = async () => {
      try {
        const saved =
          await SecureStore.getItemAsync('locale');

        if (
          mounted &&
          (saved === 'ar' || saved === 'en')
        ) {
          setLanguage(saved);
        }
      } catch (error) {
        console.warn(
          'Unable to load locale:',
          error
        );
      }
    };

    loadLanguage();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    language,
    isArabic: language === 'ar',
  };
}
