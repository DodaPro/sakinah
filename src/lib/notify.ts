/* =========================================================
   إشعارات المتصفح — مساعد موحّد للتذكيرات (أذان + ملاحظات)
   ========================================================= */

export type NotifyState = "granted" | "denied" | "default" | "unsupported";

export function notifySupported(): boolean {
  return typeof window !== "undefined" && typeof Notification !== "undefined";
}

export function notifyPermission(): NotifyState {
  if (!notifySupported()) return "unsupported";
  return Notification.permission as NotifyState;
}

/** يطلب السماح بالإشعارات — يرجع الحالة النهائية */
export async function requestNotifyPermission(): Promise<NotifyState> {
  if (!notifySupported()) return "unsupported";
  try {
    const p = await Notification.requestPermission();
    return p as NotifyState;
  } catch {
    return notifyPermission();
  }
}

/** إشعار صامت — ما يرميش لو مش مسموح أو غير مدعوم */
export function pushNotification(title: string, body: string) {
  try {
    if (notifySupported() && Notification.permission === "granted") {
      new Notification(title, { body, dir: "rtl", lang: "ar" });
    }
  } catch {}
}
