import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

// Exercício de respiração guiada (acionado pelo Botão de Emergência).
// Ciclo de respiração calmante 4-4-6: inspirar, segurar, expirar.
// O círculo expande na inspiração e contrai na expiração, dando ao usuário
// um ritmo visual para acompanhar durante a fissura.

type Phase = {
  key: "inhale" | "hold" | "exhale";
  label: string;
  seconds: number;
  scale: number;
};

const CYCLE: Phase[] = [
  { key: "inhale", label: "Inspire", seconds: 4, scale: 1 },
  { key: "hold", label: "Segure", seconds: 4, scale: 1 },
  { key: "exhale", label: "Expire", seconds: 6, scale: 0.55 },
];

const TOTAL_CYCLES = 5;

type BreathingExerciseProps = {
  visible: boolean;
  onClose: () => void;
};

export function BreathingExercise({ visible, onClose }: BreathingExerciseProps) {
  const scale = useRef(new Animated.Value(0.55)).current;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [count, setCount] = useState(CYCLE[0].seconds);
  const [done, setDone] = useState(false);

  // Reinicia o exercício sempre que a tela abre.
  useEffect(() => {
    if (!visible) return;
    setPhaseIndex(0);
    setCycle(1);
    setCount(CYCLE[0].seconds);
    setDone(false);
    scale.setValue(0.55);
  }, [visible, scale]);

  // Anima o círculo conforme a fase atual.
  useEffect(() => {
    if (!visible || done) return;
    const phase = CYCLE[phaseIndex];
    Animated.timing(scale, {
      toValue: phase.scale,
      duration: phase.seconds * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [visible, done, phaseIndex, scale]);

  // Contagem regressiva e avanço entre fases/ciclos.
  useEffect(() => {
    if (!visible || done) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c > 1) return c - 1;
        // Fim da fase: avança.
        setPhaseIndex((prevPhase) => {
          const nextPhase = (prevPhase + 1) % CYCLE.length;
          if (nextPhase === 0) {
            setCycle((prevCycle) => {
              if (prevCycle >= TOTAL_CYCLES) {
                setDone(true);
                return prevCycle;
              }
              return prevCycle + 1;
            });
          }
          return nextPhase;
        });
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [visible, done, phaseIndex]);

  // Ao trocar de fase, recarrega o contador com a duração da nova fase.
  useEffect(() => {
    if (!done) setCount(CYCLE[phaseIndex].seconds);
  }, [phaseIndex, done]);

  const phase = CYCLE[phaseIndex];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Feather name="x" size={24} color="rgba(255,255,255,0.9)" />
        </Pressable>

        {!done ? (
          <>
            <Text style={styles.cycleLabel}>
              Ciclo {cycle} de {TOTAL_CYCLES}
            </Text>

            <View style={styles.circleArea}>
              <Animated.View style={[styles.circleOuter, { transform: [{ scale }] }]}>
                <View style={styles.circleInner}>
                  <Text style={styles.phaseLabel}>{phase.label}</Text>
                  <Text style={styles.countLabel}>{count}</Text>
                </View>
              </Animated.View>
            </View>

            <Text style={styles.hint}>
              Acompanhe o círculo. Deixe a fissura passar como uma onda.
            </Text>
          </>
        ) : (
          <View style={styles.doneArea}>
            <View style={styles.doneIcon}>
              <Feather name="check" size={40} color={colors.teal600} />
            </View>
            <Text style={styles.doneTitle}>Você conseguiu 💙</Text>
            <Text style={styles.doneText}>
              A vontade mais forte já passou. Cada minuto sem fumar é uma vitória
              do seu corpo.
            </Text>
            <Pressable style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Estou mais calmo</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.teal600,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  closeButton: {
    position: "absolute",
    top: 48,
    right: 24,
    padding: 8,
  },
  cycleLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 24,
  },
  circleArea: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  circleOuter: {
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleInner: {
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  phaseLabel: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "700",
  },
  countLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 18,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  hint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    textAlign: "center",
    marginTop: 32,
    maxWidth: 280,
    lineHeight: 22,
  },
  doneArea: {
    alignItems: "center",
    gap: 16,
    maxWidth: 320,
  },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  doneTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "700",
  },
  doneText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  doneButtonText: {
    color: colors.teal600,
    fontWeight: "700",
    fontSize: 17,
  },
});
