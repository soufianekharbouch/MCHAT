import type { PurchaseDelivery, PurchaseStatus } from "../../types/purchase";

/*
|--------------------------------------------------------------------------
| SHARED COLORS (same palette as the app screens)
|--------------------------------------------------------------------------
*/

export const PCOLORS = {
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
  dangerLight: "#FDECEC",
  warning: "#E9A23B",
  warningLight: "#FBF1E1",
  overlay: "rgba(0,0,0,0.38)",
};

export const FONTS = {
  regular: "Cairo_400Regular",
  medium: "Cairo_500Medium",
  semiBold: "Cairo_600SemiBold",
  bold: "Cairo_700Bold",
  extraBold: "Cairo_800ExtraBold",
};

/*
|--------------------------------------------------------------------------
| DATES (YYYY-MM-DD, local time, no timezone shift)
|--------------------------------------------------------------------------
*/

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const WEEKDAYS_SHORT_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const WEEKDAYS_SHORT_AR = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

export function parseISODate(value?: string | null): Date | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso) ?? new Date();
  date.setDate(date.getDate() + days);

  return toISODate(date);
}

/** Moves a date to Monday when it falls on a rest day (Sunday). */
export function skipRestDay(iso: string, restDays: number[] = [0]): string {
  let current = iso;

  for (let i = 0; i < 7; i++) {
    const date = parseISODate(current);
    if (!date || !restDays.includes(date.getDay())) return current;
    current = addDays(current, 1);
  }

  return current;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function monthLabel(date: Date, isArabic: boolean): string {
  const months = isArabic ? MONTHS_AR : MONTHS_EN;
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Tuesday, September 22, 2026" / "الثلاثاء 22 سبتمبر 2026" */
export function formatLongDate(iso?: string | null, isArabic = false): string {
  const date = parseISODate(iso);
  if (!date) return "-";

  if (isArabic) {
    return `${DAYS_AR[date.getDay()]} ${date.getDate()} ${MONTHS_AR[date.getMonth()]} ${date.getFullYear()}`;
  }

  return `${DAYS_EN[date.getDay()]}, ${MONTHS_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** "September 8, 2026" / "8 سبتمبر 2026" */
export function formatDate(iso?: string | null, isArabic = false): string {
  const date = parseISODate(iso);
  if (!date) return "-";

  return isArabic
    ? `${date.getDate()} ${MONTHS_AR[date.getMonth()]} ${date.getFullYear()}`
    : `${MONTHS_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** "26/09/2026" */
export function formatShortDate(iso?: string | null): string {
  const date = parseISODate(iso);
  if (!date) return "-";

  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function slotLabel(slot?: string | null): string {
  return slot ? slot.replace("-", " - ") : "-";
}

/*
|--------------------------------------------------------------------------
| STATUS
|--------------------------------------------------------------------------
*/

export function purchaseStatusColor(status: PurchaseStatus): string {
  switch (status) {
    case "active":
    case "paid":
      return PCOLORS.primary;
    case "pending":
      return PCOLORS.warning;
    case "cancelled":
    case "refunded":
      return PCOLORS.danger;
    default:
      return PCOLORS.muted;
  }
}

export type CalendarMarker = "scheduled" | "delivered" | "delayed";

export function deliveryMarker(delivery: PurchaseDelivery): CalendarMarker {
  if (delivery.status === "delivered") return "delivered";
  if (delivery.is_delayed) return "delayed";
  return "scheduled";
}

export function markerColor(marker: CalendarMarker): string {
  switch (marker) {
    case "delivered":
      return PCOLORS.primary;
    case "delayed":
      return PCOLORS.danger;
    default:
      return PCOLORS.warning;
  }
}

/*
|--------------------------------------------------------------------------
| TEXTS SHARED BY THE PURCHASE SCREENS
|--------------------------------------------------------------------------
*/

export function purchaseTexts(isArabic: boolean) {
  return isArabic
    ? {
        back: "رجوع",
        meals: "وجبة",
        loading: "جاري التحميل...",
        error: "حدث خطأ. حاول مرة أخرى.",
        retry: "إعادة المحاولة",
        cancel: "إلغاء",
        confirm: "تأكيد",
        save: "حفظ",
        close: "إغلاق",
        success: "تم بنجاح",
        none: "لا يوجد",

        subscriptionStatus: "حالة الاشتراك",
        packageSize: "حجم الباقة",
        price: "السعر",
        cycleStarted: "بداية الدورة:",
        cycleEnds: "نهاية الدورة:",
        notStarted: "تبدأ مع أول توصيل",
        daysLeft: "يوم متبقٍ",
        progress: "الوجبات المجدولة",
        remaining: "متبقية",

        planDeliveries: "جدولة التوصيلات",
        editDeliveries: "تعديل / تغيير التوزيع",
        renew: "تجديد الاشتراك",
        cancelPlan: "إلغاء الطلب",
        uploadReceipt: "إرسال إيصال التحويل",
        receiptSent: "تم إرسال الإيصال، بانتظار التحقق",
        awaitingPayment: "بانتظار تأكيد الدفع",
        paymentMethod: "طريقة الدفع",

        deliveryCalendar: "تقويم التوصيل",
        deliveryHistory: "سجل التوصيل",
        delivery: "التوصيل",
        nextDelivery: "التوصيل القادم",
        manageDelivery: "إدارة التوصيل",
        noDeliveries: "لا توجد توصيلات بعد.",
        scheduled: "مجدول",
        delivered: "تم التوصيل",
        delayed: "متأخر",

        sessionExpired: "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.",
      }
    : {
        back: "Back",
        meals: "meals",
        loading: "Loading...",
        error: "Something went wrong. Please try again.",
        retry: "Retry",
        cancel: "Cancel",
        confirm: "Confirm",
        save: "Save",
        close: "Close",
        success: "Success",
        none: "None",

        subscriptionStatus: "SUBSCRIPTION STATUS",
        packageSize: "Package Size",
        price: "Price",
        cycleStarted: "Cycle Started:",
        cycleEnds: "Cycle Ends:",
        notStarted: "Starts with the first delivery",
        daysLeft: "days left",
        progress: "Meals scheduled",
        remaining: "remaining",

        planDeliveries: "Plan my deliveries",
        editDeliveries: "Edit / Change Distribution",
        renew: "Renew Subscription",
        cancelPlan: "Cancel Purchase",
        uploadReceipt: "Send transfer receipt",
        receiptSent: "Receipt sent, awaiting verification",
        awaitingPayment: "Awaiting payment confirmation",
        paymentMethod: "Payment method",

        deliveryCalendar: "Delivery Calendar",
        deliveryHistory: "Delivery History",
        delivery: "Delivery",
        nextDelivery: "Next delivery",
        manageDelivery: "Manage Delivery",
        noDeliveries: "No deliveries yet.",
        scheduled: "Scheduled",
        delivered: "Delivered",
        delayed: "Delayed",

        sessionExpired: "Your session has expired. Please sign in again.",
      };
}