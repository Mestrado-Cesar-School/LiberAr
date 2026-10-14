// Lembrete de check-in via expo-notifications.
//
// Todas as chamadas são defensivas: em ambiente web (protótipo no navegador)
// as notificações agendadas não são suportadas, então as funções viram no-op
// em vez de quebrar. Em produção, num build nativo, o lembrete é agendado de
// verdade no horário e nos dias da semana escolhidos pelo usuário.

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const REMINDER_PREFIX = "liberar-checkin";
const isNative = Platform.OS === "ios" || Platform.OS === "android";

const CONTENT = {
  title: "Hora do seu check-in 🌬️",
  body: "Como foi seu dia? Registre seu humor e sua fissura no LiberAr.",
};

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

/**
 * (Re)agenda o lembrete no horário informado, nos dias da semana escolhidos
 * (0 = domingo). Com os 7 dias, usa um único gatilho diário.
 */
export async function scheduleReminders(hour: number, minute: number, days: number[]): Promise<void> {
  if (!isNative) return;
  try {
    await cancelDailyReminder();
    if (days.length === 7) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}-daily`,
        content: CONTENT,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
      return;
    }
    for (const day of days) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}-${day}`,
        content: CONTENT,
        // expo-notifications usa 1 = domingo ... 7 = sábado.
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute },
      });
    }
  } catch {
    // Silencioso: o toggle na UI já reflete a preferência do usuário.
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (!isNative) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(REMINDER_PREFIX) || n.identifier === "liberar-daily-checkin")
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // Sem lembrete agendado — nada a cancelar.
  }
}

/** Notificações agendadas estão disponíveis nesta plataforma? */
export function remindersSupported(): boolean {
  return isNative;
}
