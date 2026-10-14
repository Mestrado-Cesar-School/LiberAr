import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryButton, ScreenHeader } from "../components/ui";
import { colors } from "../theme/colors";

// Login de retorno. Protótipo sem backend: ao entrar, o app restaura uma
// conta de demonstração com o e-mail informado (ou do provedor social).

type LoginScreenProps = {
  onClose: () => void;
  onForgot: () => void;
  onSuccess: (email: string | null, provider: "email" | "google" | "apple") => void;
};

export function LoginScreen({ onClose, onForgot, onSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const canSubmit = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={onClose} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <LinearGradient colors={[colors.blue400, "#2DD4BF"]} style={styles.logo}>
            <Feather name="wind" size={32} color={colors.white} />
          </LinearGradient>
          <Text style={styles.title}>Bem-vinda de volta</Text>
          <Text style={styles.subtitle}>Continue de onde parou</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Seu e-mail"
            placeholderTextColor={colors.slate400}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Sua senha"
              placeholderTextColor={colors.slate400}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
            <Pressable style={styles.eye} onPress={() => setShowPw((s) => !s)} hitSlop={8}>
              <Feather name={showPw ? "eye-off" : "eye"} size={18} color={colors.slate400} />
            </Pressable>
          </View>
          <Pressable onPress={onForgot} style={styles.forgot}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </Pressable>
        </View>

        <PrimaryButton
          label="Entrar"
          onPress={() => onSuccess(email.trim(), "email")}
          disabled={!canSubmit}
          style={styles.submit}
        />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.form}>
          <Pressable style={styles.google} onPress={() => onSuccess(null, "google")}>
            <FontAwesome name="google" size={16} color={colors.slate700} />
            <Text style={styles.googleText}>Continuar com Google</Text>
          </Pressable>
          <Pressable style={styles.apple} onPress={() => onSuccess(null, "apple")}>
            <FontAwesome name="apple" size={18} color={colors.white} />
            <Text style={styles.appleText}>Continuar com Apple</Text>
          </Pressable>
        </View>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Novo por aqui? </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.signupLink}>Criar conta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24, paddingTop: 0 },
  hero: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.slate800 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: 4 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.slate800,
  },
  passwordInput: { paddingRight: 48 },
  eye: { position: "absolute", right: 16, top: 17 },
  forgot: { alignSelf: "flex-end", paddingTop: 4 },
  forgotText: { color: colors.teal600, fontSize: 14, fontWeight: "600" },
  submit: { marginTop: 32 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: colors.slate200 },
  dividerText: { fontSize: 12, color: colors.slate400 },
  google: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: colors.slate200,
    borderRadius: 16,
    paddingVertical: 12,
  },
  googleText: { fontWeight: "600", fontSize: 14, color: colors.slate700 },
  apple: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#000",
    borderRadius: 16,
    paddingVertical: 12,
  },
  appleText: { fontWeight: "600", fontSize: 14, color: colors.white },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  signupText: { fontSize: 12, color: colors.slate400 },
  signupLink: { fontSize: 12, color: colors.teal600, fontWeight: "600" },
});
