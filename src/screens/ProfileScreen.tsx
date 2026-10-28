import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Toggle } from "../components/ui";
import { useApp } from "../context/AppContext";
import { cancelDailyReminder, requestPermission, scheduleReminders } from "../core/notifications";
import { pad2 } from "../core/progressEngine";
import { describeError } from "../data/api";
import { avatarUri } from "../data/clinical";
import { colors } from "../theme/colors";

// Módulo de Perfil (diagrama: Camada de Apresentação). "Sair da Conta" revoga
// a sessão na API e limpa os dados locais; "Excluir minha conta e dados"
// exerce o direito ao esquecimento (LGPD): apaga tudo também no servidor.

export type ProfileRoute = "edit-profile" | "triggers" | "treatment" | "report" | "terms" | "reminder";

type MenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  label: string;
  onPress?: () => void;
  last?: boolean;
};

function MenuItem({ icon, iconColor, label, onPress, last }: MenuItemProps) {
  return (
    <Pressable style={[styles.menuItem, !last && styles.menuItemBorder]} onPress={onPress}>
      <View style={styles.menuIconWrap}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Feather name="chevron-right" size={18} color={colors.slate300} />
    </Pressable>
  );
}

export function ProfileScreen({ onNavigate }: { onNavigate: (route: ProfileRoute) => void }) {
  const { profile, cycles, updateProfile, logout, deleteAccount, online, pendingOps } = useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const doLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
  };

  const doDelete = async () => {
    if (deleting) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (e) {
      setDeleteError(describeError(e));
      setDeleting(false);
    }
  };

  const syncLabel = !online
    ? "Sem conexão — as alterações serão sincronizadas depois"
    : pendingOps > 0
      ? `Sincronização pendente (${pendingOps})`
      : null;

  const reminderOn = profile?.reminderEnabled ?? false;
  const hour = profile?.reminderHour ?? 20;
  const minute = profile?.reminderMinute ?? 0;
  const days = profile?.reminderDays ?? [1, 2, 3, 4, 5];

  const toggleReminder = async (next: boolean) => {
    await updateProfile({ reminderEnabled: next });
    if (next) {
      await requestPermission();
      await scheduleReminders(hour, minute, days);
    } else {
      await cancelDailyReminder();
    }
  };

  const daysLabel =
    days.length === 7 ? "Diariamente" : days.length === 5 && !days.includes(0) && !days.includes(6) ? "Dias úteis" : `${days.length} dias/semana`;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Cabeçalho do perfil */}
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate("edit-profile")}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatarUri(profile?.avatar) }} style={styles.avatar} />
          </View>
          <View style={styles.editBadge}>
            <Feather name="edit-2" size={13} color={colors.white} />
          </View>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.name}>{profile?.name ?? "Visitante"}</Text>
          <Text style={styles.email}>{profile?.email ?? ""}</Text>
        </View>
        {syncLabel && (
          <View style={styles.syncPill}>
            <Feather name={online ? "refresh-cw" : "wifi-off"} size={12} color={colors.orange600} />
            <Text style={styles.syncText}>{syncLabel}</Text>
          </View>
        )}
      </View>

      {/* Lembrete de check-in */}
      <View style={styles.reminderCard}>
        <Pressable style={styles.reminderMain} onPress={() => onNavigate("reminder")}>
          <View style={styles.reminderIconWrap}>
            <Feather name="bell" size={20} color={colors.orange500} />
          </View>
          <View style={styles.reminderBody}>
            <Text style={styles.reminderTitle}>Lembrete de Check-in</Text>
            <Text style={styles.reminderSubtitle}>
              {reminderOn ? `${daysLabel} às ${pad2(hour)}:${pad2(minute)}` : "Toque para configurar"}
            </Text>
          </View>
        </Pressable>
        <Toggle value={reminderOn} onChange={toggleReminder} />
      </View>

      {/* Histórico de ciclos — aparece após o primeiro reinício */}
      {cycles.length > 0 && (
        <View style={styles.menuCard}>
          <View style={styles.cyclesHeader}>
            <View style={styles.cyclesIcon}>
              <Feather name="rotate-ccw" size={18} color={colors.orange500} />
            </View>
            <View>
              <Text style={styles.cyclesTitle}>Histórico de Ciclos</Text>
              <Text style={styles.cyclesSubtitle}>Cada ciclo é uma prova de coragem</Text>
            </View>
          </View>
          {cycles.map((c, i) => (
            <View key={c.endedAt} style={styles.cycleRow}>
              <View style={styles.cycleLeft}>
                <View style={styles.cycleNumber}>
                  <Text style={styles.cycleNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.cycleLabel}>{c.label}</Text>
              </View>
              <Text style={styles.cycleDays}>
                {c.days} {c.days === 1 ? "dia" : "dias"}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Menu */}
      <View style={styles.menuCard}>
        <MenuItem icon="user" iconColor={colors.slate500} label="Editar Perfil" onPress={() => onNavigate("edit-profile")} />
        <MenuItem icon="zap" iconColor={colors.orange500} label="Diário de Gatilhos" onPress={() => onNavigate("triggers")} />
        <MenuItem icon="heart" iconColor={colors.rose500} label="Meu Tratamento" onPress={() => onNavigate("treatment")} />
        <MenuItem icon="file-text" iconColor={colors.teal500} label="Exportar Relatório (PDF)" onPress={() => onNavigate("report")} />
        <MenuItem icon="shield" iconColor={colors.slate500} label="Termos de Uso e LGPD" onPress={() => onNavigate("terms")} last />
      </View>

      <View style={styles.menuCard}>
        <Pressable style={styles.logoutItem} onPress={doLogout} disabled={loggingOut}>
          <View style={styles.logoutIconWrap}>
            {loggingOut ? (
              <ActivityIndicator size="small" color={colors.rose500} />
            ) : (
              <Feather name="log-out" size={20} color={colors.rose500} />
            )}
          </View>
          <Text style={styles.logoutLabel}>{loggingOut ? "Saindo..." : "Sair da Conta"}</Text>
        </Pressable>
      </View>

      {/* LGPD — direito ao esquecimento, com confirmação em duas etapas (funciona na web) */}
      <View style={styles.menuCard}>
        {!confirmDelete ? (
          <Pressable style={styles.logoutItem} onPress={() => setConfirmDelete(true)}>
            <View style={styles.deleteIconWrap}>
              <Feather name="trash-2" size={20} color={colors.slate500} />
            </View>
            <View style={styles.deleteBody}>
              <Text style={styles.deleteLabel}>Excluir minha conta e dados</Text>
              <Text style={styles.deleteHint}>Apaga tudo no servidor e no aparelho (LGPD)</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.deleteConfirm}>
            <Text style={styles.deleteConfirmTitle}>Excluir sua conta definitivamente?</Text>
            <Text style={styles.deleteConfirmText}>
              Seu perfil, check-ins, histórico de conversas e relatórios serão apagados do
              servidor e deste aparelho. Essa ação não pode ser desfeita.
            </Text>
            {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
            <View style={styles.deleteActions}>
              <Pressable
                style={styles.deleteCancel}
                onPress={() => {
                  setConfirmDelete(false);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                <Text style={styles.deleteCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={doDelete} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.deleteButtonText}>Excluir definitivamente</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 120, gap: 20 },
  header: { alignItems: "center", paddingTop: 24, gap: 12 },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: colors.white,
    overflow: "hidden",
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: { width: "100%", height: "100%" },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.teal500,
    padding: 7,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.white,
  },
  headerText: { alignItems: "center" },
  name: { fontSize: 20, fontWeight: "700", color: colors.slate800 },
  email: { fontSize: 14, color: colors.slate500 },
  reminderCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reminderMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  reminderIconWrap: { backgroundColor: colors.orange50, padding: 8, borderRadius: 12 },
  reminderBody: { flex: 1 },
  reminderTitle: { fontSize: 14, fontWeight: "600", color: colors.slate800 },
  reminderSubtitle: { fontSize: 12, color: colors.slate500 },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.slate100,
    overflow: "hidden",
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.slate50 },
  menuIconWrap: { backgroundColor: colors.slate50, padding: 8, borderRadius: 12 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.slate700 },
  cyclesHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 8 },
  cyclesIcon: { backgroundColor: colors.orange50, padding: 8, borderRadius: 12 },
  cyclesTitle: { fontSize: 14, fontWeight: "600", color: colors.slate800 },
  cyclesSubtitle: { fontSize: 12, color: colors.slate400 },
  cycleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate50,
  },
  cycleLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cycleNumber: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.orange100,
    alignItems: "center",
    justifyContent: "center",
  },
  cycleNumberText: { fontSize: 12, fontWeight: "700", color: colors.orange600 },
  cycleLabel: { fontSize: 14, fontWeight: "600", color: colors.slate700 },
  cycleDays: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate500,
    backgroundColor: colors.slate50,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.orange50,
    borderWidth: 1,
    borderColor: colors.orange100,
  },
  syncText: { fontSize: 11, fontWeight: "600", color: colors.orange600 },
  deleteIconWrap: { backgroundColor: colors.slate100, padding: 8, borderRadius: 12 },
  deleteBody: { flex: 1 },
  deleteLabel: { fontSize: 14, fontWeight: "600", color: colors.slate700 },
  deleteHint: { fontSize: 11, color: colors.slate400, marginTop: 2 },
  deleteConfirm: { padding: 16, gap: 10 },
  deleteConfirmTitle: { fontSize: 15, fontWeight: "700", color: colors.slate800 },
  deleteConfirmText: { fontSize: 12, color: colors.slate500, lineHeight: 18 },
  deleteError: { fontSize: 12, color: colors.rose500, fontWeight: "600" },
  deleteActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  deleteCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
  },
  deleteCancelText: { fontSize: 13, fontWeight: "600", color: colors.slate600 },
  deleteButton: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.rose500,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: { fontSize: 13, fontWeight: "700", color: colors.white },
  logoutItem: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16 },
  logoutIconWrap: { backgroundColor: colors.rose50, padding: 8, borderRadius: 12 },
  logoutLabel: { fontSize: 14, fontWeight: "600", color: colors.rose500 },
});
