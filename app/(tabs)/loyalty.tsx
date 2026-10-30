import React, { useCallback, useState } from "react";
import { LayoutAnimation, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, UIManager, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { useAppLanguage } from "../../context/LanguageContext";
import { fetchLoyalty, levelIcon, type LoyaltyResponse, type PetLoyalty } from "../../services/loyaltyApi";
import { BackRow, CenteredLoader, ErrorState } from "../../components/purchase/ScreenParts";
import { FONTS, PCOLORS } from "../../components/purchase/purchaseUtils";

/*
|--------------------------------------------------------------------------
| MY LOYALTY POINTS
|--------------------------------------------------------------------------
|
| Total of the customer, the levels, one card per pet (points, what can be
| used now, deadline, progress to the next level, history), how to earn.
|
*/

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GOLD = "#D4A017";

export default function LoyaltyScreen() {
  const { isArabic } = useAppLanguage();
  const lang = isArabic ? "ar" : "en";

  const [data, setData] = useState<LoyaltyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [openHistory, setOpenHistory] = useState<Record<number, boolean>>({});

  const t = isArabic
    ? {
        title: "نقاط الولاء",
        total: "مجموع نقاطك",
        points: "نقطة",
        levels: "المستويات",
        usable: (n: number, amount: string) => `${n} نقطة قابلة للاستخدام = خصم ${amount}`,
        missing: (n: number) => `${n} نقطة أخرى لاستخدامها`,
        expires: (date: string, days: number) => `تنتهي النقاط في ${date} (${days} يوم) إذا لم تجدد الباقة`,
        trial: (date: string) => `اشترك قبل ${date} للاحتفاظ بنقاط باقة التذوق`,
        nextLevel: (n: number, name: string) => `${n} نقطة للوصول إلى ${name}`,
        topLevel: "أعلى مستوى 🎉",
        nextPack: (n: number) => `باقتك القادمة: +${n} نقطة`,
        history: "السجل",
        noHistory: "لا توجد نقاط بعد.",
        usePoints: "استخدام نقاطي",
        howTitle: "كيف أكسب النقاط؟",
        trialRule: (n: number, days: number) => `باقة التذوق: ${n} نقطة (تحتفظ بها إذا اشتركت خلال ${days} يوماً بعد انتهائها)`,
        kindLabel: { regular: "اشتراك", premium: "بريميوم" } as Record<string, string>,
        range: (from: number, to: number | null) => (to === null ? `من ${from}` : from === to ? `${from}` : `${from} إلى ${to}`),
        ptsShort: "نقطة",
        useRule: (min: number, max: number) => `استخدم النقاط من ${min} نقطة، ${max} نقطة كحد أقصى لكل باقة`,
        lostRule: (days: number) => `النقاط خاصة بكل حيوان، وتنتهي إذا لم تجدد خلال ${days} يوماً بعد نهاية الباقة`,
        noPets: "أضف حيوانك الأليف واشترِ باقة لتبدأ بجمع النقاط.",
        off: "برنامج الولاء غير متاح حالياً.",
        error: "تعذر تحميل النقاط.",
        retry: "إعادة المحاولة",
        back: "رجوع",
      }
    : {
        title: "Loyalty points",
        total: "Your points",
        points: "pts",
        levels: "Levels",
        usable: (n: number, amount: string) => `${n} points usable = ${amount} off`,
        missing: (n: number) => `${n} more points to use them`,
        expires: (date: string, days: number) => `Points lost on ${date} (${days} days) without a new plan`,
        trial: (date: string) => `Subscribe before ${date} to keep the taste pack points`,
        nextLevel: (n: number, name: string) => `${n} pts to ${name}`,
        topLevel: "Highest level 🎉",
        nextPack: (n: number) => `Next pack: +${n} pts`,
        history: "History",
        noHistory: "No points yet.",
        usePoints: "Use my points",
        howTitle: "How do I earn points?",
        trialRule: (n: number, days: number) => `Taste pack: ${n} pts (kept if you subscribe within ${days} days after it ends)`,
        kindLabel: { regular: "Subscription", premium: "Premium" } as Record<string, string>,
        range: (from: number, to: number | null) => (to === null ? `#${from}+` : from === to ? `#${from}` : `#${from}-${to}`),
        ptsShort: "pts",
        useRule: (min: number, max: number) => `Use them from ${min} pts, ${max} pts max per pack`,
        lostRule: (days: number) => `Points belong to each pet and are lost without a new plan ${days} days after the end of the pack`,
        noPets: "Add your pet and buy a pack to start collecting points.",
        off: "The loyalty program is not available for now.",
        error: "Unable to load your points.",
        retry: "Retry",
        back: "Back",
      };

  const load = useCallback(async () => {
    try {
      setError("");
      // This page: always the latest points
      setData(await fetchLoyalty(lang, true));
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const dir = isArabic ? styles.textRtl : null;
  const currency = data?.program.currency ?? "KWD";
  const money = (value: number) => `${value.toFixed(3)} ${currency}`;

  const dateLabel = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(isArabic ? "ar" : "en", { day: "numeric", month: "short", year: "numeric" }).format(date);
  };

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <CenteredLoader />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <View style={styles.page}>
          <BackRow label={t.back} isArabic={isArabic} />
          <ErrorState message={error} retryLabel={t.retry} onRetry={load} />
        </View>
      </SafeAreaView>
    );
  }

  const program = data?.program;
  const levels = data?.levels ?? [];
  const pets = data?.pets ?? [];
  const bestEarned = Math.max(0, ...pets.map(pet => pet.lifetime_earned));

  // How to earn (rules of the settings)
  const rules = data?.rules ?? [];
  const trialRule = rules.find(rule => rule.kind === "trial");
  const howLines = program
    ? [
        ...(trialRule ? [t.trialRule(trialRule.points, program.trial_bonus_days)] : []),
        ...(["regular", "premium"] as const)
          .map(kind => rules.filter(rule => rule.kind === kind))
          .filter(list => list.length > 0)
          .map(list => `${t.kindLabel[list[0].kind]} ${list.map(rule => `${t.range(rule.from, rule.to)}: ${rule.points} ${t.ptsShort}`).join(" · ")}`),
        t.useRule(program.min_points_to_use, program.max_points_per_pack),
        t.lostRule(program.grace_days),
      ]
    : [];

  const renderPet = (pet: PetLoyalty) => {
    const level = pet.level;
    const next = pet.next_level;
    const from = level?.min_points ?? 0;
    const progress = next ? Math.max(0, Math.min(1, (pet.lifetime_earned - from) / Math.max(1, next.min_points - from))) : 1;
    const open = !!openHistory[pet.pet.id];

    return (
      <View key={pet.pet.id} style={[styles.petCard, pet.usable_points > 0 && styles.petCardUsable]}>
        <View style={[styles.petHeader, isArabic && styles.rowRtl]}>
          <View style={[styles.levelIcon, { backgroundColor: level?.color ?? "#9CA3AF" }]}>
            <MaterialCommunityIcons name={levelIcon(level?.icon) as any} size={20} color={PCOLORS.white} />
          </View>

          <View style={styles.flex}>
            <Text style={[styles.petName, dir]} numberOfLines={1}>{pet.pet.name}</Text>
            {!!level && <Text style={[styles.levelName, { color: level.color }, dir]}>{level.name}</Text>}
          </View>

          <View style={styles.balanceBox}>
            <Text style={styles.balance}>{pet.balance}</Text>
            <Text style={styles.balanceLabel}>{t.points}</Text>
          </View>
        </View>

        {/* What can be done now */}
        {pet.usable_points > 0 ? (
          <View style={[styles.statusRow, styles.statusOk, isArabic && styles.rowRtl]}>
            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            <Text style={[styles.statusText, styles.statusTextOk, dir]}>{t.usable(pet.usable_points, money(pet.usable_discount))}</Text>
          </View>
        ) : pet.balance > 0 ? (
          <View style={[styles.statusRow, isArabic && styles.rowRtl]}>
            <Ionicons name="star-outline" size={16} color={PCOLORS.muted} />
            <Text style={[styles.statusText, dir]}>{t.missing(pet.missing_points)}</Text>
          </View>
        ) : null}

        {pet.balance > 0 && pet.expires_on && pet.days_left !== null && pet.days_left >= 0 && (
          <View style={[styles.statusRow, pet.days_left <= 7 && styles.statusDanger, isArabic && styles.rowRtl]}>
            <Ionicons name="hourglass-outline" size={16} color={pet.days_left <= 7 ? "#B42318" : PCOLORS.muted} />
            <Text style={[styles.statusText, pet.days_left <= 7 && styles.statusTextDanger, dir]}>
              {t.expires(dateLabel(pet.expires_on), pet.days_left)}
            </Text>
          </View>
        )}

        {pet.trial_status === "pending" && !!pet.trial_deadline && (
          <View style={[styles.statusRow, styles.statusGold, isArabic && styles.rowRtl]}>
            <Ionicons name="gift-outline" size={16} color="#9A6B00" />
            <Text style={[styles.statusText, styles.statusTextGold, dir]}>{t.trial(dateLabel(pet.trial_deadline))}</Text>
          </View>
        )}

        {/* Progress to the next level */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as `${number}%`, backgroundColor: next?.color ?? level?.color ?? GOLD }]} />
        </View>
        <View style={[styles.progressRow, isArabic && styles.rowRtl]}>
          <Text style={[styles.progressText, dir]}>{next ? t.nextLevel(next.points_needed, next.name) : t.topLevel}</Text>
          <Text style={styles.progressText}>{t.nextPack(pet.next_points.regular)}</Text>
        </View>

        <View style={[styles.cardActions, isArabic && styles.rowRtl]}>
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setOpenHistory(current => ({ ...current, [pet.pet.id]: !current[pet.pet.id] }));
            }}
            style={[styles.historyButton, isArabic && styles.rowRtl]}
          >
            <Ionicons name="time-outline" size={16} color={PCOLORS.primary} />
            <Text style={styles.historyButtonText}>{t.history}</Text>
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={PCOLORS.primary} />
          </Pressable>

          {pet.usable_points > 0 && (
            <Pressable
              onPress={() => router.push({ pathname: "/plans", params: { animalId: String(pet.pet.id) } } as any)}
              style={({ pressed }) => [styles.useButton, isArabic && styles.rowRtl, pressed && styles.pressed]}
            >
              <Ionicons name="star" size={15} color={PCOLORS.white} />
              <Text style={styles.useButtonText}>{t.usePoints}</Text>
            </Pressable>
          )}
        </View>

        {open && (
          <View style={styles.history}>
            {pet.history.length === 0 ? (
              <Text style={[styles.historyEmpty, dir]}>{t.noHistory}</Text>
            ) : (
              pet.history.map(row => (
                <View key={row.id} style={[styles.historyRow, isArabic && styles.rowRtl]}>
                  <View style={styles.flex}>
                    <Text style={[styles.historyLabel, dir]} numberOfLines={1}>{row.label}</Text>
                    <Text style={[styles.historyDate, dir]}>{dateLabel(row.date)}</Text>
                  </View>
                  <Text style={[styles.historyPoints, { color: row.points >= 0 ? "#15803D" : "#B42318" }]}>
                    {row.points >= 0 ? "+" : ""}{row.points}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={GOLD} />}
      >
        <BackRow label={t.back} isArabic={isArabic} />
        <Text style={[styles.title, dir]}>{t.title}</Text>

        {!data || !program?.enabled ? (
          <Text style={[styles.empty, dir]}>{t.off}</Text>
        ) : (
          <>
            {/* TOTAL */}
            <View style={[styles.totalCard, isArabic && styles.rowRtl]}>
              <View style={styles.totalIcon}>
                <Ionicons name="star" size={26} color={PCOLORS.white} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.totalLabel, dir]}>{t.total}</Text>
                <Text style={[styles.totalValue, dir]}>
                  {data.total_points} <Text style={styles.totalUnit}>{t.points}</Text>
                </Text>
              </View>
            </View>

            {/* LEVELS */}
            {levels.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, dir]}>{t.levels}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.levels, isArabic && styles.rowRtl]}>
                  {levels.map(level => {
                    const reached = bestEarned >= level.min_points;

                    return (
                      <View key={level.id} style={[styles.levelChip, reached && { borderColor: level.color, backgroundColor: `${level.color}1A` }]}>
                        <MaterialCommunityIcons name={levelIcon(level.icon) as any} size={18} color={reached ? level.color : PCOLORS.muted} />
                        <Text style={[styles.levelChipName, reached && { color: level.color }]}>{level.name}</Text>
                        <Text style={styles.levelChipPoints}>{level.min_points}+</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* PETS */}
            {pets.length === 0 ? <Text style={[styles.empty, dir]}>{t.noPets}</Text> : pets.map(renderPet)}

            {/* HOW TO EARN */}
            <View style={styles.howBox}>
              <Text style={[styles.howTitle, dir]}>{t.howTitle}</Text>
              {howLines.map((line, index) => (
                <View key={index} style={[styles.howRow, isArabic && styles.rowRtl]}>
                  <Ionicons name="star" size={12} color={GOLD} style={{ marginTop: 5 }} />
                  <Text style={[styles.howText, dir]}>{line}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  pressed: { opacity: 0.88 },

  safeArea: { flex: 1, backgroundColor: PCOLORS.background },
  page: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
  title: { marginBottom: 14, fontFamily: FONTS.extraBold, fontSize: 26, color: PCOLORS.text },
  empty: { marginTop: 10, fontFamily: FONTS.regular, fontSize: 14, lineHeight: 22, color: PCOLORS.muted },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },

  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8C66A",
    backgroundColor: "#FFF8E5",
  },
  totalIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" },
  totalLabel: { fontFamily: FONTS.medium, fontSize: 13, color: PCOLORS.muted },
  totalValue: { fontFamily: FONTS.extraBold, fontSize: 30, lineHeight: 40, color: PCOLORS.text },
  totalUnit: { fontFamily: FONTS.semiBold, fontSize: 15, color: PCOLORS.muted },

  levels: { gap: 8, paddingVertical: 2 },
  levelChip: {
    minWidth: 92,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  levelChipName: { marginTop: 2, fontFamily: FONTS.bold, fontSize: 12.5, color: PCOLORS.muted },
  levelChipPoints: { fontFamily: FONTS.regular, fontSize: 11, color: PCOLORS.muted },

  petCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PCOLORS.border,
    backgroundColor: PCOLORS.white,
  },
  petCardUsable: { borderColor: "#86C9A0" },
  petHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  petName: { fontFamily: FONTS.bold, fontSize: 17, color: PCOLORS.text },
  levelName: { fontFamily: FONTS.semiBold, fontSize: 13 },
  balanceBox: { alignItems: "center" },
  balance: { fontFamily: FONTS.extraBold, fontSize: 26, lineHeight: 32, color: PCOLORS.text },
  balanceLabel: { fontFamily: FONTS.regular, fontSize: 11, color: PCOLORS.muted },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: PCOLORS.background,
  },
  statusOk: { backgroundColor: "#ECF8F0" },
  statusDanger: { backgroundColor: "#FDECEA" },
  statusGold: { backgroundColor: "#FFF4D6" },
  statusText: { flex: 1, fontFamily: FONTS.medium, fontSize: 12.5, lineHeight: 19, color: PCOLORS.muted },
  statusTextOk: { color: "#15803D" },
  statusTextDanger: { color: "#B42318" },
  statusTextGold: { color: "#9A6B00" },

  progressTrack: { height: 7, marginTop: 12, borderRadius: 4, backgroundColor: PCOLORS.background, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 5, gap: 8 },
  progressText: { fontFamily: FONTS.regular, fontSize: 11.5, color: PCOLORS.muted },

  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10 },
  historyButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  historyButtonText: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.primary },
  useButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: GOLD,
  },
  useButtonText: { fontFamily: FONTS.bold, fontSize: 13, color: PCOLORS.white },

  history: { marginTop: 10, borderTopWidth: 1, borderTopColor: PCOLORS.border },
  historyEmpty: { paddingTop: 10, fontFamily: FONTS.regular, fontSize: 13, color: PCOLORS.muted },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: PCOLORS.border,
  },
  historyLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: PCOLORS.text },
  historyDate: { fontFamily: FONTS.regular, fontSize: 11.5, color: PCOLORS.muted },
  historyPoints: { fontFamily: FONTS.bold, fontSize: 15 },

  howBox: { marginTop: 22, padding: 14, borderRadius: 12, backgroundColor: PCOLORS.white, borderWidth: 1, borderColor: PCOLORS.border },
  howTitle: { marginBottom: 6, fontFamily: FONTS.bold, fontSize: 15, color: PCOLORS.text },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 },
  howText: { flex: 1, fontFamily: FONTS.regular, fontSize: 13, lineHeight: 21, color: PCOLORS.muted },
});