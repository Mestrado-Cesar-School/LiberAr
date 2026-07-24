import React, { useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { BreathingExercise } from "./BreathingExercise";

type PanicModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function PanicModal({ visible, onClose }: PanicModalProps) {
  const [showBreathing, setShowBreathing] = useState(false);

  const closeAll = () => {
    setShowBreathing(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.pulseRing}>
          <View style={styles.iconCircle}>
            <Feather name="wind" size={32} color={colors.orange500} />
          </View>
        </View>

        <Text style={styles.title}>Respire Fundo</Text>
        <Text style={styles.subtitle}>
          A fissura dura apenas alguns minutos. Você consegue superar isso.
        </Text>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => setShowBreathing(true)}>
            <Text style={styles.primaryButtonText}>Iniciar Respiração Guiada</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => Linking.openURL("tel:188")}
          >
            <Text style={styles.secondaryButtonText}>Ligar para CVV (188)</Text>
          </Pressable>
        </View>

        <Pressable onPress={onClose} style={styles.dismiss}>
          <Text style={styles.dismissText}>Estou mais calmo, voltar</Text>
        </Pressable>
      </View>

      <BreathingExercise visible={showBreathing} onClose={closeAll} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(249, 115, 22, 0.96)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  pulseRing: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.white,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: colors.orange100,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 32,
    lineHeight: 26,
  },
  actions: {
    width: "100%",
    gap: 16,
  },
  primaryButton: {
    backgroundColor: colors.white,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: colors.orange600,
    fontWeight: "700",
    fontSize: 18,
  },
  secondaryButton: {
    backgroundColor: "rgba(234, 88, 12, 0.5)",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.5)",
  },
  secondaryButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  dismiss: {
    marginTop: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissText: {
    color: "rgba(255, 255, 255, 0.8)",
    textDecorationLine: "underline",
    fontSize: 14,
  },
});
