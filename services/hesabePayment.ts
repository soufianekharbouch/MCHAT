import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { fetchPaymentStatus, type Lang, type PaymentStatusResponse } from "./shopApi";

/*
|--------------------------------------------------------------------------
| HESABE PAYMENT PAGE (KNET / Visa / Mastercard)
|--------------------------------------------------------------------------
|
| 1. The secure Hesabe page opens in the in-app browser
| 2. Paid / cancelled: Hesabe sends the customer to our server, which
|    sends him back to the app (mchat://payment-result) -> browser closed
| 3. The app asks the server the result (the server asks Hesabe):
|    never trusted from the browser
| The customer can also close the page: the result is asked the same way.
|
*/

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type HesabeOutcome = {
  /** paid | failed | expired | initiated (still not known) */
  status: PaymentStatusResponse["payment"]["status"];
  paid: boolean;
  data: PaymentStatusResponse | null;
};

export async function openHesabePayment(lang: Lang, url: string, transactionId: number): Promise<HesabeOutcome> {
  try {
    await WebBrowser.openAuthSessionAsync(url, Linking.createURL("payment-result"), {
      showInRecents: true,
      // Android: the page in Custom Tabs, back to the app at the end
      createTask: false,
    } as any);
  } catch {
    // Browser closed with an error: the result is asked anyway
  }

  return waitForPaymentResult(lang, transactionId);
}

/**
 * Result after the Hesabe page, as fast as possible:
 *  - failed  : already refused by our server -> nothing to wait
 *  - paid    : one call (packs + first delivery)
 *  - pending : bank still answering -> 3 quick calls
 *  - closed  : customer closed the page -> one call
 */
export async function resultAfterPayPage(
  lang: Lang,
  transactionId: number,
  result: "paid" | "failed" | "pending" | "closed"
): Promise<HesabeOutcome> {
  if (result === "failed") {
    return { status: "failed", paid: false, data: null };
  }

  return waitForPaymentResult(lang, transactionId, result === "pending" ? 3 : 1, 1000);
}

/**
 * Result of the payment asked to the server (which asks Hesabe):
 * the first call at once, the next ones every delayMs.
 */
export async function waitForPaymentResult(lang: Lang, transactionId: number, attempts = 3, delayMs = 1000): Promise<HesabeOutcome> {
  let last: PaymentStatusResponse | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      last = await fetchPaymentStatus(lang, transactionId);

      if (last.payment.status !== "initiated") {
        break;
      }
    } catch {
      // network: next attempt
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return {
    status: last?.payment.status ?? "initiated",
    paid: !!last?.payment.paid,
    data: last,
  };
}