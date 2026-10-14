import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PrimaryButton, ScreenHeader } from "../components/ui";
import { colors } from "../theme/colors";

// Recuperar senha. Protótipo sem backend: apenas confirma o envio do link.

export function ForgotPasswordScreen({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /\S+@\S+\.\S+/.test(email);

  if (sent) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={40} color={colors.teal600} />
        </View>
        <Text style={styles.sentTitle}>Verifique seu e-mail</Text>
        <Text style={styles.sentText}>
          Enviamos um link para <Text style={styles.strong}>{email}</Text>. Toque no link para
          redefinir sua senha.
        </Text>
        <PrimaryButton label="Voltar ao login" onPress={onClose} style={styles.sentButton} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={onClose} />
      <View style={styles.content}>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>
          Informe seu e-mail cadastrado e enviaremos um link para você criar uma nova senha.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Seu e-mail"
          placeholderTextColor={colors.slate400}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <PrimaryButton
          label="Enviar link de recuperação"
          onPress={() => setSent(true)}
          disabled={!valid}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  content: { padding: 24, paddingTop: 0 },
  title: { fontSize: 24, fontWeight: "700", color: colors.slate800 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: 4, marginBottom: 32, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.slate800,
  },
  button: { marginTop: 24 },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: colors.teal100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  sentTitle: { fontSize: 24, fontWeight: "700", color: colors.slate800, marginBottom: 8 },
  sentText: { fontSize: 14, color: colors.slate500, textAlign: "center", maxWidth: 300, lineHeight: 20 },
  strong: { fontWeight: "700" },
  sentButton: { marginTop: 32, alignSelf: "stretch" },
});
