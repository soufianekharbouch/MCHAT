import { useEffect } from "react";
import { router } from "expo-router";

/*
|--------------------------------------------------------------------------
| QUICK DELIVERY -> PLANNING SCREEN
|--------------------------------------------------------------------------
|
| "Choose the day" (taste pack, plan reminder, after the payment...) now
| always opens the planning screen of the pack (distribute-package):
| same rules everywhere (number of deliveries, meals per delivery, days
| between deliveries, address, previous pack of the pet first).
|
| The component keeps the same props, so the screens that use it do not
| change: when it becomes visible it opens the planning screen and closes.
|
*/

/** Same rule as the server: before 18:00 -> tomorrow, after -> the day after, no Sunday. */
export function nextDeliveryDays(count = 14): string[] {
  const days: string[] = [];
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (new Date().getHours() < 18 ? 1 : 2));

  while (days.length < count) {
    if (date.getDay() !== 0) {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      days.push(`${date.getFullYear()}-${month}-${day}`);
    }
    date.setDate(date.getDate() + 1);
  }

  return days;
}

type Props = {
  visible: boolean;
  purchaseId: number | null;
  petName?: string | null;
  isTastePack: boolean;
  days?: string[] | null;
  isArabic: boolean;
  onClose: () => void;
  onPlanned: () => void;
};

export default function QuickDeliverySheet({ visible, purchaseId, onClose }: Props) {
  useEffect(() => {
    if (!visible || !purchaseId) {
      return;
    }

    // The sheet state of the screen is reset, then the planning screen opens
    onClose();
    router.push({ pathname: "/distribute-package", params: { id: String(purchaseId) } } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, purchaseId]);

  return null;
}