import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { CustomerAddressOption } from "../../types/purchase";
import MonthCalendar from "./MonthCalendar";
import { CalendarMarker, FONTS, PCOLORS, formatShortDate, parseISODate, slotLabel } from "./purchaseUtils";

/*
|--------------------------------------------------------------------------
| FIELD LABEL
|--------------------------------------------------------------------------
*/

export function FieldLabel({ text, isArabic }: { text: string; isArabic: boolean }) {
  return <Text style={[styles.label, isArabic && styles.textRtl]}>{text}</Text>;
}

/*
|--------------------------------------------------------------------------
| DATE FIELD  (opens a month calendar)
|--------------------------------------------------------------------------
*/

export function DateField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  markers,
  disabled,
  isArabic,
  placeholder,
  disabledWeekdays = [0],
}: {
  disabledWeekdays?: number[];
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  minDate?: string | null;
  maxDate?: string | null;
  markers?: Record<string, CalendarMarker>;
  disabled?: boolean;
  isArabic: boolean;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  const [month, setMonth] = useState<Date>(parseISODate(value) ?? parseISODate(minDate) ?? new Date());

  const open = () => {
    setMonth(parseISODate(value) ?? parseISODate(minDate) ?? new Date());
    setVisible(true);
  };

  return (
    <View style={styles.field}>
      <FieldLabel text={label} isArabic={isArabic} />

      <Pressable
        disabled={disabled}
        onPress={open}
        style={[styles.input, isArabic && styles.rowRtl, disabled && styles.inputDisabled]}
      >
        <Text style={[styles.inputText, !value && styles.placeholder, isArabic && styles.textRtl]}>
          {value ? formatShortDate(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={19} color={PCOLORS.muted} />
      </Pressable>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <MonthCalendar
              month={month}
              onChangeMonth={setMonth}
              selectedDate={value}
              markers={markers}
              minDate={minDate}
              maxDate={maxDate}
              selectableOnlyInRange
              disabledWeekdays={disabledWeekdays}
              isArabic={isArabic}
              onSelectDate={iso => {
                onChange(iso);
                setVisible(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| ADDRESS FIELD  (opens the list of saved addresses)
|--------------------------------------------------------------------------
*/

export function AddressField({
  label,
  addresses,
  value,
  onChange,
  disabled,
  isArabic,
  placeholder,
}: {
  label: string;
  addresses: CustomerAddressOption[];
  value: number | null;
  onChange: (address: CustomerAddressOption) => void;
  disabled?: boolean;
  isArabic: boolean;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  const selected = addresses.find(address => address.id === value) ?? null;

  return (
    <View style={styles.field}>
      <FieldLabel text={label} isArabic={isArabic} />

      <Pressable
        disabled={disabled}
        onPress={() => setVisible(true)}
        style={[styles.input, isArabic && styles.rowRtl, disabled && styles.inputDisabled]}
      >
        <Text
          numberOfLines={1}
          style={[styles.inputText, !selected && styles.placeholder, isArabic && styles.textRtl]}
        >
          {selected ? addressLine(selected) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={19} color={PCOLORS.muted} />
      </Pressable>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <ScrollView style={{ maxHeight: 420 }}>
              {addresses.map(address => {
                const active = address.id === value;

                return (
                  <Pressable
                    key={address.id}
                    style={[styles.option, active && styles.optionActive, isArabic && styles.rowRtl]}
                    onPress={() => {
                      onChange(address);
                      setVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isArabic && styles.textRtl]}>
                        {address.label || (isArabic ? "العنوان" : "Address")}
                      </Text>
                      <Text style={[styles.optionText, isArabic && styles.textRtl]}>{addressDetails(address)}</Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={20} color={PCOLORS.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| SLOT CHIPS
|--------------------------------------------------------------------------
*/

export function SlotChips({
  label,
  slots,
  value,
  onChange,
  disabled,
  isArabic,
}: {
  label: string;
  slots: string[];
  value: string | null;
  onChange: (slot: string) => void;
  disabled?: boolean;
  isArabic: boolean;
}) {
  return (
    <View style={styles.field}>
      <FieldLabel text={label} isArabic={isArabic} />

      <View style={[styles.chips, isArabic && styles.rowRtl]}>
        {slots.map(slot => {
          const active = slot === value;

          return (
            <Pressable
              key={slot}
              disabled={disabled}
              onPress={() => onChange(slot)}
              style={[styles.chip, active && styles.chipActive, disabled && styles.inputDisabled]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{slotLabel(slot)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

export function addressLine(address: CustomerAddressOption): string {
  return [address.label, address.address, address.zone_label].filter(Boolean).join(" — ");
}

function addressDetails(address: CustomerAddressOption): string {
  return [address.address, address.zone_label, address.province_label].filter(Boolean).join(", ");
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },

  field: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: PCOLORS.text,
  },
  input: {
    minHeight: 60,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    borderRadius: 8,
    backgroundColor: PCOLORS.inputBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  inputText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: PCOLORS.text,
  },
  placeholder: {
    color: PCOLORS.muted,
  },
  overlay: {
    flex: 1,
    backgroundColor: PCOLORS.overlay,
    justifyContent: "center",
    padding: 22,
  },
  sheet: {
    borderRadius: 15,
    backgroundColor: PCOLORS.background,
    padding: 18,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
  optionActive: {
    backgroundColor: "rgba(36,155,151,0.08)",
  },
  optionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: PCOLORS.text,
  },
  optionText: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: PCOLORS.muted,
  },
  chips: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    borderColor: PCOLORS.primary,
    backgroundColor: "rgba(36,155,151,0.1)",
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: PCOLORS.text,
  },
  chipTextActive: {
    fontFamily: FONTS.bold,
    color: PCOLORS.primary,
  },
});