import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import * as SecureStore from 'expo-secure-store';

export type AppLanguage = 'ar' | 'en';

type LanguageContextType = {
  language: AppLanguage;
  isArabic: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

const LanguageContext =
  createContext<LanguageContextType | undefined>(
    undefined
  );

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] =
    useState<AppLanguage>('ar');

  useEffect(() => {
    const loadLanguage = async () => {
      const saved =
        await SecureStore.getItemAsync(
          'locale'
        );

      if (
        saved === 'ar' ||
        saved === 'en'
      ) {
        setLanguageState(saved);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage =
    async (
      newLanguage: AppLanguage
    ) => {
      setLanguageState(
        newLanguage
      );

      await SecureStore.setItemAsync(
        'locale',
        newLanguage
      );
    };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isArabic:
          language === 'ar',
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useAppLanguage() {
  const context =
    useContext(
      LanguageContext
    );

  if (!context) {
    throw new Error(
      'useAppLanguage must be used inside LanguageProvider'
    );
  }

  return context;
}