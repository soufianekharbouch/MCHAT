import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { FONTS, PCOLORS } from "./purchaseUtils";

/*
|--------------------------------------------------------------------------
| BACK ROW (Back on one side, optional right content on the other)
|--------------------------------------------------------------------------
*/

export function BackRow({
  label,
  isArabic,
  right,
  onBack,
}: {
  label: string;
  isArabic: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={[styles.backRow, isArabic && styles.rowRtl]}>
      <Pressable
        hitSlop={10}
        style={[styles.backButton, isArabic && styles.rowRtl]}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/pets")))}
      >
        <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={20} color={PCOLORS.primary} />
        <Text style={styles.backText}>{label}</Text>
      </Pressable>

      {right}
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| PAGE TITLE + SUBTITLE
|--------------------------------------------------------------------------
*/

export function PageTitle({
  title,
  subtitle,
  isArabic,
}: {
  title: string;
  subtitle?: string;
  isArabic: boolean;
}) {
  return (
    <View style={styles.titleBlock}>
      <Text style={[styles.title, isArabic && styles.textRtl]}>{title}</Text>
      {!!subtitle && <Text style={[styles.subtitle, isArabic && styles.textRtl]}>{subtitle}</Text>}
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| LOADER / ERROR
|--------------------------------------------------------------------------
*/

export function CenteredLoader() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={PCOLORS.primary} />
    </View>
  );
}

export function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={42} color={PCOLORS.danger} />
      <Text style={styles.errorText}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Ionicons name="refresh" size={18} color={PCOLORS.white} />
        <Text style={styles.retryText}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STATUS DOT + LABEL
|--------------------------------------------------------------------------
*/

export function StatusDot({
  color,
  label,
  isArabic,
}: {
  color: string;
  label: string;
  isArabic: boolean;
}) {
  return (
    <View style={[styles.statusRow, isArabic && styles.rowRtl]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| BUTTONS
|--------------------------------------------------------------------------
*/

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={PCOLORS.white} />
      ) : (
        <>
          {!!icon && <Ionicons name={icon} size={20} color={PCOLORS.white} />}
          <Text style={styles.primaryButtonText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  icon,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryButton,
        danger && styles.secondaryDanger,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {!!icon && <Ionicons name={icon} size={20} color={danger ? PCOLORS.danger : PCOLORS.text} />}
      <Text style={[styles.secondaryButtonText, danger && { color: PCOLORS.danger }]}>{label}</Text>
    </Pressable>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

export const sharedStyles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
});

const styles = StyleSheet.create({
  rowRtl: sharedStyles.rowRtl,
  textRtl: sharedStyles.textRtl,

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 40,
  },
  backText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: PCOLORS.text,
  },

  titleBlock: {
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 34,
    lineHeight: 44,
    color: PCOLORS.text,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 24,
    color: PCOLORS.muted,
  },

  center: {
    flex: 1,
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 14,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 22,
    color: PCOLORS.text,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 9,
    backgroundColor: PCOLORS.dark,
  },
  retryText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: PCOLORS.white,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: PCOLORS.text,
  },

  primaryButton: {
    minHeight: 58,
    borderRadius: 9,
    backgroundColor: PCOLORS.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: PCOLORS.white,
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B7DAD4",
    backgroundColor: "#E5ECE8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  secondaryDanger: {
    borderColor: "#F2C4C6",
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: PCOLORS.text,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
}); 