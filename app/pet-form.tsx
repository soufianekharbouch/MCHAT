import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

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
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import * as ImagePicker
  from 'expo-image-picker';

import {
  useAppLanguage,
} from '../hooks/useAppLanguage';

import {
  useCustomerData,
} from '../context/CustomerDataContext';

import {
  createPet,
  updatePet,
} from '../services/customerApi';

import type {
  Pet,
} from '../types/customer';


const COLORS = {
  background: '#F7F4EF',
  primary: '#249B97',
  primaryLight: '#ECF8F7',
  text: '#272727',
  muted: '#77736D',
  white: '#FFFFFF',
  border: '#E5E0D9',
  inputBackground: '#FAF9F7',
  danger: '#B42318',
};


type Species = 'Cat' | 'Dog';

type PetAge =
  | 'Kitten'
  | 'Puppy'
  | 'Adult'
  | 'Senior';

type BreedSize =
  | 'Small'
  | 'Medium'
  | 'Large';


export default function PetFormScreen() {

  const {
    isArabic,
  } = useAppLanguage();


  const {
    subscription,
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
        addTitle: 'إضافة حيوان أليف',
        editTitle: 'تعديل الحيوان الأليف',

        addSubtitle:
          'أدخل معلومات حيوانك الأليف',

        editSubtitle:
          'قم بتحديث معلومات حيوانك الأليف',

        name: 'الاسم',
        namePlaceholder: 'اسم الحيوان',

        species: 'النوع',
        selectSpecies: 'اختر النوع',
        cat: 'قط',
        dog: 'كلب',

        breedSize: 'حجم الكلب',
        small: 'صغير',
        medium: 'متوسط',
        large: 'كبير',

        age: 'العمر',
        selectAge: 'اختر العمر',
        kitten: 'هريرة',
        puppy: 'جرو',
        adult: 'بالغ',
        senior: 'كبير السن',

        health: 'الحالة الصحية',
        healthPlaceholder:
          'مثال: حالة صحية جيدة',

        note: 'ملاحظات',
        notePlaceholder:
          'معلومات إضافية...',

        photo: 'الصورة',
        addPhoto: 'إضافة صورة',
        changePhoto: 'تغيير الصورة',
        takePhoto: 'التقاط صورة',
        chooseGallery: 'اختيار من المعرض',
        removePhoto: 'حذف الصورة',
        cancel: 'إلغاء',
        cameraPermission: 'يجب السماح للتطبيق باستخدام الكاميرا.',

        save: 'حفظ',
        saving: 'جاري الحفظ...',

        requiredName:
          'المرجو إدخال اسم الحيوان.',

        requiredSpecies:
          'المرجو اختيار نوع الحيوان.',

        requiredBreed:
          'المرجو اختيار حجم الكلب.',

        photoPermission:
          'يجب السماح للتطبيق بالوصول إلى الصور.',

        successCreated:
          'تمت إضافة الحيوان بنجاح.',

        successUpdated:
          'تم تعديل معلومات الحيوان بنجاح.',

        error:
          'حدث خطأ. المرجو المحاولة مرة أخرى.',

        petNotFound:
          'تعذر العثور على الحيوان.',
      }
    : {
        addTitle: 'Add pet',
        editTitle: 'Edit pet',

        addSubtitle:
          'Enter your pet information',

        editSubtitle:
          'Update your pet information',

        name: 'Name',
        namePlaceholder: 'Pet name',

        species: 'Species',
        selectSpecies: 'Select species',
        cat: 'Cat',
        dog: 'Dog',

        breedSize: 'Dog size',
        small: 'Small',
        medium: 'Medium',
        large: 'Large',

        age: 'Age',
        selectAge: 'Select age',
        kitten: 'Kitten',
        puppy: 'Puppy',
        adult: 'Adult',
        senior: 'Senior',

        health: 'Health status',
        healthPlaceholder:
          'Example: Good health',

        note: 'Notes',
        notePlaceholder:
          'Additional information...',

        photo: 'Photo',
        addPhoto: 'Add photo',
        changePhoto: 'Change photo',
        takePhoto: 'Take photo',
        chooseGallery: 'Choose from gallery',
        removePhoto: 'Remove photo',
        cancel: 'Cancel',
        cameraPermission: 'Please allow access to the camera.',

        save: 'Save',
        saving: 'Saving...',

        requiredName:
          'Please enter the pet name.',

        requiredSpecies:
          'Please select the pet species.',

        requiredBreed:
          'Please select the dog size.',

        photoPermission:
          'Please allow access to your photos.',

        successCreated:
          'Pet added successfully.',

        successUpdated:
          'Pet updated successfully.',

        error:
          'Something went wrong. Please try again.',

        petNotFound:
          'Pet could not be found.',
      };


  /*
  |--------------------------------------------------------------------------
  | EDIT MODE
  |--------------------------------------------------------------------------
  */

  const petId =
    params.id
      ? Number(params.id)
      : null;


  const existingPet =
    useMemo<Pet | null>(() => {

      if (!petId) {
        return null;
      }

      return (
        subscription?.animals?.find(
          (pet) =>
            Number(pet.id) === petId
        ) || null
      );

    }, [
      petId,
      subscription?.animals,
    ]);


  const isEditing =
    petId !== null;


  /*
  |--------------------------------------------------------------------------
  | FORM STATE
  |--------------------------------------------------------------------------
  */

  const [
    name,
    setName,
  ] = useState('');


  const [
    species,
    setSpecies,
  ] = useState<Species | null>(
    null
  );


  const [
    breedSize,
    setBreedSize,
  ] = useState<BreedSize | null>(
    null
  );


  const [
    age,
    setAge,
  ] = useState<PetAge | null>(
    null
  );


  const [
    healthStatus,
    setHealthStatus,
  ] = useState('');


  const [
    note,
    setNote,
  ] = useState('');


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
  | LOAD EXISTING PET
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    if (!existingPet) {
      return;
    }

    setName(
      existingPet.name || ''
    );

    const normalizedSpecies =
      existingPet.species
        ?.trim()
        .toLowerCase();

    if (
      normalizedSpecies === 'cat'
    ) {
      setSpecies('Cat');
    }

    if (
      normalizedSpecies === 'dog'
    ) {
      setSpecies('Dog');
    }


    if (
      existingPet.breed_size_category ===
        'Small'
      ||
      existingPet.breed_size_category ===
        'Medium'
      ||
      existingPet.breed_size_category ===
        'Large'
    ) {
      setBreedSize(
        existingPet.breed_size_category
      );
    }


    if (
      existingPet.age === 'Kitten'
      ||
      existingPet.age === 'Puppy'
      ||
      existingPet.age === 'Adult'
      ||
      existingPet.age === 'Senior'
    ) {
      setAge(existingPet.age);
    } else {
      setAge(null);
    }


    setHealthStatus(
      existingPet.health_status || ''
    );

    setNote(
      existingPet.note || ''
    );

  }, [existingPet]);


  /*
  |--------------------------------------------------------------------------
  | PHOTO
  |--------------------------------------------------------------------------
  */

  const openGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('', t.photoPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setLocalPhotoUri(result.assets[0].uri);
      setRemoveExistingPhoto(false);
    }
  };

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('', t.cameraPermission);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setLocalPhotoUri(result.assets[0].uri);
      setRemoveExistingPhoto(false);
    }
  };

  const removePhoto = () => {
    setLocalPhotoUri(null);
    setRemoveExistingPhoto(true);
  };

  const displayedPhoto =
    removeExistingPhoto
      ? null
      : (localPhotoUri || existingPet?.photo_url || null);

  const selectPhoto = () => {
    const buttons: any[] = [
      { text: t.takePhoto, onPress: () => void openCamera() },
      { text: t.chooseGallery, onPress: () => void openGallery() },
    ];

    if (displayedPhoto) {
      buttons.push({
        text: t.removePhoto,
        style: 'destructive',
        onPress: removePhoto,
      });
    }

    buttons.push({ text: t.cancel, style: 'cancel' });
    Alert.alert(t.photo, '', buttons);
  };


  /*
  |--------------------------------------------------------------------------
  | VALIDATE
  |--------------------------------------------------------------------------
  */

  const validate =
    (): boolean => {

      if (!name.trim()) {

        Alert.alert(
          '',
          t.requiredName
        );

        return false;
      }


      if (!species) {

        Alert.alert(
          '',
          t.requiredSpecies
        );

        return false;
      }


      if (
        species === 'Dog'
        &&
        !breedSize
      ) {

        Alert.alert(
          '',
          t.requiredBreed
        );

        return false;
      }


      return true;

    };


  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */

  const savePet =
    async () => {

      if (
        saving
        ||
        !validate()
      ) {
        return;
      }


      try {

        setSaving(true);


        const payload = {
          name:
            name.trim(),

          species,

          breed_size_category:
            species === 'Dog'
              ? breedSize
              : null,

          age:
            age || null,

          health_status:
            healthStatus.trim()
            || null,

          note:
            note.trim() || null,

          photoUri:
            localPhotoUri,

          remove_photo:
            removeExistingPhoto,
        };


        if (
          isEditing
          &&
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


        /*
        |--------------------------------------------------------------------------
        | REFRESH GLOBAL CUSTOMER DATA
        |--------------------------------------------------------------------------
        */
        await refresh();

        Alert.alert(
        isArabic
            ? 'تم بنجاح'
            : 'Success',
        isEditing
            ? t.successUpdated
            : t.successCreated,
        [
            {
            text: 'OK',
            onPress: () => {
                router.replace('/(tabs)/pets');
            },
            },
        ],
        {
            cancelable: false,
        }
        );


      } catch (error) {

        console.error(
          'Save pet error:',
          error
        );


        Alert.alert(
          '',
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
  | UI
  |--------------------------------------------------------------------------
  */

  return (

    <SafeAreaView
      style={styles.safeArea}
    >

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          contentContainerStyle={
            styles.page
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >

          {/* HEADER */}

          <View
            style={[
              styles.header,
              isArabic &&
                styles.rowRtl,
            ]}
          >

            <Pressable
              style={styles.backButton}
              onPress={() =>
                router.back()
              }
            >

              <Ionicons
                name={
                  isArabic
                    ? 'chevron-forward'
                    : 'chevron-back'
                }
                size={22}
                color={COLORS.text}
              />

            </Pressable>


            <View
              style={styles.headerText}
            >

              <Text
                style={[
                  styles.title,
                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {isEditing
                  ? t.editTitle
                  : t.addTitle}
              </Text>


              <Text
                style={[
                  styles.subtitle,
                  isArabic &&
                    styles.textRtl,
                ]}
              >
                {isEditing
                  ? t.editSubtitle
                  : t.addSubtitle}
              </Text>

            </View>

          </View>


          {/* PHOTO */}

          <View
            style={styles.photoSection}
          >

            <View
              style={styles.avatar}
            >

              {displayedPhoto ? (

                <Image
                  source={{
                    uri:
                      displayedPhoto,
                  }}
                  style={styles.avatarImage}
                />

              ) : (

                <Ionicons
                  name={
                    species === 'Dog'
                      ? 'paw'
                      : species === 'Cat'
                        ? 'paw'
                        : 'paw-outline'
                  }
                  size={42}
                  color={COLORS.primary}
                />

              )}

            </View>


            <Pressable
              style={styles.photoButton}
              onPress={selectPhoto}
            >

              <Ionicons
                name="camera-outline"
                size={18}
                color={COLORS.primary}
              />

              <Text
                style={styles.photoButtonText}
              >
                {displayedPhoto
                  ? t.changePhoto
                  : t.addPhoto}
              </Text>

            </Pressable>

          </View>


          {/* FORM */}

          <View
            style={styles.formCard}
          >

            {/* NAME */}

            <FieldLabel
              text={t.name}
              rtl={isArabic}
            />

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={
                t.namePlaceholder
              }
              placeholderTextColor={
                '#AAA6A0'
              }
              style={[
                styles.input,
                isArabic &&
                  styles.inputRtl,
              ]}
            />


            {/* SPECIES */}

            <FieldLabel
              text={t.species}
              rtl={isArabic}
            />

            <SelectField
              value={species}
              placeholder={t.selectSpecies}
              rtl={isArabic}
              options={[
                {
                  value: 'Cat',
                  label: t.cat,
                },
                {
                  value: 'Dog',
                  label: t.dog,
                },
              ]}
              onChange={(value) => {
                const nextSpecies =
                  value as Species;

                setSpecies(nextSpecies);
                setBreedSize(null);

                if (
                  nextSpecies === 'Cat'
                  &&
                  age === 'Puppy'
                ) {
                  setAge(null);
                }

                if (
                  nextSpecies === 'Dog'
                  &&
                  age === 'Kitten'
                ) {
                  setAge(null);
                }
              }}
            />


            {/* DOG SIZE */}

            {species === 'Dog' && (
              <>
                <FieldLabel
                  text={t.breedSize}
                  rtl={isArabic}
                />

                <View
                  style={[
                    styles.optionsRow,
                    isArabic &&
                      styles.rowRtl,
                  ]}
                >

                  <SmallOption
                    label={t.small}
                    selected={
                      breedSize ===
                      'Small'
                    }
                    onPress={() =>
                      setBreedSize(
                        'Small'
                      )
                    }
                  />

                  <SmallOption
                    label={t.medium}
                    selected={
                      breedSize ===
                      'Medium'
                    }
                    onPress={() =>
                      setBreedSize(
                        'Medium'
                      )
                    }
                  />

                  <SmallOption
                    label={t.large}
                    selected={
                      breedSize ===
                      'Large'
                    }
                    onPress={() =>
                      setBreedSize(
                        'Large'
                      )
                    }
                  />

                </View>
              </>
            )}


            {/* AGE */}

            <FieldLabel
              text={t.age}
              rtl={isArabic}
            />

            <SelectField
              value={age}
              placeholder={t.selectAge}
              rtl={isArabic}
              disabled={!species}
              options={
                species === 'Dog'
                  ? [
                      {
                        value: 'Puppy',
                        label: t.puppy,
                      },
                      {
                        value: 'Adult',
                        label: t.adult,
                      },
                      {
                        value: 'Senior',
                        label: t.senior,
                      },
                    ]
                  : species === 'Cat'
                    ? [
                        {
                          value: 'Kitten',
                          label: t.kitten,
                        },
                        {
                          value: 'Adult',
                          label: t.adult,
                        },
                        {
                          value: 'Senior',
                          label: t.senior,
                        },
                      ]
                    : []
              }
              onChange={(value) =>
                setAge(value as PetAge)
              }
            />


            {/* HEALTH */}

            <FieldLabel
              text={t.health}
              rtl={isArabic}
            />

            <TextInput
              value={healthStatus}
              onChangeText={
                setHealthStatus
              }
              placeholder={
                t.healthPlaceholder
              }
              placeholderTextColor={
                '#AAA6A0'
              }
              style={[
                styles.input,
                isArabic &&
                  styles.inputRtl,
              ]}
            />


            {/* NOTE */}

            <FieldLabel
              text={t.note}
              rtl={isArabic}
            />

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={
                t.notePlaceholder
              }
              placeholderTextColor={
                '#AAA6A0'
              }
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.noteInput,
                isArabic &&
                  styles.inputRtl,
              ]}
            />

          </View>


          {/* SAVE */}

          <Pressable
            style={[
              styles.saveButton,
              saving &&
                styles.saveButtonDisabled,
            ]}
            onPress={savePet}
            disabled={saving}
          >

            {saving ? (

              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />

            ) : (

              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color={COLORS.white}
              />

            )}


            <Text
              style={styles.saveButtonText}
            >
              {saving
                ? t.saving
                : t.save}
            </Text>

          </Pressable>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>

  );

}


/*
|--------------------------------------------------------------------------
| SELECT FIELD
|--------------------------------------------------------------------------
*/

function SelectField({
  value,
  placeholder,
  options,
  onChange,
  rtl,
  disabled = false,
}: {
  value: string | null;
  placeholder: string;
  options: {
    value: string;
    label: string;
  }[];
  onChange: (value: string) => void;
  rtl: boolean;
  disabled?: boolean;
}) {

  const [
    visible,
    setVisible,
  ] = useState(false);

  const selectedLabel =
    options.find(
      (option) =>
        option.value === value
    )?.label || placeholder;

  return (
    <>
      <Pressable
        style={[
          styles.selectField,
          disabled &&
            styles.selectFieldDisabled,
        ]}
        disabled={disabled}
        onPress={() =>
          setVisible(true)
        }
      >
        <Text
          style={[
            styles.selectFieldText,
            !value &&
              styles.selectPlaceholder,
            rtl &&
              styles.textRtl,
          ]}
        >
          {selectedLabel}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color={COLORS.muted}
        />
      </Pressable>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() =>
          setVisible(false)
        }
      >
        <Pressable
          style={styles.selectOverlay}
          onPress={() =>
            setVisible(false)
          }
        >
          <View
            style={styles.selectModal}
          >
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.selectOption,
                  value === option.value &&
                    styles.selectOptionSelected,
                ]}
                onPress={() => {
                  onChange(option.value);
                  setVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    rtl &&
                      styles.textRtl,
                    value === option.value &&
                      styles.selectOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>

                {value === option.value && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={COLORS.primary}
                  />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}


/*
|--------------------------------------------------------------------------
| FIELD LABEL
|--------------------------------------------------------------------------
*/

function FieldLabel({
  text,
  rtl,
}: {
  text: string;
  rtl: boolean;
}) {

  return (

    <Text
      style={[
        styles.label,
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
| SPECIES OPTION
|--------------------------------------------------------------------------
*/

function OptionButton({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon:
    React.ComponentProps<
      typeof Ionicons
    >['name'];
  selected: boolean;
  onPress: () => void;
}) {

  return (

    <Pressable
      style={[
        styles.optionButton,
        selected &&
          styles.optionSelected,
      ]}
      onPress={onPress}
    >

      <Ionicons
        name={icon}
        size={22}
        color={
          selected
            ? COLORS.primary
            : COLORS.muted
        }
      />

      <Text
        style={[
          styles.optionText,
          selected &&
            styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>

    </Pressable>

  );

}


/*
|--------------------------------------------------------------------------
| SIZE OPTION
|--------------------------------------------------------------------------
*/

function SmallOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {

  return (

    <Pressable
      style={[
        styles.smallOption,
        selected &&
          styles.optionSelected,
      ]}
      onPress={onPress}
    >

      <Text
        style={[
          styles.smallOptionText,
          selected &&
            styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>

    </Pressable>

  );

}


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    flex: {
      flex: 1,
    },

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    page: {
      padding: 18,
      paddingBottom: 40,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 22,
    },

    rowRtl: {
      flexDirection:
        'row-reverse',
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    headerText: {
      flex: 1,
    },

    title: {
      fontFamily:
        'Cairo_800ExtraBold',

      fontSize: 23,

      lineHeight: 34,

      color:
        COLORS.text,
    },

    subtitle: {
      marginTop: 1,

      fontFamily:
        'Cairo_400Regular',

      fontSize: 12,

      lineHeight: 20,

      color:
        COLORS.muted,
    },

    textRtl: {
      textAlign: 'right',

      writingDirection:
        'rtl',
    },

    photoSection: {
      alignItems: 'center',

      marginBottom: 22,
    },

    avatar: {
      width: 112,
      height: 112,

      borderRadius: 56,

      backgroundColor:
        COLORS.primaryLight,

      borderWidth: 3,

      borderColor:
        COLORS.white,

      alignItems: 'center',

      justifyContent:
        'center',

      overflow: 'hidden',
    },

    avatarImage: {
      width: '100%',
      height: '100%',
    },

    photoButton: {
      marginTop: 11,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,

      paddingHorizontal: 15,

      paddingVertical: 8,

      borderRadius: 14,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    photoButtonText: {
      fontFamily:
        'Cairo_600SemiBold',

      fontSize: 12,

      color:
        COLORS.primary,
    },

    formCard: {
      backgroundColor:
        COLORS.white,

      borderRadius: 22,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      padding: 17,
    },

    label: {
      marginTop: 14,

      marginBottom: 7,

      fontFamily:
        'Cairo_600SemiBold',

      fontSize: 12,

      color:
        COLORS.text,
    },

    selectField: {
      minHeight: 49,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.inputBackground,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    selectFieldDisabled: {
      opacity: 0.5,
    },

    selectFieldText: {
      flex: 1,
      fontFamily: 'Cairo_400Regular',
      fontSize: 13,
      color: COLORS.text,
    },

    selectPlaceholder: {
      color: '#AAA6A0',
    },

    selectOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.28)',
      justifyContent: 'center',
      padding: 24,
    },

    selectModal: {
      backgroundColor: COLORS.white,
      borderRadius: 18,
      padding: 8,
    },

    selectOption: {
      minHeight: 52,
      paddingHorizontal: 14,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    selectOptionSelected: {
      backgroundColor: COLORS.primaryLight,
    },

    selectOptionText: {
      flex: 1,
      fontFamily: 'Cairo_500Medium',
      fontSize: 13,
      color: COLORS.text,
    },

    selectOptionTextSelected: {
      color: COLORS.primary,
      fontFamily: 'Cairo_600SemiBold',
    },

    input: {
      minHeight: 49,

      paddingHorizontal: 14,

      paddingVertical: 10,

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.inputBackground,

      fontFamily:
        'Cairo_400Regular',

      fontSize: 13,

      color:
        COLORS.text,
    },

    inputRtl: {
      textAlign: 'right',

      writingDirection:
        'rtl',
    },

    noteInput: {
      minHeight: 105,
    },

    optionsRow: {
      flexDirection: 'row',

      gap: 9,
    },

    optionButton: {
      flex: 1,

      minHeight: 55,

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.inputBackground,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'center',

      gap: 8,
    },

    optionSelected: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primaryLight,
    },

    optionText: {
      fontFamily:
        'Cairo_600SemiBold',

      fontSize: 12,

      color:
        COLORS.muted,
    },

    optionTextSelected: {
      color:
        COLORS.primary,
    },

    smallOption: {
      flex: 1,

      minHeight: 46,

      borderRadius: 13,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.inputBackground,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    smallOptionText: {
      fontFamily:
        'Cairo_500Medium',

      fontSize: 11,

      color:
        COLORS.muted,
    },

    saveButton: {
      minHeight: 55,

      marginTop: 20,

      borderRadius: 17,

      backgroundColor:
        COLORS.primary,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'center',

      gap: 9,
    },

    saveButtonDisabled: {
      opacity: 0.65,
    },

    saveButtonText: {
      fontFamily:
        'Cairo_700Bold',

      fontSize: 14,

      color:
        COLORS.white,
    },

  });