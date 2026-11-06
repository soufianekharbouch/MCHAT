import React, { useMemo, useState } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { FONTS, PCOLORS } from "../purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| PRODUCT INFO (blocks that open / close)
|--------------------------------------------------------------------------
|
| Built from the description of the product (back-office):
|
|   intro text
|   ## Ingredients          -> one block per "## Title" line
|   chicken breast - ...
|   ## Storage
|   - in the fridge         -> "- " = list
|   **bold** text
|
| The icon of a block follows its title (ingredients, serving, storage,
| delivery...). Extra blocks (recipes, delivery) can be added by the page.
|
*/

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type InfoSection = {
  key: string;
  title: string;
  /** lines of text ("- " = list item) */
  lines: string[];
};

type IconSpec = { family: "ion" | "mdi"; name: string };

/** Icon of a block from its title (Arabic or English). */
function iconFor(title: string): IconSpec {
  const text = title.toLowerCase();

  if (/مكون|ingredient/.test(text)) return { family: "ion", name: "leaf-outline" };
  if (/تقديم|إطعام|اطعام|serv|feed/.test(text)) return { family: "mdi", name: "bowl-mix-outline" };
  if (/تخزين|حفظ|stor|keep/.test(text)) return { family: "ion", name: "snow-outline" };
  if (/توصيل|deliver/.test(text)) return { family: "mdi", name: "truck-delivery-outline" };
  if (/محتو|داخل|content|inside/.test(text)) return { family: "ion", name: "cube-outline" };
  if (/وزن|weight/.test(text)) return { family: "mdi", name: "scale" };
  if (/وصف|recipe/.test(text)) return { family: "ion", name: "restaurant-outline" };
  if (/لماذا|why/.test(text)) return { family: "ion", name: "help-circle-outline" };

  return { family: "ion", name: "information-circle-outline" };
}

/** Description -> intro + blocks. Emojis at the start of the titles removed. */
export function parseDescription(description?: string | null): { intro: string[]; sections: InfoSection[] } {
  const intro: string[] = [];
  const sections: InfoSection[] = [];
  let current: InfoSection | null = null;

  String(description || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((raw, index) => {
      const line = raw.trim();
      const heading = line.match(/^#{1,3}\s+(.*)$/);

      if (heading) {
        const title = heading[1].replace(/^[^A-Za-z0-9\u0600-\u06FF]+/, "").trim() || heading[1].trim();
        current = { key: `s${index}`, title, lines: [] };
        sections.push(current);
        return;
      }

      if (line === "") return;

      (current ? current.lines : intro).push(line);
    });

  return { intro, sections: sections.filter(section => section.lines.length > 0) };
}

/** "**bold** text" -> Text parts */
export function RichLine({ text, style, isArabic }: { text: string; style?: any; isArabic: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return (
    <Text style={[styles.text, style, isArabic && styles.textRtl]}>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <Text key={index} style={styles.bold}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        )
      )}
    </Text>
  );
}

export default function ProductInfoSections({
  sections,
  isArabic,
  initiallyOpen,
}: {
  sections: InfoSection[];
  isArabic: boolean;
  initiallyOpen?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(initiallyOpen ?? null);

  const items = useMemo(() => sections.map(section => ({ ...section, icon: iconFor(section.title) })), [sections]);

  if (items.length === 0) return null;

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(current => (current === key ? null : key));
  };

  return (
    <View style={styles.list}>
      {items.map(section => {
        const expanded = open === section.key;

        return (
          <View key={section.key} style={styles.item}>
            <Pressable
              onPress={() => toggle(section.key)}
              style={({ pressed }) => [styles.header, isArabic && styles.rowRtl, pressed && styles.pressed]}
            >
              {section.icon.family === "mdi" ? (
                <MaterialCommunityIcons name={section.icon.name as any} size={20} color={PCOLORS.primary} />
              ) : (
                <Ionicons name={section.icon.name as any} size={20} color={PCOLORS.primary} />
              )}

              <Text style={[styles.title, isArabic && styles.textRtl]} numberOfLines={1}>
                {section.title}
              </Text>

              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={PCOLORS.text} />
            </Pressable>

            {expanded && (
              <View style={styles.body}>
                {section.lines.map((line, index) => {
                  const bullet = /^[-•*]\s+/.test(line);

                  return bullet ? (
                    <View key={index} style={[styles.bulletRow, isArabic && styles.rowRtl]}>
                      <View style={styles.bulletDot} />
                      <RichLine text={line.replace(/^[-•*]\s+/, "")} isArabic={isArabic} style={styles.flex} />
                    </View>
                  ) : (
                    <RichLine key={index} text={line} isArabic={isArabic} />
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  item: {
    backgroundColor: PCOLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECE6DD",
    overflow: "hidden",
  },
  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: PCOLORS.text },
  body: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  text: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 22, color: PCOLORS.muted },
  bold: { fontFamily: FONTS.bold, color: PCOLORS.text },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PCOLORS.primary, marginTop: 9 },
  flex: { flex: 1 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.8 },
});