import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import {
  cancelDailyReminder,
  remindersSupported,
  requestPermission,
  scheduleDailyReminder,
} from "../core/notifications";
import { colors } from "../theme/colors";

// Módulo de Perfil (diagrama: Camada de Apresentação). O logout aciona o
// direito ao esquecimento: limpa os dados locais e volta ao onboarding.

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

type ProfileScreenProps = {
  onOpenEvolution: () => void;
  onOpenTerms: () => void;
};

export function ProfileScreen({ onOpenEvolution, onOpenTerms }: ProfileScreenProps) {
  const { profile, updateProfile, logout } = useApp();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [cigsPerDay, setCigsPerDay] = useState(profile?.cigsPerDay ?? 20);
  const [reminderOn, setReminderOn] = useState(profile?.reminderEnabled ?? false);
  const reminderHour = profile?.reminderHour ?? 20;

  const saveGoal = () => {
    updateProfile({ cigsPerDay });
    setShowGoalModal(false);
  };

  const toggleReminder = async () => {
    const next = !reminderOn;
    setReminderOn(next);
    updateProfile({ reminderEnabled: next, reminderHour });
    if (next) {
      await requestPermission();
      await scheduleDailyReminder(reminderHour);
    } else {
      await cancelDailyReminder();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Cabeçalho do perfil */}
      <View style={styles.header}>
        <View>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: "https://i.pravatar.cc/150?img=47" }} style={styles.avatar} />
          </View>
          <Pressable style={styles.editBadge}>
            <Feather name="edit-2" size={13} color={colors.white} />
          </Pressable>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{profile?.name ?? "Visitante"}</Text>
          <Text style={styles.email}>{profile?.email ?? ""}</Text>
        </View>
      </View>

      {/* Lembrete diário */}
      <View style={styles.reminderCard}>
        <View style={styles.reminderIconWrap}>
          <Feather name="bell" size={20} color={colors.orange500} />
        </View>
        <View style={styles.reminderBody}>
          <Text style={styles.reminderTitle}>Lembrete de Check-in</Text>
          <Text style={styles.reminderSubtitle}>
            {reminderOn
              ? `Todos os dias às ${String(reminderHour).padStart(2, "0")}h`
              : "Receba um lembrete gentil todo dia"}
          </Text>
          {!remindersSupported() && reminderOn && (
            <Text style={styles.reminderHint}>
              Disponível no app instalado (Android/iOS).
            </Text>
          )}
        </View>
        <Pressable
          onPress={toggleReminder}
          style={[styles.toggle, reminderOn && styles.toggleOn]}
          accessibilityRole="switch"
          accessibilityState={{ checked: reminderOn }}
        >
          <View style={[styles.toggleKnob, reminderOn && styles.toggleKnobOn]} />
        </Pressable>
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        <MenuItem
          icon="target"
          iconColor={colors.blue500}
          label="Editar Meta Diária"
          onPress={() => setShowGoalModal(true)}
        />
        <MenuItem
          icon="bar-chart-2"
          iconColor={colors.orange500}
          label="Minha Evolução"
          onPress={onOpenEvolution}
        />
        <MenuItem
          icon="file-text"
          iconColor={colors.teal500}
          label="Exportar Relatório (PDF)"
        />
        <MenuItem
          icon="shield"
          iconColor={colors.slate500}
          label="Termos de Uso e LGPD"
          onPress={onOpenTerms}
          last
        />
      </View>

      <View style={styles.menuCard}>
        <Pressable style={styles.logoutItem} onPress={logout}>
          <View style={styles.logoutIconWrap}>
            <Feather name="log-out" size={20} color={colors.rose500} />
          </View>
          <Text style={styles.logoutLabel}>Sair da Conta</Text>
        </Pressable>
      </View>

      {/* Modal: Editar Meta Diária */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Meta Diária</Text>
            <Text style={styles.modalSubtitle}>
              Quantos cigarros você fumava por dia? Usamos esse valor para
              calcular sua economia e seus marcos.
            </Text>

            <View style={styles.goalStepper}>
              <Pressable
                style={styles.goalButton}
                onPress={() => setCigsPerDay(Math.max(1, cigsPerDay - 1))}
              >
                <Feather name="minus" size={22} color={colors.teal600} />
              </Pressable>
              <View style={styles.goalValueWrap}>
                <Text style={styles.goalValue}>{cigsPerDay}</Text>
                <Text style={styles.goalUnit}>cigarros/dia</Text>
              </View>
              <Pressable
                style={styles.goalButton}
                onPress={() => setCigsPerDay(Math.min(99, cigsPerDay + 1))}
              >
                <Feather name="plus" size={22} color={colors.teal600} />
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowGoalModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={saveGoal}>
                <Text style={styles.modalSaveText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 120,
    gap: 32,
  },
  header: {
    paddingTop: 32,
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: colors.white,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.blue500,
    padding: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.white,
  },
  headerText: {
    alignItems: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate800,
  },
  email: {
    fontSize: 14,
    color: colors.slate500,
  },
  reminderCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  reminderIconWrap: {
    backgroundColor: colors.orange100,
    padding: 10,
    borderRadius: 14,
  },
  reminderBody: {
    flex: 1,
    gap: 2,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate800,
  },
  reminderSubtitle: {
    fontSize: 12,
    color: colors.slate500,
  },
  reminderHint: {
    fontSize: 11,
    color: colors.orange500,
    marginTop: 2,
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 999,
    backgroundColor: colors.slate200,
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: {
    backgroundColor: colors.teal500,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobOn: {
    alignSelf: "flex-end",
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.slate100,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate50,
  },
  menuIconWrap: {
    backgroundColor: colors.slate50,
    padding: 8,
    borderRadius: 12,
  },
  menuLabel: {
    flex: 1,
    fontWeight: "600",
    fontSize: 14,
    color: colors.slate700,
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
  },
  logoutIconWrap: {
    backgroundColor: colors.rose50,
    padding: 8,
    borderRadius: 12,
  },
  logoutLabel: {
    flex: 1,
    fontWeight: "600",
    fontSize: 14,
    color: colors.rose500,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.slate800,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 19,
  },
  goalStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 8,
  },
  goalButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  goalValueWrap: {
    alignItems: "center",
    minWidth: 90,
  },
  goalValue: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.slate800,
  },
  goalUnit: {
    fontSize: 12,
    color: colors.slate400,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  modalCancelText: {
    fontWeight: "600",
    color: colors.slate600,
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: colors.teal500,
  },
  modalSaveText: {
    fontWeight: "700",
    color: colors.white,
  },
});
