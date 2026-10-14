import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Footer, Notice, PrimaryButton, ScreenHeader, SelectCard, ui } from "../components/ui";
import { useApp } from "../context/AppContext";
import { formatDate } from "../core/progressEngine";
import { classifyFagerstrom, FAGERSTROM_QUESTIONS } from "../data/clinical";
import { colors } from "../theme/colors";

// Teste de Fagerström (opcional): mede o grau de dependência à nicotina.
// O resultado fica salvo para o tratamento e o relatório da consulta.

const SCALE = [
  ["0-2", "Muito baixa"],
  ["3-4", "Baixa"],
  ["5", "Média"],
  ["6-7", "Elevada"],
  ["8-10", "Muito elevada"],
];

export function FagerstromTestScreen({ onClose }: { onClose: () => void }) {
  const { saveFagerstrom } = useApp();
  const [answers, setAnswers] = useState<(number | null)[]>(FAGERSTROM_QUESTIONS.map(() => null));
  const [score, setScore] = useState<number | null>(null);

  const allAnswered = answers.every((a) => a !== null);

  const showResult = () => {
    const total = answers.reduce<number>((sum, v) => sum + (v ?? 0), 0);
    setScore(total);
    saveFagerstrom({
      score: total,
      label: classifyFagerstrom(total).label,
      date: formatDate(new Date()),
    });
  };

  const restart = () => {
    setAnswers(FAGERSTROM_QUESTIONS.map(() => null));
    setScore(null);
  };

  if (score !== null) {
    const result = classifyFagerstrom(score);
    return (
      <View style={ui.screen}>
        <ScreenHeader title="Resultado do Teste" onBack={onClose} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.result, { backgroundColor: result.bg, borderColor: result.border }]}>
            <Text style={styles.resultKicker}>Sua pontuação</Text>
            <Text style={styles.resultScore}>{score}</Text>
            <Text style={[styles.resultLabel, { color: result.color }]}>
              Dependência {result.label.toLowerCase()}
            </Text>
          </View>
          <View style={ui.card}>
            <Text style={styles.scaleTitle}>Referência de pontuação</Text>
            {SCALE.map(([range, label]) => (
              <View key={range} style={styles.scaleRow}>
                <Text style={styles.scaleText}>{range}</Text>
                <Text style={styles.scaleText}>{label}</Text>
              </View>
            ))}
          </View>
          <Notice tone="blue">
            Este teste é opcional e não substitui uma avaliação médica profissional. Fonte: INCA -
            Teste de Fagerström.
          </Notice>
        </ScrollView>
        <Footer>
          <PrimaryButton label="Refazer teste" variant="secondary" onPress={restart} />
          <PrimaryButton label="Concluir" onPress={onClose} />
        </Footer>
      </View>
    );
  }

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Teste de Fagerström" onBack={onClose} />
      <ScrollView contentContainerStyle={styles.content}>
        <Notice tone="teal" icon="activity">
          Teste opcional que mede o grau de dependência à nicotina. Responda com sinceridade, não há
          respostas certas ou erradas.
        </Notice>
        {FAGERSTROM_QUESTIONS.map((item, qIdx) => (
          <View key={item.q} style={[ui.card, styles.question]}>
            <Text style={styles.questionText}>
              {qIdx + 1}. {item.q}
            </Text>
            {item.options.map((opt) => (
              <SelectCard
                key={opt.label}
                title={opt.label}
                active={answers[qIdx] === opt.value}
                onPress={() =>
                  setAnswers((prev) => prev.map((a, i) => (i === qIdx ? opt.value : a)))
                }
                style={styles.option}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <Footer>
        <PrimaryButton label="Ver resultado" onPress={showResult} disabled={!allAnswered} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  result: { borderRadius: 24, padding: 24, borderWidth: 1, alignItems: "center", gap: 6 },
  resultKicker: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultScore: { fontSize: 48, fontWeight: "700", color: colors.slate800 },
  resultLabel: { fontSize: 18, fontWeight: "700" },
  scaleTitle: { fontSize: 14, fontWeight: "600", color: colors.slate700, marginBottom: 6 },
  scaleRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  scaleText: { fontSize: 14, color: colors.slate500 },
  question: { gap: 8 },
  questionText: { fontSize: 14, fontWeight: "600", color: colors.slate800, marginBottom: 4 },
  option: { borderWidth: 1, paddingVertical: 12 },
});
