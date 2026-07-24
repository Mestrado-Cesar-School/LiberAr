import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

// Termos de Uso e LGPD — transparência é parte do acolhimento
// (diagrama: Gerenciador de Autenticação & LGPD).

const SECTIONS: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
  {
    icon: "shield",
    title: "Seus dados são seus",
    body:
      "O LiberAr armazena seu perfil e seus check-ins localmente no seu dispositivo. " +
      "A sincronização com a nuvem é opcional e só acontece com o seu consentimento explícito, " +
      "conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
  },
  {
    icon: "eye-off",
    title: "Conversas confidenciais",
    body:
      "As conversas com o Assistente LiberAr são tratadas com sigilo. Elas nunca são " +
      "compartilhadas com terceiros para fins comerciais e você pode apagá-las a qualquer momento.",
  },
  {
    icon: "download",
    title: "Portabilidade",
    body:
      "Você pode exportar seu relatório clínico em PDF para compartilhar com profissionais " +
      "de saúde do SUS, exercendo seu direito de portabilidade previsto na LGPD.",
  },
  {
    icon: "trash-2",
    title: "Direito ao esquecimento",
    body:
      "Ao sair da conta, você pode solicitar a exclusão definitiva de todos os seus dados. " +
      "A exclusão é irreversível e cobre perfil, check-ins e histórico de conversas.",
  },
  {
    icon: "alert-circle",
    title: "Aviso importante",
    body:
      "O LiberAr é uma ferramenta de apoio e não substitui atendimento médico ou psicológico. " +
      "Em situações de crise, procure a UBS/CAPS mais próxima ou ligue para o CVV (188), " +
      "que atende 24 horas, gratuitamente.",
  },
];

type TermsScreenProps = {
  onClose: () => void;
};

export function TermsScreen({ onClose }: TermsScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.slate500} />
        </Pressable>
        <Text style={styles.headerTitle}>Termos de Uso e LGPD</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Cuidar de você inclui cuidar dos seus dados. Aqui está, em linguagem
          simples, como o LiberAr trata suas informações.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                <Feather name={section.icon} size={18} color={colors.blue600} />
              </View>
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            <Text style={styles.cardBody}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Última atualização: julho de 2026 • LiberAr v1.0{"\n"}
          Projeto acadêmico — Mestrado Profissional em Engenharia de Software
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.slate800,
  },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 48,
  },
  intro: {
    fontSize: 14,
    color: colors.slate600,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 18,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.blue50,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate800,
    flex: 1,
  },
  cardBody: {
    fontSize: 13,
    color: colors.slate500,
    lineHeight: 20,
  },
  footer: {
    fontSize: 11,
    color: colors.slate400,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 8,
  },
});
