import React, { useCallback, useState, } from "react";
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View, } from "react-native";
import { Ionicons, MaterialCommunityIcons, } from "@expo/vector-icons";
import { SafeAreaView, } from "react-native-safe-area-context";
import { router, useFocusEffect, } from "expo-router";
import { useAppLanguage, } from "../../context/LanguageContext";
import { useCustomerData, } from "../../context/CustomerDataContext";
import { deletePet, } from "../../services/customerApi";
import type { Pet, } from "../../types/customer";
import { fetchPurchases, } from "../../services/purchaseApi";
import type { PurchaseSummary, } from "../../types/purchase";
import { formatDate, } from "../../components/purchase/purchaseUtils";
import GuestGate from "../../components/shop/GuestGate";
const COLORS = {
    background: "#F4F1EC",
    primary: "#249B97",
    primaryLight: "#EAF5F2",
    text: "#191919",
    muted: "#77736D",
    border: "#DCD5CB",
    white: "#FFFFFF",
    dark: "#292929",
    danger: "#B42318",
    dangerLight: "#FEF3F2",
};
type ViewMode = "list" | "grid";
type ExtendedPet = Pet & {
    subscription_status?: string;
    next_order?: any;
    orders?: any[];
};
export default function PetsScreen() {
    const { isArabic, } = useAppLanguage();
    const { subscription, loading, error, refresh, isGuest, } = useCustomerData();
    const { width, } = useWindowDimensions();
    const isCompact = width < 460;
    const [viewMode, setViewMode,] = useState<ViewMode>("list");
    /*
     * Packs (purchases) of all pets: the status, the next delivery
     * and the bottom button of each card come from them.
     */
    const [purchases, setPurchases,] = useState<PurchaseSummary[]>([]);
    const loadPurchases = useCallback(async () => {
        try {
            setPurchases(await fetchPurchases(isArabic ? "ar" : "en"));
        }
        catch (purchaseError) {
            console.error("Unable to load purchases:", purchaseError);
        }
    }, [isArabic]);
    const refreshAll = useCallback(async () => {
        await Promise.all([refresh(), loadPurchases()]);
    }, [refresh, loadPurchases]);
    useFocusEffect(useCallback(() => {
        void refreshAll();
    }, [refreshAll]));
    const t = isArabic
        ? {
            title: "حيواناتي الأليفة",
            subtitle: "الملفات والاشتراكات ورحلة التغذية.",
            renewPlans: "تجديد الخطط",
            addPet: "إضافة حيوان",
            active: "نشط",
            inactive: "لا يوجد اشتراك نشط",
            pending: "بانتظار الدفع",
            manage: "إدارة",
            editSubscription: "تعديل الاشتراك",
            viewPlan: "عرض الطلب",
            choosePlan: "اختيار باقة",
            next: "التالي:",
            none: "لا يوجد",
            meals: "وجبة",
            unknown: "غير محدد",
            noPets: "لا توجد حيوانات مسجلة حالياً",
            noPetsDescription: "يمكنك إضافة حيوانك الأليف للبدء.",
            addFirstPet: "إضافة أول حيوان",
            loadError: "تعذر تحميل بيانات الحيوانات",
            delete: "حذف",
            deleteTitle: "حذف الحيوان",
            deleteMessage: "هل أنت متأكد أنك تريد حذف هذا الحيوان؟",
            cancel: "إلغاء",
            deleteError: "تعذر حذف الحيوان.",
        }
        : {
            title: "My Pets",
            subtitle: "Profiles, subscriptions and nutrition journeys.",
            renewPlans: "Renew Plans",
            addPet: "Add New Pet",
            active: "Active",
            inactive: "No active plan",
            pending: "Awaiting payment",
            manage: "Manage",
            editSubscription: "Edit Subscription",
            viewPlan: "View order",
            choosePlan: "Choose a plan",
            next: "Next:",
            none: "None",
            meals: "Meals",
            unknown: "Not specified",
            noPets: "No pets found",
            noPetsDescription: "Add your first pet to get started.",
            addFirstPet: "Add your first pet",
            loadError: "Unable to load pets",
            delete: "Delete",
            deleteTitle: "Delete pet",
            deleteMessage: "Are you sure you want to delete this pet?",
            cancel: "Cancel",
            deleteError: "Unable to delete this pet.",
        };
    const pets = subscription?.animals || [];
    const openAddPet = () => {
        router.push("/pet-form");
    };
    const openManagePet = (pet: Pet) => {
        router.push({
            pathname: "/pet-form",
            params: {
                id: String(pet.id),
            },
        });
    };
    /*
     * Best plan of a pet: active/paid first, then pending.
     * Finished / cancelled plans are ignored here.
     */
    const planFor = (pet: Pet): PurchaseSummary | null => {
        const ofPet = purchases.filter(purchase => Number(purchase.animal?.id) === Number(pet.id));
        return ofPet.find(purchase => purchase.is_active)
            ?? ofPet.find(purchase => purchase.status === "pending")
            ?? null;
    };
    /*
     * Bottom button of the card:
     *  - active plan  -> Edit Subscription (pet profile with the plan card)
     *  - pending plan -> the order (payment / receipt)
     *  - no plan      -> Choose a plan (plans page for this pet)
     */
    const openSubscriptionAction = (pet: Pet) => {
        const plan = planFor(pet);
        if (plan?.is_active) {
            router.push({ pathname: "/pet-form", params: { id: String(pet.id) } });
            return;
        }
        if (plan) {
            router.push({ pathname: "/purchase", params: { id: String(plan.id) } });
            return;
        }
        router.push({ pathname: "/plans", params: { animalId: String(pet.id) } });
    };
    const openRenewPlans = () => {
        router.push("/plans");
    };
    const confirmDeletePet = (pet: Pet) => {
        Alert.alert(t.deleteTitle, t.deleteMessage, [
            {
                text: t.cancel,
                style: "cancel",
            },
            {
                text: t.delete,
                style: "destructive",
                onPress: async () => {
                    try {
                        await deletePet(pet.id);
                        await refresh();
                    }
                    catch (deleteError: any) {
                        Alert.alert("", deleteError?.message
                            || t.deleteError);
                    }
                },
            },
        ]);
    };
    // Visitor: My Pets needs an account
    if (isGuest && !loading) {
        return <GuestGate redirect="/(tabs)/pets"/>;
    }
    if (loading &&
        pets.length === 0) {
        return (<SafeAreaView edges={[
                "left",
                "right",
            ]} style={styles.safeArea}>

        <View style={styles.loader}>

          <ActivityIndicator size="large" color={COLORS.primary}/>

        </View>

      </SafeAreaView>);
    }
    return (<SafeAreaView edges={[
            "left",
            "right",
        ]} style={styles.safeArea}>

      <ScrollView style={styles.scrollView} contentContainerStyle={[
            styles.page,
            isCompact &&
                styles.pageCompact,
        ]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refreshAll()} tintColor={COLORS.primary} colors={[
                COLORS.primary,
            ]}/>}>

        

        <View style={styles.pageHeader}>

          <Text style={[
            styles.title,
            isCompact &&
                styles.titleCompact,
            isArabic &&
                styles.textRtl,
        ]}>

            {t.title}

          </Text>

          <Text style={[
            styles.subtitle,
            isCompact &&
                styles.subtitleCompact,
            isArabic &&
                styles.textRtl,
        ]}>

            {t.subtitle}

          </Text>

        </View>

        

        <View style={[
            styles.toolbar,
            isCompact &&
                styles.toolbarCompact,
            isArabic &&
                !isCompact &&
                styles.rowRtl,
        ]}>

          

          <Pressable onPress={openRenewPlans} style={({ pressed, }) => [
            styles.renewButton,
            isCompact &&
                styles.fullWidthButton,
            pressed &&
                styles.buttonPressed,
        ]}>

            <MaterialCommunityIcons name="creation" size={20} color="#FFFFFF"/>

            <Text numberOfLines={1} style={styles.renewButtonText}>

              {t.renewPlans}

            </Text>

          </Pressable>

          

          <Pressable onPress={openAddPet} style={({ pressed, }) => [
            styles.addButton,
            isCompact &&
                styles.fullWidthButton,
            pressed &&
                styles.buttonPressed,
        ]}>

            <Ionicons name="add" size={22} color={COLORS.text}/>

            <Text numberOfLines={1} style={styles.addButtonText}>

              {t.addPet}

            </Text>

          </Pressable>

          

          <View style={[
            styles.viewSwitcher,
            isCompact &&
                styles.viewSwitcherCompact,
        ]}>

            <Pressable onPress={() => setViewMode("list")} style={[
            styles.viewButton,
            viewMode ===
                "list" &&
                styles.viewButtonActive,
        ]}>

              <Ionicons name="menu-outline" size={21} color={viewMode ===
            "list"
            ? COLORS.primary
            : COLORS.muted}/>

            </Pressable>

            <Pressable onPress={() => setViewMode("grid")} style={[
            styles.viewButton,
            viewMode ===
                "grid" &&
                styles.viewButtonActive,
        ]}>

              <Ionicons name="grid-outline" size={18} color={viewMode ===
            "grid"
            ? COLORS.primary
            : COLORS.muted}/>

            </Pressable>

          </View>

        </View>

        

        <View style={[
            styles.toolbarDivider,
            isCompact &&
                styles.toolbarDividerCompact,
        ]}/>

        

        {!!error && (<View style={[
                styles.errorBox,
                isArabic &&
                    styles.rowRtl,
            ]}>

            <Ionicons name="alert-circle-outline" size={19} color={COLORS.danger}/>

            <Text style={[
                styles.errorText,
                isArabic &&
                    styles.textRtl,
            ]}>

              {error ||
                t.loadError}

            </Text>

          </View>)}

        

        {pets.length === 0 ? (<View style={styles.emptyBox}>

            <View style={styles.emptyIcon}>

              <Ionicons name="paw-outline" size={38} color={COLORS.primary}/>

            </View>

            <Text style={styles.emptyTitle}>

              {t.noPets}

            </Text>

            <Text style={styles.emptyText}>

              {t.noPetsDescription}

            </Text>

            <Pressable style={styles.emptyButton} onPress={openAddPet}>

              <Ionicons name="add" size={20} color="#FFFFFF"/>

              <Text style={styles.emptyButtonText}>

                {t.addFirstPet}

              </Text>

            </Pressable>

          </View>) : viewMode ===
            "list" ? (<View style={styles.listContainer}>

            {pets.map((pet, index) => (<PetListItem key={pet.id} pet={pet as ExtendedPet} t={t} isArabic={isArabic} isCompact={isCompact} isLast={index ===
                    pets.length - 1} onManage={() => openManagePet(pet)} plan={planFor(pet)} onEditSubscription={() => openSubscriptionAction(pet)}/>))}

          </View>) : (<View style={styles.gridContainer}>

            {pets.map((pet) => (<PetGridCard key={pet.id} pet={pet as ExtendedPet} t={t} isArabic={isArabic} isCompact={isCompact} onManage={() => openManagePet(pet)} plan={planFor(pet)} onEditSubscription={() => openSubscriptionAction(pet)}/>))}

          </View>)}

      </ScrollView>

    </SafeAreaView>);
}
function getPetData(pet: ExtendedPet, t: any, purchase: PurchaseSummary | null, isArabic: boolean) {
    /*
     * Status:
     *  - pack bought in the app / back-office (purchases) -> real status
     *  - old back-office subscription: "active" only if the pet
     *    still has an upcoming planned order
     */
    const legacyActive = pet.subscription_status === "active" &&
        !!pet.next_order;
    const active = !!purchase?.is_active || legacyActive;
    const pending = !active && purchase?.status === "pending";
    const statusLabel = active
        ? t.active
        : pending
            ? t.pending
            : t.inactive;
    const nextISO = purchase?.next_delivery?.date ||
        (legacyActive ? pet.next_order?.scheduled_for : null) ||
        null;
    const nextDate = nextISO
        ? formatDate(nextISO, isArabic)
        : null;
    let plan: string | null = null;
    if (purchase) {
        plan = `${purchase.product.name} (${purchase.usage.total_recipes} ${t.meals})`;
    }
    else if (legacyActive) {
        const sourceOrder = pet.next_order;
        const recipe = sourceOrder?.items?.[0]?.recipe?.name || null;
        const meals = sourceOrder?.items?.reduce((total: number, item: any) => total +
            Number(item.quantity || 0), 0) || 0;
        plan = recipe
            ? `${recipe}${meals ? ` (${meals} ${t.meals})` : ""}`
            : null;
    }
    const actionLabel = active
        ? t.editSubscription
        : pending
            ? t.viewPlan
            : t.choosePlan;
    const actionIcon: any = active
        ? "pencil-outline"
        : pending
            ? "receipt-outline"
            : "sparkles-outline";
    const details = [
        pet.breed_size_category ||
            null,
        pet.age ||
            null,
        pet.health_status ||
            null,
    ]
        .filter(Boolean);
    return {
        active,
        pending,
        statusLabel,
        nextDate,
        plan,
        details,
        actionLabel,
        actionIcon,
    };
}
function PetListItem({ pet, t, isArabic, isCompact, isLast, onManage, onEditSubscription, plan: purchase, }: {
    pet: ExtendedPet;
    t: any;
    isArabic: boolean;
    isCompact: boolean;
    isLast: boolean;
    onManage: () => void;
    onEditSubscription: () => void;
    plan: PurchaseSummary | null;
}) {
    const { active, pending, statusLabel, nextDate, plan, details, actionLabel, actionIcon, } = getPetData(pet, t, purchase, isArabic);
    return (<View style={[
            styles.listPet,
            !isLast &&
                styles.listPetBorder,
        ]}>

      

      <View style={[
            styles.listPetTop,
            isCompact &&
                styles.listPetTopCompact,
            isArabic &&
                styles.rowRtl,
        ]}>

        <PetAvatar pet={pet} mode="list" isCompact={isCompact}/>

        <View style={styles.listPetContent}>

          <View style={[
            styles.nameStatusRow,
            isArabic &&
                styles.rowRtl,
        ]}>

            <Text numberOfLines={1} style={[
            styles.listPetName,
            isCompact &&
                styles.listPetNameCompact,
            isArabic &&
                styles.textRtl,
        ]}>

              {pet.name ||
            t.unknown}

            </Text>

            <View style={[
            styles.statusInline,
            isArabic &&
                styles.rowRtl,
        ]}>

              <View style={[
            styles.statusDot,
            !active &&
                styles.statusDotInactive,
            pending &&
                styles.statusDotPending,
        ]}/>

              <Text style={styles.statusText}>

                {statusLabel}

              </Text>

            </View>

          </View>

          {details.map((detail, index) => (<Text key={index} style={[
                styles.petDetailText,
                isCompact &&
                    styles.petDetailTextCompact,
                isArabic &&
                    styles.textRtl,
            ]}>

                {detail}

              </Text>))}

          {!!plan && (<Text numberOfLines={isCompact
                ? 2
                : 1} style={[
                styles.listPlan,
                isCompact &&
                    styles.listPlanCompact,
                isArabic &&
                    styles.textRtl,
            ]}>

              {plan}

            </Text>)}

        </View>

      </View>

      

      <View style={[
            styles.nextRow,
            isArabic &&
                styles.rowRtl,
        ]}>

        <Ionicons name="calendar-clear-outline" size={18} color={COLORS.primary}/>

        <Text style={styles.nextLabel}>

          {t.next}{" "}

          <Text style={styles.nextDate}>

            {nextDate ||
            t.none}

          </Text>

        </Text>

      </View>

      

      <View style={[
            styles.listActions,
            isCompact &&
                styles.listActionsCompact,
            isArabic &&
                styles.rowRtl,
        ]}>

        <Pressable onPress={onManage} style={[
            styles.actionButton,
            isArabic &&
                styles.rowRtl,
        ]}>

          <Ionicons name={isArabic
            ? "arrow-back"
            : "arrow-forward"} size={18} color={COLORS.primary}/>

          <Text style={[
            styles.actionText,
            isCompact &&
                styles.actionTextCompact,
        ]}>

            {t.manage}

          </Text>

        </Pressable>

        <Pressable onPress={onEditSubscription} style={[
            styles.actionButton,
            isArabic &&
                styles.rowRtl,
        ]}>

          <Ionicons name={actionIcon} size={18} color={COLORS.primary}/>

          <Text numberOfLines={1} style={[
            styles.actionText,
            isCompact &&
                styles.actionTextCompact,
        ]}>

            {actionLabel}

          </Text>

        </Pressable>

      </View>

    </View>);
}
function PetGridCard({ pet, t, isArabic, isCompact, onManage, onEditSubscription, plan: purchase, }: {
    pet: ExtendedPet;
    t: any;
    isArabic: boolean;
    isCompact: boolean;
    onManage: () => void;
    onEditSubscription: () => void;
    plan: PurchaseSummary | null;
}) {
    const { active, pending, statusLabel, nextDate, plan, details, actionLabel, actionIcon, } = getPetData(pet, t, purchase, isArabic);
    return (<View style={[
            styles.gridCard,
            isCompact &&
                styles.gridCardCompact,
        ]}>

      <PetAvatar pet={pet} mode="grid" isCompact={isCompact}/>

      <Text numberOfLines={1} style={[
            styles.gridPetName,
            isCompact &&
                styles.gridPetNameCompact,
            isArabic &&
                styles.textRtl,
        ]}>

        {pet.name ||
            t.unknown}

      </Text>

      <Text style={[
            styles.gridStatus,
            isArabic &&
                styles.textRtl,
        ]}>

        {statusLabel}

      </Text>

      <View style={styles.gridDetails}>

        {details.map((detail, index) => (<Text key={index} style={[
                styles.petDetailText,
                isCompact &&
                    styles.petDetailTextCompact,
                isArabic &&
                    styles.textRtl,
            ]}>

              {detail}

            </Text>))}

      </View>

      {!!plan && (<Text style={[
                styles.gridPlan,
                isCompact &&
                    styles.gridPlanCompact,
                isArabic &&
                    styles.textRtl,
            ]}>

          {plan}

        </Text>)}

      <View style={styles.gridDivider}/>

      <View style={[
            styles.nextRow,
            isArabic &&
                styles.rowRtl,
        ]}>

        <Ionicons name="calendar-clear-outline" size={17} color={COLORS.primary}/>

        <Text numberOfLines={1} style={styles.nextLabel}>

          {t.next}{" "}

          <Text style={styles.nextDate}>

            {nextDate ||
            t.none}

          </Text>

        </Text>

      </View>

      <Pressable onPress={onManage} style={[
            styles.gridAction,
            isArabic &&
                styles.rowRtl,
        ]}>

        <Ionicons name={isArabic
            ? "arrow-back"
            : "arrow-forward"} size={18} color={COLORS.primary}/>

        <Text style={[
            styles.actionText,
            isCompact &&
                styles.actionTextCompact,
        ]}>

          {t.manage}

        </Text>

      </Pressable>

      <Pressable onPress={onEditSubscription} style={[
            styles.gridAction,
            isArabic &&
                styles.rowRtl,
        ]}>

        <Ionicons name={actionIcon} size={18} color={COLORS.primary}/>

        <Text numberOfLines={2} style={[
            styles.actionText,
            isCompact &&
                styles.actionTextCompact,
        ]}>

          {actionLabel}

        </Text>

      </Pressable>

    </View>);
}
function PetAvatar({ pet, mode, isCompact, }: {
    pet: Pet;
    mode: ViewMode;
    isCompact: boolean;
}) {
    const containerStyle = mode === "grid"
        ? styles.gridAvatar
        : [
            styles.listAvatar,
            isCompact &&
                styles.listAvatarCompact,
        ];
    if (pet.photo_url) {
        return (<View style={containerStyle}>

        <Image source={{
                uri: pet.photo_url,
            }} style={styles.avatarImage} resizeMode="cover"/>

      </View>);
    }
    const species = pet.species
        ?.trim()
        .toLowerCase();
    const icon = species === "cat"
        ? "cat"
        : species === "dog"
            ? "dog"
            : "paw";
    return (<View style={[
            containerStyle,
            styles.avatarFallback,
        ]}>

      <MaterialCommunityIcons name={icon} size={mode === "grid"
            ? 42
            : 34} color={COLORS.primary}/>

    </View>);
}
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    page: {
        paddingHorizontal: 30,
        paddingTop: 28,
        paddingBottom: 32,
    },
    pageCompact: {
        paddingHorizontal: 28,
        paddingTop: 27,
    },
    loader: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    pageHeader: {
        marginBottom: 20,
    },
    title: {
        fontFamily: "Cairo_800ExtraBold",
        fontSize: 34,
        lineHeight: 43,
        color: COLORS.text,
    },
    titleCompact: {
        fontSize: 33,
        lineHeight: 42,
    },
    subtitle: {
        marginTop: 2,
        fontFamily: "Cairo_400Regular",
        fontSize: 15,
        lineHeight: 23,
        color: COLORS.muted,
    },
    subtitleCompact: {
        fontSize: 14,
        lineHeight: 22,
    },
    toolbar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 21,
    },
    toolbarCompact: {
        flexDirection: "column",
        alignItems: "stretch",
        gap: 7,
        marginBottom: 23,
    },
    renewButton: {
        height: 55,
        paddingHorizontal: 16,
        borderRadius: 9,
        backgroundColor: COLORS.dark,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        flexShrink: 1,
    },
    renewButtonText: {
        fontFamily: "Cairo_700Bold",
        fontSize: 12,
        color: "#FFFFFF",
    },
    addButton: {
        height: 55,
        paddingHorizontal: 15,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#B9DCD5",
        backgroundColor: "#EDF4F1",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexShrink: 1,
    },
    addButtonText: {
        fontFamily: "Cairo_700Bold",
        fontSize: 12,
        color: COLORS.text,
    },
    fullWidthButton: {
        width: "100%",
        flexShrink: 0,
    },
    viewSwitcher: {
        height: 55,
        padding: 4,
        borderRadius: 9,
        backgroundColor: "#E9E6E0",
        flexDirection: "row",
        alignItems: "center",
    },
    viewSwitcherCompact: {
        alignSelf: "flex-start",
        marginTop: 0,
    },
    viewButton: {
        width: 42,
        height: 47,
        borderRadius: 7,
        alignItems: "center",
        justifyContent: "center",
    },
    viewButtonActive: {
        backgroundColor: "#FCFAF6",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    buttonPressed: {
        opacity: 0.7,
    },
    toolbarDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 29,
    },
    toolbarDividerCompact: {
        marginTop: 0,
        marginBottom: 29,
    },
    listContainer: {
        width: "100%",
    },
    listPet: {
        paddingBottom: 35,
        marginBottom: 29,
    },
    listPetBorder: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    listPetTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 22,
    },
    listPetTopCompact: {
        gap: 17,
    },
    listAvatar: {
        width: 105,
        height: 117,
        borderRadius: 9,
        overflow: "hidden",
        backgroundColor: COLORS.primaryLight,
        borderWidth: 2,
        borderColor: "#FFFFFF",
        flexShrink: 0,
    },
    listAvatarCompact: {
        width: 105,
        height: 117,
    },
    listPetContent: {
        flex: 1,
        minWidth: 0,
    },
    nameStatusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 7,
    },
    listPetName: {
        flexShrink: 1,
        fontFamily: "Cairo_700Bold",
        fontSize: 30,
        lineHeight: 38,
        color: COLORS.text,
    },
    listPetNameCompact: {
        fontSize: 29,
        lineHeight: 37,
    },
    statusInline: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        flexShrink: 0,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    statusDotInactive: {
        backgroundColor: COLORS.muted,
    },
    statusDotPending: {
        backgroundColor: "#E9A23B",
    },
    statusText: {
        fontFamily: "Cairo_500Medium",
        fontSize: 12,
        color: COLORS.text,
    },
    petDetailText: {
        fontFamily: "Cairo_400Regular",
        fontSize: 15,
        lineHeight: 24,
        color: COLORS.muted,
    },
    petDetailTextCompact: {
        fontSize: 14,
        lineHeight: 23,
    },
    listPlan: {
        marginTop: 7,
        fontFamily: "Cairo_500Medium",
        fontSize: 14,
        lineHeight: 22,
        color: COLORS.text,
    },
    listPlanCompact: {
        fontSize: 13.5,
        lineHeight: 21,
    },
    nextRow: {
        marginTop: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    nextLabel: {
        flexShrink: 1,
        fontFamily: "Cairo_400Regular",
        fontSize: 13,
        lineHeight: 20,
        color: COLORS.muted,
    },
    nextDate: {
        fontFamily: "Cairo_700Bold",
        color: COLORS.muted,
    },
    listActions: {
        marginTop: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
    },
    listActionsCompact: {
        gap: 10,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        minHeight: 32,
        flexShrink: 1,
    },
    actionText: {
        fontFamily: "Cairo_700Bold",
        fontSize: 15,
        lineHeight: 22,
        color: COLORS.text,
    },
    actionTextCompact: {
        fontSize: 14,
        lineHeight: 21,
    },
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "flex-start",
        rowGap: 16,
    },
    gridCard: {
        width: "48%",
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 15,
        padding: 18,
        backgroundColor: "transparent",
    },
    gridCardCompact: {
        width: "48%",
        padding: 16,
        borderRadius: 14,
    },
    gridAvatar: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: COLORS.primaryLight,
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
    },
    avatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    gridPetName: {
        marginTop: 19,
        fontFamily: "Cairo_700Bold",
        fontSize: 23,
        lineHeight: 30,
        color: COLORS.text,
    },
    gridPetNameCompact: {
        marginTop: 15,
        fontSize: 21,
        lineHeight: 28,
    },
    gridStatus: {
        marginTop: 1,
        fontFamily: "Cairo_500Medium",
        fontSize: 13,
        lineHeight: 20,
        color: COLORS.text,
    },
    gridDetails: {
        marginTop: 15,
    },
    gridPlan: {
        marginTop: 10,
        minHeight: 46,
        fontFamily: "Cairo_500Medium",
        fontSize: 14,
        lineHeight: 22,
        color: COLORS.text,
    },
    gridPlanCompact: {
        fontSize: 13,
        lineHeight: 20,
        minHeight: 42,
    },
    gridDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginTop: 12,
    },
    gridAction: {
        marginTop: 21,
        minHeight: 29,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
    },
    emptyBox: {
        minHeight: 260,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    emptyIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    emptyTitle: {
        fontFamily: "Cairo_700Bold",
        fontSize: 17,
        color: COLORS.text,
        textAlign: "center",
    },
    emptyText: {
        marginTop: 5,
        fontFamily: "Cairo_400Regular",
        fontSize: 13,
        lineHeight: 20,
        color: COLORS.muted,
        textAlign: "center",
    },
    emptyButton: {
        marginTop: 18,
        minHeight: 45,
        paddingHorizontal: 18,
        borderRadius: 9,
        backgroundColor: COLORS.dark,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    },
    emptyButtonText: {
        fontFamily: "Cairo_700Bold",
        fontSize: 12,
        color: "#FFFFFF",
    },
    errorBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 10,
        marginBottom: 15,
        borderRadius: 10,
        backgroundColor: COLORS.dangerLight,
    },
    errorText: {
        flex: 1,
        fontFamily: "Cairo_500Medium",
        fontSize: 11,
        color: COLORS.danger,
    },
    rowRtl: {
        flexDirection: "row-reverse",
    },
    textRtl: {
        textAlign: "right",
        writingDirection: "rtl",
    },
});

