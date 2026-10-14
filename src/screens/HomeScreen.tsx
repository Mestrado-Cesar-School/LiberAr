import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../context/AppContext";
import {
  evaluateAchievements,
  MILESTONES,
  nextAchievement,
  progressTowardNext,
} from "../core/achievementRules";
import { formatBRL, formatFreeTime, formatLifeGained, pad2 } from "../core/progressEngine";
import { avatarUri } from "../data/clinical";
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
  const freeTime = formatFreeTime(progress ?? { days: 0, hours: 0, minutes: 0 });

  const achievements = evaluateAchievements(totalMinutes);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const next = nextAchievement(totalMinutes);
  const nextDaysLeft = next
    ? Math.max(1, Math.ceil((next.thresholdMinutes - totalMinutes) / 1440))
    : 0;

  const checkInDone = todaysCheckIn !== null;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{firstName} ✨</Text>
        </View>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatarUri(profile?.avatar) }} style={styles.avatar} />
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
            {freeTime.map((u, i) => (
              <React.Fragment key={u.label}>
                <Text style={styles.heroNumber}>{u.pad ? pad2(u.value) : u.value}</Text>
                <Text style={[styles.heroUnit, i < freeTime.length - 1 && styles.heroUnitSpaced]}>
                  {u.label}
                </Text>
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>
      </Pressable>

      {/* Dinheiro economizado */}
      <LinearGradient
        colors={[colors.teal50, "#ECFDF5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.moneyCard}
      >
        <View style={styles.moneyHeader}>
          <View style={styles.moneyIconWrap}>
            <Feather name="credit-card" size={20} color={colors.white} />
          </View>
          <Text style={styles.moneyLabel}>Dinheiro Economizado</Text>
        </View>
        <Text style={styles.moneyValue}>{formatBRL(progress?.moneySaved ?? 0)}</Text>
        <Text style={styles.moneyFoot}>Desde o seu Dia D</Text>
      </LinearGradient>

      {/* Vida ganha e projeção */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statRose]}>
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, { backgroundColor: "#FFE4E6" }]}>
              <Feather name="heart" size={16} color="#E11D48" />
            </View>
            <Text style={[styles.statLabel, { color: "#9F1239" }]}>Vida Ganha</Text>
          </View>
          <Text style={[styles.statValue, { color: "#E11D48" }]}>
            {formatLifeGained(progress?.lifeMinutesGained ?? 0)}
          </Text>
          <Text style={[styles.statFoot, { color: "#F43F5E" }]}>11 min por cigarro (BMJ)</Text>
        </View>

        <View style={[styles.statCard, styles.statAmber]}>
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="trending-down" size={16} color="#D97706" />
            </View>
            <Text style={[styles.statLabel, { color: "#92400E" }]}>Próximos 30 dias</Text>
          </View>
          <Text style={[styles.statValue, { color: "#D97706" }]}>
            {formatBRL((progress?.dailyCost ?? 0) * 30)}
          </Text>
          <Text style={[styles.statFoot, { color: "#D97706" }]}>Projeção no seu ritmo</Text>
        </View>
      </View>

      {/* Check-in diário */}
      <Pressable
        style={[styles.checkIn, checkInDone && styles.checkInDone]}
        onPress={onOpenCheckIn}
      >
        <View style={styles.checkInLeft}>
          <View style={[styles.checkInIcon, checkInDone && styles.checkInIconDone]}>
            <Feather
              name={checkInDone ? "check-circle" : "activity"}
              size={20}
              color={checkInDone ? "#16A34A" : colors.orange500}
            />
          </View>
          <View>
            <Text style={[styles.checkInTitle, checkInDone && { color: "#166534" }]}>
              {checkInDone ? "Check-in feito!" : "Check-in Diário"}
            </Text>
            <Text style={[styles.checkInSubtitle, checkInDone && { color: "#16A34A" }]}>
              {checkInDone ? "Registrado hoje · toque para editar" : "Como você está se sentindo hoje?"}
            </Text>
          </View>
        </View>
        {!checkInDone && <Feather name="chevron-right" size={20} color={colors.slate400} />}
      </Pressable>

      {/* Próxima conquista */}
      {next ? (
        <Pressable style={styles.card} onPress={onOpenAchievements}>
          <View style={styles.nextHeader}>
            <Text style={styles.cardTitle}>Próxima Conquista</Text>
            <Text style={styles.nextCount}>
              {unlockedCount} de {MILESTONES.length}
            </Text>
          </View>
          <View style={styles.nextRow}>
            <View style={styles.nextIcon}>
              <Feather name="award" size={20} color={colors.slate400} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.nextTitle}>{next.title} livre</Text>
              <Text style={styles.nextDesc}>{next.desc}</Text>
            </View>
          </View>
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${Math.round(progressTowardNext(totalMinutes) * 100)}%` }]}
            />
          </View>
          <Text style={styles.nextRemaining}>
            {nextDaysLeft} dia{nextDaysLeft === 1 ? "" : "s"} restante{nextDaysLeft === 1 ? "" : "s"}
          </Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.card, styles.allDone]} onPress={onOpenAchievements}>
          <Feather name="award" size={20} color={colors.teal600} />
          <View>
            <Text style={styles.allDoneTitle}>Todas as conquistas desbloqueadas!</Text>
            <Text style={styles.allDoneText}>Continue assim, você é incrível.</Text>
          </View>
        </Pressable>
      )}

      {/* Conquistas de Saúde (carrossel) */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Conquistas de Saúde</Text>
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
          {achievements.map((badge) => (
            <Pressable
              key={badge.id}
              onPress={onOpenAchievements}
              style={[styles.badge, !badge.unlocked && styles.badgeLocked]}
            >
              <View style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>
                <Feather
                  name={badge.unlocked ? "award" : "lock"}
                  size={20}
                  color={badge.unlocked ? colors.teal500 : colors.slate400}
                />
              </View>
              <Text style={[styles.badgeTitle, !badge.unlocked && { color: colors.slate400 }]}>
                {badge.title}
              </Text>
              <Text style={styles.badgeDesc}>{badge.desc}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Histórico e evolução */}
      <Pressable style={[styles.card, styles.linkCard]} onPress={onOpenEvolution}>
        <View style={styles.checkInLeft}>
          <View style={[styles.checkInIcon, { backgroundColor: colors.blue50 }]}>
            <Feather name="trending-up" size={20} color={colors.blue500} />
          </View>
          <View>
            <Text style={styles.checkInTitle}>Histórico e Evolução</Text>
            <Text style={styles.checkInSubtitle}>Veja seus check-ins e gráficos</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.slate400} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 24, paddingBottom: 120, gap: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
  },
  greeting: { color: colors.slate500, fontSize: 14 },
  userName: { color: colors.slate800, fontSize: 24, fontWeight: "700" },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.blue100,
    borderWidth: 2,
    borderColor: colors.white,
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
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
  heroBgIcon: { position: "absolute", top: -16, right: -16, opacity: 0.1 },
  heroLabel: { color: colors.blue100, fontWeight: "500", fontSize: 14, marginBottom: 8 },
  heroTimer: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
  },
  heroNumber: { color: colors.white, fontSize: 48, fontWeight: "700" },
  heroUnit: { color: colors.blue100, fontSize: 18 },
  heroUnitSpaced: { marginRight: 8 },
  moneyCard: { borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.teal100 },
  moneyHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  moneyIconWrap: { backgroundColor: colors.teal500, padding: 10, borderRadius: 12 },
  moneyLabel: { color: colors.teal800, fontSize: 14, fontWeight: "600" },
  moneyValue: { color: "#0F766E", fontSize: 30, fontWeight: "700" },
  moneyFoot: { color: colors.teal600, opacity: 0.7, fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1 },
  statRose: { backgroundColor: colors.rose50, borderColor: "#FFE4E6" },
  statAmber: { backgroundColor: "#FFFBEB", borderColor: "#FEF3C7" },
  statHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  statIcon: { padding: 6, borderRadius: 8 },
  statLabel: { fontSize: 12, fontWeight: "600", flexShrink: 1 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statFoot: { fontSize: 10, marginTop: 4, opacity: 0.8 },
  checkIn: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkInDone: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  checkInLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  checkInIcon: { backgroundColor: colors.orange100, padding: 8, borderRadius: 8 },
  checkInIconDone: { backgroundColor: "#DCFCE7" },
  checkInTitle: { color: colors.slate800, fontWeight: "600", fontSize: 14 },
  checkInSubtitle: { color: colors.slate500, fontSize: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  cardTitle: { color: colors.slate800, fontWeight: "600", fontSize: 14 },
  nextHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  nextCount: { fontSize: 12, fontWeight: "700", color: colors.teal600 },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  nextIcon: { backgroundColor: colors.slate50, padding: 8, borderRadius: 999 },
  nextTitle: { fontSize: 14, fontWeight: "700", color: colors.slate800 },
  nextDesc: { fontSize: 12, color: colors.slate500 },
  track: { height: 8, borderRadius: 999, backgroundColor: colors.slate100, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: colors.teal500 },
  nextRemaining: { textAlign: "right", fontSize: 10, color: colors.slate400, marginTop: 4 },
  allDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.teal50,
    borderColor: colors.teal100,
  },
  allDoneTitle: { fontSize: 14, fontWeight: "700", color: colors.teal800 },
  allDoneText: { fontSize: 12, color: colors.teal600 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { color: colors.teal600, fontSize: 13, fontWeight: "600" },
  badgesScroll: { marginHorizontal: -24 },
  badgesRow: { paddingHorizontal: 24, paddingBottom: 8, gap: 12 },
  badge: {
    width: 110,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.teal100,
    alignItems: "center",
  },
  badgeLocked: { backgroundColor: colors.slate50, borderColor: colors.slate200, opacity: 0.6 },
  badgeIcon: { backgroundColor: colors.teal50, padding: 8, borderRadius: 999, marginBottom: 8 },
  badgeIconLocked: { backgroundColor: colors.slate200 },
  badgeTitle: { fontSize: 12, fontWeight: "700", color: colors.slate800 },
  badgeDesc: { fontSize: 10, color: colors.slate500, textAlign: "center", marginTop: 2 },
  linkCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
