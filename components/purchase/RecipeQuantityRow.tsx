import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FONTS, PCOLORS } from "./purchaseUtils";

/*
|--------------------------------------------------------------------------
| RECIPE ROW  "01  Wild Salmon & Garden Courgette        ×6"
|--------------------------------------------------------------------------
|
| Read-only (×6) when editable is false, − / + stepper otherwise.
|
*/

type Props = {
  index: number;
  name: string;
  subtitle?: string | null;
  quantity: number;
  editable?: boolean;
  canIncrement?: boolean;
  canDecrement?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
  isArabic: boolean;
  isLast?: boolean;
};

export default function RecipeQuantityRow({
  index,
  name,
  subtitle,
  quantity,
  editable = false,
  canIncrement = true,
  canDecrement = true,
  onIncrement,
  onDecrement,
  isArabic,
  isLast = false,
}: Props) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder, isArabic && styles.rowRtl]}>
      <Text style={styles.index}>{String(index).padStart(2, "0")}</Text>

      <View style={styles.content}>
        <Text style={[styles.name, isArabic && styles.textRtl]}>{name}</Text>
        {!!subtitle && <Text style={[styles.subtitle, isArabic && styles.textRtl]}>{subtitle}</Text>}
      </View>

      {editable ? (
        <View style={[styles.stepper, isArabic && styles.rowRtl]}>
          <Pressable
            hitSlop={6}
            style={[styles.stepButton, !canDecrement && styles.stepDisabled]}
            disabled={!canDecrement}
            onPress={onDecrement}
          >
            <Ionicons name="remove" size={18} color={PCOLORS.text} />
          </Pressable>

          <Text style={styles.stepValue}>{quantity}</Text>

          <Pressable
            hitSlop={6}
            style={[styles.stepButton, !canIncrement && styles.stepDisabled]}
            disabled={!canIncrement}
            onPress={onIncrement}
          >
            <Ionicons name="add" size={18} color={PCOLORS.text} />
          </Pressable>
        </View>
      ) : (
        <Text style={styles.quantity}>×{quantity}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
  index: {
    width: 22,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: PCOLORS.muted,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: PCOLORS.text,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: PCOLORS.muted,
  },
  quantity: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    color: PCOLORS.text,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PCOLORS.white,
  },
  stepDisabled: {
    opacity: 0.35,
  },
  stepValue: {
    minWidth: 24,
    textAlign: "center",
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: PCOLORS.text,
  },
});