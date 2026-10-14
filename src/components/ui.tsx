// Blocos visuais reutilizados pelas telas (cabeçalho com voltar, chips,
// cartões selecionáveis, botões e avisos) — mantêm o mesmo visual do
// protótipo do Figma em todas as telas novas.

import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type FeatherName = keyof typeof Feather.glyphMap;

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  dark,
}: {
  title?: string;
  subtitle?: string;
  onBack: () => void;
  dark?: boolean;
}) {
  return (
    <View style={[styles.header, dark && styles.headerDark, !title && styles.headerBare]}>
      <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
        <Feather name="arrow-left" size={24} color={dark ? colors.blue100 : colors.slate500} />
      </Pressable>
      {title ? (
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, dark && { color: colors.white }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.headerSubtitle, dark && { color: colors.blue100 }]}>{subtitle}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  tone = "teal",
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tone?: "teal" | "orange";
}) {
  const activeStyle = tone === "teal" ? styles.chipActiveTeal : styles.chipActiveOrange;
  const activeText = tone === "teal" ? colors.teal800 : colors.orange600;
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && activeStyle]}>
      <Text style={[styles.chipText, active && { color: activeText }]}>{label}</Text>
    </Pressable>
  );
}

export function SelectCard({
  title,
  note,
  active,
  onPress,
  style,
  large,
}: {
  title: string;
  note?: string;
  active: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  large?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.select, active && styles.selectActive, style]}>
      <Text
        style={[
          styles.selectTitle,
          large && styles.selectTitleLarge,
          active && { color: colors.teal800 },
        ]}
      >
        {title}
      </Text>
      {note ? <Text style={styles.selectNote}>{note}</Text> : null}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  variant = "primary",
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: FeatherName;
  variant?: "primary" | "secondary" | "ghost";
  style?: StyleProp<ViewStyle>;
}) {
  const textColor =
    variant === "primary" ? colors.white : variant === "secondary" ? colors.slate700 : colors.slate400;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={20} color={textColor} /> : null}
      <Text
        style={[
          styles.buttonText,
          { color: textColor },
          variant !== "primary" && styles.buttonTextSmall,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Rodapé fixo com a ação principal da tela. */
export function Footer({ children }: { children: React.ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

const NOTICE_TONES = {
  teal: { bg: colors.teal50, border: "#99F6E4", icon: colors.teal600, text: "#134E4A" },
  blue: { bg: colors.blue50, border: colors.blue100, icon: colors.blue500, text: colors.blue800 },
  orange: { bg: colors.orange50, border: "#FED7AA", icon: colors.orange500, text: "#9A3412" },
  amber: { bg: "#FFFBEB", border: "#FDE68A", icon: "#D97706", text: "#78350F" },
};

export function Notice({
  children,
  tone = "teal",
  icon = "info",
  title,
}: {
  children: React.ReactNode;
  tone?: keyof typeof NOTICE_TONES;
  icon?: FeatherName | null;
  title?: string;
}) {
  const t = NOTICE_TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg, borderColor: t.border }]}>
      {icon ? <Feather name={icon} size={18} color={t.icon} style={styles.noticeIcon} /> : null}
      <View style={styles.noticeBody}>
        {title ? <Text style={[styles.noticeTitle, { color: t.text }]}>{title}</Text> : null}
        {typeof children === "string" ? (
          <Text style={[styles.noticeText, { color: t.text }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function FlameRating({
  value,
  onChange,
  size = 36,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <View style={styles.flames}>
      {[1, 2, 3, 4, 5].map((level) => (
        <Pressable key={level} onPress={() => onChange(level)} hitSlop={4}>
          <MaterialCommunityIcons
            name="fire"
            size={size}
            color={level <= value ? colors.orange500 : colors.slate200}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggle, value && styles.toggleOn]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
    </Pressable>
  );
}

/** Par Sim/Não lado a lado. */
export function YesNo({
  value,
  onChange,
  yesTone = "teal",
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  yesTone?: "teal" | "orange";
}) {
  return (
    <View style={styles.yesNo}>
      <SelectCard
        title="Sim"
        active={value === true}
        onPress={() => onChange(true)}
        style={[styles.yesNoItem, value === true && yesTone === "orange" && styles.selectActiveOrange]}
      />
      <SelectCard
        title="Não"
        active={value === false}
        onPress={() => onChange(false)}
        style={styles.yesNoItem}
      />
    </View>
  );
}

export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.slate400} style={[styles.input, style]} {...props} />
    </View>
  );
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  screenWhite: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24, gap: 24, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: 16,
  },
  section: { gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  muted: { fontSize: 11, color: colors.slate400, textAlign: "center", lineHeight: 16 },
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    backgroundColor: colors.white,
  },
  headerDark: { backgroundColor: colors.blue600, borderBottomColor: colors.blue600 },
  headerBare: { borderBottomWidth: 0 },
  backButton: { padding: 8, marginLeft: -8, borderRadius: 999 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate800 },
  headerSubtitle: { fontSize: 12, color: colors.slate400, marginTop: 1 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  chipActiveTeal: { borderColor: colors.teal500, backgroundColor: colors.teal50 },
  chipActiveOrange: { borderColor: colors.orange400, backgroundColor: colors.orange50 },
  chipText: { fontSize: 12, fontWeight: "500", color: colors.slate600 },
  select: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.slate100,
    backgroundColor: colors.white,
  },
  selectActive: { borderColor: colors.teal500, backgroundColor: colors.teal50 },
  selectActiveOrange: { borderColor: colors.orange500, backgroundColor: colors.orange50 },
  selectTitle: { fontSize: 14, fontWeight: "600", color: colors.slate700 },
  selectTitleLarge: { fontSize: 17, fontWeight: "700" },
  selectNote: { fontSize: 12, color: colors.slate500, marginTop: 4, lineHeight: 17 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  buttonPrimary: {
    backgroundColor: colors.teal500,
    shadowColor: colors.teal500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, paddingVertical: 13 },
  buttonGhost: { paddingVertical: 10 },
  buttonDisabled: { backgroundColor: colors.slate300, shadowOpacity: 0, elevation: 0 },
  buttonText: { fontSize: 17, fontWeight: "700" },
  buttonTextSmall: { fontSize: 14, fontWeight: "600" },
  footer: {
    padding: 20,
    paddingBottom: 28,
    gap: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  notice: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  noticeIcon: { marginTop: 1 },
  noticeBody: { flex: 1, gap: 4 },
  noticeTitle: { fontSize: 13, fontWeight: "700" },
  noticeText: { fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.slate700 },
  flames: { flexDirection: "row", justifyContent: "center", gap: 8 },
  toggle: {
    width: 48,
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.slate300,
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: colors.teal500 },
  toggleKnob: { width: 20, height: 20, borderRadius: 999, backgroundColor: colors.white },
  toggleKnobOn: { alignSelf: "flex-end" },
  yesNo: { flexDirection: "row", gap: 12 },
  yesNoItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.slate500 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.slate800,
  },
});
