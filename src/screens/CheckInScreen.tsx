import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { Mood } from "../core/types";
import { colors } from "../theme/colors";

const moods: { id: Mood; emoji: string; label: string }[] = [
  { id: "anxious", emoji: "😰", label: "Ansioso" },
  { id: "confident", emoji: "😎", label: "Confiante" },
  { id: "stressed", emoji: "😫", label: "Estressado" },
];

type CheckInScreenProps = {
  onClose: () => void;
};

export function CheckInScreen({ onClose }: CheckInScreenProps) {
  const { addCheckIn, todaysCheckIn } = useApp();
  const isEditing = todaysCheckIn !== null;
  const [mood, setMood] = useState<Mood | null>(todaysCheckIn?.mood ?? null);
  const [smoked, setSmoked] = useState<boolean | null>(
    todaysCheckIn ? todaysCheckIn.smoked : null
  );
  const [cigarettes, setCigarettes] = useState(
    todaysCheckIn && todaysCheckIn.cigarettes > 0 ? String(todaysCheckIn.cigarettes) : "1"
  );
  const [craving, setCraving] = useState(todaysCheckIn?.craving ?? 3);

  const save = () => {
    // Grava pelo Gerenciador de Sincronização Local e volta ao dashboard.
    // Preserva a hora do registro original ao editar o check-in de hoje.
    addCheckIn({
      date: todaysCheckIn?.date ?? new Date().toISOString(),
      mood,
      smoked: smoked === true,
      cigarettes: smoked === true ? parseInt(cigarettes, 10) || 1 : 0,
      craving,
    });
    onClose();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.slate500} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? "Editar Check-in de Hoje" : "Check-in Diário"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isEditing && (
          <View style={styles.editNote}>
            <Feather name="edit-3" size={16} color={colors.blue600} />
            <Text style={styles.editNoteText}>
              Você já fez check-in hoje. Pode ajustar suas respostas abaixo.
            </Text>
          </View>
        )}

        {/* Humor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como você está se sentindo hoje?</Text>
          <View style={styles.moodRow}>
            {moods.map((m) => (
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

        {/* Fumou hoje? */}
        <View style={styles.smokedSection}>
          <Text style={styles.smokedTitle}>Você fumou hoje?</Text>
          <View style={styles.smokedRow}>
            <Pressable
              onPress={() => setSmoked(false)}
              style={[styles.smokedButton, smoked === false && styles.smokedButtonNo]}
            >
              <Text
                style={[styles.smokedButtonText, smoked === false && styles.smokedButtonTextActive]}
              >
                Não
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSmoked(true)}
              style={[styles.smokedButton, smoked === true && styles.smokedButtonYes]}
            >
              <Text
                style={[styles.smokedButtonText, smoked === true && styles.smokedButtonTextActive]}
              >
                Sim
              </Text>
            </Pressable>
          </View>

          {smoked === true && (
            <View style={styles.cigarettesWrap}>
              <Text style={styles.cigarettesLabel}>Quantos cigarros?</Text>
              <TextInput
                style={styles.cigarettesInput}
                keyboardType="number-pad"
                value={cigarettes}
                onChangeText={setCigarettes}
                maxLength={3}
              />
            </View>
          )}

          {smoked === true && (
            <View style={styles.relapseNote}>
              <Text style={styles.relapseText}>
                Um deslize não apaga seu progresso. Seu contador de dias
                recomeça, mas tudo o que você já economizou continua com você.
                Amanhã é uma nova chance. 💙
              </Text>
            </View>
          )}
        </View>

        {/* Nível de fissura */}
        <View style={styles.section}>
          <View style={styles.cravingHeader}>
            <Text style={styles.cravingTitle}>Nível de Fissura</Text>
            <Text style={styles.cravingSubtitle}>Quanta vontade de fumar você sentiu?</Text>
          </View>
          <View style={styles.cravingRow}>
            {[1, 2, 3, 4, 5].map((level) => (
              <Pressable key={level} onPress={() => setCraving(level)} style={styles.flameButton}>
                <MaterialCommunityIcons
                  name="fire"
                  size={40}
                  color={level <= craving ? colors.orange500 : colors.slate200}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Ação principal */}
      <View style={styles.footer}>
        <Pressable style={styles.saveButton} onPress={save}>
          <Text style={styles.saveButtonText}>Salvar Check-in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 999,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.slate800,
  },
  content: {
    padding: 24,
    gap: 32,
    paddingBottom: 40,
  },
  editNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue100,
    borderRadius: 14,
    padding: 12,
    marginBottom: -8,
  },
  editNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.blue800,
    lineHeight: 18,
  },
  relapseNote: {
    backgroundColor: colors.orange50,
    borderWidth: 1,
    borderColor: colors.orange100,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  relapseText: {
    fontSize: 13,
    color: colors.orange600,
    lineHeight: 19,
    textAlign: "center",
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: colors.slate800,
    fontWeight: "600",
    fontSize: 18,
    textAlign: "center",
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  moodCard: {
    width: 96,
    height: 112,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.slate100,
    backgroundColor: colors.slate50,
    alignItems: "center",
    justifyContent: "center",
  },
  moodCardActive: {
    borderColor: colors.teal500,
    backgroundColor: colors.teal50,
    transform: [{ scale: 1.05 }],
  },
  moodEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.slate600,
  },
  smokedSection: {
    backgroundColor: colors.slate50,
    padding: 24,
    borderRadius: 24,
    gap: 16,
  },
  smokedTitle: {
    color: colors.slate800,
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  smokedRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  smokedButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  smokedButtonNo: {
    backgroundColor: colors.teal500,
    borderColor: colors.teal500,
  },
  smokedButtonYes: {
    backgroundColor: colors.orange500,
    borderColor: colors.orange500,
  },
  smokedButtonText: {
    fontWeight: "600",
    fontSize: 16,
    color: colors.slate600,
  },
  smokedButtonTextActive: {
    color: colors.white,
  },
  cigarettesWrap: {
    paddingTop: 8,
    alignItems: "center",
    gap: 8,
  },
  cigarettesLabel: {
    fontSize: 14,
    color: colors.slate600,
  },
  cigarettesInput: {
    width: 96,
    textAlign: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
    fontSize: 16,
    color: colors.slate800,
  },
  cravingHeader: {
    alignItems: "center",
    gap: 4,
  },
  cravingTitle: {
    color: colors.slate800,
    fontWeight: "600",
    fontSize: 16,
  },
  cravingSubtitle: {
    fontSize: 12,
    color: colors.slate500,
  },
  cravingRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  flameButton: {
    padding: 8,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  saveButton: {
    backgroundColor: colors.teal500,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: colors.teal500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 18,
  },
});
