import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAppLanguage } from '../../context/LanguageContext';

const API = 'https://animal-care2.kharbouch-soufiane.com/api/mobile/support-tickets';
const C = { bg: '#F4F1EC', ink: '#272727', teal: '#249B97', muted: '#77736D', border: '#DCD4CA', white: '#FFFFFF', gold: '#E7A52D' };
type Ticket = { id: number; title: string; status: string; created_at?: string; last_message_at?: string; messages_count?: number; messages?: { message: string; sender_type: string }[] };
type Filter = 'all' | 'open' | 'resolved';
const categories = ['Transition', 'Delivery', 'Subscription', 'Other'] as const;

async function request(path: string, payload: Record<string, unknown> = {}) {
  const token = await SecureStore.getItemAsync('access_token');
  if (!token) throw new Error('Your session has expired.');
  const response = await fetch(`${API}${path}`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ access_token: token, ...payload }) });
  const json = await response.json();
  if (!response.ok || json.success === false) throw new Error(json.message || 'Request failed.');
  return json;
}
export default function SupportTicketsScreen() {
  const { isArabic } = useAppLanguage();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [category, setCategory] = useState<string>('Transition');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const t = (en: string, ar: string) => isArabic ? ar : en;
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      setError('');
      const result = await request('');
      setTickets(Array.isArray(result.tickets) ? result.tickets : (result.tickets?.data ?? []));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const filtered = tickets.filter(ticket => filter === 'all' || (filter === 'open' ? ['pending', 'in_progress'].includes(ticket.status) : ['resolved', 'closed'].includes(ticket.status)));
  const create = async () => {
    if (!subject.trim() || !message.trim()) { Alert.alert(t('Required fields', 'حقول مطلوبة'), t('Enter a subject and message.', 'يرجى إدخال الموضوع والرسالة.')); return; }
    setSaving(true);
    try {
      // Existing Laravel store() accepts title and message, not category.
      // Category is included in the title until a dedicated DB/API field is added.
      const result = await request('/create', { title: `[${category}] ${subject.trim()}`, message: message.trim() });
      setModal(false); setSubject(''); setMessage(''); setCategory('Transition');
      await load(true);
      if (result.ticket?.id) router.push({ pathname: '/(tabs)/support-ticket', params: { id: String(result.ticket.id) } });
    } catch (e) { Alert.alert(t('Error', 'خطأ'), e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };
  const statusLabel = (status: string) => ({ pending: t('Awaiting Reply', 'بانتظار الرد'), in_progress: t('In Progress', 'قيد المعالجة'), resolved: t('Resolved', 'تم الحل'), closed: t('Closed', 'مغلق') } as Record<string, string>)[status] || status;
  return <View style={s.screen}>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <Pressable style={s.back} onPress={() => router.back()}><Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={20} color={C.teal}/><Text style={s.backText}>{t('Back', 'رجوع')}</Text></Pressable>
      <Text style={[s.heading, isArabic && s.rtl]}>{t('Customer Support', 'دعم العملاء')}</Text>
      <Text style={[s.subtitle, isArabic && s.rtl]}>{t('Dedicated pet care specialists & veterinary nutritionists.', 'متخصصون في رعاية الحيوانات الأليفة والتغذية البيطرية.')}</Text>
      <View style={s.ctaRow}><Ionicons name="paw-outline" size={54} color={C.teal}/><Pressable style={s.newButton} onPress={() => setModal(true)}><Ionicons name="add" size={24} color={C.white}/><Text style={s.newButtonText}>{t('New Support Request', 'طلب دعم جديد')}</Text></Pressable></View>
      <View style={s.urgent}><Ionicons name="call-outline" size={20} color={C.teal}/><Text style={s.urgentText}>{t('Urgent cold-delivery emergency? Call dispatch: +971 4 800 CHAT', 'حالة طارئة في التوصيل المبرد؟ اتصل بخدمة التوصيل: +971 4 800 CHAT')}</Text></View>
      <View style={s.tabs}>{([['all', t('All Tickets', 'كل الطلبات')], ['open', t('Open & In Progress', 'المفتوحة وقيد المعالجة')], ['resolved', t('Resolved', 'تم الحل')]] as const).map(([key, label]) => <Pressable key={key} style={[s.tab, filter === key && s.activeTab]} onPress={() => setFilter(key)}><Text style={[s.tabText, filter === key && s.activeTabText]}>{label}</Text></Pressable>)}</View>
      {loading ? <ActivityIndicator style={s.loader} color={C.teal}/> : error ? <View style={s.empty}><Text style={s.muted}>{error}</Text><Pressable onPress={() => load()}><Text style={s.retry}>{t('Try Again', 'إعادة المحاولة')}</Text></Pressable></View> : filtered.length === 0 ? <View style={s.empty}><Ionicons name="chatbubbles-outline" size={42} color={C.teal}/><Text style={s.muted}>{t('No support requests yet.', 'لا توجد طلبات دعم حالياً.')}</Text></View> : filtered.map(ticket => <Pressable key={ticket.id} style={s.ticket} onPress={() => router.push({ pathname: '/(tabs)/support-ticket', params: { id: String(ticket.id) } })}>
        <View style={s.ticketMeta}><Text style={s.ticketCode}>{`MC-${String(ticket.id).padStart(4, '0')}`}{/^\[[^\]]+\]/.test(ticket.title) ? ` • ${ticket.title.match(/^\[([^\]]+)\]/)?.[1]?.toUpperCase()}` : ''}</Text><Text style={s.status}><Text style={{ color: C.gold }}>● </Text>{statusLabel(ticket.status)}</Text></View>
        <Text style={s.ticketTitle}>{ticket.title.replace(/^\[[^\]]+\]\s*/, '')}</Text>
        <Text style={s.preview} numberOfLines={3}>{ticket.messages?.[ticket.messages.length - 1]?.message || t('Tap to view the conversation', 'اضغط لعرض المحادثة')}</Text>
        <View style={s.ticketFooter}><Text style={s.muted}>{ticket.last_message_at ? new Date(ticket.last_message_at).toLocaleDateString(isArabic ? 'ar' : 'en-GB') : ''}</Text><Ionicons name={isArabic ? 'arrow-back' : 'arrow-forward'} size={18} color={C.teal}/></View>
      </Pressable>)}
    </ScrollView>
    <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}><View style={s.overlay}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalWrap}><View style={s.modalCard}>
      <Pressable style={s.close} onPress={() => { setModal(false); setCategoryOpen(false); }}><Ionicons name="close" size={24} color={C.muted}/></Pressable>
      <Text style={s.modalTitle}>{t('New Support Request', 'طلب دعم جديد')}</Text>
      <Text style={s.label}>{t('Category', 'الفئة')}</Text>
      <Pressable style={s.field} onPress={() => setCategoryOpen(!categoryOpen)}><Text style={s.fieldText}>{category}</Text><Ionicons name="chevron-down" size={20} color={C.ink}/></Pressable>
      {categoryOpen && categories.map(option => <Pressable key={option} style={[s.option, category === option && s.selectedOption]} onPress={() => { setCategory(option); setCategoryOpen(false); }}><Text style={[s.fieldText, category === option && { color: C.white }]}>{option}</Text></Pressable>)}
      <Text style={s.label}>{t('Subject', 'الموضوع')}</Text><TextInput style={s.input} value={subject} onChangeText={setSubject} maxLength={200}/>
      <Text style={s.label}>{t('Message', 'الرسالة')}</Text><TextInput style={[s.input, s.textarea]} value={message} onChangeText={setMessage} multiline textAlignVertical="top" maxLength={10000}/>
      <Text style={s.helper}>{t('Your request will be sent to the Maison Chat support team.', 'سيتم إرسال طلبك إلى فريق دعم ميزون شات.')}</Text>
      <Pressable style={[s.submit, saving && { opacity: 0.6 }]} disabled={saving} onPress={create}>{saving ? <ActivityIndicator color={C.white}/> : <Text style={s.submitText}>{t('Create Support Ticket', 'إنشاء طلب الدعم')}</Text>}</Pressable>
    </View></ScrollView></View></Modal>
  </View>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.bg }, content: { paddingHorizontal: 27, paddingTop: 32, paddingBottom: 55 }, back: { flexDirection: 'row', alignItems: 'center', gap: 10 }, backText: { color: C.ink, fontSize: 15, fontFamily: 'Cairo_600SemiBold' }, heading: { marginTop: 48, color: C.ink, fontSize: 32, lineHeight: 43, fontFamily: 'Cairo_700Bold' }, subtitle: { marginTop: 12, color: C.muted, fontSize: 17, lineHeight: 29, fontFamily: 'Cairo_400Regular' }, rtl: { textAlign: 'right', writingDirection: 'rtl' }, ctaRow: { marginTop: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, newButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.ink, paddingHorizontal: 19, height: 60, borderRadius: 10 }, newButtonText: { color: C.white, fontSize: 14, fontFamily: 'Cairo_700Bold' }, urgent: { flexDirection: 'row', gap: 13, borderLeftWidth: 2, borderLeftColor: C.teal, paddingLeft: 16, marginTop: 35, marginBottom: 45, paddingVertical: 10 }, urgentText: { flex: 1, color: C.muted, fontSize: 13, lineHeight: 23, fontFamily: 'Cairo_400Regular' }, tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border }, tab: { paddingVertical: 17, marginRight: 18, borderBottomWidth: 2, borderBottomColor: 'transparent' }, activeTab: { borderBottomColor: C.teal }, tabText: { color: C.muted, fontSize: 12, fontFamily: 'Cairo_500Medium' }, activeTabText: { color: C.ink, fontFamily: 'Cairo_700Bold' }, loader: { marginTop: 50 }, empty: { alignItems: 'center', gap: 16, paddingTop: 60 }, muted: { color: C.muted, fontFamily: 'Cairo_400Regular', fontSize: 13 }, retry: { color: C.teal, fontFamily: 'Cairo_700Bold' }, ticket: { borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 28, paddingBottom: 24 }, ticketMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, ticketCode: { color: C.teal, fontSize: 11, letterSpacing: 1, fontFamily: 'Cairo_700Bold' }, status: { color: C.ink, fontSize: 12, fontFamily: 'Cairo_400Regular' }, ticketTitle: { marginTop: 22, fontSize: 24, lineHeight: 34, color: C.ink, fontFamily: 'Cairo_700Bold' }, preview: { marginTop: 15, color: C.muted, fontSize: 14, lineHeight: 24, fontFamily: 'Cairo_400Regular' }, ticketFooter: { marginTop: 15, flexDirection: 'row', justifyContent: 'space-between' }, overlay: { flex: 1, backgroundColor: 'rgba(52,40,28,0.2)', justifyContent: 'center' }, modalWrap: { paddingHorizontal: 8, paddingVertical: 20, flexGrow: 1, justifyContent: 'center' }, modalCard: { backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 30, paddingTop: 28, paddingBottom: 30 }, close: { alignSelf: 'flex-end' }, modalTitle: { fontSize: 26, lineHeight: 38, color: C.ink, fontFamily: 'Cairo_700Bold', marginTop: 15, marginBottom: 22 }, label: { color: C.ink, fontFamily: 'Cairo_600SemiBold', fontSize: 15, marginTop: 17, marginBottom: 10 }, field: { borderWidth: 1, borderColor: C.border, borderRadius: 7, height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }, fieldText: { fontFamily: 'Cairo_400Regular', color: C.ink, fontSize: 16 }, option: { paddingHorizontal: 20, paddingVertical: 9, borderWidth: 1, borderTopWidth: 0, borderColor: C.border }, selectedOption: { backgroundColor: '#1E68D5' }, input: { height: 62, borderWidth: 1, borderColor: C.border, borderRadius: 7, paddingHorizontal: 16, color: C.ink, fontSize: 15, fontFamily: 'Cairo_400Regular' }, textarea: { height: 142, paddingTop: 12 }, helper: { color: C.muted, fontSize: 13, lineHeight: 23, fontFamily: 'Cairo_400Regular', marginTop: 20 }, submit: { backgroundColor: C.ink, borderRadius: 8, height: 61, alignItems: 'center', justifyContent: 'center', marginTop: 30 }, submitText: { color: C.white, fontFamily: 'Cairo_700Bold', fontSize: 15 } });
