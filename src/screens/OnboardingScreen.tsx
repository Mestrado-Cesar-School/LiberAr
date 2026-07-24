import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../context/AppContext";
import { colors } from "../theme/colors";

// Módulo de Onboarding & Perfil (fluxo 1 do diagrama):
// boas-vindas → identificação → hábitos → Dia D.

type QuitOption = { label: string; daysAgo: number };

const QUIT_OPTIONS: QuitOption[] = [
  { label: "Hoje", daysAgo: 0 },
  { label: "Há 3 dias", daysAgo: 3 },
  { label: "Há 1 semana", daysAgo: 7 },
  { label: "Há 2 semanas", daysAgo: 14 },
];

function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        style={styles.stepperButton}
        onPress={() => onChange(Math.max(min, value - 1))}
      >
        <Feather name="minus" size={20} color={colors.teal600} />
      </Pressable>
      <Text style={styles.stepperValue}>
        {value}
        {suffix ? ` ${suffix}` : ""}
      </Text>
      <Pressable
        style={styles.stepperButton}
        onPress={() => onChange(Math.min(max, value + 1))}
      >
        <Feather name="plus" size={20} color={colors.teal600} />
      </Pressable>
    </View>
  );
}

export function OnboardingScreen() {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cigsPerDay, setCigsPerDay] = useState(20);
  const [packPrice, setPackPrice] = useState("12,50");
  const [cigsPerPack, setCigsPerPack] = useState(20);
  const [quitOption, setQuitOption] = useState<QuitOption>(QUIT_OPTIONS[0]);

  const fillSocial = (provider: "google" | "apple") => {
    // Protótipo: os Provedores de Login Social preenchem uma conta demo.
    setName("Mariana Silva");
    setEmail(
      provider === "google" ? "mariana.silva@gmail.com" : "mariana.silva@icloud.com"
    );
  };

  const finish = () => {
    const quitDate = new Date();
    quitDate.setDate(quitDate.getDate() - quitOption.daysAgo);
    const price = parseFloat(packPrice.replace(",", ".")) || 12.5;
    completeOnboarding({
      name: name.trim() || "Visitante",
      email: email.trim() || "visitante@liberar.app",
      quitDate: quitDate.toISOString(),
      cigsPerDay,
      packPrice: price,
      cigsPerPack,
    });
  };

  const canContinueIdentity = name.trim().length >= 2 && email.includes("@");

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {step === 0 && (
        <LinearGradient
          colors={[colors.blue400, colors.teal500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcome}
        >
          <View style={styles.welcomeIconWrap}>
            <Feather name="wind" size={56} color={colors.white} />
          </View>
          <Text style={styles.welcomeTitle}>LiberAr</Text>
          <Text style={styles.welcomeSubtitle}>
            Respire fundo. Sua jornada para uma vida livre do cigarro começa
            agora — com acolhimento, ciência e um passo de cada vez.
          </Text>
          <Pressable style={styles.welcomeButton} onPress={() => setStep(1)}>
            <Text style={styles.welcomeButtonText}>Começar</Text>
            <Feather name="arrow-right" size={20} color={colors.teal600} />
          </Pressable>
          <Text style={styles.welcomeFootnote}>
            Baseado no Programa Nacional de Controle do Tabagismo
          </Text>
        </LinearGradient>
      )}

      {step > 0 && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Indicador de progresso */}
          <View style={styles.dots}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
            ))}
          </View>

          {step === 1 && (
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Vamos nos conhecer</Text>
              <Text style={styles.stepSubtitle}>
                Como podemos te chamar nessa caminhada?
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nome</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome"
                  placeholderTextColor={colors.slate400}
                  value={name}
                  onChangeText={setName}
                />
                <Text style={styles.fieldLabel}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.slate400}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>ou continue com</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialRow}>
                <Pressable style={styles.socialButton} onPress={() => fillSocial("google")}>
                  <FontAwesome name="google" size={18} color={colors.slate700} />
                  <Text style={styles.socialText}>Google</Text>
                </Pressable>
                <Pressable style={styles.socialButton} onPress={() => fillSocial("apple")}>
                  <FontAwesome name="apple" size={20} color={colors.slate700} />
                  <Text style={styles.socialText}>Apple</Text>
                </Pressable>
              </View>

              <Text style={styles.lgpdNote}>
                Seus dados ficam no seu dispositivo e são tratados conforme a
                LGPD. Você pode exportá-los ou apagá-los quando quiser.
              </Text>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Seus hábitos</Text>
              <Text style={styles.stepSubtitle}>
                Usamos isso para calcular sua economia e seus marcos de saúde.
                Sem julgamentos — é só matemática a seu favor.
              </Text>

              <View style={styles.habitCard}>
                <Text style={styles.habitLabel}>Cigarros por dia</Text>
                <Stepper value={cigsPerDay} onChange={setCigsPerDay} />
              </View>

              <View style={styles.habitCard}>
                <Text style={styles.habitLabel}>Preço do maço</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.pricePrefix}>R$</Text>
                  <TextInput
                    style={styles.priceInput}
                    keyboardType="decimal-pad"
                    value={packPrice}
                    onChangeText={setPackPrice}
                  />
                </View>
              </View>

              <View style={styles.habitCard}>
                <Text style={styles.habitLabel}>Cigarros por maço</Text>
                <Stepper value={cigsPerPack} onChange={setCigsPerPack} min={10} max={40} />
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Seu Dia D 🎯</Text>
              <Text style={styles.stepSubtitle}>
                O Dia D é o dia em que você parou (ou vai parar) de fumar.
                Quando foi o seu?
              </Text>

              <View style={styles.quitOptions}>
                {QUIT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.label}
                    onPress={() => setQuitOption(opt)}
                    style={[
                      styles.quitChip,
                      quitOption.label === opt.label && styles.quitChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quitChipText,
                        quitOption.label === opt.label && styles.quitChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.tipCard}>
                <Feather name="info" size={18} color={colors.blue600} />
                <Text style={styles.tipText}>
                  Ainda não parou? Escolha "Hoje" e faça deste o seu Dia D. O
                  Assistente LiberAr te acompanha desde o primeiro minuto.
                </Text>
              </View>
            </View>
          )}

          {/* Navegação entre etapas */}
          <View style={styles.stepNav}>
            <Pressable style={styles.backLink} onPress={() => setStep(step - 1)}>
              <Feather name="arrow-left" size={18} color={colors.slate500} />
              <Text style={styles.backLinkText}>Voltar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.nextButton,
                step === 1 && !canContinueIdentity && styles.nextButtonDisabled,
              ]}
              disabled={step === 1 && !canContinueIdentity}
              onPress={() => (step === 3 ? finish() : setStep(step + 1))}
            >
              <Text style={styles.nextButtonText}>
                {step === 3 ? "Começar jornada" : "Continuar"}
              </Text>
              <Feather name="arrow-right" size={18} color={colors.white} />
            </Pressable>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.slate50 },
  welcome: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  welcomeIconWrap: {
    width: 112,
    height: 112,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.white,
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  welcomeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  welcomeButtonText: {
    color: colors.teal600,
    fontWeight: "700",
    fontSize: 18,
  },
  welcomeFootnote: {
    position: "absolute",
    bottom: 40,
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  content: {
    padding: 24,
    paddingTop: 16,
    gap: 24,
    flexGrow: 1,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 32,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.slate200,
  },
  dotActive: {
    backgroundColor: colors.teal500,
  },
  stepBody: {
    gap: 16,
    flexGrow: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.slate800,
    textAlign: "center",
    marginTop: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate600,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.slate800,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate200,
  },
  dividerText: {
    fontSize: 12,
    color: colors.slate400,
  },
  socialRow: {
    flexDirection: "row",
    gap: 16,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 16,
    paddingVertical: 14,
  },
  socialText: {
    fontWeight: "600",
    color: colors.slate700,
    fontSize: 14,
  },
  lgpdNote: {
    fontSize: 12,
    color: colors.slate400,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
  habitCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  habitLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.slate700,
    flexShrink: 1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.slate800,
    minWidth: 36,
    textAlign: "center",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pricePrefix: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.slate500,
  },
  priceInput: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate800,
    minWidth: 90,
    textAlign: "center",
  },
  quitOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  quitChip: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.slate200,
  },
  quitChipActive: {
    backgroundColor: colors.teal50,
    borderColor: colors.teal500,
  },
  quitChipText: {
    fontWeight: "600",
    color: colors.slate600,
    fontSize: 15,
  },
  quitChipTextActive: {
    color: colors.teal600,
  },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue100,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.blue800,
    lineHeight: 19,
  },
  stepNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 24,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
  },
  backLinkText: {
    color: colors.slate500,
    fontWeight: "600",
    fontSize: 14,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.teal500,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: colors.teal500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  nextButtonDisabled: {
    backgroundColor: colors.slate300,
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
