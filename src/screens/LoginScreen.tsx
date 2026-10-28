import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryButton, ScreenHeader } from "../components/ui";
import { useApp } from "../context/AppContext";
import { describeError } from "../data/api";
import { colors } from "../theme/colors";

// Login de retorno: autentica na API (POST /auth/login). O AppContext guarda a
// sessão e o snapshot — com o perfil carregado, o Root troca para as abas.

type LoginScreenProps = {
  onClose: () => void;
  onForgot: () => void;
};

/** Login social só fica ativo com os client ids configurados no ambiente. */
export function socialLoginMessage(provider: "google" | "apple"): string {
  const label = provider === "google" ? "Google" : "Apple";
  const configured =
    provider === "google"
      ? Boolean(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID)
      : Boolean(process.env.EXPO_PUBLIC_APPLE_CLIENT_ID);
  return configured
    ? `Login com ${label} ainda não está disponível neste build do app`
    : `Login com ${label} não está configurado neste ambiente`;
}

export function LoginScreen({ onClose, onForgot }: LoginScreenProps) {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = /\S+@\S+\.\S+/.test(email) && password.length >= 6 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(describeError(e));
      setSubmitting(false);
    }
  };

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
            autoComplete="email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
          />
          <View>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Sua senha"
              placeholderTextColor={colors.slate400}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
            <Pressable style={styles.eye} onPress={() => setShowPw((s) => !s)} hitSlop={8}>
              <Feather name={showPw ? "eye-off" : "eye"} size={18} color={colors.slate400} />
            </Pressable>
          </View>
          <Pressable onPress={onForgot} style={styles.forgot}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color={colors.rose500} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {submitting ? (
          <View style={[styles.submit, styles.loading]}>
            <ActivityIndicator color={colors.white} />
            <Text style={styles.loadingText}>Entrando...</Text>
          </View>
        ) : (
          <PrimaryButton label="Entrar" onPress={submit} disabled={!canSubmit} style={styles.submit} />
        )}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.form}>
          <Pressable style={styles.google} onPress={() => setError(socialLoginMessage("google"))}>
            <FontAwesome name="google" size={16} color={colors.slate700} />
            <Text style={styles.googleText}>Continuar com Google</Text>
          </Pressable>
          <Pressable style={styles.apple} onPress={() => setError(socialLoginMessage("apple"))}>
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.rose50,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.rose500, fontWeight: "600" },
  submit: { marginTop: 32 },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.teal500,
  },
  loadingText: { color: colors.white, fontWeight: "700", fontSize: 17 },
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
