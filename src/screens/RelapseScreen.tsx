import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Notice } from "../components/ui";
import { useApp } from "../context/AppContext";
import { colors } from "../theme/colors";

// Apoio à recaída (TCC): acolhe sem julgamento e deixa o usuário decidir se
// mantém a sequência atual ou reinicia a contagem — salvando o ciclo anterior.

type RelapseScreenProps = {
  onDone: () => void;
};

export function RelapseScreen({ onDone }: RelapseScreenProps) {
  const { progress, cycles, restartStreak } = useApp();
  const elapsedDays = progress?.days ?? 0;
  const cycleNumber = cycles.length + 1;

  const restart = async () => {
    await restartStreak();
    onDone();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#FBBF24", colors.orange400]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heartWrap}>
          <Feather name="heart" size={36} color={colors.white} />
        </View>
        <Text style={styles.heroTitle}>Tudo bem.</Text>
        <Text style={styles.heroText}>
          Recaídas são parte de um processo real. Você não falhou — você está aprendendo. O que
          importa é que você voltou.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Notice tone="amber" icon={null} title="A ciência confirma:">
          A maioria das pessoas tenta parar de fumar múltiplas vezes antes de ter sucesso
          duradouro. Cada tentativa ensina algo novo sobre seus gatilhos e fortalece sua
          determinação.
        </Notice>

        <Text style={styles.question}>O que você quer fazer agora?</Text>

        <Pressable style={[styles.option, styles.optionKeep]} onPress={onDone}>
          <View style={[styles.optionIcon, { backgroundColor: colors.teal50 }]}>
            <Feather name="activity" size={22} color={colors.teal600} />
          </View>
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>Continuar minha sequência atual</Text>
            <Text style={styles.optionText}>
              Manter o cronômetro e o histórico como estão. Um deslize pontual não define sua
              jornada.
            </Text>
          </View>
        </Pressable>

        <Pressable style={styles.option} onPress={restart}>
          <View style={[styles.optionIcon, { backgroundColor: colors.slate50 }]}>
            <Feather name="refresh-cw" size={22} color={colors.slate500} />
          </View>
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>Reiniciar minha contagem</Text>
            <Text style={styles.optionText}>
              O cronômetro recomeça do zero agora.
              {elapsedDays > 0 && (
                <>
                  {" "}Seu{" "}
                  <Text style={styles.optionStrong}>
                    Ciclo {cycleNumber} ({elapsedDays} {elapsedDays === 1 ? "dia" : "dias"})
                  </Text>{" "}
                  será salvo no seu histórico de ciclos.
                </>
              )}
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  hero: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40, alignItems: "center" },
  heartWrap: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroTitle: { fontSize: 24, fontWeight: "700", color: colors.white, marginBottom: 8 },
  heroText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 290,
  },
  content: { padding: 24, gap: 16 },
  question: { fontSize: 14, fontWeight: "600", color: colors.slate500, textAlign: "center", paddingTop: 8 },
  option: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  optionKeep: { borderColor: "#2DD4BF" },
  optionIcon: { padding: 12, borderRadius: 12 },
  optionBody: { flex: 1 },
  optionTitle: { fontWeight: "700", color: colors.slate800, marginBottom: 4, fontSize: 15 },
  optionText: { fontSize: 12, color: colors.slate500, lineHeight: 17 },
  optionStrong: { fontWeight: "600", color: colors.orange600 },
});
