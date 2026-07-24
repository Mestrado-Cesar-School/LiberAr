import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { formatBRL } from "../core/progressEngine";
import { CheckIn, Mood } from "../core/types";
import { colors } from "../theme/colors";

// Visualiza Evolução (fluxo 5 do diagrama): gráfico do nível de fissura,
// histórico de humor e métricas geradas pelo Motor de Cálculo de Progresso.

const MOOD_EMOJI: Record<Mood, string> = {
  anxious: "😰",
  confident: "😎",
  stressed: "😫",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Dados de exemplo exibidos até o usuário acumular check-ins reais. */
function demoCheckIns(): CheckIn[] {
  const moods: Mood[] = ["anxious", "stressed", "anxious", "confident", "confident", "anxious", "confident"];
  const cravings = [5, 4, 4, 3, 2, 3, 1];
  return cravings.map((craving, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return { date: date.toISOString(), mood: moods[i], smoked: i === 0, cigarettes: i === 0 ? 2 : 0, craving };
  });
}

type EvolutionScreenProps = {
  onClose: () => void;
};

export function EvolutionScreen({ onClose }: EvolutionScreenProps) {
  const { checkIns, progress } = useApp();

  const usingDemo = checkIns.length === 0;
  const series = useMemo(() => {
    const source = usingDemo ? demoCheckIns() : checkIns.slice(-7);
    return source.map((c) => ({ ...c, weekday: WEEKDAYS[new Date(c.date).getDay()] }));
  }, [checkIns, usingDemo]);

  const avgCraving =
    series.reduce((sum, c) => sum + c.craving, 0) / Math.max(1, series.length);
  const smokeFreeDays = series.filter((c) => !c.smoked).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.slate500} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Minha Evolução</Text>
          <Text style={styles.headerSubtitle}>Sua jornada em números</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Métricas principais */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.blue50, borderColor: colors.blue100 }]}>
            <Text style={[styles.statValue, { color: colors.blue600 }]}>
              {progress?.days ?? 0}
            </Text>
            <Text style={styles.statLabel}>dias livre</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.teal50, borderColor: colors.teal100 }]}>
            <Text style={[styles.statValue, { color: colors.teal600 }]}>
              {progress?.cigsAvoided ?? 0}
            </Text>
            <Text style={styles.statLabel}>cigarros evitados</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.orange50, borderColor: colors.orange100 }]}>
            <Text style={[styles.statValue, { color: colors.orange500, fontSize: 18 }]}>
              {formatBRL(progress?.moneySaved ?? 0)}
            </Text>
            <Text style={styles.statLabel}>economizados</Text>
          </View>
        </View>

        {/* Gráfico de fissura */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Nível de Fissura</Text>
            <View style={styles.trendTag}>
              <Feather name="trending-down" size={14} color={colors.teal600} />
              <Text style={styles.trendTagText}>em queda</Text>
            </View>
          </View>
          <Text style={styles.chartSubtitle}>
            Últimos 7 check-ins • média {avgCraving.toFixed(1)} de 5
          </Text>

          <View style={styles.chart}>
            {series.map((c, i) => (
              <View key={i} style={styles.chartColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${(c.craving / 5) * 100}%`,
                        backgroundColor: c.craving >= 4 ? colors.orange400 : colors.teal500,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barMood}>{c.mood ? MOOD_EMOJI[c.mood] : "•"}</Text>
                <Text style={styles.barLabel}>{c.weekday}</Text>
              </View>
            ))}
          </View>

          {usingDemo && (
            <Text style={styles.demoNote}>
              Dados de exemplo — faça seus check-ins diários para ver sua
              evolução real aqui.
            </Text>
          )}
        </View>

        {/* Resumo da semana */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Feather name="check-circle" size={20} color={colors.teal600} />
            </View>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>{smokeFreeDays} de {series.length} dias</Text> sem
              fumar nos últimos registros
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconWrap, { backgroundColor: colors.blue50 }]}>
              <Feather name="edit-3" size={20} color={colors.blue600} />
            </View>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>{usingDemo ? 0 : checkIns.length} check-ins</Text> registrados
              na sua jornada
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconWrap, { backgroundColor: colors.orange50 }]}>
              <Feather name="zap" size={20} color={colors.orange500} />
            </View>
            <Text style={styles.summaryText}>
              A fissura tende a diminuir com o tempo — os picos ficam mais
              raros e mais curtos. Continue firme!
            </Text>
          </View>
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
    gap: 20,
    paddingBottom: 48,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: colors.slate500,
    textAlign: "center",
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 20,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate800,
  },
  trendTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.teal50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  trendTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.teal600,
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.slate400,
    marginTop: 2,
    marginBottom: 16,
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  chartColumn: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  barTrack: {
    width: 18,
    height: 110,
    borderRadius: 999,
    backgroundColor: colors.slate100,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 999,
  },
  barMood: {
    fontSize: 14,
  },
  barLabel: {
    fontSize: 10,
    color: colors.slate400,
    fontWeight: "600",
  },
  demoNote: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 20,
    gap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: colors.slate600,
    lineHeight: 19,
  },
  summaryBold: {
    fontWeight: "700",
    color: colors.slate800,
  },
});
