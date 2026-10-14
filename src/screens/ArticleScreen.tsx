import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Article } from "../data/articles";
import { colors } from "../theme/colors";

// Tela de leitura de artigo (aberta a partir do feed do Explorar).

type ArticleScreenProps = {
  article: Article;
  onClose: () => void;
  /** Abre o Chat para conversar sobre o artigo. */
  onChat: () => void;
};

export function ArticleScreen({ article, onClose, onChat }: ArticleScreenProps) {
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Cabeçalho ilustrado */}
        <LinearGradient
          colors={[article.colorFrom, article.colorTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Pressable onPress={onClose} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.heroIcon}>
            <Feather name={article.icon} size={40} color={colors.white} />
          </View>
        </LinearGradient>

        {/* Conteúdo */}
        <View style={styles.body}>
          <Text style={styles.category}>{article.category}</Text>
          <Text style={styles.title}>{article.title}</Text>
          <View style={styles.metaRow}>
            <Feather name="clock" size={14} color={colors.slate400} />
            <Text style={styles.meta}>{article.readMinutes} min de leitura</Text>
          </View>

          {article.sections.map((section, i) => (
            <View key={i} style={styles.section}>
              {section.heading && <Text style={styles.heading}>{section.heading}</Text>}
              <Text style={styles.paragraph}>{section.body}</Text>
            </View>
          ))}

          <View style={styles.footerCard}>
            <Feather name="heart" size={18} color={colors.teal600} />
            <Text style={styles.footerText}>
              Precisa conversar? O Assistente LiberAr está na aba Chat, a qualquer
              hora.
            </Text>
          </View>

          <Pressable style={styles.chatButton} onPress={onChat}>
            <Feather name="message-circle" size={18} color={colors.white} />
            <Text style={styles.chatButtonText}>Conversar sobre isso</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.teal500,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16,
  },
  chatButtonText: { color: colors.white, fontWeight: "600", fontSize: 15 },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    paddingBottom: 48,
  },
  hero: {
    height: 180,
    paddingTop: 16,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    alignSelf: "flex-start",
    marginBottom: 24,
    marginLeft: 8,
  },
  body: {
    padding: 24,
    gap: 16,
  },
  category: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.teal600,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.slate800,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -4,
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: colors.slate400,
  },
  section: {
    gap: 6,
  },
  heading: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.slate800,
    marginTop: 8,
  },
  paragraph: {
    fontSize: 15,
    color: colors.slate600,
    lineHeight: 24,
  },
  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.teal100,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    color: colors.teal800,
    lineHeight: 19,
  },
});
