import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  Chip,
  Field,
  FlameRating,
  Footer,
  Notice,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  ui,
  YesNo,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { formatDate } from "../core/progressEngine";
import { TRIGGER_EMOTIONS, TRIGGER_PEOPLE, TRIGGER_PLACES } from "../data/clinical";
import { colors } from "../theme/colors";

// Diário de Gatilhos (TCC): mapear onde, como e com quem a vontade aparece
// é o primeiro passo para quebrar o padrão do hábito.

export function TriggersScreen({ onClose }: { onClose: () => void }) {
  const { triggers, addTrigger } = useApp();
  const [place, setPlace] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [people, setPeople] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [gaveIn, setGaveIn] = useState(false);
  const [note, setNote] = useState("");

  const save = async () => {
    await addTrigger({
      date: new Date().toISOString(),
      place,
      emotion,
      people,
      intensity,
      gaveIn,
      note: note.trim(),
    });
    setPlace(null);
    setEmotion(null);
    setPeople(null);
    setIntensity(3);
    setGaveIn(false);
    setNote("");
  };

  const ChipGroup = ({
    title,
    options,
    value,
    onChange,
  }: {
    title: string;
    options: string[];
    value: string | null;
    onChange: (v: string | null) => void;
  }) => (
    <View style={ui.section}>
      <SectionTitle>{title}</SectionTitle>
      <View style={ui.wrap}>
        {options.map((o) => (
          <Chip key={o} label={o} active={value === o} onPress={() => onChange(value === o ? null : o)} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Diário de Gatilhos" subtitle="Mapeie o que dispara a sua vontade" onBack={onClose} />

      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        <Notice tone="teal">
          Registrar os gatilhos ajuda a identificar padrões — e o padrão é o primeiro passo para
          quebrar o hábito.
        </Notice>

        <ChipGroup title="Onde você estava?" options={TRIGGER_PLACES} value={place} onChange={setPlace} />
        <ChipGroup title="Como estava se sentindo?" options={TRIGGER_EMOTIONS} value={emotion} onChange={setEmotion} />
        <ChipGroup title="Com quem?" options={TRIGGER_PEOPLE} value={people} onChange={setPeople} />

        <View style={ui.section}>
          <SectionTitle>Intensidade (1-5)</SectionTitle>
          <FlameRating value={intensity} onChange={setIntensity} size={32} />
        </View>

        <View style={ui.section}>
          <SectionTitle>Você cedeu?</SectionTitle>
          <YesNo value={gaveIn} onChange={setGaveIn} yesTone="orange" />
        </View>

        <View style={ui.section}>
          <SectionTitle>Anotação (opcional)</SectionTitle>
          <Field
            multiline
            placeholder="O que acionou? O que ajudou a passar?"
            value={note}
            onChangeText={setNote}
            style={styles.textArea}
          />
        </View>

        {triggers.length > 0 && (
          <View style={ui.section}>
            <SectionTitle>Histórico ({triggers.length})</SectionTitle>
            {triggers.slice(0, 8).map((t) => (
              <View key={t.date} style={[ui.card, styles.entry]}>
                <View style={[styles.entryIcon, t.gaveIn ? styles.entryIconGave : styles.entryIconOk]}>
                  <Feather name="zap" size={18} color={t.gaveIn ? colors.orange600 : colors.teal600} />
                </View>
                <View style={styles.entryBody}>
                  <Text style={styles.entryDate}>{formatDate(new Date(t.date))}</Text>
                  <Text style={styles.entryTitle} numberOfLines={1}>
                    {[t.place, t.emotion, t.people].filter(Boolean).join(" • ") || "Sem detalhes"}
                  </Text>
                  {t.note ? (
                    <Text style={styles.entryNote} numberOfLines={2}>
                      {t.note}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.entryBadge, t.gaveIn ? styles.badgeGave : styles.badgeOk]}>
                  {t.intensity}/5
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Footer>
        <PrimaryButton label="Registrar Gatilho" onPress={save} disabled={!place && !emotion} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  textArea: { minHeight: 80, textAlignVertical: "top", borderRadius: 16 },
  entry: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12 },
  entryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  entryIconGave: { backgroundColor: colors.orange100 },
  entryIconOk: { backgroundColor: colors.teal100 },
  entryBody: { flex: 1 },
  entryDate: { fontSize: 12, color: colors.slate400 },
  entryTitle: { fontSize: 14, fontWeight: "600", color: colors.slate700 },
  entryNote: { fontSize: 12, color: colors.slate500, marginTop: 4 },
  entryBadge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  badgeGave: { backgroundColor: colors.orange50, color: colors.orange600 },
  badgeOk: { backgroundColor: colors.teal50, color: colors.teal600 },
});
