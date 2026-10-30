import React, { useMemo, useState } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FONTS, PCOLORS } from "../purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| PRODUCT DESCRIPTION (sections that open / close)
|--------------------------------------------------------------------------
|
| Written in the Laravel product form (description / description_ar):
|
|   🚚 **توصيل مجاني**                     <- text before the first ## = always shown
|
|   ## 🍽️ لماذا تبدأ بباقة التذوق؟          <- new section (title, emoji allowed)
|   - مرحلة انتقالية من الأكل المصنع إلى الطبيعي   <- bullet
|   - لضمان انتقال سلس وسهولة الهضم
|
|   ## 🍗 المكونات
|   صدور دجاج - أفخاذ دجاج - كبد دجاج ...  <- normal paragraph
|   **قطتك عندها حساسية؟** تواصل معنا      <- **bold**
|
| A description without ## is shown as before (simple text).
|
*/

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Line = { type: "bullet" | "text"; text: string };
type Section = { title: string; lines: Line[] };

/** Sections opened when the page opens (0 = the first one). */
const OPEN_BY_DEFAULT = [0];

function parse(description: string): { intro: Line[]; sections: Section[] } {
  const intro: Line[] = [];
  const sections: Section[] = [];

  description
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach(raw => {
      const line = raw.trim();

      if (!line) return;

      if (line.startsWith("#")) {
        sections.push({ title: line.replace(/^#+\s*/, ""), lines: [] });
        return;
      }

      const bullet = /^([-*•●▪])\s+/.exec(line);
      const item: Line = bullet ? { type: "bullet", text: line.slice(bullet[0].length) } : { type: "text", text: line };

      if (sections.length === 0) {
        intro.push(item);
      } else {
        sections[sections.length - 1].lines.push(item);
      }
    });

  return { intro, sections };
}

/** "**bold**" inside a line. */
function RichText({ text, style }: { text: string; style: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return (
    <Text style={style}>
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

function Lines({ lines, isArabic, intro }: { lines: Line[]; isArabic: boolean; intro?: boolean }) {
  const dir = isArabic ? styles.textRtl : null;

  return (
    <View style={[styles.lines, intro && styles.introLines]}>
      {lines.map((line, index) =>
        line.type === "bullet" ? (
          <View key={index} style={[styles.bulletRow, isArabic && styles.rowRtl]}>
            <View style={styles.dot} />
            <RichText text={line.text} style={[styles.bulletText, intro && styles.introText, dir]} />
          </View>
        ) : (
          <RichText key={index} text={line.text} style={[styles.paragraph, intro && styles.introText, dir]} />
        )
      )}
    </View>
  );
}

export default function ProductDescription({ description, isArabic }: { description?: string | null; isArabic: boolean }) {
  const { intro, sections } = useMemo(() => parse(String(description || "")), [description]);
  const [open, setOpen] = useState<number[]>(OPEN_BY_DEFAULT);

  if (!description || (intro.length === 0 && sections.length === 0)) {
    return null;
  }

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(current => (current.includes(index) ? current.filter(i => i !== index) : [...current, index]));
  };

  return (
    <View style={styles.box}>
      {/* Text before the first ## (e.g. "🚚 Free delivery"): bigger, with space below */}
      {intro.length > 0 && <Lines lines={intro} isArabic={isArabic} intro />}

      {sections.map((section, index) => {
        const expanded = open.includes(index);

        return (
          <View key={`${index}-${section.title}`} style={[styles.section, index === 0 && intro.length === 0 && styles.sectionFirst]}>
            <Pressable
              onPress={() => toggle(index)}
              style={({ pressed }) => [styles.header, isArabic && styles.rowRtl, pressed && styles.pressed]}
              hitSlop={4}
            >
              <RichText text={section.title} style={[styles.title, isArabic && styles.textRtl]} />
              <Ionicons name={expanded ? "remove" : "add"} size={22} color={PCOLORS.text} />
            </Pressable>

            {expanded && section.lines.length > 0 && <Lines lines={section.lines} isArabic={isArabic} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 6 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.7 },
  bold: { fontFamily: FONTS.bold, color: PCOLORS.text },

  section: { borderTopWidth: 1, borderTopColor: PCOLORS.border, paddingVertical: 14 },
  sectionFirst: { borderTopWidth: 0, paddingTop: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 16, lineHeight: 26, color: PCOLORS.text },

  lines: { marginTop: 8, gap: 6 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PCOLORS.text, marginTop: 10 },
  bulletText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 14, lineHeight: 24, color: PCOLORS.text },
  paragraph: { fontFamily: FONTS.medium, fontSize: 14, lineHeight: 24, color: PCOLORS.text, paddingHorizontal: 4 },

  introLines: { marginTop: 0, marginBottom: 18, gap: 8 },
  introText: { fontFamily: FONTS.bold, fontSize: 18, lineHeight: 30, color: PCOLORS.text },
});