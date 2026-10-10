import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppLanguage } from '../../context/LanguageContext';

// Replace with your existing Laravel API base URL (HTTPS).
const API_BASE_URL = 'https://YOUR-LARAVEL-DOMAIN.com/api';

const COLORS = {
  background: '#F7F4EF',
  text: '#302F2E',
  muted: '#85817E',
  teal: '#249B97',
  border: '#DCD4CA',
};

type Faq = {
  id: number;
  question_en: string;
  question_ar: string;
  answer_en: string;
  answer_ar: string;
  sort_order?: number;
};

type FaqResponse = {
  success?: boolean;
  data?: Faq[] | { data?: Faq[] };
  faqs?: Faq[];
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HelpKnowledgeBaseScreen() {
  const router = useRouter();
  const { isArabic } = useAppLanguage();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchFaqs = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const response = await fetch(`${API_BASE_URL}/mobile/help/faqs`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json: FaqResponse = await response.json();
      const items = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.data)
          ? json.data.data
          : Array.isArray(json.faqs)
            ? json.faqs
            : null;
      if (!items) throw new Error('Invalid FAQ response');
      setFaqs([...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setExpandedId(null);
    } catch (err) {
      console.warn('Unable to load help FAQs:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const toggleFaq = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(current => (current === id ? null : id));
  };

  const copy = isArabic
    ? {
        back: 'رجوع',
        title: 'المساعدة وقاعدة المعرفة',
        subtitle: 'كل ما تحتاج معرفته عن التغذية الطازجة لحيوانك الأليف، والتوصيل والعناية.',
        loading: 'جارٍ تحميل الأسئلة...',
        error: 'تعذر تحميل الأسئلة. يرجى المحاولة مجدداً.',
        retry: 'إعادة المحاولة',
        empty: 'لا توجد أسئلة متاحة حالياً.',
      }
    : {
        back: 'Back',
        title: 'Help & Knowledge Base',
        subtitle: 'Everything you need to know about fresh pet nutrition, delivery rules, and care.',
        loading: 'Loading questions...',
        error: 'Unable to load questions. Please try again.',
        retry: 'Try again',
        empty: 'No questions are available yet.',
      };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFaqs(true)}
            tintColor={COLORS.teal}
            colors={[COLORS.teal]}
          />
        }
      >
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[styles.backButton, isArabic && styles.rtlRow]}
        >
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={19} color={COLORS.teal} />
          <Text style={styles.backText}>{copy.back}</Text>
        </TouchableOpacity>

        <Text style={[styles.title, isArabic && styles.arabicText]}>{copy.title}</Text>
        <Text style={[styles.subtitle, isArabic && styles.arabicText]}>{copy.subtitle}</Text>

        <View style={[styles.illustrations, isArabic && styles.rtlRow]}>
          <Ionicons name="restaurant-outline" size={45} color={COLORS.teal} />
          <Ionicons name="paw-outline" size={48} color={COLORS.teal} />
        </View>

        <View style={styles.faqList}>
          {loading ? (
            <View style={styles.status}>
              <ActivityIndicator color={COLORS.teal} />
              <Text style={styles.statusText}>{copy.loading}</Text>
            </View>
          ) : error ? (
            <View style={styles.status}>
              <Text style={styles.statusText}>{copy.error}</Text>
              <TouchableOpacity onPress={() => fetchFaqs()} style={styles.retryButton}>
                <Text style={styles.retryText}>{copy.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : faqs.length === 0 ? (
            <Text style={styles.statusText}>{copy.empty}</Text>
          ) : (
            faqs.map((faq, index) => {
              const expanded = expandedId === faq.id;
              const question = (isArabic ? faq.question_ar : faq.question_en) || faq.question_en;
              const answer = (isArabic ? faq.answer_ar : faq.answer_en) || faq.answer_en;
              return (
                <View key={faq.id} style={styles.faqItem}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    onPress={() => toggleFaq(faq.id)}
                    style={[styles.faqHeader, isArabic && styles.rtlRow]}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
                    <Text style={[styles.question, isArabic && styles.arabicText]}>{question}</Text>
                    <Ionicons
                      name={expanded ? 'close-outline' : 'chevron-down-outline'}
                      size={19}
                      color={COLORS.teal}
                    />
                  </TouchableOpacity>
                  {expanded && (
                    <Text style={[styles.answer, isArabic && styles.arabicText]}>{answer}</Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 30, paddingTop: 32, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 11, alignSelf: 'flex-start' },
  backText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  title: { marginTop: 52, fontSize: 34, lineHeight: 42, fontWeight: '700', color: COLORS.text, letterSpacing: -1.2 },
  subtitle: { marginTop: 14, color: COLORS.muted, fontSize: 17, lineHeight: 29, maxWidth: 380 },
  illustrations: { flexDirection: 'row', alignItems: 'center', gap: 35, marginTop: 43, marginBottom: 43 },
  faqList: { borderTopWidth: 1, borderTopColor: COLORS.border },
  faqItem: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingVertical: 29 },
  number: { color: COLORS.muted, fontSize: 12, paddingTop: 5, minWidth: 15 },
  question: { flex: 1, color: COLORS.text, fontSize: 17, lineHeight: 27, fontWeight: '600' },
  answer: { color: COLORS.muted, fontSize: 16, lineHeight: 30, paddingLeft: 35, paddingRight: 15, paddingBottom: 31 },
  status: { alignItems: 'center', paddingVertical: 35, gap: 14 },
  statusText: { color: COLORS.muted, fontSize: 15, lineHeight: 24, textAlign: 'center', paddingVertical: 14 },
  retryButton: { paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.teal, borderRadius: 8 },
  retryText: { color: COLORS.teal, fontWeight: '600' },
  arabicText: { textAlign: 'right', writingDirection: 'rtl' },
  rtlRow: { flexDirection: 'row-reverse' },
});
