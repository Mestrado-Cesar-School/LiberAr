import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export type TabKey = "home" | "chat" | "info" | "profile";

type NavItemProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  /** Durante o tour: true destaca este item, false o esmaece. */
  spotlight?: boolean;
};

function NavItem({ icon, label, active, onPress, spotlight }: NavItemProps) {
  return (
    <Pressable
      style={[styles.navItem, spotlight === false && styles.dimmed, spotlight && styles.spotlight]}
      onPress={onPress}
    >
      <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
        <Feather name={icon} size={24} color={active ? colors.teal600 : colors.slate400} />
      </View>
      <Text style={[styles.navLabel, { color: active ? colors.teal600 : colors.slate400 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

type BottomNavProps = {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  onPanicPress: () => void;
  /** Aba destacada pelo tour de apresentação (as demais ficam esmaecidas). */
  tourTab?: TabKey | null;
};

export function BottomNav({ activeTab, onChangeTab, onPanicPress, tourTab }: BottomNavProps) {
  const spot = (tab: TabKey) => (tourTab ? tourTab === tab : undefined);
  return (
    <View style={styles.container}>
      <NavItem icon="home" label="Home" active={activeTab === "home"} onPress={() => onChangeTab("home")} spotlight={spot("home")} />
      <NavItem icon="message-circle" label="Chat" active={activeTab === "chat"} onPress={() => onChangeTab("chat")} spotlight={spot("chat")} />

      {/* FAB — Botão de Emergência */}
      <View style={[styles.fabSlot, tourTab && styles.dimmed]}>
        <Pressable style={styles.fab} onPress={onPanicPress}>
          <Feather name="alert-triangle" size={28} color={colors.white} />
        </Pressable>
      </View>

      <NavItem icon="book-open" label="Explorar" active={activeTab === "info"} onPress={() => onChangeTab("info")} spotlight={spot("info")} />
      <NavItem icon="user" label="Perfil" active={activeTab === "profile"} onPress={() => onChangeTab("profile")} spotlight={spot("profile")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 12,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dimmed: {
    opacity: 0.25,
  },
  spotlight: {
    borderWidth: 3,
    borderColor: "#2DD4BF",
    borderRadius: 999,
    padding: 6,
    margin: -9,
  },
  navIconWrap: {
    padding: 6,
    borderRadius: 12,
  },
  navIconWrapActive: {
    backgroundColor: colors.teal50,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  fabSlot: {
    top: -24,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    backgroundColor: colors.orange500,
    padding: 16,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: colors.slate50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.orange500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
