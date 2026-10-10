import React, { useCallback, useState } from "react";

import {

  ActivityIndicator,

  Alert,

  KeyboardAvoidingView,

  Modal,

  Platform,

  Pressable,

  RefreshControl,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  View,

} from "react-native";

import * as SecureStore from "expo-secure-store";

import { router, useFocusEffect } from "expo-router";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAppLanguage } from "../../context/LanguageContext";

const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

const COLORS = {

  background: "#F4F1EC",

  primary: "#249B97",

  coral: "#EB6268",

  text: "#272727",

  muted: "#77736D",

  border: "#DCD4CA",

  white: "#FFFFFF",

  overlay: "rgba(0,0,0,0.38)",

};

type CustomerAddress = {

  id: number;

  label?: string | null;

  first_name?: string | null;

  last_name?: string | null;

  phone?: string | null;

  address: string;

  city?: string | null;

  province?: string | null;

  postal_code?: string | null;

  country?: string | null;

  note?: string | null;

  is_default: boolean | number;

};

type AddressForm = {

  label: string;

  address: string;

  note: string;

};

const EMPTY_FORM: AddressForm = {

  label: "",

  address: "",

  note: "",

};

export default function SavedAddressesScreen() {

  const { isArabic } = useAppLanguage();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [actionId, setActionId] = useState<number | null>(null);

  const [modalVisible, setModalVisible] = useState(false);

  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);

  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);

  const text = {

    back: isArabic ? "رجوع" : "Back",

    title: isArabic ? "العناوين المحفوظة" : "Saved Addresses",

    add: isArabic ? "إضافة عنوان جديد" : "Add New Address",

    default: isArabic ? "افتراضي" : "Default",

    setDefault: isArabic ? "تعيين كعنوان افتراضي" : "Set as Default Address",

    empty: isArabic ? "لا توجد عناوين محفوظة." : "No saved addresses yet.",

    loading: isArabic ? "جاري تحميل العناوين..." : "Loading addresses...",

    loadError: isArabic ? "تعذر تحميل العناوين." : "Unable to load addresses.",

    deleteTitle: isArabic ? "حذف العنوان" : "Delete Address",

    deleteMessage: isArabic ? "هل تريد حذف هذا العنوان؟" : "Are you sure you want to delete this address?",

    cancel: isArabic ? "إلغاء" : "Cancel",

    delete: isArabic ? "حذف" : "Delete",

    addTitle: isArabic ? "إضافة عنوان جديد" : "Add New Address",

    editTitle: isArabic ? "تعديل العنوان" : "Edit Address",

    label: isArabic ? "التسمية" : "Label",

    address: isArabic ? "العنوان" : "Address",

    notes: isArabic ? "ملاحظات التوصيل" : "Delivery Notes",

    save: isArabic ? "حفظ التغييرات" : "Save Changes",

    required: isArabic ? "العنوان مطلوب." : "Address is required.",

    saveError: isArabic ? "تعذر حفظ العنوان." : "Unable to save the address.",

  };

  const getAccessToken = async () => SecureStore.getItemAsync("access_token");

  const apiRequest = async (endpoint: string, body: Record<string, unknown> = {}) => {

    const token = await getAccessToken();

    if (!token) throw new Error("Unauthenticated");

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {

      method: "POST",

      headers: {

        Accept: "application/json",

        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,

      },

      body: JSON.stringify({ ...body, access_token: token }),

    });

    let data: any = {};

    try {

      data = await response.json();

    } catch {

      throw new Error("Invalid server response");

    }

    if (!response.ok) {

      const validationMessage = data?.errors

        ? Object.values(data.errors).flat().join("\n")

        : null;

      throw new Error(validationMessage || data?.message || "Request failed");

    }

    return data;

  };

  const loadAddresses = useCallback(async (showLoader = true) => {

    try {

      if (showLoader) setLoading(true);

      const data = await apiRequest("/settings/addresses");

      setAddresses(Array.isArray(data?.addresses) ? data.addresses : []);

    } catch (error) {

      console.error("Load addresses error:", error);

      Alert.alert(isArabic ? "خطأ" : "Error", text.loadError);

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  }, [isArabic]);

  useFocusEffect(

    useCallback(() => {

      loadAddresses();

    }, [loadAddresses])

  );

  const handleRefresh = () => {

    setRefreshing(true);

    loadAddresses(false);

  };

  const closeModal = () => {

    if (saving) return;

    setModalVisible(false);

    setEditingAddress(null);

    setForm(EMPTY_FORM);

  };

  const handleAddAddress = () => {

    setEditingAddress(null);

    setForm(EMPTY_FORM);

    setModalVisible(true);

  };

  const handleEditAddress = (address: CustomerAddress) => {

    setEditingAddress(address);

    setForm({

      label: address.label ?? "",

      address: address.address ?? "",

      note: address.note ?? "",

    });

    setModalVisible(true);

  };

  const updateForm = (key: keyof AddressForm, value: string) => {

    setForm(current => ({ ...current, [key]: value }));

  };

  const saveAddress = async () => {

    const addressValue = form.address.trim();

    if (!addressValue) {

      Alert.alert(

        isArabic ? "خطأ" : "Error",

        isArabic ? "العنوان مطلوب." : "Address is required."

      );

      return;

    }

    try {

      setSaving(true);

      const payload = {

        label: form.label.trim() || null,

        address: addressValue,

        note: form.note.trim() || null,

      };

      if (editingAddress) {

        await apiRequest(`/settings/addresses/${editingAddress.id}/update`, payload);

      } else {

        await apiRequest("/settings/addresses/create", payload);

      }

      setModalVisible(false);

      setEditingAddress(null);

      setForm(EMPTY_FORM);

      await loadAddresses(false);

    } catch (error) {

      console.error("Save address error:", error);

      Alert.alert(

        isArabic ? "خطأ" : "Error",

        error instanceof Error ? error.message : text.saveError

      );

    } finally {

      setSaving(false);

    }

  };

  const setDefaultAddress = async (address: CustomerAddress) => {

    if (Boolean(address.is_default)) return;

    try {

      setActionId(address.id);

      await apiRequest(`/settings/addresses/${address.id}/default`);

      await loadAddresses(false);

    } catch (error) {

      console.error("Set default address error:", error);

      Alert.alert(

        isArabic ? "خطأ" : "Error",

        isArabic ? "تعذر تعيين العنوان الافتراضي." : "Unable to set the default address."

      );

    } finally {

      setActionId(null);

    }

  };

  const deleteAddress = async (address: CustomerAddress) => {

    try {

      setActionId(address.id);

      await apiRequest(`/settings/addresses/${address.id}/delete`);

      await loadAddresses(false);

    } catch (error) {

      console.error("Delete address error:", error);

      Alert.alert(

        isArabic ? "خطأ" : "Error",

        isArabic ? "تعذر حذف العنوان." : "Unable to delete the address."

      );

    } finally {

      setActionId(null);

    }

  };

  const confirmDelete = (address: CustomerAddress) => {

    Alert.alert(text.deleteTitle, text.deleteMessage, [

      { text: text.cancel, style: "cancel" },

      { text: text.delete, style: "destructive", onPress: () => deleteAddress(address) },

    ]);

  };

  const formatAddress = (item: CustomerAddress) =>

    [item.address, item.city, item.province, item.postal_code, item.country]

      .filter(value => typeof value === "string" && value.trim())

      .map(value => String(value).trim())

      .join(", ");

  return (

    
      <View style={styles.screen}>

      <ScrollView

        style={styles.scrollView}

        contentContainerStyle={styles.scrollContent}

        showsVerticalScrollIndicator={false}

        refreshControl={

          <RefreshControl

            refreshing={refreshing}

            onRefresh={handleRefresh}

            tintColor={COLORS.primary}

          />

        }

      >

        <Pressable

          style={[styles.backButton, isArabic && styles.rowReverse]}

          onPress={() => router.back()}

        >

          <Ionicons

            name={isArabic ? "arrow-forward" : "arrow-back"}

            size={20}

            color={COLORS.primary}

          />

          <Text style={styles.backText}>{text.back}</Text>

        </Pressable>

        <Text style={[styles.title, isArabic && styles.textRight]}>{text.title}</Text>

        <View style={[styles.actionHeader, isArabic && styles.rowReverse]}>

          <View style={styles.addressIllustration}>

            <MaterialCommunityIcons name="home-city-outline" size={61} color={COLORS.primary} />

          </View>

          <Pressable style={styles.addButton} onPress={handleAddAddress}>

            <Ionicons name="add" size={25} color={COLORS.white} />

            <Text style={styles.addButtonText}>{text.add}</Text>

          </Pressable>

        </View>

        <View style={styles.topDivider} />

        {loading ? (

          <View style={styles.loadingContainer}>

            <ActivityIndicator size="small" color={COLORS.primary} />

            <Text style={styles.loadingText}>{text.loading}</Text>

          </View>

        ) : addresses.length === 0 ? (

          <View style={styles.emptyContainer}>

            <MaterialCommunityIcons name="map-marker-outline" size={38} color={COLORS.muted} />

            <Text style={[styles.emptyText, isArabic && styles.textRight]}>{text.empty}</Text>

          </View>

        ) : (

          addresses.map((address, index) => {

            const isDefault = Boolean(address.is_default);

            const isBusy = actionId === address.id;

            return (

              <View

                key={address.id}

                style={[

                  styles.addressCard,

                  index === addresses.length - 1 && styles.lastAddressCard,

                ]}

              >

                <View style={[styles.addressTitleRow, isArabic && styles.rowReverse]}>

                  <Text style={[styles.addressTitle, isArabic && styles.textRight]}>

                    {address.label || (isArabic ? "العنوان" : "Address")}

                  </Text>

                  <View style={[styles.addressActions, isArabic && styles.rowReverse]}>

                    <Pressable

                      style={styles.iconButton}

                      disabled={isBusy}

                      onPress={() => handleEditAddress(address)}

                    >

                      <MaterialCommunityIcons name="pencil-outline" size={23} color={COLORS.muted} />

                    </Pressable>

                    <Pressable

                      style={styles.iconButton}

                      disabled={isBusy}

                      onPress={() => confirmDelete(address)}

                    >

                      <MaterialCommunityIcons name="trash-can-outline" size={23} color={COLORS.muted} />

                    </Pressable>

                  </View>

                </View>

                {isDefault && (

                  <View style={[styles.defaultRow, isArabic && styles.rowReverse]}>

                    <View style={styles.defaultDot} />

                    <Text style={styles.defaultText}>{text.default}</Text>

                  </View>

                )}

                <Text style={[styles.addressText, isArabic && styles.textRight]}>

                  {formatAddress(address)}

                </Text>

                {!!address.note && (

                  <View style={[styles.noteContainer, isArabic && styles.noteContainerArabic]}>

                    <Text style={[styles.noteText, isArabic && styles.textRight]}>

                      {isArabic ? `ملاحظة: ${address.note}` : `Note: ${address.note}`}

                    </Text>

                  </View>

                )}

                {!isDefault && (

                  <Pressable

                    style={[styles.setDefaultButton, isArabic && styles.rowReverse]}

                    disabled={isBusy}

                    onPress={() => setDefaultAddress(address)}

                  >

                    {isBusy ? (

                      <ActivityIndicator size="small" color={COLORS.primary} />

                    ) : (

                      <Ionicons name="checkmark" size={21} color={COLORS.primary} />

                    )}

                    <Text style={styles.setDefaultText}>{text.setDefault}</Text>

                  </Pressable>

                )}

              </View>

            );

          })

        )}

      </ScrollView>

      <Modal

        visible={modalVisible}

        transparent

        animationType="fade"

        statusBarTranslucent

        onRequestClose={closeModal}

      >

        <KeyboardAvoidingView

          style={styles.modalOverlay}

          behavior={Platform.OS === "ios" ? "padding" : undefined}

        >

          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />

          <View style={styles.modalCard}>

            <ScrollView

              showsVerticalScrollIndicator={false}

              keyboardShouldPersistTaps="handled"

              contentContainerStyle={styles.modalContent}

            >

              <View style={[styles.modalHeader, isArabic && styles.rowReverse]}>

                <Text style={[styles.modalTitle, isArabic && styles.textRight]}>

                  {editingAddress ? text.editTitle : text.addTitle}

                </Text>

                <Pressable style={styles.closeButton} onPress={closeModal} disabled={saving}>

                  <Ionicons name="close" size={27} color={COLORS.muted} />

                </Pressable>

              </View>

              <FormField

                label={text.label}

                value={form.label}

                onChangeText={value => updateForm("label", value)}

                isArabic={isArabic}

              />

              <FormField

                label={text.address}

                value={form.address}

                onChangeText={value => updateForm("address", value)}

                isArabic={isArabic}

              />

              <FormField

                label={text.notes}

                value={form.note}

                onChangeText={value => updateForm("note", value)}

                isArabic={isArabic}

                multiline

              />

              <Pressable

                style={[styles.saveButton, saving && styles.disabledButton]}

                onPress={saveAddress}

                disabled={saving}

              >

                {saving ? (

                  <ActivityIndicator size="small" color={COLORS.white} />

                ) : (

                  <Text style={styles.saveButtonText}>{text.save}</Text>

                )}

              </Pressable>

            </ScrollView>

          </View>

        </KeyboardAvoidingView>

      </Modal>

    </View>
    

  );

}

type FormFieldProps = {

  label: string;

  value: string;

  onChangeText: (value: string) => void;

  isArabic: boolean;

  multiline?: boolean;

};

function FormField({

  label,

  value,

  onChangeText,

  isArabic,

  multiline = false,

}: FormFieldProps) {

  return (

    <View style={styles.field}>

      <Text style={[styles.fieldLabel, isArabic && styles.textRight]}>{label}</Text>

      <TextInput

        value={value}

        onChangeText={onChangeText}

        multiline={multiline}

        textAlignVertical={multiline ? "top" : "center"}

        style={[

          styles.input,

          multiline && styles.textArea,

          isArabic && styles.inputArabic,

        ]}

        autoCapitalize="sentences"

        autoCorrect={false}

      />

    </View>

  );

}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    height: 0,
    backgroundColor: "#000000",
  },

  screen: {

    flex: 1,

    backgroundColor: COLORS.background,

  },

  scrollView: {

    flex: 1,

  },

  scrollContent: {

    paddingHorizontal: 27,

  },

  rowReverse: {

    flexDirection: "row-reverse",

  },

  textRight: {

    textAlign: "right",

    writingDirection: "rtl",

  },

  backButton: {

    alignSelf: "flex-start",

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    minHeight: 44,

    marginBottom: 38,

  },

  backText: {

    fontFamily: "Cairo_600SemiBold",

    fontSize: 15,

    color: COLORS.text,

  },

  title: {

    fontFamily: "Cairo_700Bold",

    fontSize: 35,

    lineHeight: 45,

    color: COLORS.text,

    marginBottom: 23,

  },

  actionHeader: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    minHeight: 82,

    marginBottom: 25,

  },

  addressIllustration: {

    width: 80,

    minHeight: 72,

    justifyContent: "center",

    alignItems: "flex-start",

  },

  addButton: {

    minHeight: 56,

    paddingHorizontal: 18,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 10,

    borderRadius: 10,

    backgroundColor: COLORS.text,

  },

  addButtonText: {

    fontFamily: "Cairo_700Bold",

    fontSize: 13,

    color: COLORS.white,

  },

  topDivider: {

    height: 1,

    backgroundColor: COLORS.border,

  },

  loadingContainer: {

    minHeight: 180,

    justifyContent: "center",

    alignItems: "center",

    gap: 14,

  },

  loadingText: {

    fontFamily: "Cairo_400Regular",

    fontSize: 13,

    color: COLORS.muted,

  },

  emptyContainer: {

    minHeight: 220,

    justifyContent: "center",

    alignItems: "center",

    gap: 15,

  },

  emptyText: {

    fontFamily: "Cairo_500Medium",

    fontSize: 14,

    color: COLORS.muted,

  },

  addressCard: {

    paddingTop: 37,

    paddingBottom: 37,

    borderBottomWidth: 1,

    borderBottomColor: COLORS.border,

  },

  lastAddressCard: {

    borderBottomWidth: 0,

  },

  addressTitleRow: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "flex-start",

    gap: 16,

  },

  addressTitle: {

    flex: 1,

    fontFamily: "Cairo_700Bold",

    fontSize: 27,

    lineHeight: 35,

    color: COLORS.text,

  },

  addressActions: {

    flexDirection: "row",

    alignItems: "center",

    gap: 19,

  },

  iconButton: {

    width: 36,

    height: 40,

    alignItems: "center",

    justifyContent: "center",

  },

  defaultRow: {

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    marginTop: 14,

  },

  defaultDot: {

    width: 7,

    height: 7,

    borderRadius: 4,

    backgroundColor: COLORS.primary,

  },

  defaultText: {

    fontFamily: "Cairo_400Regular",

    fontSize: 12,

    color: COLORS.text,

  },

  addressText: {

    marginTop: 27,

    fontFamily: "Cairo_400Regular",

    fontSize: 16,

    lineHeight: 27,

    color: COLORS.text,

  },

  noteContainer: {

    marginTop: 18,

    paddingLeft: 16,

    borderLeftWidth: 2,

    borderLeftColor: COLORS.primary,

  },

  noteContainerArabic: {

    paddingLeft: 0,

    paddingRight: 16,

    borderLeftWidth: 0,

    borderRightWidth: 2,

    borderRightColor: COLORS.primary,

  },

  noteText: {

    fontFamily: "Cairo_400Regular",

    fontSize: 14,

    lineHeight: 27,

    fontStyle: "italic",

    color: COLORS.muted,

  },

  setDefaultButton: {

    alignSelf: "flex-start",

    marginTop: 26,

    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

  },

  setDefaultText: {

    fontFamily: "Cairo_700Bold",

    fontSize: 13,

    color: COLORS.text,

  },

  modalOverlay: {

    flex: 1,

    backgroundColor: COLORS.overlay,

    justifyContent: "center",

    paddingHorizontal: 27,

    paddingVertical: 30,

  },

  modalCard: {

    width: "100%",

    maxHeight: "92%",

    borderRadius: 15,

    backgroundColor: COLORS.background,

    overflow: "hidden",

  },

  modalContent: {

    paddingHorizontal: 25,

    paddingTop: 25,

    paddingBottom: 25,

  },

  modalHeader: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 24,

  },

  modalTitle: {

    flex: 1,

    fontFamily: "Cairo_700Bold",

    fontSize: 28,

    lineHeight: 38,

    color: COLORS.text,

  },

  closeButton: {

    width: 42,

    height: 42,

    alignItems: "center",

    justifyContent: "center",

    marginLeft: 12,

  },

  field: {

    marginBottom: 22,

  },

  fieldLabel: {

    marginBottom: 8,

    fontFamily: "Cairo_500Medium",

    fontSize: 15,

    color: COLORS.text,

  },

  input: {

    width: "100%",

    minHeight: 58,

    paddingHorizontal: 14,

    paddingVertical: 10,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 8,

    backgroundColor: COLORS.background,

    fontFamily: "Cairo_400Regular",

    fontSize: 15,

    color: COLORS.text,

  },

  inputArabic: {

    textAlign: "right",

    writingDirection: "rtl",

  },

  textArea: {

    minHeight: 115,

    paddingTop: 13,

  },

  saveButton: {

    minHeight: 60,

    marginTop: 4,

    borderRadius: 10,

    backgroundColor: COLORS.text,

    alignItems: "center",

    justifyContent: "center",

  },

  saveButtonText: {

    fontFamily: "Cairo_700Bold",

    fontSize: 14,

    color: COLORS.white,

  },

  disabledButton: {

    opacity: 0.65,

  },

});
