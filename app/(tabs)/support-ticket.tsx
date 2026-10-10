import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAppLanguage } from '../../context/LanguageContext';
import { Dimensions } from 'react-native';
const SCREEN_WIDTH = Dimensions.get('window').width;
const API = 'https://animal-care2.kharbouch-soufiane.com/api/mobile/support-tickets';
const C = { bg: '#F4F1EC', ink: '#272727', teal: '#249B97', muted: '#77736D', border: '#DCD4CA', pale: '#E5EEEA', white: '#FFFFFF' };
type Message = { id: number; sender_type: string; sender_id?: number; message: string; created_at?: string };
type Ticket = { id: number; title: string; status: string; messages: Message[]; created_at?: string };
type LoadMode = 'initial' | 'refresh' | 'silent';
async function post(path: string, data: Record<string, unknown> = {}) {
  const token = await SecureStore.getItemAsync('access_token');
  if (!token) throw new Error('Your session has expired.');
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ access_token: token, ...data }),
  });
  let json: any;
  try { json = await response.json(); } catch { throw new Error('Invalid server response.'); }
  if (!response.ok || json.success === false) throw new Error(json.message || 'Request failed.');
  return json;
}
export default function SupportTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isArabic } = useAppLanguage();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestInFlight = useRef(false);
  const screenActive = useRef(false);
  const requestGeneration = useRef(0);
  const t = (en: string, ar: string) => isArabic ? ar : en;
  const load = useCallback(async (mode: LoadMode = 'initial') => {
    if (!id || requestInFlight.current) return;
    requestInFlight.current = true;
    const generation = requestGeneration.current;
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'initial') setLoading(true);
    try {
      if (mode !== 'silent') setError('');
      const result = await post(`/${encodeURIComponent(id)}`);
      if (screenActive.current && generation === requestGeneration.current) {
        setTicket(result.ticket);
      }
    } catch (e) {
      if (screenActive.current && generation === requestGeneration.current && mode !== 'silent') {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      requestInFlight.current = false;
      if (screenActive.current && generation === requestGeneration.current && mode !== 'silent') {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [id]);
  useFocusEffect(useCallback(() => {
    screenActive.current = true;
    let foreground = AppState.currentState === 'active';
    void load();
    const subscription = AppState.addEventListener('change', state => {
      const wasForeground = foreground;
      foreground = state === 'active';
      if (!wasForeground && foreground && screenActive.current) void load('silent');
    });
    const interval = setInterval(() => {
      if (screenActive.current && foreground) void load('silent');
    }, 5000);
    return () => {
      screenActive.current = false;
      requestGeneration.current += 1;
      clearInterval(interval);
      subscription.remove();
    };
  }, [load]));
  const send = async () => {
    const message = reply.trim();
    if (!message || sending || !id || !ticket || ['resolved', 'closed'].includes(ticket.status)) return;
    setSending(true);
    try {
      await post(`/${encodeURIComponent(id)}/reply`, { message });
      setReply('');
      if (!requestInFlight.current) await load('silent');
    } catch (e) {
      Alert.alert(t('Error', 'خطأ'), e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };
  const status = ticket?.status === 'pending'
    ? t('Awaiting Reply', 'بانتظار الرد')
    : ticket?.status === 'in_progress'
      ? t('In Progress', 'قيد المعالجة')
      : ticket?.status === 'resolved'
        ? t('Resolved', 'تم الحل')
        : t('Closed', 'مغلق');
  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.top}>
          <Pressable style={s.back} onPress={() => router.back()}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={18} color={C.teal} />
            <Text style={s.backText}>{t('Back', 'رجوع')}</Text>
          </Pressable>
          {ticket && <Text style={s.status}><Text style={{ color: '#E7A52D' }}>● </Text>{status}</Text>}
        </View>
        {loading && !ticket ? (
          <ActivityIndicator color={C.teal} style={{ marginTop: 70 }} />
        ) : error && !ticket ? (
          <View style={s.empty}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable onPress={() => void load()}><Text style={s.retry}>{t('Retry', 'إعادة المحاولة')}</Text></Pressable>
          </View>
        ) : ticket ? (
          <>
            <Text style={[s.title, isArabic && s.rtl]}>{ticket.title.replace(/^\[[^\]]+\]\s*/, '')}</Text>
            <Text style={s.ticketNumber}>MC-{String(ticket.id).padStart(4, '0')}</Text>
            <View style={s.thread}>
              {(ticket.messages || []).map((item, index) => {
                const outgoing = item.sender_type !== 'admin';
                return (
                  <View key={item.id || index} style={[s.messageRow, outgoing ? s.rowOutgoing : s.rowIncoming]}>
                    <View style={[s.bubble, outgoing ? s.bubbleOutgoing : s.bubbleIncoming]}>
                      <Text style={[s.sender, outgoing ? s.senderOutgoing : s.senderIncoming]}>
                        {outgoing ? t('YOU', 'أنت') : t('MAISON CHAT SUPPORT', 'فريق دعم ميزون شات')}
                      </Text>
                      <Text style={[s.body, outgoing && s.bodyOutgoing, isArabic && s.rtl]}>{item.message}</Text>
                      {item.created_at ? (
                        <Text style={[s.date, outgoing && s.dateOutgoing, isArabic && s.rtl]}>
                          {new Date(item.created_at).toLocaleString(isArabic ? 'ar' : 'en-GB')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
            {!['resolved', 'closed'].includes(ticket.status) && (
              <View style={s.replySection}>
                <Text style={s.label}>{t('Your reply', 'ردك')}</Text>
                <TextInput
                  style={[s.input, isArabic && s.rtl]}
                  multiline
                  textAlignVertical="top"
                  value={reply}
                  onChangeText={setReply}
                  maxLength={10000}
                  placeholder={t('Write your message...', 'اكتب رسالتك...')}
                  placeholderTextColor={C.muted}
                />
                <Pressable style={[s.send, (sending || !reply.trim()) && s.disabled]} disabled={sending || !reply.trim()} onPress={() => void send()}>
                  {sending ? <ActivityIndicator color={C.white} /> : <Text style={s.sendText}>{t('Send Reply', 'إرسال الرد')}</Text>}
                </Pressable>
                <Text style={s.note}>{t('Your message will be sent to Maison Chat support.', 'سيتم إرسال رسالتك إلى فريق دعم ميزون شات.')}</Text>
              </View>
            )}
            {ticket.status === 'resolved' && (
              <View style={s.resolved}>
                <Ionicons name="checkmark-circle-outline" size={20} color={C.teal} />
                <Text style={s.resolvedText}>{t('This request has been resolved. Replies are no longer available.', 'تم حل هذا الطلب. لم يعد بإمكانك إرسال ردود.')}</Text>
              </View>
            )}
            {ticket.status === 'closed' && (
              <View style={s.resolved}>
                <Text style={s.resolvedText}>{t('This ticket is closed.', 'تم إغلاق هذا الطلب.')}</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 70 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { color: C.ink, fontFamily: 'Cairo_600SemiBold', fontSize: 14 },
  status: { color: C.ink, fontFamily: 'Cairo_400Regular', fontSize: 12 },
  title: { marginTop: 44, fontFamily: 'Cairo_700Bold', fontSize: 28, lineHeight: 40, color: C.ink },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  ticketNumber: { color: C.teal, marginTop: 8, fontFamily: 'Cairo_600SemiBold', fontSize: 12 },
  thread: { marginTop: 32, gap: 14 },
  messageRow: { width: '100%', flexDirection: 'row' },
  rowOutgoing: { justifyContent: 'flex-end' },
  rowIncoming: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', minWidth: 240, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 18 },
  bubbleOutgoing: { backgroundColor: C.teal, borderBottomRightRadius: 0 },
  bubbleIncoming: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  sender: { fontFamily: 'Cairo_700Bold', fontSize: 10, letterSpacing: 0.7 },
  senderOutgoing: { color: '#E1F5F3' },
  senderIncoming: { color: C.teal },
  body: { fontFamily: 'Cairo_400Regular', fontSize: 15, lineHeight: 25, color: C.ink, marginTop: 7 },
  bodyOutgoing: { color: C.white },
  date: { fontFamily: 'Cairo_400Regular', fontSize: 10, color: C.muted, marginTop: 8 },
  dateOutgoing: { color: '#DDF3F1', textAlign: 'right' },
  replySection: { marginTop: 35 },
  label: { color: C.ink, fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 7, minHeight: 112, padding: 14, fontSize: 15, color: C.ink, fontFamily: 'Cairo_400Regular' },
  send: { backgroundColor: C.ink, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginTop: 26 },
  disabled: { opacity: 0.6 },
  sendText: { color: C.white, fontSize: 14, fontFamily: 'Cairo_700Bold' },
  note: { marginTop: 16, fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.muted },
  resolved: { backgroundColor: C.pale, borderWidth: 1, borderColor: '#A8DAD7', borderRadius: 8, padding: 18, marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resolvedText: { color: C.ink, fontFamily: 'Cairo_500Medium', fontSize: 12, flex: 1 },
  empty: { marginTop: 60, alignItems: 'center', gap: 16 },
  errorText: { color: C.ink, textAlign: 'center' },
  retry: { color: C.teal },
});
