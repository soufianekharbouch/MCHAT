import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ApiError,
  getCustomerData,
} from '../services/customerApi';

import {
  clearSession,
  loadSession,
  onSessionChange,
} from '../services/session';

import type {
  Customer,
  Subscription,
} from '../types/customer';

/*
|--------------------------------------------------------------------------
| CUSTOMER DATA
|--------------------------------------------------------------------------
|
| Visitor (no token): customer / subscription = null, isGuest = true.
| No redirection to the login screen anymore: the shop stays open.
| Data are reloaded automatically when the customer signs in or out.
|
*/

type CustomerDataContextType = {
  customer: Customer | null;
  subscription: Subscription | null;

  loading: boolean;
  error: string | null;

  /** true when nobody is signed in (visitor mode) */
  isGuest: boolean;

  refresh: () => Promise<void>;
};

const CustomerDataContext =
  createContext<CustomerDataContextType | undefined>(undefined);

export function CustomerDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  // Session state used by the last refresh (avoids double loads)
  const lastSignedIn = useRef<boolean | null>(null);
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    refreshing.current = true;

    try {
      setLoading(true);
      setError(null);

      const signedIn = await loadSession();
      lastSignedIn.current = signedIn;

      if (!signedIn) {
        setCustomer(null);
        setSubscription(null);
        setIsGuest(true);
        return;
      }

      const data = await getCustomerData();

      setCustomer(data.customer || null);
      setSubscription(data.subscription || null);
      setIsGuest(false);
    } catch (err) {
      console.error('Customer data error:', err);

      /*
       * Session refused by the server: back to visitor mode
       * (the shop stays available).
       */
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        lastSignedIn.current = false;
        await clearSession();

        setCustomer(null);
        setSubscription(null);
        setIsGuest(true);

        return;
      }

      setError(err instanceof Error ? err.message : 'Unable to load data');
    } finally {
      refreshing.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    // Sign in / logout anywhere in the app -> reload
    const unsubscribe = onSessionChange(signedIn => {
      if (!refreshing.current && signedIn !== lastSignedIn.current) {
        void refresh();
      }
    });

    return unsubscribe;
  }, [refresh]);

  return (
    <CustomerDataContext.Provider
      value={{
        customer,
        subscription,
        loading,
        error,
        isGuest,
        refresh,
      }}
    >
      {children}
    </CustomerDataContext.Provider>
  );
}

export function useCustomerData() {
  const context = useContext(CustomerDataContext);

  if (!context) {
    throw new Error('useCustomerData must be used inside CustomerDataProvider');
  }

  return context;
}
