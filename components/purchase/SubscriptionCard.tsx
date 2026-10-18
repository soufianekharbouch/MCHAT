import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { PurchaseSummary } from "../../types/purchase";
import { StatusDot } from "./ScreenParts";
import { FONTS, PCOLORS, formatDate, purchaseStatusColor, purchaseTexts } from "./purchaseUtils";

/*
|--------------------------------------------------------------------------
| SUBSCRIPTION CARD
|--------------------------------------------------------------------------
|
| Same design as the card of the pet profile, fed by a real purchase.
| Buttons are shown only when the matching callback is given.
|
*/

type Props = {
  purchase: PurchaseSummary;
  isArabic: boolean;
  onOpen?: () => void;
  onPlan?: () => void;
  onRenew?: () => void;
  /** Opens the plans with the trial prices (default: onRenew). */
  onTrialOffer?: () => void;
  onUploadReceipt?: () => void;
  onCancel?: () => void;
};

export default function SubscriptionCard({
  purchase,
  isArabic,
  onOpen,
  onPlan,
  onRenew,
  onTrialOffer,
  onUploadReceipt,
  onCancel,
}: Props) {
  const t = purchaseTexts(isArabic);
  const rtl = isArabic ? styles.textRtl : null;

  const { usage, period, price } = purchase;
  const progress = usage.total_recipes > 0 ? Math.min(1, usage.scheduled_recipes / usage.total_recipes) : 0;

  const title = `${purchase.product.name} (${usage.total_recipes} ${isArabic ? "وجبة" : "Meals"})`;
  const hasPlannedDeliveries = usage.deliveries_count > 0;

  // Trial still running: invite to continue with a special price
  const trialOffer = purchase.trial_offer?.available ? purchase.trial_offer : null;
  const openTrialOffer = onTrialOffer ?? onRenew;

  const offerTexts = isArabic
    ? {
        title: "عرض خاص قبل نهاية التجربة",
        text: "استمر مع باقة كاملة بسعر خاص",
        from: "ابتداءً من",
        until: "حتى",
        button: "اكتشف العرض",
      }
    : {
        title: "Special offer before your trial ends",
        text: "Continue with a full plan at a special price",
        from: "from",
        until: "until",
        button: "See the offer",
      };

  return (
    <Pressable onPress={onOpen} disabled={!onOpen} style={styles.card}>
      {/* HEADER */}
      <View style={[styles.header, isArabic && styles.rowRtl]}>
        <Text style={styles.statusLabel}>{t.subscriptionStatus}</Text>
        <StatusDot color={purchaseStatusColor(purchase.status)} label={purchase.status_label} isArabic={isArabic} />
      </View>

      {/* BADGES */}
      {(purchase.product.is_trial || purchase.product.is_premium) && (
        <View style={[styles.badges, isArabic && styles.rowRtl]}>
          {purchase.product.is_premium && (
            <View style={[styles.badge, styles.badgePremium]}>
              <MaterialCommunityIcons name="crown-outline" size={13} color="#8A6D1F" />
              <Text style={[styles.badgeText, { color: "#8A6D1F" }]}>Premium</Text>
            </View>
          )}
          {purchase.product.is_trial && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{isArabic ? "باقة تجريبية" : "Trial pack"}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={[styles.title, rtl]}>{title}</Text>

      {/* STATS */}
      <View style={[styles.stats, isArabic && styles.rowRtl]}>
        <View style={styles.statColumn}>
          <Text style={[styles.statLabel, rtl]}>{t.packageSize}</Text>
          <View style={[styles.statValueRow, isArabic && styles.rowRtl]}>
            <Text style={styles.statValue}>{usage.total_recipes}</Text>
            <Text style={styles.statSuffix}>{t.meals}</Text>
          </View>
        </View>

        <View style={styles.statSeparator} />

        <View style={styles.statColumn}>
          <Text style={[styles.statLabel, rtl]}>
            {t.price} / {period.duration_label}
          </Text>
          <View style={[styles.statValueRow, isArabic && styles.rowRtl]}>
            <Text style={styles.statValue}>{formatPrice(price.total)}</Text>
            <Text style={styles.statSuffix}>{price.currency}</Text>
          </View>
        </View>
      </View>

      {/* PROGRESS */}
      {purchase.is_active && (
        <View style={styles.progressBlock}>
          <View style={[styles.progressLabels, isArabic && styles.rowRtl]}>
            <Text style={styles.progressText}>
              {t.progress}: {usage.scheduled_recipes} / {usage.total_recipes}
            </Text>
            <Text style={styles.progressText}>
              {usage.remaining_recipes} {t.remaining}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
          </View>
        </View>
      )}

      <View style={styles.divider} />

      {/* PERIOD */}
      <Text style={[styles.cycleText, rtl]}>
        {t.cycleStarted}{" "}
        <Text style={styles.cycleStrong}>
          {period.starts_on ? formatDate(period.starts_on, isArabic) : t.notStarted}
        </Text>
      </Text>

      {!!period.ends_on && (
        <Text style={[styles.cycleText, rtl]}>
          {t.cycleEnds} <Text style={styles.cycleStrong}>{formatDate(period.ends_on, isArabic)}</Text>
          {period.days_left !== null && period.days_left >= 0 && (
            <Text>
              {"  ·  "}
              {period.days_left} {t.daysLeft}
            </Text>
          )}
        </Text>
      )}

      {/* PENDING PAYMENT */}
      {purchase.status === "pending" && (
        <View style={[styles.pendingBox, isArabic && styles.rowRtl]}>
          <Ionicons name="time-outline" size={19} color={PCOLORS.warning} />
          <Text style={[styles.pendingText, rtl]}>
            {purchase.payment.proof_uploaded ? t.receiptSent : t.awaitingPayment}
            {purchase.payment.method_label ? ` · ${purchase.payment.method_label}` : ""}
          </Text>
        </View>
      )}

      {/* ACTIONS */}
      {!!onUploadReceipt && purchase.can_upload_payment_proof && purchase.payment.method === "bank_transfer" && (
        <Pressable style={[styles.editButton, isArabic && styles.rowRtl]} onPress={onUploadReceipt}>
          <Ionicons name="cloud-upload-outline" size={22} color={PCOLORS.text} />
          <Text style={styles.editButtonText}>{t.uploadReceipt}</Text>
        </Pressable>
      )}

      {!!onPlan && purchase.can_schedule && (
        <Pressable style={[styles.editButton, isArabic && styles.rowRtl]} onPress={onPlan}>
          <Ionicons name={hasPlannedDeliveries ? "pencil-outline" : "calendar-outline"} size={22} color={PCOLORS.text} />
          <Text style={styles.editButtonText}>{hasPlannedDeliveries ? t.editDeliveries : t.planDeliveries}</Text>
        </Pressable>
      )}

      {/* TRIAL OFFER */}
      {!!trialOffer && !!openTrialOffer && (
        <View style={styles.offerBox}>
          <View style={[styles.offerHeader, isArabic && styles.rowRtl]}>
            <MaterialCommunityIcons name="gift-outline" size={22} color="#A86A12" />
            <Text style={[styles.offerTitle, rtl]}>{offerTexts.title}</Text>
          </View>
          <Text style={[styles.offerText, rtl]}>
            {offerTexts.text} · {offerTexts.from}{" "}
            <Text style={styles.offerPrice}>
              {formatPrice(trialOffer.from_price)} {trialOffer.currency}
            </Text>
            {trialOffer.ends_on ? ` · ${offerTexts.until} ${formatDate(trialOffer.ends_on, isArabic)}` : ""}
          </Text>
          <Pressable style={[styles.offerButton, isArabic && styles.rowRtl]} onPress={openTrialOffer}>
            <MaterialCommunityIcons name="creation" size={22} color={PCOLORS.white} />
            <Text style={styles.renewButtonText}>{offerTexts.button}</Text>
          </Pressable>
        </View>
      )}

      {!!onRenew && !trialOffer && (
        <Pressable style={[styles.renewButton, isArabic && styles.rowRtl]} onPress={onRenew}>
          <MaterialCommunityIcons name="creation-outline" size={24} color={PCOLORS.white} />
          <Text style={styles.renewButtonText}>{t.renew}</Text>
        </Pressable>
      )}

      {!!onCancel && purchase.can_cancel && (
        <Pressable style={[styles.cancelAction, isArabic && styles.rowRtl]} onPress={onCancel}>
          <Ionicons name="close" size={22} color={PCOLORS.danger} />
          <Text style={styles.cancelActionText}>{t.cancelPlan}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export function formatPrice(value: number): string {
  // KWD: 3 decimals, trailing zeros removed (12.500 -> 12.5, 15.000 -> 15)
  return String(Number(value.toFixed(3)));
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  card: {
    borderTopWidth: 3,
    borderTopColor: PCOLORS.primary,
    backgroundColor: PCOLORS.card,
    paddingHorizontal: 25,
    paddingTop: 31,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: PCOLORS.text,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: PCOLORS.primaryLight,
  },
  badgePremium: {
    backgroundColor: "#F8EDC8",
  },
  badgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: PCOLORS.primary,
  },
  title: {
    marginTop: 22,
    fontFamily: FONTS.bold,
    fontSize: 27,
    lineHeight: 36,
    color: PCOLORS.text,
  },
  stats: {
    flexDirection: "row",
    marginTop: 28,
  },
  statColumn: {
    flex: 1,
  },
  statSeparator: {
    width: 1,
    height: 76,
    marginHorizontal: 20,
    backgroundColor: PCOLORS.border,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: PCOLORS.muted,
  },
  statValueRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  statValue: {
    fontFamily: FONTS.medium,
    fontSize: 37,
    lineHeight: 46,
    color: PCOLORS.text,
  },
  statSuffix: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: PCOLORS.text,
  },
  progressBlock: {
    marginTop: 22,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: PCOLORS.muted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: PCOLORS.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PCOLORS.primary,
  },
  divider: {
    height: 1,
    marginTop: 25,
    marginBottom: 20,
    backgroundColor: PCOLORS.border,
  },
  cycleText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 22,
    color: PCOLORS.muted,
  },
  cycleStrong: {
    fontFamily: FONTS.semiBold,
    color: PCOLORS.text,
  },
  pendingBox: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    borderRadius: 9,
    backgroundColor: PCOLORS.warningLight,
  },
  pendingText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 20,
    color: PCOLORS.text,
  },
  editButton: {
    minHeight: 60,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#B7DAD4",
    borderRadius: 10,
    backgroundColor: "#E5ECE8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  editButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: PCOLORS.text,
  },
  offerBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0CF94",
    backgroundColor: PCOLORS.warningLight,
  },
  offerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  offerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  offerText: { marginTop: 6, fontFamily: FONTS.regular, fontSize: 13, lineHeight: 21, color: PCOLORS.muted },
  offerPrice: { fontFamily: FONTS.bold, color: "#A86A12" },
  offerButton: {
    minHeight: 54,
    marginTop: 14,
    borderRadius: 9,
    backgroundColor: PCOLORS.warning,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  renewButton: {
    minHeight: 60,
    marginTop: 13,
    borderRadius: 9,
    backgroundColor: PCOLORS.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  renewButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: PCOLORS.white,
  },
  cancelAction: {
    marginTop: 22,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
  },
  cancelActionText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: PCOLORS.text,
  },
});