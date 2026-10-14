import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { TabKey } from "./BottomNav";

// Tour de apresentação (primeira abertura após o onboarding): percorre os
// quatro pilares do app destacando cada aba da navegação inferior.

type TourStep = { tab: TabKey; badge: string; title: string; subtitle: string; desc: string };

export const TOUR_STEPS: TourStep[] = [
  { tab: "home", badge: "Pilar 1", title: "Início", subtitle: "Acompanhamento", desc: "Acompanhe seu tempo sem fumar em tempo real, desbloqueie conquistas de saúde e registre seu check-in diário." },
  { tab: "chat", badge: "Pilar 2", title: "Chat", subtitle: "Apoio 24 horas", desc: "Converse com nosso assistente sempre que precisar de incentivo, tirar dúvidas ou enfrentar um momento difícil." },
  { tab: "info", badge: "Pilar 3", title: "Explorar", subtitle: "Conhecimento", desc: "Artigos, apoio profissional (UBS) e testes como o de Fagerström para você entender melhor sua jornada." },
  { tab: "profile", badge: "Pilar 4", title: "Perfil", subtitle: "Sua Evolução", desc: "Acompanhe conquistas, seu histórico de ciclos e personalize lembretes para continuar motivada." },
];

type TourOverlayProps = {
  /** Troca a aba visível conforme o passo do tour. */
  onStepChange: (tab: TabKey) => void;
  onFinish: () => void;
};

export function TourOverlay({ onStepChange, onFinish }: TourOverlayProps) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  useEffect(() => {
    onStepChange(current.tab);
  }, [current.tab, onStepChange]);

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.kicker}>
          {current.badge} · {current.subtitle}
        </Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.desc}>{current.desc}</Text>
        <View style={styles.dots}>
          {TOUR_STEPS.map((s, i) => (
            <View key={s.tab} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.actions}>
          <Pressable onPress={onFinish} hitSlop={8}>
            <Text style={styles.skip}>Pular</Text>
          </Pressable>
          <Pressable
            style={styles.next}
            onPress={() => (isLast ? onFinish() : setStep((s) => s + 1))}
          >
            <Text style={styles.nextText}>{isLast ? "Concluir" : "Próximo"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 116,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.slate800 },
  desc: { fontSize: 14, color: colors.slate500, lineHeight: 20 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, paddingTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.slate200 },
  dotActive: { width: 24, backgroundColor: colors.teal500 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  skip: { fontSize: 14, fontWeight: "600", color: colors.slate400 },
  next: { backgroundColor: colors.teal500, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  nextText: { color: colors.white, fontWeight: "700", fontSize: 14 },
});
