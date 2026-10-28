import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PrimaryButton, ScreenHeader } from "../components/ui";
import { useApp } from "../context/AppContext";
import { ApiError, describeError } from "../data/api";
import { colors } from "../theme/colors";

// Recuperar senha em duas etapas: a API envia um código de 6 dígitos para o
// e-mail (POST /auth/forgot-password) e o usuário o informa junto da nova
// senha (POST /auth/reset-password).

type Step = "email" | "code" | "done";

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.ruleDot, ok && styles.ruleDotOk]}>
        {ok && <Feather name="check" size={10} color={colors.white} />}
      </View>
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{label}</Text>
    </View>
  );
}

export function ForgotPasswordScreen({ onClose }: { onClose: () => void }) {
  const { requestPasswordReset, resetPassword } = useApp();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validEmail = /\S+@\S+\.\S+/.test(email);
  const pwHasLength = password.length >= 8;
  const pwHasLetter = /[a-zA-Z]/.test(password);
  const pwHasNumber = /[0-9]/.test(password);
  const pwValid = pwHasLength && pwHasLetter && pwHasNumber;
  const codeValid = /^\d{6}$/.test(code);

  const sendCode = async () => {
    if (!validEmail || busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setStep("code");
      setInfo(`Se ${email.trim()} estiver cadastrado, você receberá um código em instantes.`);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!codeValid || !pwValid || busy) return;
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email.trim(), code, password);
      setStep("done");
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "INVALID_CODE"
          ? "Código inválido ou expirado. Confira o e-mail ou peça um novo código."
          : describeError(e)
      );
    } finally {
      setBusy(false);
    }
  };

  if (step === "done") {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={40} color={colors.teal600} />
        </View>
        <Text style={styles.sentTitle}>Senha redefinida</Text>
        <Text style={styles.sentText}>
          Sua nova senha já está valendo. Entre com <Text style={styles.strong}>{email.trim()}</Text>{" "}
          para continuar sua jornada.
        </Text>
        <PrimaryButton label="Voltar ao login" onPress={onClose} style={styles.sentButton} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={step === "code" ? () => setStep("email") : onClose} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === "email" ? (
          <>
            <Text style={styles.title}>Recuperar senha</Text>
            <Text style={styles.subtitle}>
              Informe seu e-mail cadastrado e enviaremos um código de 6 dígitos para você criar uma
              nova senha.
            </Text>
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
              onSubmitEditing={sendCode}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <PrimaryButton
              label={busy ? "Enviando..." : "Enviar código de recuperação"}
              onPress={sendCode}
              disabled={!validEmail || busy}
              style={styles.button}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>Digite o código</Text>
            <Text style={styles.subtitle}>
              Enviamos um código de 6 dígitos para <Text style={styles.strong}>{email.trim()}</Text>.
              Ele vale por 15 minutos.
            </Text>
            {info && (
              <View style={styles.infoBox}>
                <Feather name="mail" size={16} color={colors.teal600} />
                <Text style={styles.infoText}>{info}</Text>
              </View>
            )}
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="000000"
              placeholderTextColor={colors.slate300}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(t) => {
                setCode(t.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
            />
            <View>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Nova senha"
                placeholderTextColor={colors.slate400}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                onSubmitEditing={confirm}
              />
              <Pressable style={styles.eye} onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                <Feather name={showPw ? "eye-off" : "eye"} size={18} color={colors.slate400} />
              </Pressable>
            </View>
            {password.length > 0 && (
              <View style={styles.rules}>
                <PasswordRule ok={pwHasLength} label="Mínimo 8 caracteres" />
                <PasswordRule ok={pwHasLetter} label="Pelo menos uma letra" />
                <PasswordRule ok={pwHasNumber} label="Pelo menos um número" />
              </View>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
            {busy ? (
              <View style={[styles.button, styles.loading]}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : (
              <PrimaryButton
                label="Redefinir senha"
                onPress={confirm}
                disabled={!codeValid || !pwValid}
                style={styles.button}
              />
            )}
            <Pressable onPress={sendCode} style={styles.resend} disabled={busy}>
              <Text style={styles.resendText}>Não recebeu? Reenviar código</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  content: { padding: 24, paddingTop: 0, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", color: colors.slate800 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: -8, marginBottom: 12, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.slate800,
  },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: "center", fontWeight: "700" },
  passwordInput: { paddingRight: 48 },
  eye: { position: "absolute", right: 16, top: 17 },
  rules: { gap: 6, paddingHorizontal: 4 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleDotOk: { backgroundColor: colors.teal500 },
  ruleText: { fontSize: 12, color: colors.slate400 },
  ruleTextOk: { color: colors.teal600 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.teal50,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.teal800, lineHeight: 17 },
  errorText: { fontSize: 13, color: colors.rose500, fontWeight: "600" },
  button: { marginTop: 12 },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: colors.teal500,
  },
  resend: { alignSelf: "center", paddingVertical: 8 },
  resendText: { color: colors.teal600, fontSize: 13, fontWeight: "600" },
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
