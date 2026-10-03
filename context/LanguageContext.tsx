import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import * as SecureStore from 'expo-secure-store';


/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export type AppLanguage =
  | 'ar'
  | 'en';

type LanguageContextType = {
  language: AppLanguage;

  isArabic: boolean;
  isEnglish: boolean;

  isLoading: boolean;

  setLanguage: (
    language: AppLanguage
  ) => Promise<void>;

  reloadLanguage: () => Promise<void>;
};


/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const LANGUAGE_STORAGE_KEY =
  'locale';

const DEFAULT_LANGUAGE: AppLanguage =
  'ar';


/*
|--------------------------------------------------------------------------
| CONTEXT
|--------------------------------------------------------------------------
*/

const LanguageContext =
  createContext<
    LanguageContextType | undefined
  >(undefined);


/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    language,
    setLanguageState,
  ] =
    useState<AppLanguage>(
      DEFAULT_LANGUAGE
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);


  /*
  |--------------------------------------------------------------------------
  | LOAD SAVED LANGUAGE
  |--------------------------------------------------------------------------
  */

  const reloadLanguage =
    async () => {
      try {
        const savedLanguage =
          await SecureStore.getItemAsync(
            LANGUAGE_STORAGE_KEY
          );

        if (
          savedLanguage === 'ar' ||
          savedLanguage === 'en'
        ) {
          setLanguageState(
            savedLanguage
          );

          return;
        }

        /*
         * No saved language yet.
         * Use Arabic by default.
         */

        setLanguageState(
          DEFAULT_LANGUAGE
        );

        await SecureStore.setItemAsync(
          LANGUAGE_STORAGE_KEY,
          DEFAULT_LANGUAGE
        );
      } catch (error) {
        console.error(
          'Unable to load language:',
          error
        );

        setLanguageState(
          DEFAULT_LANGUAGE
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const initializeLanguage =
      async () => {
        try {
          await reloadLanguage();
        } finally {
          setIsLoading(false);
        }
      };

    initializeLanguage();
  }, []);


  /*
  |--------------------------------------------------------------------------
  | CHANGE LANGUAGE
  |--------------------------------------------------------------------------
  */

  const setLanguage =
    async (
      newLanguage: AppLanguage
    ) => {
      /*
       * Update UI immediately.
       */

      setLanguageState(
        newLanguage
      );

      /*
       * Persist language locally.
       *
       * This value is available before
       * and after customer authentication.
       */

      await SecureStore.setItemAsync(
        LANGUAGE_STORAGE_KEY,
        newLanguage
      );
    };


  /*
  |--------------------------------------------------------------------------
  | CONTEXT VALUE
  |--------------------------------------------------------------------------
  */

  const isArabic =
    language === 'ar';

  const isEnglish =
    language === 'en';


  return (
    <LanguageContext.Provider
      value={{
        language,

        isArabic,
        isEnglish,

        isLoading,

        setLanguage,
        reloadLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}


/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

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