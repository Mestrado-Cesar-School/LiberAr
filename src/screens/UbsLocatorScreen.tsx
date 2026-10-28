import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { HealthUnit } from "../core/types";
import { healthUnits as healthUnitsApi } from "../data/api";
import { HEALTH_UNITS } from "../data/ubsUnits";
import { colors } from "../theme/colors";

// Localizador de Unidades de Saúde (fluxo 4 do diagrama:
// "Busca Atendimento Gratuito"). As unidades vêm da API (GET /health-units);
// sem rede, usa a Base Estática UBS/CAPS como fallback.

type Filter = "todas" | "UBS" | "CAPS";

type UbsLocatorScreenProps = {
  onClose: () => void;
};

export function UbsLocatorScreen({ onClose }: UbsLocatorScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [remote, setRemote] = useState<HealthUnit[] | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await healthUnitsApi.list();
        if (!cancelled) {
          setRemote(list);
          setOffline(false);
        }
      } catch {
        if (!cancelled) setOffline(true);
      } finally {
        if (!cancelled) setLoadingUnits(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const source = remote ?? HEALTH_UNITS;

  const units = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((u) => {
      if (filter !== "todas" && u.kind !== filter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.address.toLowerCase().includes(q) ||
        u.services.some((s) => s.toLowerCase().includes(q))
      );
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [source, query, filter]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.slate500} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Unidades de Saúde</Text>
          <Text style={styles.headerSubtitle}>Atendimento gratuito pelo SUS</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Localização simulada */}
        <View style={styles.locationCard}>
          <Feather name="map-pin" size={18} color={colors.blue600} />
          <Text style={styles.locationText}>
            Perto de você — Centro, Belo Horizonte
          </Text>
          <Text style={styles.locationChange}>Alterar</Text>
        </View>

        {/* Busca */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={20} color={colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar unidade, bairro ou serviço..."
            placeholderTextColor={colors.slate400}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {offline && (
          <View style={styles.offlineNote}>
            <Feather name="wifi-off" size={14} color={colors.orange600} />
            <Text style={styles.offlineNoteText}>
              Sem conexão com o servidor — exibindo a base local de exemplo.
            </Text>
          </View>
        )}
        {loadingUnits && (
          <Text style={styles.loadingText}>Buscando unidades próximas...</Text>
        )}

        {/* Filtros */}
        <View style={styles.filterRow}>
          {(["todas", "UBS", "CAPS"] as Filter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}
              >
                {f === "todas" ? "Todas" : f}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Lista de unidades */}
        {units.map((unit) => (
          <View key={unit.id} style={styles.unitCard}>
            <View style={styles.unitHeader}>
              <View
                style={[
                  styles.kindTag,
                  { backgroundColor: unit.kind === "UBS" ? colors.teal50 : colors.blue50 },
                ]}
              >
                <Text
                  style={[
                    styles.kindTagText,
                    { color: unit.kind === "UBS" ? colors.teal600 : colors.blue600 },
                  ]}
                >
                  {unit.kind}
                </Text>
              </View>
              <Text style={styles.unitDistance}>{unit.distanceKm.toFixed(1)} km</Text>
            </View>

            <Text style={styles.unitName}>{unit.name}</Text>
            <Text style={styles.unitAddress}>{unit.address}</Text>

            <View style={styles.unitMetaRow}>
              <Feather name="clock" size={14} color={colors.slate400} />
              <Text style={styles.unitMeta}>{unit.hours}</Text>
            </View>

            <View style={styles.servicesRow}>
              {unit.services.map((s) => (
                <View key={s} style={styles.serviceTag}>
                  <Text style={styles.serviceTagText}>{s}</Text>
                </View>
              ))}
            </View>

            <View style={styles.unitActions}>
              <Pressable
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${unit.phone.replace(/\D/g, "")}`)}
              >
                <Feather name="phone" size={16} color={colors.teal600} />
                <Text style={styles.callButtonText}>Ligar</Text>
              </Pressable>
              <Pressable style={styles.routeButton}>
                <Feather name="navigation" size={16} color={colors.white} />
                <Text style={styles.routeButtonText}>Como chegar</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {units.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="map" size={40} color={colors.slate300} />
            <Text style={styles.emptyText}>
              Nenhuma unidade encontrada para essa busca.
            </Text>
          </View>
        )}
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
  offlineNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.orange50,
    borderWidth: 1,
    borderColor: colors.orange100,
  },
  offlineNoteText: { flex: 1, fontSize: 12, color: colors.orange600, lineHeight: 17 },
  loadingText: { fontSize: 12, color: colors.slate400, textAlign: "center" },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 48,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue100,
    borderRadius: 16,
    padding: 14,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: colors.blue800,
    fontWeight: "500",
  },
  locationChange: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.blue600,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.slate700,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  filterChipActive: {
    backgroundColor: colors.teal500,
    borderColor: colors.teal500,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate600,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  unitCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 16,
    gap: 6,
  },
  unitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kindTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  kindTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  unitDistance: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate500,
  },
  unitName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate800,
  },
  unitAddress: {
    fontSize: 13,
    color: colors.slate500,
  },
  unitMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  unitMeta: {
    fontSize: 12,
    color: colors.slate400,
  },
  servicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  serviceTag: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceTagText: {
    fontSize: 11,
    color: colors.slate600,
    fontWeight: "500",
  },
  unitActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.teal50,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  callButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.teal600,
  },
  routeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.blue600,
    borderRadius: 12,
    paddingVertical: 10,
  },
  routeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate400,
    textAlign: "center",
  },
});
