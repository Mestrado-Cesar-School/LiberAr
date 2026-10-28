import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { PrimaryButton, SelectCard } from "../components/ui";
import { useApp } from "../context/AppContext";
import { pad2 } from "../core/progressEngine";
import { ApiError, auth as authApi, describeError, NetworkError } from "../data/api";
import { socialLoginMessage } from "./LoginScreen";
import {
  AuthMethod,
  MainFear,
  SmokeDuration,
  StopMethod,
  StopReason,
  UsageType,
  VapeHabits,
} from "../core/types";
import {
  MAIN_FEAR_OPTIONS,
  SMOKE_DURATION_OPTIONS,
  STOP_REASON_OPTIONS,
  TERMS_SECTIONS,
  USAGE_OPTIONS,
} from "../data/clinical";
import { colors } from "../theme/colors";

// Módulo de Onboarding & Perfil (fluxo 1 do diagrama):
// boas-vindas → cadastro → motivação (3 perguntas) → termos/LGPD →
// o que você usa → hábitos → como pretende parar → Dia D.
// A conta só é criada na API no último passo (POST /auth/register); na etapa
// de cadastro o e-mail é conferido em POST /auth/check-email.

const TOTAL_STEPS = 7; // etapas com indicador de progresso (1..7)

const VAPE_FIELDS: { key: keyof VapeHabits; label: string }[] = [
  { key: "nicotineMg", label: "Concentração nic. (mg/mL)" },
  { key: "juiceMl", label: "Volume do juice (mL)" },
  { key: "podDays", label: "Quanto tempo dura seu pod/refil? (dias)" },
  { key: "juicePrice", label: "Preço do juice (R$)" },
  { key: "coilPrice", label: "Preço do coil (R$)" },
];

function toNumber(text: string, fallback = 0): number {
  const n = parseFloat(text.replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

/** Converte "DD/MM/AAAA" + "HH:MM" em Date, ou null se inválido. */
function parseDateTime(date: string, time: string): Date | null {
  const d = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const t = time.match(/^(\d{2}):(\d{2})$/);
  if (!d || !t) return null;
  const result = new Date(+d[3], +d[2] - 1, +d[1], +t[1], +t[2]);
  if (result.getDate() !== +d[1] || +t[1] > 23 || +t[2] > 59) return null;
  return result;
}

/** Máscara simples para digitação de data/hora. */
function mask(text: string, pattern: "date" | "time"): string {
  const digits = text.replace(/\D/g, "");
  if (pattern === "time") {
    const v = digits.slice(0, 4);
    return v.length > 2 ? `${v.slice(0, 2)}:${v.slice(2)}` : v;
  }
  const v = digits.slice(0, 8);
  if (v.length > 4) return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  if (v.length > 2) return `${v.slice(0, 2)}/${v.slice(2)}`;
  return v;
}

const fmtDate = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperButton} onPress={() => onChange(Math.max(0, value - 1))}>
        <Text style={styles.stepperSign}>-</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperButton} onPress={() => onChange(value + 1)}>
        <Text style={styles.stepperSign}>+</Text>
      </Pressable>
    </View>
  );
}

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

type OnboardingScreenProps = {
  onLogin: () => void;
};

export function OnboardingScreen({ onLogin }: OnboardingScreenProps) {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);

  // Etapa 1 — cadastro
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const pwHasLength = password.length >= 8;
  const pwHasLetter = /[a-zA-Z]/.test(password);
  const pwHasNumber = /[0-9]/.test(password);
  const pwValid = pwHasLength && pwHasLetter && pwHasNumber;

  // Etapa 2 — motivação (3 sub-telas)
  const [motivSubStep, setMotivSubStep] = useState(0);
  const [smokeDuration, setSmokeDuration] = useState<SmokeDuration | null>(null);
  const [stopReason, setStopReason] = useState<StopReason | null>(null);
  const [stopReasonText, setStopReasonText] = useState("");
  const [mainFear, setMainFear] = useState<MainFear | null>(null);
  const [mainFearText, setMainFearText] = useState("");

  // Etapa 3 — termos
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsBoxHeight, setTermsBoxHeight] = useState(0);

  // Etapas 4 a 7
  const [usageType, setUsageType] = useState<UsageType | null>(null);
  const [cigsPerDay, setCigsPerDay] = useState(15);
  const [packPrice, setPackPrice] = useState("12,50");
  const [vape, setVape] = useState<Record<keyof VapeHabits, string>>({
    nicotineMg: "35",
    juiceMl: "30",
    podDays: "15",
    juicePrice: "80",
    coilPrice: "30",
  });
  const [stopMethod, setStopMethod] = useState<StopMethod | null>(null);
  const [quitDate, setQuitDate] = useState("");
  const [quitTime, setQuitTime] = useState("");
  const quitTimestamp = parseDateTime(quitDate, quitTime);

  // Último passo: cria a conta + jornada na API.
  const [submitting, setSubmitting] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const finish = async () => {
    if (!quitTimestamp || submitting) return;
    const usesVape = usageType === "vape" || usageType === "ambos";
    const cleanEmail = email.trim().toLowerCase();
    const profile = {
      name: name.trim(),
      email: cleanEmail,
      authMethod: authMethod ?? "email",
      quitDate: quitTimestamp.toISOString(),
      cigsPerDay,
      packPrice: toNumber(packPrice, 12.5),
      cigsPerPack: 20,
      usageType: usageType ?? "cigarro",
      vape: usesVape
        ? {
            nicotineMg: toNumber(vape.nicotineMg),
            juiceMl: toNumber(vape.juiceMl),
            podDays: Math.max(1, toNumber(vape.podDays, 15)),
            juicePrice: toNumber(vape.juicePrice),
            coilPrice: toNumber(vape.coilPrice),
          }
        : undefined,
      stopMethod: stopMethod ?? "abrupto",
      smokeDuration: smokeDuration ?? undefined,
      stopReason: stopReason ?? undefined,
      stopReasonText: stopReasonText.trim() || undefined,
      mainFear: mainFear ?? undefined,
      mainFearText: mainFearText.trim() || undefined,
      tourDone: false,
    } as const;
    setFinishError(null);
    setSubmitting(true);
    try {
      await completeOnboarding(profile, { name: name.trim(), email: cleanEmail, password });
    } catch (e) {
      if (e instanceof ApiError && e.code === "EMAIL_TAKEN") {
        setEmailTaken(true);
        setAuthError("Este e-mail já está cadastrado");
        setStep(1);
      } else if (e instanceof NetworkError) {
        setFinishError("Sem conexão. Verifique a API em EXPO_PUBLIC_API_URL e tente novamente.");
      } else {
        setFinishError(describeError(e));
      }
      setSubmitting(false);
    }
  };

  /** Etapa 1 (e-mail): confere na API se o e-mail está livre antes de seguir. */
  const checkEmailAndContinue = async () => {
    if (checkingEmail) return;
    setAuthError(null);
    setEmailTaken(false);
    setCheckingEmail(true);
    try {
      const { available } = await authApi.checkEmail(email.trim().toLowerCase());
      if (!available) {
        setEmailTaken(true);
        setAuthError("Este e-mail já está cadastrado");
        return;
      }
    } catch (e) {
      // Sem rede, segue: o registro no último passo vai tratar.
      if (!(e instanceof NetworkError)) {
        setAuthError(describeError(e));
        return;
      }
    } finally {
      setCheckingEmail(false);
    }
    setStep(2);
  };

  const chooseSocial = (provider: "google" | "apple") => {
    setEmailTaken(false);
    setAuthError(socialLoginMessage(provider));
  };

  const nextStep = () => {
    if (step === 1) {
      if (authMethod === "email") void checkEmailAndContinue();
      return;
    }
    if (step === 2 && motivSubStep < 2) {
      setMotivSubStep((s) => s + 1);
      return;
    }
    if (step === 2) setMotivSubStep(0);
    if (step === 6 && !quitDate) {
      // Sugestão de Dia D: hoje (parada abrupta) ou daqui a 7 dias (gradual).
      const base = new Date();
      if (stopMethod === "gradual") base.setDate(base.getDate() + 7);
      setQuitDate(fmtDate(base));
      setQuitTime(fmtTime(new Date()));
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
    else void finish();
  };

  const prevStep = () => {
    if (step === 2 && motivSubStep > 0) {
      setMotivSubStep((s) => s - 1);
      return;
    }
    if (step > 0) setStep(step - 1);
  };

  const disabled =
    submitting ||
    checkingEmail ||
    (step === 1 && (authMethod !== "email" || !pwValid || !/\S+@\S+\.\S+/.test(email) || name.trim().length < 2)) ||
    (step === 2 && motivSubStep === 0 && !smokeDuration) ||
    (step === 2 && motivSubStep === 1 && !stopReason) ||
    (step === 2 && motivSubStep === 2 && !mainFear) ||
    (step === 3 && (!termsScrolled || !termsAccepted)) ||
    (step === 4 && !usageType) ||
    (step === 6 && !stopMethod) ||
    (step === 7 && !quitTimestamp);

  const onTermsScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 24) {
      setTermsScrolled(true);
    }
  };

  if (step === 0) {
    return (
      <LinearGradient
        colors={[colors.blue400, "#2DD4BF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcome}
      >
        <Feather name="wind" size={80} color="rgba(255,255,255,0.9)" style={styles.welcomeIcon} />
        <Text style={styles.welcomeTitle}>LiberAr</Text>
        <Text style={styles.welcomeSubtitle}>
          Um respiro de cada vez. Estamos aqui para apoiar sua jornada.
        </Text>
        <Pressable style={styles.welcomeButton} onPress={nextStep}>
          <Text style={styles.welcomeButtonText}>Começar</Text>
        </Pressable>
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Já tem conta? </Text>
          <Pressable onPress={onLogin} hitSlop={8}>
            <Text style={styles.loginLink}>Entrar</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Cabeçalho: voltar + indicador de progresso */}
      <View style={styles.topBar}>
        <Pressable onPress={prevStep} style={styles.backButton} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={colors.slate500} />
        </Pressable>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
            <View key={i} style={[styles.dot, step >= i && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>Como podemos te chamar?</Text>

            {authMethod !== "email" && (
              <View style={styles.gap12}>
                <Pressable
                  onPress={() => chooseSocial("google")}
                  style={[styles.googleButton, authMethod === "google" && styles.googleButtonActive]}
                >
                  <FontAwesome name="google" size={18} color={authMethod === "google" ? colors.teal800 : colors.slate700} />
                  <Text style={[styles.socialText, authMethod === "google" && { color: colors.teal800 }]}>
                    Continuar com Google
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => chooseSocial("apple")}
                  style={[styles.appleButton, authMethod === "apple" && styles.appleButtonActive]}
                >
                  <FontAwesome name="apple" size={20} color={colors.white} />
                  <Text style={[styles.socialText, { color: colors.white }]}>Continuar com Apple</Text>
                </Pressable>
                {authMethod === null && (
                  <View style={styles.dividerRow}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>ou use seu e-mail</Text>
                    <View style={styles.divider} />
                  </View>
                )}
              </View>
            )}

            {(authMethod === null || authMethod === "email") && (
              <View style={styles.gap12}>
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome"
                  placeholderTextColor={colors.slate400}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setAuthMethod("email")}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Seu e-mail"
                  placeholderTextColor={colors.slate400}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setAuthError(null);
                    setEmailTaken(false);
                  }}
                  onFocus={() => setAuthMethod("email")}
                />
                {authMethod === "email" && (
                  <>
                    <View>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Senha"
                        placeholderTextColor={colors.slate400}
                        secureTextEntry={!showPw}
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                      />
                      <Pressable style={styles.eye} onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                        <Feather name={showPw ? "eye-off" : "eye"} size={20} color={colors.slate400} />
                      </Pressable>
                    </View>
                    {password.length > 0 && (
                      <View style={styles.rules}>
                        <PasswordRule ok={pwHasLength} label="Mínimo 8 caracteres" />
                        <PasswordRule ok={pwHasLetter} label="Pelo menos uma letra" />
                        <PasswordRule ok={pwHasNumber} label="Pelo menos um número" />
                      </View>
                    )}
                    <Pressable onPress={() => setAuthMethod(null)}>
                      <Text style={styles.switchMethod}>Prefiro entrar com Google ou Apple</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {(authMethod === "google" || authMethod === "apple") && (
              <View style={styles.socialChosen}>
                <Text style={styles.socialChosenText}>
                  Entrando com {authMethod === "google" ? "Google" : "Apple"}
                </Text>
                <Pressable onPress={() => setAuthMethod(null)} hitSlop={8}>
                  <Text style={styles.switchLink}>Trocar</Text>
                </Pressable>
              </View>
            )}

            {authError && (
              <View style={styles.authErrorBox}>
                <Feather name="alert-circle" size={14} color={colors.rose500} />
                <Text style={styles.authErrorText}>{authError}</Text>
                {emailTaken && (
                  <Pressable onPress={onLogin} hitSlop={8}>
                    <Text style={styles.authErrorLink}>Entrar</Text>
                  </Pressable>
                )}
              </View>
            )}

            <View style={styles.lgpdRow}>
              <Feather name="shield" size={12} color={colors.slate400} />
              <Text style={styles.lgpdNote}>Seus dados estão seguros e seguem a LGPD.</Text>
            </View>
          </View>
        )}

        {step === 2 && motivSubStep === 0 && (
          <View style={styles.stepBody}>
            <View>
              <Text style={styles.kicker}>Nos conte um pouco</Text>
              <Text style={styles.stepTitle}>Há quanto tempo você fuma?</Text>
            </View>
            {SMOKE_DURATION_OPTIONS.map((opt) => (
              <SelectCard
                key={opt.value}
                title={opt.label}
                active={smokeDuration === opt.value}
                onPress={() => setSmokeDuration(opt.value)}
                style={styles.bigOption}
              />
            ))}
          </View>
        )}

        {step === 2 && motivSubStep === 1 && (
          <View style={styles.stepBody}>
            <View>
              <Text style={styles.kicker}>Sua motivação</Text>
              <Text style={styles.stepTitle}>Qual seu principal motivo para parar?</Text>
            </View>
            <View style={styles.grid}>
              {STOP_REASON_OPTIONS.map((opt) => (
                <SelectCard
                  key={opt.value}
                  title={opt.label}
                  active={stopReason === opt.value}
                  onPress={() => setStopReason(opt.value)}
                  style={[styles.gridItem, opt.value === "outro" && styles.gridItemFull]}
                />
              ))}
            </View>
            {stopReason && (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Conte um pouco mais (opcional)..."
                placeholderTextColor={colors.slate400}
                multiline
                value={stopReasonText}
                onChangeText={setStopReasonText}
              />
            )}
          </View>
        )}

        {step === 2 && motivSubStep === 2 && (
          <View style={styles.stepBody}>
            <View>
              <Text style={styles.kicker}>Seus desafios</Text>
              <Text style={styles.stepTitle}>Qual seu maior receio em parar?</Text>
            </View>
            {MAIN_FEAR_OPTIONS.map((opt) => (
              <SelectCard
                key={opt.value}
                title={opt.label}
                active={mainFear === opt.value}
                onPress={() => setMainFear(opt.value)}
                style={styles.bigOption}
              />
            ))}
            {mainFear && (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Quer falar mais sobre isso? (opcional)"
                placeholderTextColor={colors.slate400}
                multiline
                value={mainFearText}
                onChangeText={setMainFearText}
              />
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepBody}>
            <View>
              <Text style={styles.stepTitle}>Termos de Uso e Privacidade</Text>
              <Text style={styles.stepSubtitle}>Role até o final para aceitar e continuar.</Text>
            </View>
            <ScrollView
              style={styles.termsBox}
              contentContainerStyle={styles.termsContent}
              nestedScrollEnabled
              onScroll={onTermsScroll}
              scrollEventThrottle={32}
              onLayout={(e) => setTermsBoxHeight(e.nativeEvent.layout.height)}
              onContentSizeChange={(_, h) => {
                // Em telas altas o texto pode caber inteiro: libera o aceite.
                if (termsBoxHeight > 0 && h <= termsBoxHeight + 24) setTermsScrolled(true);
              }}
            >
              {TERMS_SECTIONS.map((s) => (
                <View key={s.title}>
                  <Text style={styles.termsTitle}>{s.title}</Text>
                  <Text style={styles.termsBody}>{s.body}</Text>
                </View>
              ))}
            </ScrollView>
            {!termsScrolled && (
              <View style={styles.lgpdRow}>
                <Feather name="info" size={12} color={colors.slate400} />
                <Text style={styles.lgpdNote}>Role o texto até o final para habilitar o aceite</Text>
              </View>
            )}
            <Pressable
              style={[styles.acceptRow, !termsScrolled && styles.acceptRowDisabled]}
              disabled={!termsScrolled}
              onPress={() => setTermsAccepted((v) => !v)}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]}>
                {termsAccepted && <Feather name="check" size={13} color={colors.white} />}
              </View>
              <Text style={styles.acceptText}>
                Li e aceito os <Text style={styles.acceptStrong}>Termos de Uso</Text> e a{" "}
                <Text style={styles.acceptStrong}>Política de Privacidade</Text>
              </Text>
            </Pressable>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>O que você usa?</Text>
            <Text style={styles.stepSubtitle}>Isso nos ajuda a personalizar seu acompanhamento.</Text>
            {USAGE_OPTIONS.map((opt) => (
              <SelectCard
                key={opt.value}
                title={opt.value === "ambos" ? "Ambos" : opt.label}
                large
                active={usageType === opt.value}
                onPress={() => setUsageType(opt.value)}
                style={styles.bigOption}
              />
            ))}
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>Vamos entender seus hábitos</Text>

            {(usageType === "cigarro" || usageType === "ambos") && (
              <View style={styles.gap12}>
                {usageType === "ambos" && <Text style={styles.groupLabel}>Cigarro</Text>}
                <View style={styles.habitRow}>
                  <Text style={styles.habitLabel}>Cigarros por dia</Text>
                  <Stepper value={cigsPerDay} onChange={setCigsPerDay} />
                </View>
                <View style={styles.habitRow}>
                  <Text style={styles.habitLabel}>Preço do maço (R$)</Text>
                  <TextInput
                    style={styles.habitInput}
                    keyboardType="decimal-pad"
                    value={packPrice}
                    onChangeText={setPackPrice}
                  />
                </View>
              </View>
            )}

            {(usageType === "vape" || usageType === "ambos") && (
              <View style={styles.gap12}>
                {usageType === "ambos" && <Text style={styles.groupLabel}>Vape</Text>}
                {VAPE_FIELDS.map((f) => (
                  <View key={f.key} style={styles.habitRow}>
                    <Text style={styles.habitLabel}>{f.label}</Text>
                    <TextInput
                      style={styles.habitInput}
                      keyboardType="decimal-pad"
                      value={vape[f.key]}
                      onChangeText={(v) => setVape((prev) => ({ ...prev, [f.key]: v }))}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {step === 6 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>Como você pretende parar?</Text>
            <SelectCard
              title="De uma vez"
              note="Parada abrupta no seu Dia D. Ideal se você quer cortar os laços de forma definitiva."
              large
              active={stopMethod === "abrupto"}
              onPress={() => setStopMethod("abrupto")}
              style={styles.bigOption}
            />
            <SelectCard
              title="Gradualmente"
              note="Redução progressiva. Vamos te ajudar a diminuir a quantidade até chegar a zero."
              large
              active={stopMethod === "gradual"}
              onPress={() => setStopMethod("gradual")}
              style={styles.bigOption}
            />
          </View>
        )}

        {step === 7 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>Seu Dia D</Text>
            <Text style={styles.fieldLabel}>Quando você parou (ou vai parar)?</Text>
            <View style={styles.iconInputWrap}>
              <Feather name="calendar" size={20} color={colors.teal500} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.iconInput]}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.slate400}
                keyboardType="number-pad"
                value={quitDate}
                onChangeText={(t) => setQuitDate(mask(t, "date"))}
              />
            </View>
            <View style={styles.iconInputWrap}>
              <Feather name="clock" size={20} color={colors.teal500} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.iconInput]}
                placeholder="HH:MM"
                placeholderTextColor={colors.slate400}
                keyboardType="number-pad"
                value={quitTime}
                onChangeText={(t) => setQuitTime(mask(t, "time"))}
              />
            </View>
            {quitDate.length === 10 && quitTime.length === 5 && !quitTimestamp && (
              <Text style={styles.errorText}>Data ou horário inválido.</Text>
            )}
            {finishError && (
              <View style={styles.authErrorBox}>
                <Feather name="alert-circle" size={14} color={colors.rose500} />
                <Text style={styles.authErrorText}>{finishError}</Text>
              </View>
            )}

            <View style={styles.tipCard}>
              <Feather name="info" size={22} color={colors.blue500} />
              <View style={styles.flex1}>
                <Text style={styles.tipTitle}>O que é o Dia D?</Text>
                <Text style={styles.tipText}>
                  É a data oficial em que você inicia sua jornada livre do fumo. Não se preocupe se
                  ainda não parou, marque a data que você escolheu. Estaremos com você!
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={
            submitting
              ? "Criando sua conta..."
              : checkingEmail
                ? "Verificando..."
                : step === 7
                  ? "Começar jornada"
                  : step === 3
                    ? "Concluir Cadastro"
                    : "Continuar"
          }
          onPress={nextStep}
          disabled={disabled}
        />
        {step === 2 && <PrimaryButton label="Pular" variant="ghost" onPress={nextStep} />}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  flex1: { flex: 1 },
  gap12: { gap: 12 },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  welcomeIcon: { marginBottom: 24 },
  welcomeTitle: { fontSize: 36, fontWeight: "700", color: colors.white, marginBottom: 16 },
  welcomeSubtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 48,
  },
  welcomeButton: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  welcomeButtonText: { color: colors.teal600, fontWeight: "700", fontSize: 16 },
  loginRow: { flexDirection: "row", alignItems: "center", paddingTop: 16 },
  loginText: { color: "rgba(255,255,255,0.9)", fontSize: 14 },
  loginLink: { color: colors.white, fontWeight: "700", fontSize: 14, textDecorationLine: "underline" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: { width: 40, padding: 8 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.slate200 },
  dotActive: { backgroundColor: colors.teal500 },
  content: { padding: 24, paddingTop: 16, flexGrow: 1 },
  stepBody: { gap: 16 },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal500,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepTitle: { fontSize: 24, fontWeight: "700", color: colors.slate800 },
  stepSubtitle: { fontSize: 14, color: colors.slate500, marginTop: 4 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.slate800,
  },
  passwordInput: { paddingRight: 48 },
  eye: { position: "absolute", right: 16, top: 16 },
  textArea: { minHeight: 80, textAlignVertical: "top", fontSize: 14 },
  rules: { backgroundColor: colors.slate50, borderRadius: 12, padding: 12, gap: 6 },
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
  ruleTextOk: { color: colors.teal800, fontWeight: "500" },
  switchMethod: { fontSize: 12, color: colors.slate400, textAlign: "center", textDecorationLine: "underline" },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 16,
  },
  googleButtonActive: { borderColor: colors.teal500, backgroundColor: colors.teal50 },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
  },
  appleButtonActive: { backgroundColor: colors.slate800 },
  socialText: { fontWeight: "600", color: colors.slate700, fontSize: 15 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  divider: { flex: 1, height: 1, backgroundColor: colors.slate200 },
  dividerText: { fontSize: 12, color: colors.slate400, fontWeight: "500" },
  socialChosen: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: "#99F6E4",
    borderRadius: 12,
    padding: 16,
  },
  socialChosenText: { fontSize: 14, fontWeight: "600", color: colors.teal800 },
  switchLink: { fontSize: 12, color: colors.slate400, textDecorationLine: "underline" },
  lgpdRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  lgpdNote: { fontSize: 12, color: colors.slate400 },
  bigOption: { padding: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: { width: "47.5%", alignItems: "center" },
  gridItemFull: { width: "100%" },
  termsBox: {
    maxHeight: 340,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 16,
  },
  termsContent: { padding: 20, gap: 16 },
  termsTitle: { fontWeight: "700", color: colors.slate800, fontSize: 14, marginBottom: 4 },
  termsBody: { fontSize: 14, color: colors.slate600, lineHeight: 21 },
  acceptRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  acceptRowDisabled: { opacity: 0.4 },
  checkbox: {
    marginTop: 1,
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.slate300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  checkboxOn: { backgroundColor: colors.teal500, borderColor: colors.teal500 },
  acceptText: { flex: 1, fontSize: 14, color: colors.slate700, lineHeight: 20 },
  acceptStrong: { fontWeight: "600", color: colors.teal600 },
  groupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate400,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate50,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  habitLabel: { flex: 1, fontWeight: "600", fontSize: 14, color: colors.slate800 },
  habitInput: {
    width: 84,
    textAlign: "right",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 8,
    padding: 8,
    fontWeight: "700",
    color: colors.teal800,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperSign: { color: colors.teal600, fontWeight: "700", fontSize: 16 },
  stepperValue: { minWidth: 24, textAlign: "center", fontWeight: "700", color: colors.slate800 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: colors.slate700 },
  iconInputWrap: { justifyContent: "center" },
  inputIcon: { position: "absolute", left: 16, zIndex: 1 },
  iconInput: {
    paddingLeft: 48,
    borderWidth: 2,
    borderRadius: 16,
    fontWeight: "700",
    color: colors.slate700,
  },
  errorText: { fontSize: 12, color: colors.rose500 },
  authErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.rose50,
  },
  authErrorText: { flex: 1, fontSize: 12, color: colors.rose500, fontWeight: "600" },
  authErrorLink: { fontSize: 12, color: colors.teal600, fontWeight: "700" },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue100,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  tipTitle: { fontWeight: "700", color: colors.blue800, marginBottom: 4, fontSize: 14 },
  tipText: { fontSize: 14, color: colors.blue800, lineHeight: 20, opacity: 0.9 },
  footer: { padding: 24, paddingTop: 12, backgroundColor: colors.white, gap: 4 },
});
