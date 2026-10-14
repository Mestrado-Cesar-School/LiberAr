import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Chip, FlameRating, Footer, Notice, PrimaryButton, ScreenHeader } from "../components/ui";
import { useApp } from "../context/AppContext";
import { Mood } from "../core/types";
import { MOOD_OPTIONS, WITHDRAWAL_SYMPTOMS } from "../data/clinical";
import { colors } from "../theme/colors";

// Check-in diário (fluxo 4 do diagrama): humor, uso, fissura e sintomas de
// abstinência — esses registros entram no relatório para a consulta na UBS.

type CheckInScreenProps = {
  onClose: () => void;
  /** Chamado quando o usuário relata uso: abre a tela de apoio à recaída. */
  onRelapse: () => void;
};

export function CheckInScreen({ onClose, onRelapse }: CheckInScreenProps) {
  const { addCheckIn, todaysCheckIn, profile } = useApp();
  const isEditing = todaysCheckIn !== null;
  const [mood, setMood] = useState<Mood | null>(todaysCheckIn?.mood ?? null);
  const [smoked, setSmoked] = useState<boolean | null>(todaysCheckIn ? todaysCheckIn.smoked : null);
  const [amount, setAmount] = useState(
    todaysCheckIn && todaysCheckIn.cigarettes > 0 ? String(todaysCheckIn.cigarettes) : "1"
  );
  const [craving, setCraving] = useState(todaysCheckIn?.craving ?? 0);
  const [symptoms, setSymptoms] = useState<string[]>(todaysCheckIn?.symptoms ?? []);

  const unit =
    profile?.usageType === "vape" ? "puffs" : profile?.usageType === "ambos" ? "cigarros/puffs" : "cigarros";

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const save = async () => {
    // Preserva a hora do registro original ao editar o check-in de hoje.
    await addCheckIn({
      date: todaysCheckIn?.date ?? new Date().toISOString(),
      mood,
      smoked: smoked === true,
      cigarettes: smoked === true ? parseInt(amount, 10) || 1 : 0,
      craving,
      symptoms,
    });
    // Só abre o apoio à recaída quando o uso é um registro novo do dia.
    if (smoked === true && !todaysCheckIn?.smoked) onRelapse();
    else onClose();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEditing ? "Editar Check-in de Hoje" : "Check-in Diário"}
        onBack={onClose}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isEditing && (
          <Notice tone="blue" icon="edit-3">
            Você já fez check-in hoje. Pode ajustar suas respostas abaixo.
          </Notice>
        )}

        {/* Humor */}
        <View style={styles.section}>
          <Text style={styles.title}>Como você está se sentindo hoje?</Text>
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setMood(m.id)}
                style={[styles.moodCard, mood === m.id && styles.moodCardActive]}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={styles.moodLabel}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Fumou/usou hoje? */}
        <View style={styles.smokedBox}>
          <Text style={styles.subtitle}>Você fumou/usou hoje?</Text>
          <View style={styles.smokedRow}>
            <Pressable
              onPress={() => setSmoked(false)}
              style={[styles.pill, smoked === false && styles.pillNo]}
            >
              <Text style={[styles.pillText, smoked === false && styles.pillTextActive]}>Não</Text>
            </Pressable>
            <Pressable
              onPress={() => setSmoked(true)}
              style={[styles.pill, smoked === true && styles.pillYes]}
            >
              <Text style={[styles.pillText, smoked === true && styles.pillTextActive]}>Sim</Text>
            </Pressable>
          </View>

          {smoked === true && (
            <>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Quantos {unit}?</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="number-pad"
                  value={amount}
                  onChangeText={setAmount}
                  maxLength={3}
                />
              </View>
              <Notice tone="orange" title="Recaídas fazem parte do processo.">
                Na próxima tela, você poderá escolher se quer manter sua sequência atual ou
                reiniciar a contagem — a decisão é sua.
              </Notice>
            </>
          )}
        </View>

        {/* Nível de fissura */}
        <View style={styles.section}>
          <View>
            <Text style={styles.subtitle}>Nível de Fissura</Text>
            <Text style={styles.hint}>Quanta vontade você sentiu?</Text>
          </View>
          <FlameRating value={craving} onChange={setCraving} />
        </View>

        {/* Sintomas de abstinência */}
        <View style={styles.section}>
          <View>
            <Text style={styles.subtitle}>Sintomas de abstinência</Text>
            <Text style={styles.hint}>Marque o que você sentiu hoje</Text>
          </View>
          <View style={styles.chips}>
            {WITHDRAWAL_SYMPTOMS.map((s) => (
              <Chip key={s} label={s} active={symptoms.includes(s)} onPress={() => toggleSymptom(s)} />
            ))}
          </View>
          <Text style={styles.footNote}>
            <Feather name="file-text" size={11} color={colors.slate400} /> Esses registros entram no
            seu relatório para a consulta na UBS.
          </Text>
        </View>
      </ScrollView>

      <Footer>
        <PrimaryButton label="Salvar Check-in" onPress={save} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24, gap: 32, paddingBottom: 40 },
  section: { gap: 16 },
  title: { fontSize: 18, fontWeight: "600", color: colors.slate800, textAlign: "center" },
  subtitle: { fontSize: 16, fontWeight: "600", color: colors.slate800, textAlign: "center" },
  hint: { fontSize: 12, color: colors.slate500, textAlign: "center", marginTop: 2 },
  moodRow: { flexDirection: "row", justifyContent: "center", gap: 16 },
  moodCard: {
    width: 96,
    height: 112,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.slate100,
    backgroundColor: colors.slate50,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  moodCardActive: { borderColor: colors.teal500, backgroundColor: colors.teal50 },
  moodEmoji: { fontSize: 30 },
  moodLabel: { fontSize: 11, fontWeight: "600", color: colors.slate600 },
  smokedBox: { backgroundColor: colors.slate50, padding: 24, borderRadius: 24, gap: 16 },
  smokedRow: { flexDirection: "row", justifyContent: "center", gap: 16 },
  pill: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  pillNo: { backgroundColor: colors.teal500, borderColor: colors.teal500 },
  pillYes: { backgroundColor: colors.orange500, borderColor: colors.orange500 },
  pillText: { fontWeight: "600", color: colors.slate700, fontSize: 15 },
  pillTextActive: { color: colors.white },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    paddingLeft: 16,
  },
  amountLabel: { fontSize: 14, fontWeight: "600", color: colors.slate700 },
  amountInput: {
    width: 64,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "700",
    color: colors.orange600,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  footNote: { fontSize: 11, color: colors.slate400, textAlign: "center", lineHeight: 16 },
});
