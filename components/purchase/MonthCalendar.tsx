import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  CalendarMarker,
  FONTS,
  PCOLORS,
  WEEKDAYS_SHORT_AR,
  WEEKDAYS_SHORT_EN,
  markerColor,
  monthLabel,
  toISODate,
} from "./purchaseUtils";

/*
|--------------------------------------------------------------------------
| MONTH CALENDAR
|--------------------------------------------------------------------------
|
| - month: any date of the displayed month
| - markers: { "2026-09-22": "scheduled" | "delivered" | "delayed" }
| - minDate / maxDate (YYYY-MM-DD): days outside are greyed and not selectable
|   (only when selectableOnlyInRange is true; otherwise every day is selectable)
|
*/

type Props = {
  month: Date;
  onChangeMonth: (month: Date) => void;
  selectedDate?: string | null;
  onSelectDate: (iso: string) => void;
  markers?: Record<string, CalendarMarker>;
  minDate?: string | null;
  maxDate?: string | null;
  selectableOnlyInRange?: boolean;
  disabledWeekdays?: number[]; // 0 = Sunday
  isArabic: boolean;
};

export default function MonthCalendar({
  month,
  onChangeMonth,
  selectedDate,
  onSelectDate,
  markers = {},
  minDate,
  maxDate,
  selectableOnlyInRange = false,
  disabledWeekdays = [],
  isArabic,
}: Props) {
  const weekdays = isArabic ? WEEKDAYS_SHORT_AR : WEEKDAYS_SHORT_EN;

  /*
   * Weeks of the month, starting on Sunday (null = empty cell).
   */
  const weeks = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

    const cells: (Date | null)[] = [];

    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    return rows;
  }, [month]);

  const changeMonth = (delta: number) => {
    onChangeMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  };

  const todayIso = toISODate(new Date());

  const isOutOfRange = (iso: string) =>
    (!!minDate && iso < minDate) || (!!maxDate && iso > maxDate);

  return (
    <View>
      {/* MONTH NAVIGATION */}
      <View style={[styles.monthRow, isArabic && styles.rowRtl]}>
        <Pressable hitSlop={12} style={styles.arrow} onPress={() => changeMonth(-1)}>
          <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={22} color={PCOLORS.muted} />
        </Pressable>

        <Text style={styles.monthText}>{monthLabel(month, isArabic)}</Text>

        <Pressable hitSlop={12} style={styles.arrow} onPress={() => changeMonth(1)}>
          <Ionicons name={isArabic ? "arrow-back" : "arrow-forward"} size={22} color={PCOLORS.muted} />
        </Pressable>
      </View>

      {/* WEEKDAYS */}
      <View style={[styles.weekRow, isArabic && styles.rowRtl]}>
        {weekdays.map(day => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>

      {/* DAYS */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={[styles.weekRow, isArabic && styles.rowRtl]}>
          {week.map((date, dayIndex) => {
            if (!date) {
              return <View key={dayIndex} style={styles.dayCell} />;
            }

            const iso = toISODate(date);
            const selected = iso === selectedDate;
            const marker = markers[iso];
            const restDay = disabledWeekdays.includes(date.getDay());
            const outOfRange = isOutOfRange(iso) || restDay;
            const disabled = (selectableOnlyInRange && outOfRange) || restDay;

            return (
              <Pressable
                key={dayIndex}
                style={styles.dayCell}
                disabled={disabled}
                onPress={() => onSelectDate(iso)}
              >
                <View style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                  <Text
                    style={[
                      styles.dayText,
                      iso === todayIso && styles.dayToday,
                      outOfRange && styles.dayOutOfRange,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>

                <View style={[styles.markerDot, marker ? { backgroundColor: markerColor(marker) } : null]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| LEGEND
|--------------------------------------------------------------------------
*/

export function CalendarLegend({
  labels,
  isArabic,
}: {
  labels: { scheduled: string; delivered: string; delayed: string };
  isArabic: boolean;
}) {
  const items: { marker: CalendarMarker; label: string }[] = [
    { marker: "scheduled", label: labels.scheduled },
    { marker: "delivered", label: labels.delivered },
    { marker: "delayed", label: labels.delayed },
  ];

  return (
    <View style={[styles.legend, isArabic && styles.rowRtl]}>
      {items.map(item => (
        <View key={item.marker} style={[styles.legendItem, isArabic && styles.rowRtl]}>
          <View style={[styles.legendDot, { backgroundColor: markerColor(item.marker) }]} />
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },

  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },
  arrow: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  monthText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: PCOLORS.text,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: PCOLORS.muted,
    marginBottom: 14,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: PCOLORS.primary,
  },
  dayText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: PCOLORS.text,
  },
  dayToday: {
    fontFamily: FONTS.bold,
  },
  dayOutOfRange: {
    color: "#C2BCB4",
  },
  dayTextSelected: {
    fontFamily: FONTS.bold,
    color: PCOLORS.text,
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
    backgroundColor: "transparent",
  },

  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 18,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: PCOLORS.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: PCOLORS.muted,
  },
});