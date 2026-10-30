import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { TrackedDelivery, TrackingStepKey } from "../services/trackingApi";

const ICONS: Record<TrackingStepKey, keyof typeof Ionicons.glyphMap> = {
  scheduled: "calendar-outline",
  prepared: "cube-outline",
  on_the_way: "bicycle-outline",
  delivered: "checkmark-done-outline",
};

const MAUVE = "#8B5FBF";
const GREEN = "#16a34a";
const GREY = "#d4d4d8";

type Props = {
  delivery: TrackedDelivery;
  lang: "ar" | "en";
};

/**
 * 4 steps of a delivery: Scheduled -> Prepared -> On the way -> Delivered.
 */
export default function DeliveryTracker({ delivery, lang }: Props) {
  const isRtl = lang === "ar";

  return (
    <View style={[styles.row, isRtl && styles.rowRtl]}>
      {delivery.steps.map((step, index) => {
        const color = step.key === "delivered" && step.done ? GREEN : step.done ? MAUVE : GREY;
        const isLast = index === delivery.steps.length - 1;

        return (
          <View key={step.key} style={styles.step}>
            <View style={[styles.lineRow, isRtl && styles.rowRtl]}>
              <View style={[styles.line, { backgroundColor: index === 0 ? "transparent" : step.done ? MAUVE : GREY }]} />
              <View style={[styles.circle, { borderColor: color, backgroundColor: step.done ? color : "#fff" }]}>
                <Ionicons name={ICONS[step.key]} size={15} color={step.done ? "#fff" : GREY} />
              </View>
              <View
                style={[
                  styles.line,
                  { backgroundColor: isLast ? "transparent" : delivery.steps[index + 1]?.done ? MAUVE : GREY },
                ]}
              />
            </View>

            <Text
              style={[styles.label, step.current && styles.labelCurrent, { color: step.done ? "#1f2937" : "#9ca3af" }]}
              numberOfLines={2}
            >
              {step.label}
            </Text>

            {step.at ? (
              <Text style={styles.time}>
                {new Date(step.at).toLocaleTimeString(isRtl ? "ar-KW" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  rowRtl: { flexDirection: "row-reverse" },
  step: { flex: 1, alignItems: "center" },
  lineRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  line: { flex: 1, height: 3, borderRadius: 2 },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { marginTop: 6, fontSize: 11, textAlign: "center", fontFamily: "Cairo_600SemiBold" },
  labelCurrent: { fontFamily: "Cairo_800ExtraBold" },
  time: { fontSize: 10, color: "#6b7280", fontFamily: "Cairo_400Regular" },
});