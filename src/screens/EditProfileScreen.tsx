import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Field, Footer, PrimaryButton, ScreenHeader, SectionTitle, SelectCard, ui } from "../components/ui";
import { useApp } from "../context/AppContext";
import { MainFear, StopReason } from "../core/types";
import { AVATARS, avatarUri, MAIN_FEAR_OPTIONS, STOP_REASON_OPTIONS } from "../data/clinical";
import { colors } from "../theme/colors";

// Editar Perfil: avatar, nome, e-mail e as respostas motivacionais do
// onboarding (motivo para parar e maior receio).

export function EditProfileScreen({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useApp();
  const [name, setName] = useState(profile?.name ?? "");
  // O e-mail é a identidade da conta na API e não muda por aqui.
  const email = profile?.email ?? "";
  const [avatar, setAvatar] = useState(profile?.avatar ?? 47);
  const [stopReason, setStopReason] = useState<StopReason | undefined>(profile?.stopReason);
  const [mainFear, setMainFear] = useState<MainFear | undefined>(profile?.mainFear);

  const save = async () => {
    await updateProfile({
      name: name.trim() || profile?.name,
      avatar,
      stopReason,
      mainFear,
    });
    onClose();
  };

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Editar Perfil" onBack={onClose} />

      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatarUri(avatar) }} style={styles.avatar} />
          </View>
          <Text style={styles.avatarHint}>Escolha um avatar</Text>
          <View style={styles.avatarRow}>
            {AVATARS.map((a) => (
              <Pressable
                key={a}
                onPress={() => setAvatar(a)}
                style={[styles.avatarOption, avatar === a && styles.avatarOptionActive]}
              >
                <Image source={{ uri: avatarUri(a, 80) }} style={styles.avatarSmall} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[ui.card, styles.fields]}>
          <Field label="Nome" value={name} onChangeText={setName} />
          <Field
            label="E-mail (não editável)"
            value={email}
            editable={false}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.readOnly}
          />
        </View>

        <View style={ui.section}>
          <SectionTitle>Motivação principal</SectionTitle>
          <View style={styles.grid}>
            {STOP_REASON_OPTIONS.filter((o) => o.value !== "outro").map((o) => (
              <SelectCard
                key={o.value}
                title={o.label}
                active={stopReason === o.value}
                onPress={() => setStopReason(o.value)}
                style={styles.gridItem}
              />
            ))}
          </View>
        </View>

        <View style={ui.section}>
          <SectionTitle>Maior receio</SectionTitle>
          <View style={styles.grid}>
            {MAIN_FEAR_OPTIONS.map((o) => (
              <SelectCard
                key={o.value}
                title={o.label}
                active={mainFear === o.value}
                onPress={() => setMainFear(o.value)}
                style={styles.gridItem}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <Footer>
        <PrimaryButton label="Salvar Alterações" onPress={save} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  readOnly: { color: colors.slate400, backgroundColor: colors.slate50 },
  avatarSection: { alignItems: "center" },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: colors.white,
    overflow: "hidden",
    backgroundColor: colors.white,
  },
  avatar: { width: "100%", height: "100%" },
  avatarHint: { fontSize: 12, color: colors.slate400, marginTop: 8 },
  avatarRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 12 },
  avatarOption: { width: 44, height: 44, borderRadius: 999, borderWidth: 2, borderColor: "transparent", padding: 2 },
  avatarOptionActive: { borderColor: colors.teal500 },
  avatarSmall: { width: "100%", height: "100%", borderRadius: 999 },
  fields: { gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridItem: { width: "48.5%", alignItems: "center", paddingVertical: 12 },
});
