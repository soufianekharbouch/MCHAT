import React, { useEffect, useMemo, useRef, useState } from "react";

import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/cairo";

import { useAppLanguage } from "../context/LanguageContext";
import { associateDeviceWithCustomer } from "../services/pushNotifications";

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

const API_BASE_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

const COLORS = {
  background: "#F4F1EC",
  card: "#EFEAE2",
  primary: "#249B97",
  primaryLight: "#E7F0ED",
  text: "#292929",
  muted: "#85817D",
  white: "#FFFFFF",
  border: "#D8CFC5",
  placeholder: "#9A958F",
  button: "#292929",
  errorBackground: "#FFF0F0",
  errorBorder: "#FFD8D8",
  errorText: "#C0392B",
  overlay: "rgba(0,0,0,0.38)",
};

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type Zone = {
  id: number;
  province_id: number;
  name: string;
  name_ar?: string | null;
};

type Province = {
  id: number;
  code?: string | null;
  name: string;
  name_ar?: string | null;
  zones: Zone[];
};

type Species = "Cat" | "Dog";
type BreedSize = "" | "Small" | "Medium" | "Large";
type Sex = "" | "Male" | "Female";

type PetDraft = {
  key: string;
  name: string;
  species: Species;
  breedSize: BreedSize;
  breed: string;
  ageYears: string;
  weight: string;
  sex: Sex;
  allergies: string;
  preferences: string;
  healthNotes: string;
};

type PickerMode = "province" | "zone" | null;

const newPet = (): PetDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  species: "Cat",
  breedSize: "",
  breed: "",
  ageYears: "",
  weight: "",
  sex: "",
  allergies: "",
  preferences: "",
  healthNotes: "",
});

/*
 * Age choices, same values as the back-office (animals.age).
 */
const AGE_VALUES: Record<Species, string[]> = {
  Cat: ["Kitten", "Adult", "Senior"],
  Dog: ["Puppy", "Adult", "Senior"],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * Créneaux de livraison : doivent correspondre à
 * CustomerAddress::DELIVERY_SLOTS côté Laravel.
 */
const DELIVERY_SLOTS = ["09:00-12:00", "12:00-15:00"] as const;

/*
|--------------------------------------------------------------------------
| SCREEN
|--------------------------------------------------------------------------
*/

export default function RegisterScreen() {
  const { language, setLanguage } = useAppLanguage();

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  const scrollRef = useRef<ScrollView>(null);

  /*
   * Customer
   */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /*
   * Address
   */
  const [addressLabel, setAddressLabel] = useState("");
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [addressText, setAddressText] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [deliverySlot, setDeliverySlot] = useState<string>("");

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  /*
   * Pets
   */
  const [pets, setPets] = useState<PetDraft[]>([]);

  /*
   * Submit
   */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isArabic = language === "ar";

  /*
  |--------------------------------------------------------------------------
  | TEXT
  |--------------------------------------------------------------------------
  */

  const t = isArabic
    ? {
        languageButton: "EN",
        back: "رجوع",
        title: "إنشاء حساب",
        subtitle: "أنشئ حسابك وأضف عنوان التوصيل وحيواناتك الأليفة.",

        accountSection: "معلوماتك",
        firstName: "الاسم الأول",
        lastName: "اسم العائلة",
        email: "البريد الإلكتروني",
        phone: "رقم الهاتف المحمول",
        password: "كلمة المرور",
        passwordConfirmation: "تأكيد كلمة المرور",
        passwordHint: "8 أحرف على الأقل",

        addressSection: "عنوان التوصيل",
        addressLabel: "التسمية (مثال: المنزل)",
        province: "المحافظة",
        zone: "المنطقة",
        selectProvince: "اختر المحافظة",
        selectZone: "اختر المنطقة",
        selectProvinceFirst: "اختر المحافظة أولاً",
        address: "العنوان (القطعة، الشارع، المنزل...)",
        addressNote: "ملاحظات التوصيل",
        deliverySlot: "وقت التوصيل",

        petsSection: "حيواناتك الأليفة",
        petsIntro: "أضف حيوانك الأليف الآن أو لاحقاً من التطبيق.",
        addPet: "إضافة حيوان أليف",
        addAnotherPet: "إضافة حيوان آخر",
        skipPets: "تخطي، سأضيفها لاحقاً",
        skippedPets: "يمكنك إضافة حيواناتك الأليفة لاحقاً من صفحة «حيواناتي».",
        pet: "الحيوان",
        removePet: "حذف",
        petName: "الاسم",
        species: "النوع",
        cat: "قط",
        dog: "كلب",
        dogSize: "حجم الكلب",
        small: "صغير",
        medium: "متوسط",
        large: "كبير",
        breed: "السلالة",
        ageYears: "العمر",
        ageLabels: {
          Kitten: "صغير (قطيط)",
          Puppy: "صغير (جرو)",
          Adult: "بالغ",
          Senior: "كبير السن",
        } as Record<string, string>,
        weightKg: "الوزن (كغ)",
        sex: "الجنس",
        male: "ذكر",
        female: "أنثى",
        allergies: "الحساسيات",
        preferences: "التفضيلات",
        healthNotes: "ملاحظات صحية",

        submit: "إنشاء الحساب",
        submitting: "جاري إنشاء الحساب...",
        haveAccount: "لديك حساب بالفعل؟",
        signIn: "تسجيل الدخول",

        search: "بحث...",
        noResults: "لا توجد نتائج.",
        loadingList: "جاري التحميل...",
        provincesError: "تعذر تحميل المحافظات والمناطق.",

        errFirstName: "يرجى إدخال الاسم الأول.",
        errLastName: "يرجى إدخال اسم العائلة.",
        errEmail: "يرجى إدخال بريد إلكتروني صحيح.",
        errPhone: "يرجى إدخال رقم الهاتف.",
        errPassword: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
        errPasswordConfirmation: "كلمتا المرور غير متطابقتين.",
        errProvince: "يرجى اختيار المحافظة.",
        errZone: "يرجى اختيار المنطقة.",
        errAddress: "يرجى إدخال العنوان.",
        errDeliverySlot: "يرجى اختيار وقت التوصيل.",
        errDogSize: "يرجى اختيار حجم الكلب.",
        errPetName: "يرجى إدخال اسم كل حيوان أليف.",
        errServer: "استجابة غير صالحة من الخادم.",
        errRegister: "تعذر إنشاء الحساب.",
        errConnection: "حدث خطأ في الاتصال بالخادم. حاول مرة أخرى.",
        errToken: "لم يتم استلام رمز الدخول.",
        errTooMany: "محاولات كثيرة جداً. يرجى الانتظار دقيقة ثم المحاولة مرة أخرى.",
      }
    : {
        languageButton: "العربية",
        back: "Back",
        title: "Create Account",
        subtitle: "Create your account, add your delivery address and your pets.",

        accountSection: "Your information",
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email",
        phone: "Mobile Phone Number",
        password: "Password",
        passwordConfirmation: "Confirm Password",
        passwordHint: "At least 8 characters",

        addressSection: "Delivery address",
        addressLabel: "Label (e.g. Home)",
        province: "Governorate",
        zone: "Area",
        selectProvince: "Select governorate",
        selectZone: "Select area",
        selectProvinceFirst: "Select a governorate first",
        address: "Address (block, street, house...)",
        addressNote: "Delivery Notes",
        deliverySlot: "Delivery Time Slot",

        petsSection: "Your pets",
        petsIntro: "Add your pet now, or later from the app.",
        addPet: "Add a pet",
        addAnotherPet: "Add another pet",
        skipPets: "Skip, I'll add them later",
        skippedPets: "You can add your pets later from the “My Pets” page.",
        pet: "Pet",
        removePet: "Remove",
        petName: "Name",
        species: "Species",
        cat: "Cat",
        dog: "Dog",
        dogSize: "Dog size",
        small: "Small",
        medium: "Medium",
        large: "Large",
        breed: "Breed",
        ageYears: "Age",
        ageLabels: {
          Kitten: "Kitten",
          Puppy: "Puppy",
          Adult: "Adult",
          Senior: "Senior",
        } as Record<string, string>,
        weightKg: "Weight (kg)",
        sex: "Sex",
        male: "Male",
        female: "Female",
        allergies: "Allergies",
        preferences: "Preferences",
        healthNotes: "Health Notes",

        submit: "Create Account",
        submitting: "Creating account...",
        haveAccount: "Already have an account?",
        signIn: "Sign In",

        search: "Search...",
        noResults: "No results.",
        loadingList: "Loading...",
        provincesError: "Unable to load governorates and areas.",

        errFirstName: "Please enter your first name.",
        errLastName: "Please enter your last name.",
        errEmail: "Please enter a valid email address.",
        errPhone: "Please enter your phone number.",
        errPassword: "Password must be at least 8 characters.",
        errPasswordConfirmation: "Passwords do not match.",
        errProvince: "Please select a governorate.",
        errZone: "Please select an area.",
        errAddress: "Please enter your address.",
        errDeliverySlot: "Please select a delivery time slot.",
        errDogSize: "Please select the dog size.",
        errPetName: "Please enter a name for each pet.",
        errServer: "Invalid response from server.",
        errRegister: "Unable to create the account.",
        errConnection: "Unable to connect to the server. Please try again.",
        errToken: "Access token was not returned.",
        errTooMany: "Too many attempts. Please wait a minute and try again.",
      };

  /*
  |--------------------------------------------------------------------------
  | PROVINCES & ZONES
  |--------------------------------------------------------------------------
  */

  const loadProvinces = async () => {
    try {
      setProvincesLoading(true);

      const response = await fetch(`${API_BASE_URL}/provinces-zones`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("Request failed");

      const data = await response.json();

      setProvinces(Array.isArray(data?.provinces) ? data.provinces : []);
    } catch (loadError) {
      console.error("Load provinces error:", loadError);
    } finally {
      setProvincesLoading(false);
    }
  };

  useEffect(() => {
    void loadProvinces();
  }, []);

  const localName = (item: { name: string; name_ar?: string | null }) =>
    isArabic && item.name_ar ? item.name_ar : item.name;

  const selectedProvince = useMemo(
    () => provinces.find(p => p.id === provinceId) ?? null,
    [provinces, provinceId]
  );

  const selectedZone = useMemo(
    () => selectedProvince?.zones.find(z => z.id === zoneId) ?? null,
    [selectedProvince, zoneId]
  );

  const pickerItems = useMemo(() => {
    const source: Array<Province | Zone> =
      pickerMode === "province"
        ? provinces
        : pickerMode === "zone"
          ? selectedProvince?.zones ?? []
          : [];

    const query = pickerSearch.trim();

    const filtered = query
      ? source.filter(item =>
          item.name.toLowerCase().includes(query.toLowerCase())
          || (item.name_ar ?? "").includes(query)
        )
      : source;

    return [...filtered].sort((a, b) =>
      localName(a).localeCompare(localName(b), isArabic ? "ar" : "en")
    );
  }, [pickerMode, provinces, selectedProvince, pickerSearch, isArabic]);

  const openPicker = (mode: Exclude<PickerMode, null>) => {
    if (mode === "zone" && !selectedProvince) {
      setError(t.selectProvinceFirst);
      return;
    }

    if (provinces.length === 0 && !provincesLoading) {
      void loadProvinces();
    }

    setPickerSearch("");
    setPickerMode(mode);
  };

  const closePicker = () => {
    setPickerMode(null);
    setPickerSearch("");
  };

  const selectPickerItem = (item: Province | Zone) => {
    if (pickerMode === "province") {
      const province = item as Province;

      setProvinceId(province.id);

      if (!province.zones.some(z => z.id === zoneId)) {
        setZoneId(null);
      }
    } else {
      const zone = item as Zone;

      setProvinceId(zone.province_id);
      setZoneId(zone.id);
    }

    closePicker();
  };

  /*
  |--------------------------------------------------------------------------
  | PETS
  |--------------------------------------------------------------------------
  */

  const addPet = () => setPets(current => [...current, newPet()]);

  const removePet = (key: string) =>
    setPets(current => current.filter(pet => pet.key !== key));

  const updatePet = <K extends keyof PetDraft>(key: string, field: K, value: PetDraft[K]) =>
    setPets(current =>
      current.map(pet => {
        if (pet.key !== key) return pet;

        const next = { ...pet, [field]: value };

        if (field === "species" && value !== "Dog") {
          next.breedSize = "";
        }

        // Kitten <-> Puppy: clear an age that does not exist for the new species
        if (field === "species" && next.ageYears && !AGE_VALUES[next.species].includes(next.ageYears)) {
          next.ageYears = "";
        }

        return next;
      })
    );

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  const validate = (): string | null => {
    if (!firstName.trim()) return t.errFirstName;
    if (!lastName.trim()) return t.errLastName;
    if (!EMAIL_REGEX.test(email.trim())) return t.errEmail;
    if (!phone.trim()) return t.errPhone;
    if (password.length < 8) return t.errPassword;
    if (password !== passwordConfirmation) return t.errPasswordConfirmation;
    if (!provinceId) return t.errProvince;
    if (!zoneId) return t.errZone;
    if (!addressText.trim()) return t.errAddress;
    if (!deliverySlot) return t.errDeliverySlot;
    if (pets.some(pet => !pet.name.trim())) return t.errPetName;
    if (pets.some(pet => pet.species === "Dog" && !pet.breedSize)) return t.errDogSize;

    return null;
  };

  const showError = (message: string) => {
    setError(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  |
  | POST /api/mobile/register
  | Expected response (same as /login):
  |   { success, access_token, expires_at, must_change_password }
  |
  */

  const handleRegister = async () => {
    if (loading) return;

    setError("");

    const validationError = validate();

    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        password_confirmation: passwordConfirmation,
        locale: language,

        address: {
          label: addressLabel.trim() || null,
          province_id: provinceId,
          zone_id: zoneId,
          address: addressText.trim(),
          note: addressNote.trim() || null,
          delivery_slot: deliverySlot || null,
        },

        pets: pets.map(pet => ({
          name: pet.name.trim(),
          species: pet.species,
          breed_size_category: pet.species === "Dog" ? pet.breedSize || null : null,
          breed: pet.breed.trim() || null,
          age: pet.ageYears.trim() || null,
          weight_kg: pet.weight.trim().replace(",", ".") || null,
          sex: pet.sex || null,
          allergies: pet.allergies.trim() || null,
          preferences: pet.preferences.trim() || null,
          note: pet.healthNotes.trim() || null,
        })),
      };

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Request limit reached (Laravel throttle on /register)
      if (response.status === 429) {
        showError(t.errTooMany);
        return;
      }

      let data: any;

      try {
        data = await response.json();
      } catch {
        showError(t.errServer);
        return;
      }

      if (!response.ok || !data?.success) {
        const validationMessage = data?.errors
          ? Object.values(data.errors).flat().join("\n")
          : null;

        showError(validationMessage || data?.message || t.errRegister);
        return;
      }

      if (!data.access_token) {
        showError(t.errToken);
        return;
      }

      /*
       * Same session steps as the login screen.
       */
      await SecureStore.setItemAsync("access_token", data.access_token);

      if (data.expires_at) {
        await SecureStore.setItemAsync("access_token_expires_at", data.expires_at);
      } else {
        await SecureStore.deleteItemAsync("access_token_expires_at");
      }

      await SecureStore.setItemAsync("locale", language);

      // The customer chose their own password: no forced change.
      await SecureStore.setItemAsync(
        "must_change_password",
        data.must_change_password === true ? "1" : "0"
      );

      try {
        const deviceResult = await associateDeviceWithCustomer();

        if (!deviceResult.success) {
          console.warn("Device could not be associated with customer.");
        }
      } catch (deviceError) {
        console.error("Device association error:", deviceError);
      }

      router.replace("/(tabs)");
    } catch (exception) {
      console.error("Register error:", exception);
      showError(t.errConnection);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  const textDir = isArabic ? styles.textArabic : styles.textEnglish;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* TOP BAR */}

        <View style={[styles.topBar, isArabic && styles.rowReverse]}>
          <Pressable
            style={[styles.backButton, isArabic && styles.rowReverse]}
            onPress={goToLogin}
            hitSlop={10}
          >
            <Ionicons
              name={isArabic ? "arrow-forward" : "arrow-back"}
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.backText}>{t.back}</Text>
          </Pressable>

          <Pressable
            onPress={() => setLanguage(isArabic ? "en" : "ar")}
            hitSlop={10}
          >
            <Text style={styles.languageButtonText}>{t.languageButton}</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* INTRO */}

          <Text style={[styles.title, textDir]}>{t.title}</Text>
          <Text style={[styles.subtitle, textDir]}>{t.subtitle}</Text>

          {/* ERROR */}

          {error !== "" && (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, textDir]}>{error}</Text>
            </View>
          )}

          {/*
          |------------------------------------------------------------------
          | 1. CUSTOMER
          |------------------------------------------------------------------
          */}

          <SectionTitle
            number="1"
            title={t.accountSection}
            icon="account-outline"
            isArabic={isArabic}
          />

          <View style={[styles.row, isArabic && styles.rowReverse]}>
            <View style={styles.half}>
              <Field
                label={t.firstName}
                value={firstName}
                onChangeText={setFirstName}
                isArabic={isArabic}
                editable={!loading}
                textContentType="givenName"
              />
            </View>

            <View style={styles.half}>
              <Field
                label={t.lastName}
                value={lastName}
                onChangeText={setLastName}
                isArabic={isArabic}
                editable={!loading}
                textContentType="familyName"
              />
            </View>
          </View>

          <Field
            label={t.email}
            value={email}
            onChangeText={setEmail}
            isArabic={isArabic}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            placeholder="name@example.com"
            forceLtr
          />

          <Field
            label={t.phone}
            value={phone}
            onChangeText={setPhone}
            isArabic={isArabic}
            editable={!loading}
            keyboardType="phone-pad"
            autoCapitalize="none"
            textContentType="telephoneNumber"
            placeholder="+965 5000 0000"
            forceLtr
          />

          <Field
            label={t.password}
            hint={t.passwordHint}
            value={password}
            onChangeText={setPassword}
            isArabic={isArabic}
            editable={!loading}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
            onRightIconPress={() => setShowPassword(current => !current)}
          />

          <Field
            label={t.passwordConfirmation}
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            isArabic={isArabic}
            editable={!loading}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
          />

          {/*
          |------------------------------------------------------------------
          | 2. ADDRESS
          |------------------------------------------------------------------
          */}

          <SectionTitle
            number="2"
            title={t.addressSection}
            icon="home-city-outline"
            isArabic={isArabic}
          />

          <Field
            label={t.addressLabel}
            value={addressLabel}
            onChangeText={setAddressLabel}
            isArabic={isArabic}
            editable={!loading}
          />

          <SelectField
            label={t.province}
            value={selectedProvince ? localName(selectedProvince) : null}
            placeholder={t.selectProvince}
            onPress={() => openPicker("province")}
            isArabic={isArabic}
            disabled={loading}
          />

          <SelectField
            label={t.zone}
            value={selectedZone ? localName(selectedZone) : null}
            placeholder={selectedProvince ? t.selectZone : t.selectProvinceFirst}
            onPress={() => openPicker("zone")}
            isArabic={isArabic}
            disabled={loading || !selectedProvince}
          />

          <Field
            label={t.address}
            value={addressText}
            onChangeText={setAddressText}
            isArabic={isArabic}
            editable={!loading}
          />

          <Field
            label={t.addressNote}
            value={addressNote}
            onChangeText={setAddressNote}
            isArabic={isArabic}
            editable={!loading}
            multiline
          />

          <Text style={[styles.label, textDir]}>{t.deliverySlot}</Text>
          <Chips<string>
            value={deliverySlot}
            options={DELIVERY_SLOTS.map(slot => ({
              value: slot,
              label: slot.replace("-", " - "),
            }))}
            onChange={setDeliverySlot}
            isArabic={isArabic}
            disabled={loading}
          />

          {/*
          |------------------------------------------------------------------
          | 3. PETS
          |------------------------------------------------------------------
          */}

          <SectionTitle
            number="3"
            title={t.petsSection}
            icon="paw"
            isArabic={isArabic}
          />

          <Text style={[styles.sectionIntro, textDir]}>
            {pets.length === 0 ? t.petsIntro : ""}
          </Text>

          {pets.map((pet, index) => (
            <PetCard
              key={pet.key}
              pet={pet}
              index={index}
              t={t}
              isArabic={isArabic}
              disabled={loading}
              onChange={(field, value) => updatePet(pet.key, field, value)}
              onRemove={() => removePet(pet.key)}
            />
          ))}

          <Pressable
            style={[styles.addPetButton, isArabic && styles.rowReverse]}
            onPress={addPet}
            disabled={loading}
          >
            <Ionicons name="add" size={22} color={COLORS.text} />
            <Text style={styles.addPetButtonText}>
              {pets.length === 0 ? t.addPet : t.addAnotherPet}
            </Text>
          </Pressable>

          {pets.length === 0 ? (
            <View style={[styles.skipBox, isArabic && styles.rowReverse]}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.skipText, textDir]}>{t.skippedPets}</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.skipButton, isArabic && styles.rowReverse]}
              onPress={() => setPets([])}
              disabled={loading}
            >
              <Ionicons name="play-skip-forward-outline" size={18} color={COLORS.muted} />
              <Text style={styles.skipButtonText}>{t.skipPets}</Text>
            </Pressable>
          )}

          {/* SUBMIT */}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && !loading && styles.submitButtonPressed,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <View style={[styles.loadingRow, isArabic && styles.rowReverse]}>
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text style={styles.submitButtonText}>{t.submitting}</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>{t.submit}</Text>
            )}
          </Pressable>

          {/* SIGN IN LINK */}

          <View style={[styles.signInRow, isArabic && styles.rowReverse]}>
            <Text style={styles.signInText}>{t.haveAccount}</Text>

            <Pressable onPress={goToLogin} hitSlop={10} disabled={loading}>
              <Text style={styles.signInLink}>{t.signIn}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/*
      |----------------------------------------------------------------------
      | PROVINCE / ZONE PICKER
      |----------------------------------------------------------------------
      */}

      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePicker}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closePicker} />

          <View style={styles.modalCard}>
            <View style={[styles.modalHeader, isArabic && styles.rowReverse]}>
              <Text style={[styles.modalTitle, textDir]}>
                {pickerMode === "province" ? t.selectProvince : t.selectZone}
              </Text>

              <Pressable style={styles.closeButton} onPress={closePicker}>
                <Ionicons name="close" size={26} color={COLORS.muted} />
              </Pressable>
            </View>

            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder={t.search}
              placeholderTextColor={COLORS.placeholder}
              style={[styles.input, styles.searchInput, isArabic && styles.inputArabic]}
              autoCorrect={false}
            />

            {provincesLoading && provinces.length === 0 ? (
              <View style={styles.pickerEmpty}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.mutedText}>{t.loadingList}</Text>
              </View>
            ) : provinces.length === 0 ? (
              <View style={styles.pickerEmpty}>
                <Text style={[styles.mutedText, textDir]}>{t.provincesError}</Text>

                <Pressable style={styles.retryButton} onPress={loadProvinces}>
                  <Ionicons name="refresh" size={18} color={COLORS.primary} />
                </Pressable>
              </View>
            ) : (
              <ScrollView
                style={styles.pickerList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {pickerItems.length === 0 ? (
                  <Text style={styles.pickerNoResult}>{t.noResults}</Text>
                ) : (
                  pickerItems.map(item => {
                    const isSelected =
                      pickerMode === "province"
                        ? item.id === provinceId
                        : item.id === zoneId;

                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.pickerItem,
                          isArabic && styles.rowReverse,
                          isSelected && styles.pickerItemSelected,
                        ]}
                        onPress={() => selectPickerItem(item)}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            isSelected && styles.pickerItemTextSelected,
                            textDir,
                          ]}
                        >
                          {localName(item)}
                        </Text>

                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| SECTION TITLE
|--------------------------------------------------------------------------
*/

function SectionTitle({
  number,
  title,
  icon,
  isArabic,
}: {
  number: string;
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  isArabic: boolean;
}) {
  return (
    <View style={[styles.sectionHeader, isArabic && styles.rowReverse]}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>

      <Text style={[styles.sectionTitle, isArabic ? styles.textArabic : styles.textEnglish]}>
        {title}
      </Text>

      <MaterialCommunityIcons name={icon} size={22} color={COLORS.primary} />
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| FIELD
|--------------------------------------------------------------------------
*/

type FieldProps = React.ComponentProps<typeof TextInput> & {
  label: string;
  hint?: string;
  isArabic: boolean;
  forceLtr?: boolean;
  rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onRightIconPress?: () => void;
};

function Field({
  label,
  hint,
  isArabic,
  forceLtr = false,
  rightIcon,
  onRightIconPress,
  multiline,
  style,
  ...inputProps
}: FieldProps) {
  const rtl = isArabic && !forceLtr;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, isArabic ? styles.textArabic : styles.textEnglish]}>
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          multiline && styles.textAreaContainer,
          isArabic && styles.rowReverse,
        ]}
      >
        <TextInput
          {...inputProps}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          placeholderTextColor={COLORS.placeholder}
          autoCorrect={false}
          style={[
            styles.inputInner,
            multiline && styles.textAreaInner,
            rtl ? styles.inputArabic : styles.inputEnglish,
            style,
          ]}
        />

        {!!rightIcon && (
          <Pressable style={styles.eyeButton} onPress={onRightIconPress} hitSlop={10}>
            <MaterialCommunityIcons name={rightIcon} size={24} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      {!!hint && (
        <Text style={[styles.hint, isArabic ? styles.textArabic : styles.textEnglish]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| SELECT FIELD
|--------------------------------------------------------------------------
*/

function SelectField({
  label,
  value,
  placeholder,
  onPress,
  isArabic,
  disabled = false,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  isArabic: boolean;
  disabled?: boolean;
}) {
  const textDir = isArabic ? styles.textArabic : styles.textEnglish;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, textDir]}>{label}</Text>

      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.inputContainer,
          styles.selectContainer,
          isArabic && styles.rowReverse,
          disabled && styles.selectDisabled,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.selectText, !value && styles.selectPlaceholder, textDir]}
        >
          {value ?? placeholder}
        </Text>

        <Ionicons name="chevron-down" size={20} color={COLORS.muted} />
      </Pressable>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| CHIPS
|--------------------------------------------------------------------------
*/

function Chips<T extends string>({
  value,
  options,
  onChange,
  isArabic,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  isArabic: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.chips, isArabic && styles.rowReverse]}>
      {options.map(option => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| PET CARD
|--------------------------------------------------------------------------
*/

function PetCard({
  pet,
  index,
  t,
  isArabic,
  disabled,
  onChange,
  onRemove,
}: {
  pet: PetDraft;
  index: number;
  t: any;
  isArabic: boolean;
  disabled: boolean;
  onChange: <K extends keyof PetDraft>(field: K, value: PetDraft[K]) => void;
  onRemove: () => void;
}) {
  const textDir = isArabic ? styles.textArabic : styles.textEnglish;

  return (
    <View style={styles.petCard}>
      <View style={[styles.petCardHeader, isArabic && styles.rowReverse]}>
        <View style={[styles.petCardTitleRow, isArabic && styles.rowReverse]}>
          <MaterialCommunityIcons
            name={pet.species === "Dog" ? "dog" : "cat"}
            size={22}
            color={COLORS.primary}
          />
          <Text style={[styles.petCardTitle, textDir]}>
            {pet.name.trim() || `${t.pet} ${index + 1}`}
          </Text>
        </View>

        <Pressable
          style={[styles.removePetButton, isArabic && styles.rowReverse]}
          onPress={onRemove}
          disabled={disabled}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.errorText} />
          <Text style={styles.removePetText}>{t.removePet}</Text>
        </Pressable>
      </View>

      <Field
        label={t.petName}
        value={pet.name}
        onChangeText={value => onChange("name", value)}
        isArabic={isArabic}
        editable={!disabled}
      />

      <Text style={[styles.label, textDir]}>{t.species}</Text>
      <Chips<Species>
        value={pet.species}
        options={[
          { value: "Cat", label: t.cat },
          { value: "Dog", label: t.dog },
        ]}
        onChange={value => onChange("species", value)}
        isArabic={isArabic}
        disabled={disabled}
      />

      {pet.species === "Dog" && (
        <>
          <Text style={[styles.label, textDir]}>{t.dogSize}</Text>
          <Chips<BreedSize>
            value={pet.breedSize}
            options={[
              { value: "Small", label: t.small },
              { value: "Medium", label: t.medium },
              { value: "Large", label: t.large },
            ]}
            onChange={value => onChange("breedSize", value)}
            isArabic={isArabic}
            disabled={disabled}
          />
        </>
      )}

      <Field
        label={t.breed}
        value={pet.breed}
        onChangeText={value => onChange("breed", value)}
        isArabic={isArabic}
        editable={!disabled}
      />

      <Text style={[styles.label, textDir]}>{t.ageYears}</Text>
      <Chips<string>
        value={pet.ageYears}
        options={AGE_VALUES[pet.species].map(value => ({
          value,
          label: t.ageLabels[value] ?? value,
        }))}
        onChange={value => onChange("ageYears", value)}
        isArabic={isArabic}
        disabled={disabled}
      />

      <Field
        label={t.weightKg}
        value={pet.weight}
        onChangeText={value => onChange("weight", value)}
        isArabic={isArabic}
        editable={!disabled}
        keyboardType="decimal-pad"
      />

      <Text style={[styles.label, textDir]}>{t.sex}</Text>
      <Chips<Sex>
        value={pet.sex}
        options={[
          { value: "Male", label: t.male },
          { value: "Female", label: t.female },
        ]}
        onChange={value => onChange("sex", value)}
        isArabic={isArabic}
        disabled={disabled}
      />

      <Field
        label={t.allergies}
        value={pet.allergies}
        onChangeText={value => onChange("allergies", value)}
        isArabic={isArabic}
        editable={!disabled}
      />

      <Field
        label={t.preferences}
        value={pet.preferences}
        onChangeText={value => onChange("preferences", value)}
        isArabic={isArabic}
        editable={!disabled}
      />

      <Field
        label={t.healthNotes}
        value={pet.healthNotes}
        onChangeText={value => onChange("healthNotes", value)}
        isArabic={isArabic}
        editable={!disabled}
        multiline
      />
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  rowReverse: {
    flexDirection: "row-reverse",
  },

  textArabic: {
    textAlign: "right",
    writingDirection: "rtl",
  },

  textEnglish: {
    textAlign: "left",
    writingDirection: "ltr",
  },

  /* TOP BAR */

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 4,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
  },

  backText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
    color: COLORS.text,
  },

  languageButtonText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.text,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 40,
  },

  /* INTRO */

  title: {
    fontFamily: "Cairo_800ExtraBold",
    fontSize: 36,
    lineHeight: 48,
    color: COLORS.text,
    marginBottom: 6,
  },

  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 16,
    lineHeight: 27,
    color: COLORS.muted,
    marginBottom: 24,
  },

  /* ERROR */

  errorBox: {
    backgroundColor: COLORS.errorBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },

  errorText: {
    fontFamily: "Cairo_500Medium",
    color: COLORS.errorText,
    fontSize: 13,
    lineHeight: 21,
  },

  /* SECTIONS */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionNumberText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: COLORS.white,
  },

  sectionTitle: {
    flex: 1,
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    lineHeight: 30,
    color: COLORS.text,
  },

  sectionIntro: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.muted,
  },

  /* FIELDS */

  row: {
    flexDirection: "row",
    gap: 12,
  },

  half: {
    flex: 1,
  },

  field: {
    marginBottom: 20,
  },

  label: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
    marginBottom: 8,
  },

  hint: {
    marginTop: 5,
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: COLORS.muted,
  },

  inputContainer: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  textAreaContainer: {
    minHeight: 100,
    alignItems: "flex-start",
    paddingVertical: 10,
  },

  inputInner: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 0,
    fontFamily: "Cairo_400Regular",
    fontSize: 16,
    color: COLORS.text,
  },

  textAreaInner: {
    minHeight: 80,
  },

  input: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 14,
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

  inputEnglish: {
    textAlign: "left",
    writingDirection: "ltr",
  },

  eyeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  selectContainer: {
    justifyContent: "space-between",
    gap: 10,
  },

  selectText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 16,
    color: COLORS.text,
  },

  selectPlaceholder: {
    color: COLORS.placeholder,
  },

  selectDisabled: {
    opacity: 0.55,
  },

  /* CHIPS */

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  chip: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  chipText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: COLORS.text,
  },

  chipTextActive: {
    fontFamily: "Cairo_700Bold",
    color: COLORS.primary,
  },

  /* PETS */

  petCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 14,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    backgroundColor: COLORS.card,
  },

  petCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  petCardTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  petCardTitle: {
    flexShrink: 1,
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: COLORS.text,
  },

  removePetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  removePetText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: COLORS.errorText,
  },

  addPetButton: {
    marginTop: 16,
    minHeight: 55,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#B9DCD5",
    backgroundColor: "#EDF4F1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  addPetButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: COLORS.text,
  },

  skipBox: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  skipText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.muted,
  },

  skipButton: {
    marginTop: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
  },

  skipButtonText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: COLORS.muted,
    textDecorationLine: "underline",
  },

  /* SUBMIT */

  submitButton: {
    marginTop: 30,
    height: 61,
    borderRadius: 9,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
  },

  submitButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },

  submitButtonDisabled: {
    opacity: 0.65,
  },

  submitButtonText: {
    fontFamily: "Cairo_700Bold",
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 23,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  signInRow: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },

  signInText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: COLORS.muted,
  },

  signInLink: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: "underline",
  },

  /* PICKER MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    paddingHorizontal: 27,
    paddingVertical: 30,
  },

  modalCard: {
    width: "100%",
    maxHeight: "85%",
    borderRadius: 15,
    backgroundColor: COLORS.background,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  modalTitle: {
    flex: 1,
    fontFamily: "Cairo_700Bold",
    fontSize: 21,
    lineHeight: 30,
    color: COLORS.text,
  },

  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInput: {
    marginBottom: 10,
  },

  pickerList: {
    maxHeight: 420,
  },

  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  pickerItemSelected: {
    backgroundColor: "rgba(36,155,151,0.08)",
  },

  pickerItemText: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: 15,
    color: COLORS.text,
  },

  pickerItemTextSelected: {
    fontFamily: "Cairo_700Bold",
    color: COLORS.primary,
  },

  pickerNoResult: {
    paddingVertical: 24,
    textAlign: "center",
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: COLORS.muted,
  },

  pickerEmpty: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  mutedText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: COLORS.muted,
  },

  retryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
});