import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { evaluateAchievements } from "../core/achievementRules";
import { colors } from "../theme/colors";

// Painel de Conquistas & Badges (diagrama: Camada de Apresentação).
// As medalhas são "gatilhadas" pelo Validador de Regras de Conquistas.

type AchievementsScreenProps = {
  onClose: () => void;
};

export function AchievementsScreen({ onClose }: AchievementsScreenProps) {
  const { progress } = useApp();
  const totalMinutes = progress?.totalMinutes ?? 0;
  const achievements = evaluateAchievements(totalMinutes);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.slate500} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Conquistas de Saúde</Text>
          <Text style={styles.headerSubtitle}>
            {unlockedCount} de {achievements.length} desbloqueadas
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {achievements.map((a) => (
          <View key={a.id} style={[styles.card, !a.unlocked && styles.cardLocked]}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: a.unlocked ? `${a.color}1A` : colors.slate100 },
              ]}
            >
              <Feather
                name={a.icon as keyof typeof Feather.glyphMap}
                size={24}
                color={a.unlocked ? a.color : colors.slate300}
              />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, !a.unlocked && styles.textLocked]}>
                  {a.title}
                </Text>
                {a.unlocked ? (
                  <View style={styles.unlockedTag}>
                    <Feather name="check" size={12} color={colors.teal600} />
                    <Text style={styles.unlockedTagText}>Conquistado</Text>
                  </View>
                ) : (
                  <Feather name="lock" size={16} color={colors.slate300} />
                )}
              </View>
              <Text style={[styles.cardDesc, !a.unlocked && styles.textLocked]}>
                {a.desc}
              </Text>
              {!a.unlocked && (
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${Math.round(a.progress * 100)}%` }]}
                  />
                </View>
              )}
            </View>
          </View>
        ))}

        <View style={styles.footerCard}>
          <Feather name="heart" size={18} color={colors.teal600} />
          <Text style={styles.footerText}>
            Cada marco é uma vitória do seu corpo. Continue — o próximo já está
            a caminho!
          </Text>
        </View>
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
  headerSubtitle: {
    fontSize: 12,
    color: colors.slate500,
  },
  content: {
    padding: 24,
    gap: 12,
    paddingBottom: 48,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 16,
  },
  cardLocked: {
    backgroundColor: colors.slate50,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate800,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.slate500,
  },
  textLocked: {
    color: colors.slate400,
  },
  unlockedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.teal50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  unlockedTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.teal600,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.slate200,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.teal500,
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
    marginTop: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    color: colors.teal800,
    lineHeight: 19,
  },
});
