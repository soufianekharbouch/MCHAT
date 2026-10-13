import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import * as ImagePicker from "expo-image-picker";

import {
  useAppLanguage,
} from "../../context/LanguageContext";

import {
  useCustomerData,
} from "../../context/CustomerDataContext";

import {
  createPet,
  updatePet,
} from "../../services/customerApi";

import type {
  Pet,
} from "../../types/customer";

import {
  fetchPurchases,
} from "../../services/purchaseApi";

import type {
  PurchaseSummary,
} from "../../types/purchase";

import SubscriptionCard from "../../components/purchase/SubscriptionCard";

/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/

const COLORS = {
  background: "#F4F1EC",
  card: "#EFEAE2",
  primary: "#249B97",
  primaryLight: "#E7F0ED",
  text: "#191919",
  muted: "#77736D",
  border: "#D9D1C6",
  inputBackground: "#F7F4EF",
  white: "#FFFFFF",
  dark: "#292929",
  danger: "#EB6268",
  overlay: "rgba(0,0,0,0.38)",
};

/*
|--------------------------------------------------------------------------
| AGE CHOICES
|--------------------------------------------------------------------------
|
| Same values as the back-office form (animals.age):
|   Cat: Kitten / Adult / Senior
|   Dog: Puppy  / Adult / Senior
| The English value is saved, the label is translated.
|
*/

const AGE_VALUES: Record<"Cat" | "Dog", string[]> = {
  Cat: ["Kitten", "Adult", "Senior"],
  Dog: ["Puppy", "Adult", "Senior"],
};

const ageOptionsFor = (
  species: "Cat" | "Dog",
  t: any
) =>
  AGE_VALUES[species].map(value => ({
    value,
    label: t.ageLabels[value] ?? value,
  }));

/*
|--------------------------------------------------------------------------
| EXTENDED PET
|--------------------------------------------------------------------------
|
| These optional fields allow the screen to display the new design
| if your API already returns them.
|
*/

type ExtendedPet = Pet & {
  breed?: string | null;

  age_years?: number | string | null;

  weight?: number | string | null;
  weight_kg?: number | string | null;

  sex?: string | null;
  gender?: string | null;

  allergies?: string | string[] | null;

  preferences?: string | null;

  health_notes?: string | null;

  subscription_status?: string | null;

  next_order?: any;

  orders?: any[];

  subscription?: any;
};

/*
|--------------------------------------------------------------------------
| SCREEN
|--------------------------------------------------------------------------
*/

export default function PetFormScreen() {

  const {
    isArabic,
  } = useAppLanguage();

  const insets =
    useSafeAreaInsets();

  const {
    subscription,
    loading,
    refresh,
  } = useCustomerData();

  const params =
    useLocalSearchParams<{
      id?: string;
    }>();

  /*
  |--------------------------------------------------------------------------
  | TRANSLATIONS
  |--------------------------------------------------------------------------
  */

  const t = isArabic
    ? {
        back: "رجوع",
        editProfile: "تعديل الملف",

        addTitle: "إضافة حيوان أليف",
        editTitle: "تعديل الملف",

        changePicture: "تغيير صورة الملف",
        pictureHint: "JPG, PNG أو WebP",

        name: "الاسم",
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

        saveChanges: "حفظ التغييرات",
        saving: "جاري الحفظ...",

        deliveryCalendar: "تقويم التوصيل",
        transitionGuide: "دليل الانتقال للطعام الطازج",
        deliveryHistory: "سجل التوصيل",

        subscriptionStatus: "حالة الاشتراك",
        active: "نشط",
        inactive: "غير نشط",

        packageSize: "حجم الباقة",
        priceCycle: "السعر / الدورة",
        meals: "وجبة",

        cycleStarted: "بداية الدورة:",
        nextRenewal: "التجديد التلقائي القادم:",

        editSubscription: "تعديل / تغيير الاشتراك",
        renewSubscription: "تجديد الاشتراك",
        pausePlan: "إيقاف الخطة مؤقتاً",
        cancelPlan: "إلغاء الخطة",

        addPet: "إضافة حيوان أليف",
        species: "النوع",
        cat: "قط",
        dog: "كلب",
        dogSize: "حجم الكلب",
        small: "صغير",
        medium: "متوسط",
        large: "كبير",

        select: "اختر",
        addPhoto: "إضافة صورة",
        changePhoto: "تغيير الصورة",
        takePhoto: "التقاط صورة",
        chooseGallery: "اختيار من المعرض",
        removePhoto: "حذف الصورة",
        cancel: "إلغاء",

        requiredName: "المرجو إدخال اسم الحيوان.",
        photoPermission:
          "يجب السماح للتطبيق بالوصول إلى الصور.",
        cameraPermission:
          "يجب السماح للتطبيق باستخدام الكاميرا.",

        successUpdated:
          "تم تعديل معلومات الحيوان بنجاح.",

        successCreated:
          "تمت إضافة الحيوان بنجاح.",

        error:
          "حدث خطأ. المرجو المحاولة مرة أخرى.",

        unknown: "غير محدد",
        none: "لا يوجد",

        noPlanTitle: "لا توجد باقة نشطة",
        noPlanText: "اختر باقة وجبات طازجة لهذا الحيوان، ثم حدد مواعيد التوصيل.",
        choosePlan: "اختيار باقة",
        planHistory: "الباقات السابقة",
      }

    : {
        back: "Back",
        editProfile: "Edit Profile",

        addTitle: "Add Pet",
        editTitle: "Edit Profile",

        changePicture: "Change profile picture",
        pictureHint: "JPG, PNG or WebP",

        name: "Name",
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

        saveChanges: "Save Changes",
        saving: "Saving...",

        deliveryCalendar: "Delivery Calendar",
        transitionGuide: "Fresh Food Transition Guide",
        deliveryHistory: "Delivery History",

        subscriptionStatus: "SUBSCRIPTION STATUS",
        active: "Active",
        inactive: "Inactive",

        packageSize: "Package Size",
        priceCycle: "Price / Cycle",
        meals: "meals",

        cycleStarted: "Cycle Started:",
        nextRenewal: "Next Auto-Renewal:",

        editSubscription: "Edit / Change Subscription",
        renewSubscription: "Renew Subscription",
        pausePlan: "Pause Plan",
        cancelPlan: "Cancel Plan",

        addPet: "Add Pet",
        species: "Species",
        cat: "Cat",
        dog: "Dog",
        dogSize: "Dog size",
        small: "Small",
        medium: "Medium",
        large: "Large",

        select: "Select",
        addPhoto: "Add photo",
        changePhoto: "Change photo",
        takePhoto: "Take photo",
        chooseGallery: "Choose from gallery",
        removePhoto: "Remove photo",
        cancel: "Cancel",

        requiredName:
          "Please enter the pet name.",

        photoPermission:
          "Please allow access to your photos.",

        cameraPermission:
          "Please allow access to the camera.",

        successUpdated:
          "Pet updated successfully.",

        successCreated:
          "Pet added successfully.",

        error:
          "Something went wrong. Please try again.",

        unknown: "Not specified",
        none: "None",

        noPlanTitle: "No active plan",
        noPlanText: "Choose a fresh meal plan for this pet, then pick your delivery dates.",
        choosePlan: "Choose a plan",
        planHistory: "Previous plans",
      };

  /*
  |--------------------------------------------------------------------------
  | PET
  |--------------------------------------------------------------------------
  */

  const petId =
    params.id
      ? Number(params.id)
      : null;

  const existingPet =
    useMemo<ExtendedPet | null>(() => {

      if (!petId) {
        return null;
      }

      return (
        subscription?.animals?.find(
          pet =>
            Number(pet.id) === petId
        ) as ExtendedPet
      ) || null;

    }, [
      petId,
      subscription?.animals,
    ]);

  const isEditing =
    petId !== null;

  /*
  |--------------------------------------------------------------------------
  | PURCHASES OF THIS PET (shown as the subscription card)
  |--------------------------------------------------------------------------
  */

  const [
    purchases,
    setPurchases,
  ] = useState<PurchaseSummary[]>([]);

  const [
    purchasesLoading,
    setPurchasesLoading,
  ] = useState(false);

  const loadPurchases = useCallback(async () => {

    if (!petId) {
      return;
    }

    try {
      setPurchasesLoading(true);

      setPurchases(
        await fetchPurchases(
          isArabic ? "ar" : "en",
          { animalId: petId }
        )
      );
    } catch (error) {
      console.error(
        "Unable to load pet purchases:",
        error
      );
    } finally {
      setPurchasesLoading(false);
    }

  }, [petId, isArabic]);

  useFocusEffect(
    useCallback(() => {
      void loadPurchases();
    }, [loadPurchases])
  );

  /*
   * Plan shown on the card: active > paid > pending,
   * otherwise the most recent finished one (to renew it).
   */
  const currentPurchase =
    useMemo<PurchaseSummary | null>(() => {

      const byPriority = ["active", "paid", "pending"];

      for (const status of byPriority) {
        const found = purchases.find(
          purchase => purchase.status === status
        );

        if (found) {
          return found;
        }
      }

      return purchases.find(
        purchase =>
          purchase.status === "completed" ||
          purchase.status === "expired"
      ) ?? null;

    }, [purchases]);

  const openPlans = () =>
    router.push({
      pathname: "/plans",
      params: petId ? { animalId: String(petId) } : {},
    });

  const openPurchase = (purchase: PurchaseSummary) =>
    router.push({
      pathname: "/purchase",
      params: { id: String(purchase.id) },
    });

  /*
  |--------------------------------------------------------------------------
  | LOAD / RECOVER PET
  |--------------------------------------------------------------------------
  |
  | The old version displayed an infinite spinner whenever the pet was not
  | already present in subscription.animals. We now perform one explicit
  | refresh and then show a real not-found state instead of spinning forever.
  |
  */

  const [
    petLookupFinished,
    setPetLookupFinished,
  ] = useState(false);

  useEffect(() => {

    let mounted = true;

    const recoverPet = async () => {

      if (!isEditing) {
        if (mounted) {
          setPetLookupFinished(true);
        }
        return;
      }

      if (existingPet) {
        if (mounted) {
          setPetLookupFinished(true);
        }
        return;
      }

      try {
        await refresh();
      } catch (error) {
        console.error(
          "Unable to refresh pet data:",
          error
        );
      } finally {
        if (mounted) {
          setPetLookupFinished(true);
        }
      }

    };

    void recoverPet();

    return () => {
      mounted = false;
    };

  }, [
    isEditing,
    petId,
    existingPet,
    refresh,
  ]);

  /*
  |--------------------------------------------------------------------------
  | EDIT MODAL
  |--------------------------------------------------------------------------
  */

  const [
    editVisible,
    setEditVisible,
  ] = useState(!isEditing);

  /*
  |--------------------------------------------------------------------------
  | FORM STATE
  |--------------------------------------------------------------------------
  */

  const [
    species,
    setSpecies,
  ] = useState<"Cat" | "Dog">("Cat");

  const [
    breedSize,
    setBreedSize,
  ] = useState<"Small" | "Medium" | "Large" | "">("");

  const [
    name,
    setName,
  ] = useState("");

  const [
    breed,
    setBreed,
  ] = useState("");

  const [
    ageYears,
    setAgeYears,
  ] = useState("");

  const [
    weight,
    setWeight,
  ] = useState("");

  const [
    sex,
    setSex,
  ] = useState("");

  const [
    allergies,
    setAllergies,
  ] = useState("");

  const [
    preferences,
    setPreferences,
  ] = useState("");

  const [
    healthNotes,
    setHealthNotes,
  ] = useState("");

  const [
    localPhotoUri,
    setLocalPhotoUri,
  ] = useState<string | null>(
    null
  );

  const [
    removeExistingPhoto,
    setRemoveExistingPhoto,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD PET DATA
  |--------------------------------------------------------------------------
  */

  const loadFormData = () => {

    if (!existingPet) {
      return;
    }

    setSpecies(
      existingPet.species === "Dog" ? "Dog" : "Cat"
    );

    setBreedSize(
      existingPet.breed_size_category === "Small" ||
      existingPet.breed_size_category === "Medium" ||
      existingPet.breed_size_category === "Large"
        ? existingPet.breed_size_category
        : ""
    );

    setName(
      existingPet.name || ""
    );

    setBreed(existingPet.breed || "");

    /*
     * If the API doesn't yet provide age_years,
     * we fall back to the existing age field.
     */

    setAgeYears(
      existingPet.age_years != null
        ? String(existingPet.age_years)
        : existingPet.age
          ? String(existingPet.age)
          : ""
    );

    setWeight(
      existingPet.weight_kg != null
        ? String(existingPet.weight_kg)
        : existingPet.weight != null
          ? String(existingPet.weight)
          : ""
    );

    setSex(
      existingPet.sex ||
      existingPet.gender ||
      ""
    );

    const petAllergies =
      existingPet.allergies;

    setAllergies(
      Array.isArray(petAllergies)
        ? petAllergies.join(", ")
        : petAllergies || ""
    );

    setPreferences(
      existingPet.preferences || ""
    );

    setHealthNotes(
      existingPet.health_notes ||
      existingPet.note ||
      ""
    );

    setLocalPhotoUri(null);
    setRemoveExistingPhoto(false);

  };

  useEffect(() => {

    loadFormData();

  }, [existingPet]);

  /*
  |--------------------------------------------------------------------------
  | PHOTO
  |--------------------------------------------------------------------------
  */

  const displayedPhoto =
    removeExistingPhoto
      ? null
      : (
          localPhotoUri ||
          existingPet?.photo_url ||
          null
        );

  const openGallery =
    async () => {

      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {

        Alert.alert(
          "",
          t.photoPermission
        );

        return;
      }

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (
        !result.canceled &&
        result.assets.length > 0
      ) {

        setLocalPhotoUri(
          result.assets[0].uri
        );

        setRemoveExistingPhoto(
          false
        );

      }

    };

  const openCamera =
    async () => {

      const permission =
        await ImagePicker
          .requestCameraPermissionsAsync();

      if (!permission.granted) {

        Alert.alert(
          "",
          t.cameraPermission
        );

        return;
      }

      const result =
        await ImagePicker
          .launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (
        !result.canceled &&
        result.assets.length > 0
      ) {

        setLocalPhotoUri(
          result.assets[0].uri
        );

        setRemoveExistingPhoto(
          false
        );

      }

    };

  const removePhoto = () => {

    setLocalPhotoUri(null);

    setRemoveExistingPhoto(
      true
    );

  };

  const selectPhoto = () => {

    const buttons: any[] = [

      {
        text: t.takePhoto,

        onPress: () =>
          void openCamera(),
      },

      {
        text: t.chooseGallery,

        onPress: () =>
          void openGallery(),
      },

    ];

    if (displayedPhoto) {

      buttons.push({

        text: t.removePhoto,

        style: "destructive",

        onPress: removePhoto,

      });

    }

    buttons.push({

      text: t.cancel,

      style: "cancel",

    });

    Alert.alert(
      t.changePicture,
      "",
      buttons
    );

  };

  /*
  |--------------------------------------------------------------------------
  | OPEN / CLOSE EDIT PROFILE
  |--------------------------------------------------------------------------
  */

  const openEditProfile = () => {

    loadFormData();

    setEditVisible(true);

  };

  /*
  | Back always returns to the Pets tab
  | (router.back() inside Tabs goes to the Home tab)
  */
  const goBackToPets = () => {
    router.navigate("/(tabs)/pets");
  };

  const closeEditProfile = () => {
    if (saving) {
      return;
    }

    setEditVisible(false);

    if (!isEditing) {
      goBackToPets();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */

  const savePet =
    async () => {

      if (saving) {
        return;
      }

      if (!name.trim()) {

        Alert.alert(
          "",
          t.requiredName
        );

        return;
      }

      try {

        setSaving(true);

        const payload = {
          name: name.trim(),
          species,
          breed_size_category: species === "Dog" ? breedSize || null : null,
          age: ageYears.trim() || null,
          health_status: existingPet?.health_status || null,
          note: healthNotes.trim() || null,
          photoUri: localPhotoUri,
          remove_photo: removeExistingPhoto,
          breed: breed.trim() || null,
          weight_kg: weight.trim().replace(",", ".") || null,
          sex: sex || null,
          allergies: allergies.trim() || null,
          preferences: preferences.trim() || null,
        };

        if (
          isEditing &&
          petId
        ) {

          await updatePet(
            petId,
            payload
          );

        } else {

          await createPet(
            payload
          );

        }

        await refresh();

        setEditVisible(false);

        Alert.alert(
          isArabic ? "تم بنجاح" : "Success",
          isEditing ? t.successUpdated : t.successCreated
        );

        if (!isEditing) {
          router.replace("/(tabs)/pets");
        }

      } catch (error) {

        console.error(
          "Save pet error:",
          error
        );

        Alert.alert(

          "",

          error instanceof Error
            ? error.message
            : t.error

        );

      } finally {

        setSaving(false);

      }

    };

  /*
  |--------------------------------------------------------------------------
  | NOT FOUND / LOADING
  |--------------------------------------------------------------------------
  */

  if (
    isEditing &&
    !existingPet &&
    (!petLookupFinished || loading)
  ) {

    return (
      <>

        <SafeAreaView
          edges={["left", "right"]}
          style={styles.safeArea}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (
    isEditing &&
    !existingPet &&
    petLookupFinished
  ) {

    return (
      <>

        <SafeAreaView
          edges={["left", "right"]}
          style={styles.safeArea}
        >
          <View
            style={[
              styles.loadingContainer,
              {
                paddingHorizontal: 28,
                backgroundColor: COLORS.background,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="cat"
              size={54}
              color={COLORS.primary}
            />

            <Text
              style={[
                styles.profileName,
                {
                  marginTop: 18,
                  textAlign: "center",
                },
              ]}
            >
              {isArabic
                ? "تعذر العثور على الحيوان"
                : "Pet not found"}
            </Text>

            <Text
              style={{
                marginTop: 10,
                color: COLORS.muted,
                textAlign: "center",
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {isArabic
                ? "تعذر تحميل بيانات هذا الحيوان. ارجع إلى قائمة الحيوانات وحاول مرة أخرى."
                : "We couldn't load this pet's data. Go back to My Pets and try again."}
            </Text>

            <Pressable
              style={[
                styles.primarySimpleButton,
                { marginTop: 24 },
              ]}
              onPress={() => router.push("/(tabs)/pets")}
            >
              <Ionicons
                name={isArabic ? "arrow-forward" : "arrow-back"}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.primarySimpleButtonText}>
                {t.back}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ADD PET MODE
  |--------------------------------------------------------------------------
  | Opening /pet-form without an id immediately shows the same profile form
  | used by Edit Profile. Saving calls createPet() instead of updatePet().
  |
  */

  if (!isEditing) {
    return (
      <>

        <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
          <EditProfileModal
            visible={editVisible}
            bottomInset={insets.bottom}
            t={t}
            isArabic={isArabic}
            isEditing={false}
            existingPet={null}
            displayedPhoto={displayedPhoto}
            species={species}
            setSpecies={setSpecies}
            breedSize={breedSize}
            setBreedSize={setBreedSize}
            name={name}
            setName={setName}
            breed={breed}
            setBreed={setBreed}
            ageYears={ageYears}
            setAgeYears={setAgeYears}
            weight={weight}
            setWeight={setWeight}
            sex={sex}
            setSex={setSex}
            allergies={allergies}
            setAllergies={setAllergies}
            preferences={preferences}
            setPreferences={setPreferences}
            healthNotes={healthNotes}
            setHealthNotes={setHealthNotes}
            saving={saving}
            onClose={closeEditProfile}
            onPhoto={selectPhoto}
            onSave={savePet}
          />
        </SafeAreaView>
      </>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PROFILE DATA
  |--------------------------------------------------------------------------
  */

  /*
   * Empty fields are not displayed (null = hidden)
   * to keep the profile page light.
   */

  const filled = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
  };

  const displayBreed =
    filled(existingPet?.breed) ??
    filled(existingPet?.breed_size_category);

  const rawSex =
    filled(existingPet?.sex) ??
    filled(existingPet?.gender);

  const displaySex =
    rawSex === "Male"
      ? t.male
      : rawSex === "Female"
        ? t.female
        : rawSex;

  const rawAge = filled(existingPet?.age);

  const displayAge =
    rawAge
      ? t.ageLabels[rawAge] ?? rawAge
      : null;

  const rawWeight =
    filled(existingPet?.weight_kg) ??
    filled(existingPet?.weight);

  const displayWeight =
    rawWeight
      ? `${rawWeight} kg`
      : null;

  const allergyList =
    Array.isArray(
      existingPet?.allergies
    )
      ? existingPet?.allergies
      : existingPet?.allergies
        ? String(
            existingPet.allergies
          )
            .split(",")
            .map(item =>
              item.trim()
            )
            .filter(Boolean)
        : [];

  const displayPreferences =
    filled(existingPet?.preferences);

  const displayHealthNotes =
    filled(existingPet?.health_notes) ??
    filled(existingPet?.note);

  // Rows of the information table that have a value
  const infoRows = [
    allergyList.length > 0 ? "allergies" : null,
    displayPreferences ? "preferences" : null,
    displayHealthNotes ? "healthNotes" : null,
  ].filter(Boolean) as string[];

  const lastInfoRow = infoRows[infoRows.length - 1];

  /*
  |--------------------------------------------------------------------------
  | PROFILE UI
  |--------------------------------------------------------------------------
  */

  return (

    <>

      <SafeAreaView
        edges={[
          "left",
          "right",
        ]}
        style={styles.safeArea}
      >

      <ScrollView

        style={
          styles.flex
        }

        contentContainerStyle={
          styles.profilePage
        }

        showsVerticalScrollIndicator={
          false
        }

      >

        {/*
        |--------------------------------------------------------------------------
        | BACK / EDIT
        |--------------------------------------------------------------------------
        */}

        <View
          style={[
            styles.profileActions,

            isArabic &&
              styles.rowRtl,
          ]}
        >

          <Pressable
            style={[
              styles.topAction,

              isArabic &&
                styles.rowRtl,
            ]}
            onPress={goBackToPets}
          >

            <Ionicons
              name={
                isArabic
                  ? "arrow-forward"
                  : "arrow-back"
              }
              size={20}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.topActionText
              }
            >
              {t.back}
            </Text>

          </Pressable>

          <Pressable
            style={[
              styles.topAction,

              isArabic &&
                styles.rowRtl,
            ]}
            onPress={
              openEditProfile
            }
          >

            <Ionicons
              name="pencil-outline"
              size={20}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.topActionText
              }
            >
              {t.editProfile}
            </Text>

          </Pressable>

        </View>

        {/*
        |--------------------------------------------------------------------------
        | PROFILE HERO
        |--------------------------------------------------------------------------
        */}

        <View
          style={[
            styles.profileHero,

            isArabic &&
              styles.rowRtl,
          ]}
        >

          <View
            style={
              styles.profileImage
            }
          >

            {existingPet?.photo_url ? (

              <Image
                source={{
                  uri:
                    existingPet.photo_url,
                }}
                style={
                  styles.fillImage
                }
              />

            ) : (

              <MaterialCommunityIcons
                name="cat"
                size={52}
                color={
                  COLORS.primary
                }
              />

            )}

          </View>

          <View
            style={
              styles.profileHeroInfo
            }
          >

            {!!displayBreed && (
              <Text
                style={[
                  styles.profileBreed,

                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {displayBreed}
              </Text>
            )}

            <Text
              style={[
                styles.profileName,

                isArabic &&
                  styles.textRtl,
              ]}
            >
              {
                existingPet?.name ||
                t.unknown
              }
            </Text>

            {!!displaySex && (
              <Text
                style={[
                  styles.profileSex,

                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {displaySex}
              </Text>
            )}

            {(!!displayAge || !!displayWeight) && (
            <View
              style={[
                styles.ageWeightRow,

                isArabic &&
                  styles.rowRtl,
              ]}
            >

              {!!displayAge && (
                <Text
                  style={
                    styles.ageWeightText
                  }
                >
                  {displayAge}
                </Text>
              )}

              {!!displayWeight && (
                <>
                  {!!displayAge && (
                    <View
                      style={
                        styles.verticalDivider
                      }
                    />
                  )}

                  <Text
                    style={
                      styles.ageWeightText
                    }
                  >
                    {displayWeight}
                  </Text>
                </>
              )}

            </View>
            )}

          </View>

        </View>

        {/*
        |--------------------------------------------------------------------------
        | PROFILE INFORMATION
        |--------------------------------------------------------------------------
        */}

        {infoRows.length > 0 && (
          <View
            style={
              styles.infoTable
            }
          >

            {allergyList.length > 0 && (
              <InfoRow
                label={t.allergies}
                isArabic={isArabic}
                last={lastInfoRow === "allergies"}
              >
                <View
                  style={
                    styles.allergyContainer
                  }
                >
                  {allergyList.map(
                    (
                      allergy,
                      index
                    ) => (
                      <View
                        key={`${allergy}-${index}`}
                        style={
                          styles.allergyItem
                        }
                      >
                        <View
                          style={
                            styles.allergyDot
                          }
                        />

                        <Text
                          style={
                            styles.infoValue
                          }
                        >
                          {allergy}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </InfoRow>
            )}

            {!!displayPreferences && (
              <InfoRow
                label={t.preferences}
                isArabic={isArabic}
                last={lastInfoRow === "preferences"}
              >
                <Text
                  style={[
                    styles.infoValue,

                    isArabic &&
                      styles.textRtl,
                  ]}
                >
                  {displayPreferences}
                </Text>
              </InfoRow>
            )}

            {!!displayHealthNotes && (
              <InfoRow
                label={t.healthNotes}
                isArabic={isArabic}
                last={lastInfoRow === "healthNotes"}
              >
                <Text
                  style={[
                    styles.healthNotes,

                    isArabic &&
                      styles.textRtl,
                  ]}
                >
                  {displayHealthNotes}
                </Text>
              </InfoRow>
            )}

          </View>
        )}

        {/*
        |--------------------------------------------------------------------------
        | LINKS
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.profileLinks
          }
        >

          <ProfileLink
            icon="calendar-clear-outline"
            title={
              t.deliveryCalendar
            }
            isArabic={
              isArabic
            }
            onPress={() =>
              router.push({
                pathname: "/delivery-calendar",
                params: { animalId: String(petId) },
              })
            }
          />

          <ProfileLink
            customIcon="creation-outline"
            title={
              t.transitionGuide
            }
            isArabic={
              isArabic
            }
            onPress={() =>
              router.push("/help_knowledge-base")
            }
          />

          <ProfileLink
            icon="time-outline"
            title={
              t.deliveryHistory
            }
            isArabic={
              isArabic
            }
            onPress={() =>
              router.push({
                pathname: "/delivery-history",
                params: { animalId: String(petId) },
              })
            }
          />

        </View>

        {/*
        |--------------------------------------------------------------------------
        | SUBSCRIPTION CARD (current plan of the pet)
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.subscriptionWrapper
          }
        >

          {purchasesLoading && !currentPurchase ? (

            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={{ marginVertical: 30 }}
            />

          ) : currentPurchase ? (

            <SubscriptionCard
              purchase={currentPurchase}
              isArabic={isArabic}
              onOpen={() =>
                openPurchase(currentPurchase)
              }
              onPlan={() =>
                router.push({
                  pathname: "/distribute-package",
                  params: { id: String(currentPurchase.id) },
                })
              }
              onUploadReceipt={() =>
                openPurchase(currentPurchase)
              }
              onRenew={
                currentPurchase.status === "pending"
                  ? undefined
                  : openPlans
              }
              onCancel={() =>
                openPurchase(currentPurchase)
              }
            />

          ) : (

            <View
              style={
                styles.subscriptionCard
              }
            >

              <Text
                style={[
                  styles.subscriptionStatusLabel,

                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {t.subscriptionStatus}
              </Text>

              <Text
                style={[
                  styles.subscriptionTitle,

                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {t.noPlanTitle}
              </Text>

              <Text
                style={[
                  styles.cycleText,
                  { marginTop: 10 },

                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {t.noPlanText}
              </Text>

              <Pressable
                style={[
                  styles.renewButton,
                  { marginTop: 24 },

                  isArabic &&
                    styles.rowRtl,
                ]}
                onPress={openPlans}
              >

                <MaterialCommunityIcons
                  name="creation-outline"
                  size={24}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.renewButtonText
                  }
                >
                  {t.choosePlan}
                </Text>

              </Pressable>

            </View>

          )}

          {/*
           * Other plans of this pet (previous / waiting ones)
           */}

          {purchases.filter(
            purchase =>
              purchase.id !== currentPurchase?.id
          ).length > 0 && (

            <View
              style={
                styles.otherPlans
              }
            >

              <Text
                style={[
                  styles.otherPlansTitle,

                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {t.planHistory}
              </Text>

              {purchases
                .filter(
                  purchase =>
                    purchase.id !== currentPurchase?.id
                )
                .map(purchase => (

                  <Pressable
                    key={purchase.id}
                    onPress={() =>
                      openPurchase(purchase)
                    }
                    style={[
                      styles.otherPlanRow,

                      isArabic &&
                        styles.rowRtl,
                    ]}
                  >

                    <Text
                      style={[
                        styles.otherPlanName,

                        isArabic &&
                          styles.textRtl,
                      ]}
                      numberOfLines={1}
                    >
                      {purchase.product.name}
                    </Text>

                    <Text
                      style={
                        styles.otherPlanStatus
                      }
                    >
                      {purchase.status_label}
                    </Text>

                  </Pressable>

                ))}

            </View>

          )}

        </View>

      </ScrollView>

      {/*
      |--------------------------------------------------------------------------
      | EDIT PROFILE POPUP
      |--------------------------------------------------------------------------
      */}

      <EditProfileModal
        visible={
          editVisible
        }
        bottomInset={
          insets.bottom
        }
        t={t}
        isArabic={
          isArabic
        }
        isEditing={true}
        species={species}
        setSpecies={setSpecies}
        breedSize={breedSize}
        setBreedSize={setBreedSize}
        existingPet={
          existingPet
        }
        displayedPhoto={
          displayedPhoto
        }
        name={name}
        setName={setName}
        breed={breed}
        setBreed={setBreed}
        ageYears={
          ageYears
        }
        setAgeYears={
          setAgeYears
        }
        weight={
          weight
        }
        setWeight={
          setWeight
        }
        sex={sex}
        setSex={setSex}
        allergies={
          allergies
        }
        setAllergies={
          setAllergies
        }
        preferences={
          preferences
        }
        setPreferences={
          setPreferences
        }
        healthNotes={
          healthNotes
        }
        setHealthNotes={
          setHealthNotes
        }
        saving={
          saving
        }
        onClose={
          closeEditProfile
        }
        onPhoto={
          selectPhoto
        }
        onSave={
          savePet
        }
      />

      </SafeAreaView>
    </>

  );

}

/*
|--------------------------------------------------------------------------
| EDIT PROFILE MODAL
|--------------------------------------------------------------------------
*/

function EditProfileModal({
  visible,
  bottomInset,
  t,
  isArabic,
  isEditing,
  existingPet,
  species,
  setSpecies,
  breedSize,
  setBreedSize,
  displayedPhoto,

  name,
  setName,

  breed,
  setBreed,

  ageYears,
  setAgeYears,

  weight,
  setWeight,

  sex,
  setSex,

  allergies,
  setAllergies,

  preferences,
  setPreferences,

  healthNotes,
  setHealthNotes,

  saving,

  onClose,
  onPhoto,
  onSave,
}: any) {

  return (

    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={
        onClose
      }
    >

      <KeyboardAvoidingView
        style={
          styles.modalKeyboard
        }
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >

        <View
          style={
            styles.modalOverlay
          }
        >

          <View
            style={
              styles.modalCard
            }
          >

            {/*
            |--------------------------------------------------------------------------
            | CLOSE
            |--------------------------------------------------------------------------
            */}

            <Pressable
              onPress={
                onClose
              }
              style={
                styles.modalClose
              }
            >

              <Ionicons
                name="close"
                size={27}
                color={
                  COLORS.muted
                }
              />

            </Pressable>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={[
                styles.modalContent,

                {
                  paddingBottom:
                    Math.max(
                      bottomInset,
                      20
                    ) + 20,
                },
              ]}
            >

              <Text
                style={[
                  styles.modalTitle,

                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {isEditing ? t.editTitle : t.addTitle}
              </Text>

              {/*
              |--------------------------------------------------------------------------
              | PHOTO
              |--------------------------------------------------------------------------
              */}

              <View
                style={[
                  styles.modalPhotoRow,

                  isArabic &&
                    styles.rowRtl,
                ]}
              >

                <View
                  style={
                    styles.modalAvatar
                  }
                >

                  {displayedPhoto ? (

                    <Image
                      source={{
                        uri:
                          displayedPhoto,
                      }}
                      style={
                        styles.fillImage
                      }
                    />

                  ) : (

                    <MaterialCommunityIcons
                      name="cat"
                      size={40}
                      color={
                        COLORS.primary
                      }
                    />

                  )}

                </View>

                <View
                  style={
                    styles.changePhotoContainer
                  }
                >

                  <Pressable
                    style={[
                      styles.changePhotoButton,

                      isArabic &&
                        styles.rowRtl,
                    ]}
                    onPress={
                      onPhoto
                    }
                  >

                    <Ionicons
                      name="pencil-outline"
                      size={22}
                      color={
                        COLORS.text
                      }
                    />

                    <Text
                      style={
                        styles.changePhotoText
                      }
                    >
                      {
                        t.changePicture
                      }
                    </Text>

                  </Pressable>

                  <Text
                    style={[
                      styles.pictureHint,

                      isArabic &&
                        styles.textRtl,
                    ]}
                  >
                    {t.pictureHint}
                  </Text>

                </View>

              </View>

              <View
                style={
                  styles.modalDivider
                }
              />

              {true && (
                <>
                  <FormLabel text={t.species} rtl={isArabic} />
                  <SimpleSelect
                    value={species}
                    rtl={isArabic}
                    placeholder={t.select}
                    options={[
                      { value: "Cat", label: t.cat },
                      { value: "Dog", label: t.dog },
                    ]}
                    onChange={(value: "Cat" | "Dog") => {
                      setSpecies(value);
                      if (value !== "Dog") {
                        setBreedSize("");
                      }
                      // Kitten <-> Puppy: clear an age that does not exist for the new species
                      if (ageYears && !AGE_VALUES[value].includes(ageYears)) {
                        setAgeYears("");
                      }
                    }}
                  />

                  {species === "Dog" && (
                    <>
                      <FormLabel text={t.dogSize} rtl={isArabic} />
                      <SimpleSelect
                        value={breedSize}
                        rtl={isArabic}
                        placeholder={t.select}
                        options={[
                          { value: "Small", label: t.small },
                          { value: "Medium", label: t.medium },
                          { value: "Large", label: t.large },
                        ]}
                        onChange={setBreedSize}
                      />
                    </>
                  )}
                </>
              )}

              {/*
              |--------------------------------------------------------------------------
              | NAME
              |--------------------------------------------------------------------------
              */}

              <FormLabel
                text={t.name}
                rtl={isArabic}
              />

              <TextInput
                value={name}
                onChangeText={
                  setName
                }
                style={[
                  styles.modalInput,

                  isArabic &&
                    styles.inputRtl,
                ]}
              />

              {/*
              |--------------------------------------------------------------------------
              | BREED
              |--------------------------------------------------------------------------
              */}

              <FormLabel
                text={t.breed}
                rtl={isArabic}
              />

              <TextInput
                value={breed}
                onChangeText={
                  setBreed
                }
                style={[
                  styles.modalInput,

                  isArabic &&
                    styles.inputRtl,
                ]}
              />

              {/*
              |--------------------------------------------------------------------------
              | AGE / WEIGHT
              |--------------------------------------------------------------------------
              */}

              <View
                style={[
                  styles.doubleFieldRow,

                  isArabic &&
                    styles.rowRtl,
                ]}
              >

                <View
                  style={
                    styles.halfField
                  }
                >

                  <FormLabel
                    text={
                      t.ageYears
                    }
                    rtl={
                      isArabic
                    }
                  />

                  <SimpleSelect
                    value={ageYears}
                    rtl={isArabic}
                    placeholder={t.select}
                    options={ageOptionsFor(species, t)}
                    onChange={setAgeYears}
                  />

                </View>

                <View
                  style={
                    styles.halfField
                  }
                >

                  <FormLabel
                    text={
                      t.weightKg
                    }
                    rtl={
                      isArabic
                    }
                  />

                  <TextInput
                    value={
                      weight
                    }
                    onChangeText={
                      setWeight
                    }
                    keyboardType="decimal-pad"
                    style={[
                      styles.modalInput,

                      isArabic &&
                        styles.inputRtl,
                    ]}
                  />

                </View>

              </View>

              {/*
              |--------------------------------------------------------------------------
              | SEX
              |--------------------------------------------------------------------------
              */}

              <FormLabel
                text={t.sex}
                rtl={isArabic}
              />

              <SimpleSelect
                value={sex}
                rtl={isArabic}
                placeholder={
                  t.select
                }
                options={[
                  {
                    value: "Male",
                    label: t.male,
                  },
                  {
                    value: "Female",
                    label: t.female,
                  },
                ]}
                onChange={
                  setSex
                }
              />

              {/*
              |--------------------------------------------------------------------------
              | ALLERGIES
              |--------------------------------------------------------------------------
              */}

              <FormLabel
                text={
                  t.allergies
                }
                rtl={
                  isArabic
                }
              />

              <TextInput
                value={
                  allergies
                }
                onChangeText={
                  setAllergies
                }
                style={[
                  styles.modalInput,

                  isArabic &&
                    styles.inputRtl,
                ]}
              />

              {/*
              |--------------------------------------------------------------------------
              | PREFERENCES
              |--------------------------------------------------------------------------
              */}

              <FormLabel
                text={
                  t.preferences
                }
                rtl={
                  isArabic
                }
              />

              <TextInput
                value={
                  preferences
                }
                onChangeText={
                  setPreferences
                }
                style={[
                  styles.modalInput,

                  isArabic &&
                    styles.inputRtl,
                ]}
              />

              {/*
              |--------------------------------------------------------------------------
              | HEALTH NOTES
              |--------------------------------------------------------------------------
              */}

              <FormLabel
                text={
                  t.healthNotes
                }
                rtl={
                  isArabic
                }
              />

              <TextInput
                value={
                  healthNotes
                }
                onChangeText={
                  setHealthNotes
                }
                multiline
                textAlignVertical="top"
                style={[
                  styles.modalInput,
                  styles.modalTextarea,

                  isArabic &&
                    styles.inputRtl,
                ]}
              />

              {/*
              |--------------------------------------------------------------------------
              | SAVE
              |--------------------------------------------------------------------------
              */}

              <Pressable
                onPress={
                  onSave
                }
                disabled={
                  saving
                }
                style={[
                  styles.saveButton,

                  saving &&
                    styles.disabled,
                ]}
              >

                {saving ? (

                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                ) : (

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {
                      isEditing ? t.saveChanges : t.addPet
                    }
                  </Text>

                )}

              </Pressable>

            </ScrollView>

          </View>

        </View>

      </KeyboardAvoidingView>

    </Modal>

  );

}

/*
|--------------------------------------------------------------------------
| INFO ROW
|--------------------------------------------------------------------------
*/

function InfoRow({
  label,
  children,
  isArabic,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  isArabic: boolean;
  last?: boolean;
}) {

  return (

    <View
      style={[
        styles.infoRow,

        !last &&
          styles.infoRowBorder,

        isArabic &&
          styles.rowRtl,
      ]}
    >

      <Text
        style={[
          styles.infoLabel,

          isArabic &&
            styles.textRtl,
        ]}
      >
        {label}
      </Text>

      <View
        style={
          styles.infoContent
        }
      >
        {children}
      </View>

    </View>

  );

}

/*
|--------------------------------------------------------------------------
| PROFILE LINK
|--------------------------------------------------------------------------
*/

function ProfileLink({
  title,
  icon,
  customIcon,
  isArabic,
  onPress,
}: {
  onPress?: () => void;
  title: string;
  icon?: React.ComponentProps<
    typeof Ionicons
  >["name"];
  customIcon?: React.ComponentProps<
    typeof MaterialCommunityIcons
  >["name"];
  isArabic: boolean;
}) {

  return (

    <Pressable
      onPress={onPress}
      style={[
        styles.profileLink,

        isArabic &&
          styles.rowRtl,
      ]}
    >

      <View
        style={[
          styles.profileLinkLeft,

          isArabic &&
            styles.rowRtl,
        ]}
      >

        {customIcon ? (

          <MaterialCommunityIcons
            name={customIcon}
            size={24}
            color={
              COLORS.primary
            }
          />

        ) : (

          <Ionicons
            name={
              icon ||
              "arrow-forward"
            }
            size={23}
            color={
              COLORS.primary
            }
          />

        )}

        <Text
          style={
            styles.profileLinkText
          }
        >
          {title}
        </Text>

      </View>

      <Ionicons
        name={
          isArabic
            ? "arrow-back"
            : "arrow-forward"
        }
        size={19}
        color={
          COLORS.muted
        }
      />

    </Pressable>

  );

}

/*
|--------------------------------------------------------------------------
| FORM LABEL
|--------------------------------------------------------------------------
*/

function FormLabel({
  text,
  rtl,
}: {
  text: string;
  rtl: boolean;
}) {

  return (

    <Text
      style={[
        styles.formLabel,

        rtl &&
          styles.textRtl,
      ]}
    >
      {text}
    </Text>

  );

}

/*
|--------------------------------------------------------------------------
| SIMPLE SELECT
|--------------------------------------------------------------------------
*/

function SimpleSelect({
  value,
  options,
  onChange,
  placeholder,
  rtl,
}: {
  value: string;
  options: {
    value: string;
    label: string;
  }[];
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  rtl: boolean;
}) {

  const [
    visible,
    setVisible,
  ] = useState(false);

  const label =
    options.find(
      option =>
        option.value
        .toLowerCase() ===
        value
          ?.toLowerCase()
    )?.label ||
    value ||
    placeholder;

  return (
    <>

      <Pressable
        style={
          styles.modalSelect
        }
        onPress={() =>
          setVisible(true)
        }
      >

        <Text
          style={[
            styles.modalSelectText,

            rtl &&
              styles.textRtl,
          ]}
        >
          {label}
        </Text>

        <Ionicons
          name="chevron-down"
          size={19}
          color={
            COLORS.text
          }
        />

      </Pressable>

      <Modal
        transparent
        visible={
          visible
        }
        animationType="fade"
        onRequestClose={() =>
          setVisible(false)
        }
      >

        <Pressable
          style={
            styles.selectOverlay
          }
          onPress={() =>
            setVisible(false)
          }
        >

          <View
            style={
              styles.selectBox
            }
          >

            {options.map(
              option => (

                <Pressable
                  key={
                    option.value
                  }
                  style={
                    styles.selectOption
                  }
                  onPress={() => {

                    onChange(
                      option.value
                    );

                    setVisible(
                      false
                    );

                  }}
                >

                  <Text
                    style={
                      styles.selectOptionText
                    }
                  >
                    {option.label}
                  </Text>

                </Pressable>

              )
            )}

          </View>

        </Pressable>

      </Modal>

    </>
  );

}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    topSafeArea: {
      backgroundColor: "#000000",
    },

    flex: {
      flex: 1,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    loadingContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      padding: 30,
    },

    /*
    |--------------------------------------------------------------------------
    | PROFILE PAGE
    |--------------------------------------------------------------------------
    */

    profilePage: {
      paddingHorizontal: 22,

      paddingTop: 34,

      paddingBottom: 55,
    },

    profileActions: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginBottom: 47,
    },

    topAction: {
      flexDirection: "row",

      alignItems: "center",

      gap: 9,
    },

    topActionText: {
      fontFamily:
        "Cairo_700Bold",

      fontSize: 15,

      color:
        COLORS.text,
    },

    /*
    |--------------------------------------------------------------------------
    | HERO
    |--------------------------------------------------------------------------
    */

    profileHero: {
      flexDirection: "row",

      alignItems: "center",

      gap: 22,

      marginBottom: 40,
    },

    profileImage: {
      width: 155,

      height: 185,

      borderRadius: 78,

      borderBottomLeftRadius: 4,

      borderBottomRightRadius: 4,

      overflow: "hidden",

      backgroundColor:
        COLORS.primaryLight,

      alignItems: "center",

      justifyContent:
        "center",
    },

    fillImage: {
      width: "100%",
      height: "100%",
    },

    profileHeroInfo: {
      flex: 1,
      minWidth: 0,
    },

    profileBreed: {
      fontFamily:
        "Cairo_600SemiBold",

      fontSize: 12,

      color:
        COLORS.muted,

      marginBottom: 8,
    },

    profileName: {
      fontFamily:
        "Cairo_800ExtraBold",

      fontSize: 42,

      lineHeight: 50,

      color:
        COLORS.text,
    },

    profileSex: {
      marginTop: 13,

      fontFamily:
        "Cairo_400Regular",

      fontSize: 15,

      color:
        COLORS.muted,
    },

    ageWeightRow: {
      flexDirection: "row",

      alignItems: "center",

      marginTop: 17,

      gap: 12,
    },

    ageWeightText: {
      fontFamily:
        "Cairo_400Regular",

      fontSize: 14,

      color:
        COLORS.text,
    },

    verticalDivider: {
      width: 1,

      height: 25,

      backgroundColor:
        COLORS.border,
    },

    /*
    |--------------------------------------------------------------------------
    | INFO TABLE
    |--------------------------------------------------------------------------
    */

    infoTable: {
      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,
    },

    infoRow: {
      flexDirection: "row",

      paddingVertical: 21,

      minHeight: 67,
    },

    infoRowBorder: {
      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,
    },

    infoLabel: {
      width: 125,

      paddingRight: 14,

      fontFamily:
        "Cairo_400Regular",

      fontSize: 13,

      color:
        COLORS.muted,
    },

    infoContent: {
      flex: 1,
    },

    infoValue: {
      fontFamily:
        "Cairo_400Regular",

      fontSize: 14,

      lineHeight: 24,

      color:
        COLORS.text,
    },

    healthNotes: {
      fontFamily:
        "Cairo_400Regular",

      fontStyle: "italic",

      fontSize: 15,

      lineHeight: 26,

      color:
        COLORS.muted,
    },

    allergyContainer: {
      flexDirection: "row",

      flexWrap: "wrap",

      gap: 10,
    },

    allergyItem: {
      flexDirection: "row",

      alignItems: "center",

      gap: 7,
    },

    allergyDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor:
        COLORS.danger,
    },

    /*
    |--------------------------------------------------------------------------
    | LINKS
    |--------------------------------------------------------------------------
    */

    profileLinks: {
      marginTop: 30,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,
    },

    profileLink: {
      minHeight: 66,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,
    },

    profileLinkLeft: {
      flexDirection: "row",

      alignItems: "center",

      gap: 16,

      flex: 1,
    },

    profileLinkText: {
      fontFamily:
        "Cairo_500Medium",

      fontSize: 15,

      color:
        COLORS.text,
    },

    /*
    |--------------------------------------------------------------------------
    | SUBSCRIPTION
    |--------------------------------------------------------------------------
    */

    subscriptionWrapper: {
      marginTop: 41,
    },

    otherPlans: {
      marginTop: 24,
    },

    otherPlansTitle: {
      fontFamily:
        "Cairo_700Bold",

      fontSize: 13,

      color:
        COLORS.muted,

      marginBottom: 6,
    },

    otherPlanRow: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      gap: 12,

      minHeight: 50,

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,
    },

    otherPlanName: {
      flex: 1,

      fontFamily:
        "Cairo_500Medium",

      fontSize: 14,

      color:
        COLORS.text,
    },

    otherPlanStatus: {
      fontFamily:
        "Cairo_400Regular",

      fontSize: 12,

      color:
        COLORS.muted,
    },

    subscriptionCard: {

      borderTopWidth: 3,

      borderTopColor:
        COLORS.primary,

      backgroundColor:
        COLORS.card,

      paddingHorizontal: 25,

      paddingTop: 31,

      paddingBottom: 31,
    },

    subscriptionHeader: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",
    },

    subscriptionStatusLabel: {
      fontFamily:
        "Cairo_700Bold",

      fontSize: 10,

      letterSpacing: 1.5,

      color:
        COLORS.text,
    },

    status: {
      flexDirection: "row",

      alignItems: "center",

      gap: 7,
    },

    statusDot: {
      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        COLORS.primary,
    },

    statusDotInactive: {
      backgroundColor:
        COLORS.muted,
    },

    statusText: {
      fontFamily:
        "Cairo_400Regular",

      fontSize: 12,

      color:
        COLORS.text,
    },

    subscriptionTitle: {
      marginTop: 31,

      fontFamily:
        "Cairo_700Bold",

      fontSize: 29,

      lineHeight: 38,

      color:
        COLORS.text,
    },

    subscriptionStats: {
      flexDirection: "row",

      marginTop: 32,
    },

    statColumn: {
      flex: 1,
    },

    statSeparator: {
      width: 1,

      height: 76,

      marginHorizontal: 20,

      backgroundColor:
        COLORS.border,
    },

    statLabel: {
      fontFamily:
        "Cairo_400Regular",

      fontSize: 12,

      color:
        COLORS.muted,
    },

    statValueRow: {
      marginTop: 10,

      flexDirection: "row",

      alignItems: "baseline",

      gap: 7,
    },

    statValue: {
      fontFamily:
        "Cairo_500Medium",

      fontSize: 37,

      lineHeight: 46,

      color:
        COLORS.text,
    },

    statSuffix: {
      fontFamily:
        "Cairo_500Medium",

      fontSize: 12,

      color:
        COLORS.text,
    },

    subscriptionDivider: {
      height: 1,

      marginTop: 25,

      marginBottom: 20,

      backgroundColor:
        COLORS.border,
    },

    cycleText: {
      fontFamily:
        "Cairo_400Regular",

      fontSize: 13,

      lineHeight: 21,

      color:
        COLORS.muted,
    },

    cycleStrong: {
      fontFamily:
        "Cairo_600SemiBold",

      color:
        COLORS.text,
    },

    editSubscriptionButton: {
      minHeight: 60,

      marginTop: 28,

      borderWidth: 1,

      borderColor:
        "#B7DAD4",

      borderRadius: 10,

      backgroundColor:
        "#E5ECE8",

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      gap: 12,
    },

    editSubscriptionText: {
      fontFamily:
        "Cairo_700Bold",

      fontSize: 14,

      color:
        COLORS.text,
    },

    renewButton: {
      minHeight: 60,

      marginTop: 13,

      borderRadius: 9,

      backgroundColor:
        COLORS.dark,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      gap: 12,
    },

    renewButtonText: {
      fontFamily:
        "Cairo_700Bold",

      fontSize: 14,

      color:
        "#FFFFFF",
    },

    planActions: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginTop: 26,
    },

    planAction: {
      flexDirection: "row",

      alignItems: "center",

      gap: 9,
    },

    planActionText: {
      fontFamily:
        "Cairo_500Medium",

      fontSize: 13,

      color:
        COLORS.text,
    },

    /*
    |--------------------------------------------------------------------------
    | MODAL
    |--------------------------------------------------------------------------
    */

    modalKeyboard: {
      flex: 1,
    },

    modalOverlay: {
      flex: 1,

      backgroundColor:
        COLORS.overlay,

      paddingHorizontal: 24,

      paddingVertical: 23,

      justifyContent:
        "center",
    },

    modalCard: {
      width: "100%",

      maxHeight: "94%",

      maxWidth: 520,

      alignSelf: "center",

      borderRadius: 15,

      overflow: "hidden",

      backgroundColor:
        COLORS.background,
    },

    modalClose: {
      position: "absolute",

      top: 22,

      right: 22,

      zIndex: 20,

      width: 38,

      height: 38,

      alignItems: "center",

      justifyContent:
        "center",
    },

    modalContent: {
      paddingHorizontal: 25,

      paddingTop: 72,
    },

    modalTitle: {
      fontFamily:
        "Cairo_800ExtraBold",

      fontSize: 29,

      lineHeight: 38,

      color:
        COLORS.text,

      marginBottom: 22,
    },

    modalPhotoRow: {
      flexDirection: "row",

      alignItems: "center",

      gap: 23,
    },

    modalAvatar: {
      width: 105,

      height: 115,

      borderRadius: 53,

      borderBottomLeftRadius: 10,

      borderBottomRightRadius: 10,

      overflow: "hidden",

      backgroundColor:
        COLORS.primaryLight,

      alignItems: "center",

      justifyContent:
        "center",

      flexShrink: 0,
    },

    changePhotoContainer: {
      flex: 1,
    },

    changePhotoButton: {
      minHeight: 53,

      paddingHorizontal: 15,

      borderWidth: 1,

      borderColor:
        "#B7DAD4",

      borderRadius: 9,

      backgroundColor:
        "#E8EFEC",

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      gap: 11,
    },

    changePhotoText: {
      fontFamily:
        "Cairo_600SemiBold",

      fontSize: 13,

      color:
        COLORS.text,

      textAlign: "center",
    },

    pictureHint: {
      marginTop: 5,

      fontFamily:
        "Cairo_400Regular",

      fontSize: 10,

      color:
        COLORS.muted,
    },

    modalDivider: {
      height: 1,

      backgroundColor:
        COLORS.border,

      marginTop: 25,

      marginBottom: 14,
    },

    formLabel: {
      marginTop: 14,

      marginBottom: 8,

      fontFamily:
        "Cairo_500Medium",

      fontSize: 14,

      color:
        COLORS.text,
    },

    modalInput: {
      width: "100%",

      minHeight: 62,

      paddingHorizontal: 17,

      paddingVertical: 12,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 8,

      backgroundColor:
        COLORS.inputBackground,

      fontFamily:
        "Cairo_400Regular",

      fontSize: 16,

      color:
        COLORS.text,
    },

    modalTextarea: {
      minHeight: 140,

      paddingTop: 17,
    },

    inputRtl: {
      textAlign: "right",

      writingDirection:
        "rtl",
    },

    doubleFieldRow: {
      flexDirection: "row",

      gap: 12,
    },

    halfField: {
      flex: 1,
    },

    modalSelect: {
      minHeight: 62,

      paddingHorizontal: 17,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 8,

      backgroundColor:
        COLORS.inputBackground,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      gap: 10,
    },

    modalSelectText: {
      flex: 1,

      fontFamily:
        "Cairo_400Regular",

      fontSize: 16,

      color:
        COLORS.text,
    },

    saveButton: {
      minHeight: 59,

      marginTop: 39,

      borderRadius: 9,

      backgroundColor:
        COLORS.dark,

      alignItems: "center",

      justifyContent:
        "center",
    },

    saveButtonText: {
      fontFamily:
        "Cairo_700Bold",

      fontSize: 14,

      color:
        "#FFFFFF",
    },

    disabled: {
      opacity: 0.6,
    },

    /*
    |--------------------------------------------------------------------------
    | SELECT
    |--------------------------------------------------------------------------
    */

    selectOverlay: {
      flex: 1,

      backgroundColor:
        "rgba(0,0,0,0.30)",

      justifyContent:
        "center",

      padding: 28,
    },

    selectBox: {
      backgroundColor:
        COLORS.background,

      borderRadius: 12,

      padding: 8,
    },

    selectOption: {
      minHeight: 52,

      justifyContent:
        "center",

      paddingHorizontal: 15,

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,
    },

    selectOptionText: {
      fontFamily:
        "Cairo_500Medium",

      fontSize: 14,

      color:
        COLORS.text,
    },

    /*
    |--------------------------------------------------------------------------
    | SIMPLE ADD BUTTON
    |--------------------------------------------------------------------------
    */

    primarySimpleButton: {
      marginTop: 20,

      minHeight: 55,

      paddingHorizontal: 25,

      borderRadius: 9,

      backgroundColor:
        COLORS.dark,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      gap: 8,
    },

    primarySimpleButtonText: {
      fontFamily:
        "Cairo_700Bold",

      fontSize: 14,

      color:
        "#FFFFFF",
    },

    /*
    |--------------------------------------------------------------------------
    | RTL
    |--------------------------------------------------------------------------
    */

    rowRtl: {
      flexDirection:
        "row-reverse",
    },

    textRtl: {
      textAlign: "right",

      writingDirection:
        "rtl",
    },

  });