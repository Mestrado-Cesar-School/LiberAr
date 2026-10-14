import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Footer, Notice, PrimaryButton, ScreenHeader, Toggle, ui } from "../components/ui";
import { useApp } from "../context/AppContext";
import { pad2 } from "../core/progressEngine";
import {
  cancelDailyReminder,
  remindersSupported,
  requestPermission,
  scheduleReminders,
} from "../core/notifications";
import { colors } from "../theme/colors";

// Configurações do lembrete de check-in: horário e dias da semana.

const WEEKDAYS = [
  { n: 0, l: "D" },
  { n: 1, l: "S" },
  { n: 2, l: "T" },
  { n: 3, l: "Q" },
  { n: 4, l: "Q" },
  { n: 5, l: "S" },
  { n: 6, l: "S" },
];

function TimeStepper({
  value,
  max,
  step,
  onChange,
}: {
  value: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const wrap = (v: number) => (v + max) % max;
  return (
    <View style={styles.timeCol}>
      <Pressable onPress={() => onChange(wrap(value + step))} style={styles.timeArrow} hitSlop={6}>
        <Feather name="chevron-up" size={24} color={colors.teal600} />
      </Pressable>
      <Text style={styles.timeValue}>{pad2(value)}</Text>
      <Pressable onPress={() => onChange(wrap(value - step))} style={styles.timeArrow} hitSlop={6}>
        <Feather name="chevron-down" size={24} color={colors.teal600} />
      </Pressable>
    </View>
  );
}

export function ReminderSettingsScreen({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useApp();
  const [enabled, setEnabled] = useState(profile?.reminderEnabled ?? false);
  const [hour, setHour] = useState(profile?.reminderHour ?? 20);
  const [minute, setMinute] = useState(profile?.reminderMinute ?? 0);
  const [days, setDays] = useState<number[]>(profile?.reminderDays ?? [1, 2, 3, 4, 5]);

  const toggleDay = (n: number) =>
    setDays((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort()));

  const save = async () => {
    await updateProfile({
      reminderEnabled: enabled,
      reminderHour: hour,
      reminderMinute: minute,
      reminderDays: days,
    });
    if (enabled && days.length > 0) {
      await requestPermission();
      await scheduleReminders(hour, minute, days);
    } else {
      await cancelDailyReminder();
    }
    onClose();
  };

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Lembretes" onBack={onClose} />

      <ScrollView contentContainerStyle={ui.content}>
        <View style={[ui.card, styles.card]}>
          <View style={styles.cardHeader}>
            <View style={styles.bell}>
              <Feather name="bell" size={20} color={colors.orange500} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>Horário do lembrete diário</Text>
              <Text style={styles.cardSubtitle}>Vamos te lembrar de fazer o check-in</Text>
            </View>
            <Toggle value={enabled} onChange={setEnabled} />
          </View>
          <View style={[styles.timeBox, !enabled && styles.dim]}>
            <TimeStepper value={hour} max={24} step={1} onChange={setHour} />
            <Text style={styles.timeSep}>:</Text>
            <TimeStepper value={minute} max={60} step={5} onChange={setMinute} />
          </View>
        </View>

        <View style={[ui.card, styles.card, !enabled && styles.dim]}>
          <Text style={styles.cardTitle}>Dias da semana</Text>
          <View style={styles.daysRow}>
            {WEEKDAYS.map((d) => (
              <Pressable
                key={d.n}
                onPress={() => toggleDay(d.n)}
                style={[styles.day, days.includes(d.n) && styles.dayOn]}
              >
                <Text style={[styles.dayText, days.includes(d.n) && styles.dayTextOn]}>{d.l}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.daysHint}>Ativo em {days.length} de 7 dias</Text>
        </View>

        {!remindersSupported() && (
          <Notice tone="blue" icon="smartphone">
            As notificações são enviadas no app instalado (Android/iOS). No navegador, suas
            preferências ficam salvas.
          </Notice>
        )}

        <Notice tone="teal">
          Estudos mostram que a consistência do check-in nas 4 primeiras semanas dobra a chance de
          sucesso no tratamento.
        </Notice>
      </ScrollView>

      <Footer>
        <PrimaryButton label="Salvar" onPress={save} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  card: { padding: 20, gap: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  bell: { backgroundColor: colors.orange50, padding: 8, borderRadius: 12 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.slate800 },
  cardSubtitle: { fontSize: 12, color: colors.slate400 },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: colors.slate100,
    borderRadius: 12,
    paddingVertical: 8,
  },
  dim: { opacity: 0.5 },
  timeCol: { alignItems: "center" },
  timeArrow: { padding: 4 },
  timeValue: { fontSize: 32, fontWeight: "700", color: colors.slate800, minWidth: 56, textAlign: "center" },
  timeSep: { fontSize: 32, fontWeight: "700", color: colors.slate400 },
  daysRow: { flexDirection: "row", justifyContent: "space-between" },
  day: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  dayOn: { backgroundColor: colors.teal500 },
  dayText: { fontWeight: "700", fontSize: 14, color: colors.slate500 },
  dayTextOn: { color: colors.white },
  daysHint: { fontSize: 11, color: colors.slate400 },
});
