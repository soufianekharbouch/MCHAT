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
import { fetchLoyalty, levelIcon, type LoyaltyResponse, type PetLoyalty } from "../../services/loyaltyApi";
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
/*
 * PREMIUM-... pack (sent by the API on each purchase):
 *  - needs_consultation: our team prepares his custom recipes
 *  - custom_ready: custom recipes ready
 */
type PremiumFlags = {
    is_personalized?: boolean;
    needs_consultation?: boolean;
    custom_ready?: boolean;
};
type PremiumInfo = {
    pending: boolean;
} | null;
const GOLD = {
    main: "#B8860B",
    dark: "#6B4E00",
    border: "#C9A227",
    light: "#FFF9EC",
};
// Loyalty points colors
const POINTS = {
    gold: "#D4A017",
    dark: "#9A6B00",
    light: "#FFF8E5",
    border: "#E8C66A",
};
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
    /*
     * Loyalty points of each pet (+ total of the customer).
     */
    const [loyalty, setLoyalty,] = useState<LoyaltyResponse | null>(null);
    const loadLoyalty = useCallback(async () => {
        try {
            setLoyalty(await fetchLoyalty(isArabic ? "ar" : "en"));
        }
        catch (loyaltyError) {
            console.warn("Unable to load loyalty points:", loyaltyError);
        }
    }, [isArabic]);
    const refreshAll = useCallback(async () => {
        await Promise.all([refresh(), loadPurchases(), loadLoyalty()]);
    }, [refresh, loadPurchases, loadLoyalty]);
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
            premium: "بريميوم",
            premiumSubscription: "اشتراك بريميوم",
            premiumPending: "يتواصل معك فريقنا لتحضير وصفاته الخاصة",
            premiumReady: "وصفاته المخصصة جاهزة",
            points: "نقطة",
            pointsTotal: (n: number) => `${n} نقطة ولاء`,
            pointsUsable: (amount: string) => `قابلة للاستخدام = خصم ${amount}`,
            pointsMissing: (n: number) => `${n} نقطة أخرى لاستخدامها`,
            pointsLost: (days: number) => `تنتهي خلال ${days} يوم`,
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
            premium: "Premium",
            premiumSubscription: "Premium subscription",
            premiumPending: "Our team contacts you to prepare his own recipes",
            premiumReady: "His custom recipes are ready",
            points: "pts",
            pointsTotal: (n: number) => `${n} loyalty points`,
            pointsUsable: (amount: string) => `usable = ${amount} off`,
            pointsMissing: (n: number) => `${n} more to use them`,
            pointsLost: (days: number) => `lost in ${days} day${days === 1 ? "" : "s"}`,
        };
    const pets = subscription?.animals || [];
    const openAddPet = () => {
        router.push({ pathname: "/pet-form", params: { id: "" } });
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
     * Premium pet: a PREMIUM-... pack paid / running
     * (untreated = our team prepares his custom recipes).
     */
    const premiumFor = (pet: Pet): PremiumInfo => {
        const premium = purchases.filter(purchase => Number(purchase.animal?.id) === Number(pet.id) &&
            purchase.is_active &&
            !!(purchase as PurchaseSummary & PremiumFlags).is_personalized);
        if (premium.length === 0) {
            return null;
        }
        return {
            pending: premium.some(purchase => !!(purchase as PurchaseSummary & PremiumFlags).needs_consultation),
        };
    };
    const loyaltyOn = !!loyalty?.program?.enabled;
    const pointsFor = (pet: Pet): PetLoyalty | null => loyaltyOn
        ? loyalty?.pets.find(item => Number(item.pet.id) === Number(pet.id)) ?? null
        : null;
    const currency = loyalty?.program?.currency ?? "KWD";
    const openLoyalty = () => {
        router.push("/loyalty" as any);
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

          {loyaltyOn && pets.length > 0 && (<Pressable onPress={openLoyalty} hitSlop={6} style={[
                styles.pointsTotal,
                isArabic &&
                    styles.pointsTotalRtl,
            ]}>

              <Ionicons name="star" size={14} color={POINTS.gold}/>

              <Text style={styles.pointsTotalText}>

                {t.pointsTotal(loyalty?.total_points ?? 0)}

              </Text>

              <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={14} color={POINTS.dark}/>

            </Pressable>)}

        </View>

        

        <View style={[
            styles.toolbar,
            isCompact &&
                styles.toolbarCompact,
            isArabic &&
                !isCompact &&
                styles.rowRtl,
        ]}>

          

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
                    pets.length - 1} onManage={() => openManagePet(pet)} plan={planFor(pet)} premium={premiumFor(pet)} points={pointsFor(pet)} currency={currency} onPoints={openLoyalty}/>))}

          </View>) : (<View style={styles.gridContainer}>

            {pets.map((pet) => (<PetGridCard key={pet.id} pet={pet as ExtendedPet} t={t} isArabic={isArabic} isCompact={isCompact} onManage={() => openManagePet(pet)} plan={planFor(pet)} premium={premiumFor(pet)} points={pointsFor(pet)} currency={currency} onPoints={openLoyalty}/>))}

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
        const isPremium = !!(purchase as PurchaseSummary & PremiumFlags).is_personalized;
        plan = `${isPremium ? t.premiumSubscription : purchase.product.name} (${purchase.usage.total_recipes} ${t.meals})`;
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
    };
}
/*
 * PREMIUM badge (crown) + short line: being prepared / custom recipes ready
 */
function PremiumBadge({ t, isArabic, premium, withNote, }: {
    t: any;
    isArabic: boolean;
    premium: PremiumInfo;
    withNote?: boolean;
}) {
    if (!premium) {
        return null;
    }
    return (<View style={styles.premiumWrap}>

      <View style={[
            styles.premiumBadge,
            isArabic &&
                styles.rowRtl,
            isArabic &&
                styles.premiumBadgeRtl,
        ]}>

        <MaterialCommunityIcons name="crown" size={14} color="#FFFFFF"/>

        <Text style={styles.premiumBadgeText}>

          {t.premium}

        </Text>

      </View>

      {withNote && (<View style={[
                styles.premiumNote,
                isArabic &&
                    styles.rowRtl,
            ]}>

          <Ionicons name={premium.pending ? "call-outline" : "sparkles"} size={14} color={GOLD.dark}/>

          <Text style={[
                styles.premiumNoteText,
                isArabic &&
                    styles.textRtl,
            ]}>

            {premium.pending ? t.premiumPending : t.premiumReady}

          </Text>

        </View>)}

    </View>);
}
/*
 * LOYALTY POINTS of a pet: balance + level, usable now / missing,
 * lost soon. Tap = "My points" page.
 */
function PetPoints({ points, t, isArabic, currency, compact, onPress, }: {
    points: PetLoyalty | null;
    t: any;
    isArabic: boolean;
    currency: string;
    compact?: boolean;
    onPress: () => void;
}) {
    if (!points || (points.balance <= 0 && points.lifetime_earned <= 0)) {
        return null;
    }
    const usable = points.usable_points > 0;
    const losingSoon = points.balance > 0 && points.days_left !== null && points.days_left >= 0 && points.days_left <= 7;
    const detail = losingSoon
        ? t.pointsLost(points.days_left)
        : usable
            ? t.pointsUsable(`${points.usable_discount.toFixed(3)} ${currency}`)
            : points.balance > 0
                ? t.pointsMissing(points.missing_points)
                : null;
    return (<Pressable onPress={onPress} hitSlop={4} style={[
            styles.pointsRow,
            usable && styles.pointsRowUsable,
            losingSoon && styles.pointsRowDanger,
            isArabic && styles.pointsTotalRtl,
        ]}>

      <MaterialCommunityIcons name={(points.level ? levelIcon(points.level.icon) : "star") as any} size={15} color={points.level?.color ?? POINTS.gold}/>

      <Text numberOfLines={1} style={styles.pointsValue}>

        {points.balance} {t.points}

      </Text>

      {!!detail && !compact && (<Text numberOfLines={1} style={[
                styles.pointsDetail,
                usable && styles.pointsDetailUsable,
                losingSoon && styles.pointsDetailDanger,
                isArabic && styles.textRtl,
            ]}>

          · {detail}

        </Text>)}

    </Pressable>);
}
function PetListItem({ pet, t, isArabic, isCompact, isLast, onManage, plan: purchase, premium, points, currency, onPoints, }: {
    pet: ExtendedPet;
    t: any;
    isArabic: boolean;
    isCompact: boolean;
    isLast: boolean;
    onManage: () => void;
    plan: PurchaseSummary | null;
    premium: PremiumInfo;
    points: PetLoyalty | null;
    currency: string;
    onPoints: () => void;
}) {
    const { active, pending, statusLabel, nextDate, plan, details, } = getPetData(pet, t, purchase, isArabic);
    // Tap on the card = Manage (pet profile)
    return (<Pressable onPress={onManage} style={({ pressed, }) => [
            styles.listPet,
            !isLast &&
                styles.listPetBorder,
            pressed &&
                styles.cardPressed,
        ]}>

      

      <View style={[
            styles.listPetTop,
            isCompact &&
                styles.listPetTopCompact,
            isArabic &&
                styles.rowRtl,
        ]}>

        <PetAvatar pet={pet} mode="list" isCompact={isCompact} premium={!!premium}/>

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

          <PremiumBadge t={t} isArabic={isArabic} premium={premium}/>

          <PetPoints points={points} t={t} isArabic={isArabic} currency={currency} onPress={onPoints}/>

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

      </View>

    </Pressable>);
}
function PetGridCard({ pet, t, isArabic, isCompact, onManage, plan: purchase, premium, points, currency, onPoints, }: {
    pet: ExtendedPet;
    t: any;
    isArabic: boolean;
    isCompact: boolean;
    onManage: () => void;
    plan: PurchaseSummary | null;
    premium: PremiumInfo;
    points: PetLoyalty | null;
    currency: string;
    onPoints: () => void;
}) {
    const { active, pending, statusLabel, nextDate, plan, details, } = getPetData(pet, t, purchase, isArabic);
    // Tap on the card = Manage (pet profile)
    return (<Pressable onPress={onManage} style={({ pressed, }) => [
            styles.gridCard,
            isCompact &&
                styles.gridCardCompact,
            pressed &&
                styles.cardPressed,
        ]}>

      <PetAvatar pet={pet} mode="grid" isCompact={isCompact} premium={!!premium}/>

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

      <PremiumBadge t={t} isArabic={isArabic} premium={premium}/>

      <PetPoints points={points} t={t} isArabic={isArabic} currency={currency} compact onPress={onPoints}/>

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

    </Pressable>);
}
function PetAvatar({ pet, mode, isCompact, premium, }: {
    pet: Pet;
    mode: ViewMode;
    isCompact: boolean;
    premium?: boolean;
}) {
    const containerStyle = [
        mode === "grid"
            ? styles.gridAvatar
            : [
                styles.listAvatar,
                isCompact &&
                    styles.listAvatarCompact,
            ],
        premium &&
            styles.avatarPremium,
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
    cardPressed: {
        opacity: 0.85,
    },
    // PREMIUM pet: gold border on the photo + badge only
    avatarPremium: {
        borderColor: GOLD.border,
    },
    premiumWrap: {
        marginTop: 6,
        marginBottom: 4,
        gap: 6,
    },
    premiumBadge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: GOLD.main,
    },
    premiumBadgeRtl: {
        alignSelf: "flex-end",
    },
    premiumBadgeText: {
        fontFamily: "Cairo_700Bold",
        fontSize: 12,
        lineHeight: 18,
        color: "#FFFFFF",
    },
    premiumNote: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    premiumNoteText: {
        flex: 1,
        fontFamily: "Cairo_700Bold",
        fontSize: 12,
        lineHeight: 18,
        color: GOLD.dark,
    },
    // LOYALTY POINTS
    pointsTotal: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: POINTS.border,
        backgroundColor: POINTS.light,
    },
    pointsTotalRtl: {
        alignSelf: "flex-end",
        flexDirection: "row-reverse",
    },
    pointsTotalText: {
        fontFamily: "Cairo_700Bold",
        fontSize: 12.5,
        color: POINTS.dark,
    },
    pointsRow: {
        alignSelf: "flex-start",
        maxWidth: "100%",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 6,
        marginBottom: 4,
        paddingHorizontal: 9,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: POINTS.border,
        backgroundColor: POINTS.light,
    },
    pointsRowUsable: {
        borderColor: "#86C9A0",
        backgroundColor: "#ECF8F0",
    },
    pointsRowDanger: {
        borderColor: "#F0A8A0",
        backgroundColor: "#FDECEA",
    },
    pointsValue: {
        fontFamily: "Cairo_700Bold",
        fontSize: 12,
        lineHeight: 18,
        color: COLORS.text,
    },
    pointsDetail: {
        flexShrink: 1,
        fontFamily: "Cairo_500Medium",
        fontSize: 11.5,
        lineHeight: 18,
        color: POINTS.dark,
    },
    pointsDetailUsable: {
        color: "#15803D",
    },
    pointsDetailDanger: {
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