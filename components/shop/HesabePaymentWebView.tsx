import React, { useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { FONTS, PCOLORS } from "../purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| HESABE PAYMENT PAGE INSIDE THE APP (WebView, no external browser)
|--------------------------------------------------------------------------
|
| Shown over the checkout. Finished when:
|  - Hesabe sends the customer to our page /api/payments/hesabe/return|failure
|    (our server has already asked the result to Hesabe), or the link
|    mchat://payment-result of that page        -> onFinish("returned")
|  - the customer closes it (X / Android back)   -> onFinish("closed")
| In both cases the checkout asks the result to the server.
|
*/

/** What the return page says (already checked at Hesabe by our server) */
export type PayPageResult = "paid" | "failed" | "pending" | "closed";

type Props = {
  visible: boolean;
  url: string | null;
  isArabic: boolean;
  onFinish: (result: PayPageResult) => void;
};

/** mchat://payment-result?status=paid|failed|pending  /  .../hesabe/failure/... */
const resultOf = (url: string): PayPageResult => {
  const match = url.match(/[?&]status=(paid|failed|pending)/i);
  if (match) return match[1].toLowerCase() as PayPageResult;
  if (/\/payments\/hesabe\/failure\//i.test(url)) return "failed";
  return "pending";
};

/** Our return pages: payment finished (paid or not) */
const isReturnUrl = (url: string) =>
  url.startsWith("mchat://") || /\/payments\/hesabe\/(return|failure)\//i.test(url);

export default function HesabePaymentWebView({ visible, url, isArabic, onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const finished = useRef(false);

  const finish = (result: PayPageResult) => {
    if (finished.current) return;
    finished.current = true;
    onFinish(result);
  };

  // New page opened: can finish again
  React.useEffect(() => {
    if (visible) {
      finished.current = false;
      setLoading(true);
    }
  }, [visible, url]);

  const onNavigation = (state: WebViewNavigation) => {
    // Our return page loaded: it sends mchat://...?status= at once (below);
    // safety net if that link is blocked
    if (!state.loading && isReturnUrl(state.url)) {
      setTimeout(() => finish(resultOf(state.url)), 700);
    }
  };

  return (
    <Modal visible={visible && !!url} animationType="slide" onRequestClose={() => finish("closed")} presentationStyle="fullScreen">
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={[styles.header, isArabic && styles.rowRtl]}>
          <Pressable onPress={() => finish("closed")} hitSlop={12} style={styles.close}>
            <Ionicons name="close" size={24} color={PCOLORS.text} />
          </Pressable>

          <View style={[styles.titleRow, isArabic && styles.rowRtl]}>
            <Ionicons name="lock-closed" size={15} color={PCOLORS.primary} />
            <Text style={styles.title}>{isArabic ? "دفع آمن" : "Secure payment"}</Text>
          </View>

          <View style={styles.close} />
        </View>

        {!!url && (
          <WebView
            source={{ uri: url }}
            style={styles.web}
            originWhitelist={["https://*", "http://*", "mchat://*"]}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={onNavigation}
            // Link back to the app (end of the return page): stop here, finished
            onShouldStartLoadWithRequest={request => {
              if (request.url.startsWith("mchat://")) {
                finish(resultOf(request.url));
                return false;
              }
              return true;
            }}
            onError={() => setLoading(false)}
            {...(Platform.OS === "android" ? { mixedContentMode: "compatibility" as const } : {})}
          />
        )}

        {loading && (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="large" color={PCOLORS.primary} />
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Text style={styles.footerText}>
            {isArabic ? "KNET · Visa · Mastercard - مدعوم من Hesabe" : "KNET · Visa · Mastercard - powered by Hesabe"}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PCOLORS.white },
  rowRtl: { flexDirection: "row-reverse" },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
  close: { width: 36, alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  web: { flex: 1 },
  loader: { ...StyleSheet.absoluteFillObject, top: 52, alignItems: "center", justifyContent: "center" },
  footer: { paddingTop: 8, alignItems: "center", borderTopWidth: 1, borderTopColor: PCOLORS.border },
  footerText: { fontFamily: FONTS.regular, fontSize: 11, color: PCOLORS.muted },
});