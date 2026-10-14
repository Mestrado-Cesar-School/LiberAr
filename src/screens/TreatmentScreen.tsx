import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Chip,
  Field,
  Footer,
  Notice,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  SelectCard,
  ui,
  YesNo,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { Treatment } from "../core/types";
import {
  ADHERENCE_OPTIONS,
  MED_OPTIONS,
  Option,
  SIDE_EFFECTS,
  TRN_ADESIVO,
  TRN_ORAL,
} from "../data/clinical";
import { colors } from "../theme/colors";

// Meu Tratamento: o usuário registra o tratamento já prescrito por um
// profissional de saúde (TRN, medicamentos, adesão e efeitos adversos).
// O app não prevê, recomenda nem indica medicamentos.

/** Converte "DD/MM/AAAA" ⇄ "AAAA-MM-DD" (formato salvo). */
const toIso = (br: string) => {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};
const toBr = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};
const maskDate = (text: string) => {
  const v = text.replace(/\D/g, "").slice(0, 8);
  if (v.length > 4) return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  if (v.length > 2) return `${v.slice(0, 2)}/${v.slice(2)}`;
  return v;
};

export function TreatmentScreen({ onClose }: { onClose: () => void }) {
  const { treatment, saveTreatment, fagerstrom } = useApp();
  const [t, setT] = useState<Treatment>(treatment);
  const [startDate, setStartDate] = useState(toBr(treatment.startDate));

  const upd = (patch: Partial<Treatment>) => setT((prev) => ({ ...prev, ...patch }));
  const toggleSide = (value: string) =>
    upd({
      sideEffects: t.sideEffects.includes(value)
        ? t.sideEffects.filter((x) => x !== value)
        : [...t.sideEffects, value],
    });

  const save = async () => {
    await saveTreatment({ ...t, startDate: toIso(startDate) });
    onClose();
  };

  const suggestion = fagerstrom
    ? `Seu resultado no Teste de Fagerström foi ${fagerstrom.score} de 10 pontos. Leve esse resultado à sua consulta na UBS ou CAPS: é o profissional de saúde quem avalia e define o tratamento mais adequado para o seu caso.`
    : "Faça o Teste de Fagerström na aba Explorar para registrar aqui o seu resultado.";

  const OptionGroup = ({
    title,
    options,
    field,
  }: {
    title: string;
    options: Option[];
    field: "adesivo" | "oral" | "med";
  }) => (
    <View style={ui.section}>
      <SectionTitle>{title}</SectionTitle>
      {options.map((o) => (
        <SelectCard
          key={o.value}
          title={o.label}
          note={o.note}
          active={t[field] === o.value}
          onPress={() => upd({ [field]: t[field] === o.value ? null : o.value })}
        />
      ))}
    </View>
  );

  return (
    <View style={ui.screen}>
      <ScreenHeader
        title="Meu Tratamento"
        subtitle="Registre o que você usa para parar de fumar"
        onBack={onClose}
      />

      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        <Notice tone="teal">
          <Text style={styles.noticeText}>{suggestion}</Text>
          <Text style={[styles.noticeText, styles.bold]}>
            O LiberAr não prevê, recomenda ou indica medicamentos. Esta tela serve apenas para você
            registrar o tratamento que um profissional de saúde já prescreveu.
          </Text>
        </Notice>

        <View style={ui.section}>
          <SectionTitle>Você chegou ao tratamento pelo LiberAr?</SectionTitle>
          <YesNo value={t.viaApp} onChange={(v) => upd({ viaApp: v })} />
          <View style={[ui.card, styles.fields]}>
            <Field
              label="Unidade de saúde (UBS) do acompanhamento"
              placeholder="Ex.: UBS Casa Amarela"
              value={t.ubs}
              onChangeText={(v) => upd({ ubs: v })}
            />
            <Field
              label="Início do tratamento"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              value={startDate}
              onChangeText={(v) => setStartDate(maskDate(v))}
            />
            <Field
              label="Profissional ou equipe responsável"
              placeholder="Ex.: equipe de saúde da família"
              value={t.professional}
              onChangeText={(v) => upd({ professional: v })}
            />
          </View>
        </View>

        <OptionGroup title="Adesivo de nicotina" options={TRN_ADESIVO} field="adesivo" />
        <OptionGroup title="Nicotina de alívio rápido" options={TRN_ORAL} field="oral" />
        <OptionGroup title="Medicamento não nicotínico" options={MED_OPTIONS} field="med" />

        <View style={ui.section}>
          <SectionTitle>Como está a adesão ao tratamento?</SectionTitle>
          <View style={styles.row}>
            {ADHERENCE_OPTIONS.map((a) => (
              <SelectCard
                key={a.value}
                title={a.label}
                active={t.adherence === a.value}
                onPress={() => upd({ adherence: a.value })}
                style={styles.adherence}
              />
            ))}
          </View>
        </View>

        <View style={ui.section}>
          <SectionTitle>Efeitos adversos percebidos</SectionTitle>
          <View style={ui.wrap}>
            {SIDE_EFFECTS.map((s) => (
              <Chip
                key={s}
                label={s}
                tone="orange"
                active={t.sideEffects.includes(s)}
                onPress={() => toggleSide(s)}
              />
            ))}
          </View>
        </View>

        <View style={ui.section}>
          <SectionTitle>Observações para levar à consulta</SectionTitle>
          <Field
            multiline
            placeholder="Ex.: senti muita fissura na 2ª semana, o adesivo descolou algumas vezes..."
            value={t.notes}
            onChangeText={(v) => upd({ notes: v })}
            style={styles.textArea}
          />
        </View>

        <Text style={ui.muted}>
          Este registro é um apoio ao seu acompanhamento e não substitui a prescrição nem a
          avaliação de um profissional de saúde.
        </Text>
      </ScrollView>

      <Footer>
        <PrimaryButton label="Salvar Tratamento" onPress={save} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  noticeText: { fontSize: 12, lineHeight: 18, color: "#134E4A" },
  bold: { fontWeight: "700", marginTop: 6 },
  fields: { gap: 12 },
  row: { flexDirection: "row", gap: 8 },
  adherence: { flex: 1, alignItems: "center", paddingHorizontal: 6, paddingVertical: 12 },
  textArea: { minHeight: 96, textAlignVertical: "top", borderRadius: 16, color: colors.slate800 },
});
