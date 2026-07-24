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
};

function NavItem({ icon, label, active, onPress }: NavItemProps) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
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
};

export function BottomNav({ activeTab, onChangeTab, onPanicPress }: BottomNavProps) {
  return (
    <View style={styles.container}>
      <NavItem icon="home" label="Home" active={activeTab === "home"} onPress={() => onChangeTab("home")} />
      <NavItem icon="message-circle" label="Chat" active={activeTab === "chat"} onPress={() => onChangeTab("chat")} />

      {/* FAB — Botão de Emergência */}
      <View style={styles.fabSlot}>
        <Pressable style={styles.fab} onPress={onPanicPress}>
          <Feather name="alert-triangle" size={28} color={colors.white} />
        </Pressable>
      </View>

      <NavItem icon="book-open" label="Explorar" active={activeTab === "info"} onPress={() => onChangeTab("info")} />
      <NavItem icon="user" label="Perfil" active={activeTab === "profile"} onPress={() => onChangeTab("profile")} />
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
