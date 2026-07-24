// Lembrete diário de check-in via expo-notifications.
//
// Todas as chamadas são defensivas: em ambiente web (protótipo no navegador)
// as notificações agendadas não são suportadas, então as funções viram no-op
// em vez de quebrar. Em produção, num build nativo, o lembrete é agendado de
// verdade no horário escolhido pelo usuário.

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const REMINDER_ID = "liberar-daily-checkin";
const isNative = Platform.OS === "ios" || Platform.OS === "android";

/** Pede permissão de notificação. Retorna true se concedida. */
export async function requestPermission(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/** (Re)agenda o lembrete diário no horário informado. */
export async function scheduleDailyReminder(hour: number): Promise<void> {
  if (!isNative) return;
  try {
    await cancelDailyReminder();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: "Hora do seu check-in 🌬️",
        body: "Como foi seu dia? Registre seu humor e sua fissura no LiberAr.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  } catch {
    // Silencioso: o toggle na UI já reflete a preferência do usuário.
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (!isNative) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // Sem lembrete agendado — nada a cancelar.
  }
}

/** Notificações agendadas estão disponíveis nesta plataforma? */
export function remindersSupported(): boolean {
  return isNative;
}
