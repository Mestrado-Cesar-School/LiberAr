import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Article, ARTICLES } from "../data/articles";
import { colors } from "../theme/colors";

type InfoScreenProps = {
  onOpenUbsLocator: () => void;
  onOpenFagerstrom: () => void;
  onOpenArticle: (article: Article) => void;
};

export function InfoScreen({ onOpenUbsLocator, onOpenFagerstrom, onOpenArticle }: InfoScreenProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ARTICLES;
    return ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.sections.some((s) => s.body.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Cabeçalho e busca */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Explorar</Text>
        <View style={styles.searchWrap}>
          <Feather name="search" size={20} color={colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar dicas, artigos..."
            placeholderTextColor={colors.slate400}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={18} color={colors.slate400} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Mapa / UBS — some durante a busca para focar nos resultados */}
      {query.trim().length === 0 && (
        <View style={styles.mapCard}>
          <View style={styles.mapBgIcon}>
            <Feather name="map-pin" size={100} color={colors.blue800} />
          </View>
          <View style={styles.mapContent}>
            <View style={styles.mapTitleRow}>
              <Feather name="map-pin" size={20} color={colors.blue800} />
              <Text style={styles.mapTitle}>Apoio Profissional</Text>
            </View>
            <Text style={styles.mapDesc}>
              Encontre a Unidade Básica de Saúde (UBS) mais próxima com grupo de apoio.
            </Text>
            <Pressable style={styles.mapButton} onPress={onOpenUbsLocator}>
              <Text style={styles.mapButtonText}>Localizar UBS / CAPS</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Teste de Fagerström (opcional) */}
      {query.trim().length === 0 && (
        <Pressable style={[styles.mapCard, styles.testCard]} onPress={onOpenFagerstrom}>
          <View style={styles.mapBgIcon}>
            <Feather name="activity" size={100} color={colors.teal800} />
          </View>
          <View style={styles.mapContent}>
            <View style={styles.mapTitleRow}>
              <Feather name="activity" size={20} color={colors.teal800} />
              <Text style={[styles.mapTitle, { color: colors.teal800 }]}>Teste de Fagerström</Text>
            </View>
            <Text style={[styles.mapDesc, { color: colors.teal600 }]}>
              Teste opcional: calcule seu grau de dependência à nicotina em poucos minutos.
            </Text>
            <View style={[styles.mapButton, { backgroundColor: colors.teal600 }]}>
              <Text style={styles.mapButtonText}>Fazer o teste</Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* Artigos */}
      <View style={styles.articlesSection}>
        <Text style={styles.sectionTitle}>
          {query.trim().length > 0 ? "Resultados" : "Recomendado para você"}
        </Text>
        <View style={styles.articlesList}>
          {results.map((item) => (
            <Pressable
              key={item.id}
              style={styles.articleCard}
              onPress={() => onOpenArticle(item)}
            >
              <LinearGradient
                colors={[item.colorFrom, item.colorTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.articleThumb}
              >
                <Feather name={item.icon} size={28} color={colors.white} />
              </LinearGradient>
              <View style={styles.articleBody}>
                <Text style={styles.articleCategory}>{item.category}</Text>
                <Text style={styles.articleTitle}>{item.title}</Text>
                <Text style={styles.articleDesc} numberOfLines={2}>
                  {item.summary}
                </Text>
              </View>
            </Pressable>
          ))}

          {results.length === 0 && (
            <View style={styles.emptyState}>
              <Feather name="search" size={36} color={colors.slate300} />
              <Text style={styles.emptyText}>
                Nada encontrado para “{query.trim()}”. Tente outra palavra.
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 120,
    gap: 24,
  },
  headerSection: {
    paddingTop: 16,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.slate800,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.slate700,
  },
  mapCard: {
    backgroundColor: colors.blue50,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.blue100,
    overflow: "hidden",
  },
  testCard: {
    backgroundColor: colors.teal50,
    borderColor: colors.teal100,
  },
  mapBgIcon: {
    position: "absolute",
    right: -20,
    bottom: -20,
    opacity: 0.1,
  },
  mapContent: {
    gap: 12,
  },
  mapTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapTitle: {
    fontWeight: "600",
    fontSize: 16,
    color: colors.blue800,
  },
  mapDesc: {
    fontSize: 14,
    color: "rgba(37, 99, 235, 0.8)",
    lineHeight: 20,
  },
  mapButton: {
    backgroundColor: colors.blue600,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  mapButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  articlesSection: {
    gap: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 16,
    color: colors.slate800,
  },
  articlesList: {
    gap: 16,
  },
  articleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  articleThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  articleBody: {
    flex: 1,
  },
  articleCategory: {
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.teal600,
    marginBottom: 4,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate800,
    marginBottom: 4,
  },
  articleDesc: {
    fontSize: 12,
    color: colors.slate500,
    lineHeight: 17,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate400,
    textAlign: "center",
    maxWidth: 240,
  },
});
