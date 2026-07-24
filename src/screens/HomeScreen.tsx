import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../context/AppContext";
import { evaluateAchievements, nextAchievement } from "../core/achievementRules";
import { formatBRL, pad2 } from "../core/progressEngine";
import { colors } from "../theme/colors";

// Dashboard Principal de Métricas (fluxo 2 do diagrama:
// "Acompanha Dias e Economia"). Tudo calculado pelo Motor de Progresso.

type HomeScreenProps = {
  onOpenCheckIn: () => void;
  onOpenAchievements: () => void;
  onOpenEvolution: () => void;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia,";
  if (hour < 18) return "Boa tarde,";
  return "Boa noite,";
}

export function HomeScreen({
  onOpenCheckIn,
  onOpenAchievements,
  onOpenEvolution,
}: HomeScreenProps) {
  const { profile, progress, todaysCheckIn } = useApp();
  const firstName = profile?.name.split(" ")[0] ?? "Visitante";
  const totalMinutes = progress?.totalMinutes ?? 0;

  const badges = evaluateAchievements(totalMinutes).filter((a) => a.unlocked).slice(-4);
  const next = nextAchievement(totalMinutes);

  const hasCheckInToday = todaysCheckIn !== null;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{firstName} ✨</Text>
        </View>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: "https://i.pravatar.cc/150?img=47" }} style={styles.avatar} />
        </View>
      </View>

      {/* Hero: Cronômetro (toque para ver a evolução) */}
      <Pressable onPress={onOpenEvolution}>
        <LinearGradient
          colors={[colors.blue400, colors.blue500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBgIcon}>
            <Feather name="wind" size={120} color={colors.white} />
          </View>
          <Text style={styles.heroLabel}>Você está livre há</Text>
          <View style={styles.heroTimer}>
            <Text style={styles.heroNumber}>{progress?.days ?? 0}</Text>
            <Text style={styles.heroUnit}>dias</Text>
            <Text style={[styles.heroNumber, styles.heroNumberSpaced]}>
              {pad2(progress?.hours ?? 0)}
            </Text>
            <Text style={styles.heroUnit}>hrs</Text>
          </View>
          <View style={styles.heroFooter}>
            <Feather name="bar-chart-2" size={14} color={colors.blue100} />
            <Text style={styles.heroFooterText}>Ver minha evolução</Text>
          </View>
        </LinearGradient>
      </Pressable>

      {/* Card Financeiro */}
      <View style={styles.moneyCard}>
        <View style={styles.moneyIconWrap}>
          <Feather name="credit-card" size={24} color={colors.teal600} />
        </View>
        <View style={styles.moneyBody}>
          <Text style={styles.moneyLabel}>Dinheiro Economizado</Text>
          <Text style={styles.moneyValue}>{formatBRL(progress?.moneySaved ?? 0)}</Text>
        </View>
        <View style={styles.moneyExtra}>
          <Text style={styles.moneyExtraValue}>{progress?.cigsAvoided ?? 0}</Text>
          <Text style={styles.moneyExtraLabel}>cigarros{"\n"}evitados</Text>
        </View>
      </View>

      {/* Banner de Check-in */}
      <Pressable style={styles.checkInBanner} onPress={onOpenCheckIn}>
        <View style={styles.checkInLeft}>
          <View
            style={[
              styles.checkInIconWrap,
              hasCheckInToday && styles.checkInIconWrapDone,
            ]}
          >
            <Feather
              name={hasCheckInToday ? "check" : "activity"}
              size={20}
              color={hasCheckInToday ? colors.teal600 : colors.orange500}
            />
          </View>
          <View>
            <Text style={styles.checkInTitle}>Check-in Diário</Text>
            <Text style={styles.checkInSubtitle}>
              {hasCheckInToday
                ? "Registrado hoje. Toque para editar."
                : "Como você está se sentindo hoje?"}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.slate400} />
      </Pressable>

      {/* Próxima conquista */}
      {next && (
        <Pressable style={styles.nextCard} onPress={onOpenAchievements}>
          <View style={styles.nextIconWrap}>
            <Feather
              name={next.icon as keyof typeof Feather.glyphMap}
              size={20}
              color={next.color}
            />
          </View>
          <View style={styles.nextBody}>
            <Text style={styles.nextLabel}>Próxima conquista • {next.title}</Text>
            <Text style={styles.nextDesc}>{next.desc}</Text>
            <View style={styles.nextTrack}>
              <View
                style={[styles.nextFill, { width: `${Math.round(next.progress * 100)}%` }]}
              />
            </View>
          </View>
        </Pressable>
      )}

      {/* Badges de Saúde */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Conquistas de Saúde</Text>
          <Pressable onPress={onOpenAchievements} style={styles.seeAll}>
            <Text style={styles.seeAllText}>Ver todas</Text>
            <Feather name="chevron-right" size={16} color={colors.teal600} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesRow}
          style={styles.badgesScroll}
        >
          {badges.length === 0 && (
            <View style={styles.badgeCard}>
              <View style={styles.badgeIconWrap}>
                <Feather name="clock" size={24} color={colors.slate400} />
              </View>
              <View style={styles.badgeTextWrap}>
                <Text style={styles.badgeTitle}>Em breve</Text>
                <Text style={styles.badgeDesc}>Sua 1ª conquista está chegando</Text>
              </View>
            </View>
          )}
          {badges.map((badge) => (
            <View key={badge.id} style={styles.badgeCard}>
              <View style={styles.badgeIconWrap}>
                <Feather
                  name={badge.icon as keyof typeof Feather.glyphMap}
                  size={24}
                  color={badge.color}
                />
              </View>
              <View style={styles.badgeTextWrap}>
                <Text style={styles.badgeTitle}>{badge.title}</Text>
                <Text style={styles.badgeDesc}>{badge.desc}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 120,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
  },
  greeting: {
    color: colors.slate500,
    fontSize: 14,
  },
  userName: {
    color: colors.slate800,
    fontSize: 24,
    fontWeight: "700",
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.blue100,
    borderWidth: 2,
    borderColor: colors.white,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  hero: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: colors.blue500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  heroBgIcon: {
    position: "absolute",
    top: -16,
    right: -16,
    opacity: 0.1,
  },
  heroLabel: {
    color: colors.blue100,
    fontWeight: "500",
    fontSize: 14,
    marginBottom: 8,
  },
  heroTimer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  heroNumber: {
    color: colors.white,
    fontSize: 48,
    fontWeight: "700",
  },
  heroNumberSpaced: {
    marginLeft: 8,
  },
  heroUnit: {
    color: colors.blue100,
    fontSize: 18,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroFooterText: {
    color: colors.blue100,
    fontSize: 12,
    fontWeight: "600",
  },
  moneyCard: {
    backgroundColor: colors.teal50,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.teal100,
    flexDirection: "row",
    alignItems: "center",
  },
  moneyIconWrap: {
    backgroundColor: colors.teal100,
    padding: 12,
    borderRadius: 12,
    marginRight: 16,
  },
  moneyBody: {
    flex: 1,
  },
  moneyLabel: {
    color: colors.teal800,
    fontSize: 14,
    fontWeight: "500",
  },
  moneyValue: {
    color: colors.teal600,
    fontSize: 24,
    fontWeight: "700",
  },
  moneyExtra: {
    alignItems: "center",
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.teal100,
  },
  moneyExtraValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.teal600,
  },
  moneyExtraLabel: {
    fontSize: 10,
    color: colors.teal800,
    textAlign: "center",
  },
  checkInBanner: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkInLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  checkInIconWrap: {
    backgroundColor: colors.orange100,
    padding: 8,
    borderRadius: 8,
  },
  checkInIconWrapDone: {
    backgroundColor: colors.teal100,
  },
  checkInTitle: {
    color: colors.slate800,
    fontWeight: "600",
    fontSize: 14,
  },
  checkInSubtitle: {
    color: colors.slate500,
    fontSize: 12,
  },
  nextCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nextIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBody: {
    flex: 1,
    gap: 3,
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate800,
  },
  nextDesc: {
    fontSize: 12,
    color: colors.slate500,
  },
  nextTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.slate100,
    marginTop: 4,
    overflow: "hidden",
  },
  nextFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.teal500,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.slate800,
    fontWeight: "600",
    fontSize: 16,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    color: colors.teal600,
    fontSize: 13,
    fontWeight: "600",
  },
  badgesScroll: {
    marginHorizontal: -24,
  },
  badgesRow: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 16,
  },
  badgeCard: {
    minWidth: 120,
    maxWidth: 140,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    alignItems: "center",
    gap: 8,
  },
  badgeIconWrap: {
    backgroundColor: colors.slate50,
    padding: 12,
    borderRadius: 999,
  },
  badgeTextWrap: {
    alignItems: "center",
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate800,
  },
  badgeDesc: {
    fontSize: 10,
    color: colors.slate500,
    textAlign: "center",
  },
});
