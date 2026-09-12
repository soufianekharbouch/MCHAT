import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import * as SecureStore
  from 'expo-secure-store';

import { router }
  from 'expo-router';

import {
  ApiError,
  getCustomerData,
} from '../services/customerApi';

import type {
  Customer,
  Subscription,
} from '../types/customer';

type CustomerDataContextType = {
  customer: Customer | null;
  subscription: Subscription | null;

  loading: boolean;

  error: string | null;

  refresh: () => Promise<void>;
};

const CustomerDataContext =
  createContext<
    CustomerDataContextType | undefined
  >(undefined);

export function CustomerDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [
    customer,
    setCustomer,
  ] = useState<Customer | null>(null);

  const [
    subscription,
    setSubscription,
  ] = useState<Subscription | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const refresh =
    useCallback(async () => {

      try {

        setLoading(true);
        setError(null);

        /*
         * Vérifier d'abord si une session existe.
         * Cela évite l'erreur :
         * "Missing access token"
         */
        const accessToken =
          await SecureStore.getItemAsync(
            'access_token'
          );

        if (!accessToken) {

          setCustomer(null);
          setSubscription(null);

          return;
        }

        const data =
          await getCustomerData();

        setCustomer(
          data.customer || null
        );

        setSubscription(
          data.subscription || null
        );

      } catch (err) {

        console.error(
          'Customer data error:',
          err
        );

        if (
          err instanceof ApiError &&
          (
            err.status === 401 ||
            err.status === 403
          )
        ) {

          await SecureStore.deleteItemAsync(
            'access_token'
          );

          await SecureStore.deleteItemAsync(
            'access_token_expires_at'
          );

          setCustomer(null);
          setSubscription(null);

          router.replace('/login');

          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load data'
        );

      } finally {

        setLoading(false);

      }

    }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CustomerDataContext.Provider
      value={{
        customer,
        subscription,
        loading,
        error,
        refresh,
      }}
    >
      {children}
    </CustomerDataContext.Provider>
  );
}

export function useCustomerData() {

  const context =
    useContext(CustomerDataContext);

  if (!context) {
    throw new Error(
      'useCustomerData must be used inside CustomerDataProvider'
    );
  }

  return context;
}