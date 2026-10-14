import React, { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";
import { Footer, PrimaryButton, ScreenHeader } from "../components/ui";
import { useApp } from "../context/AppContext";
import { formatDate, formatDateTime } from "../core/progressEngine";
import { buildReport, ReportBlock, reportHtml } from "../core/report";
import { colors } from "../theme/colors";

// Relatório de Acompanhamento: pré-visualização do PDF que o usuário leva à
// consulta na UBS. "Salvar como PDF" abre a impressão do sistema, que permite
// salvar o arquivo (web, Android e iOS).

type ReportScreenProps = {
  onClose: () => void;
  onEditTreatment: () => void;
};

function Block({ block }: { block: ReportBlock }) {
  switch (block.kind) {
    case "rows":
      return (
        <>
          {block.rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </>
      );
    case "subtitle":
      return <Text style={styles.subtitle}>{block.text}</Text>;
    case "note":
      return <Text style={styles.note}>{block.text}</Text>;
    case "empty":
      return <Text style={styles.empty}>{block.text}</Text>;
    case "score":
      return (
        <View style={styles.score}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>{block.score}</Text>
            <Text style={styles.scoreOf}>de 10</Text>
          </View>
          <View>
            <Text style={styles.strong}>Dependência {block.label.toLowerCase()}</Text>
            <Text style={styles.muted}>Aplicado em {block.date}</Text>
          </View>
        </View>
      );
    case "items":
      return (
        <View style={styles.gap6}>
          {block.items.map((i) => (
            <View key={i.title} style={styles.item}>
              <Text style={styles.strong}>{i.title}</Text>
              <Text style={styles.muted}>{i.text}</Text>
            </View>
          ))}
        </View>
      );
    case "bars":
      return (
        <View style={styles.gap6}>
          {block.bars.map((b) => (
            <View key={b.label} style={styles.bar}>
              <Text style={styles.barLabel}>{b.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.round(b.ratio * 100)}%` }]} />
              </View>
              <Text style={styles.barCount}>{b.count}x</Text>
            </View>
          ))}
        </View>
      );
    case "table":
      return (
        <View>
          <View style={[styles.tr, styles.thead]}>
            {block.head.map((h) => (
              <Text key={h} style={[styles.td, styles.th]}>
                {h}
              </Text>
            ))}
          </View>
          {block.rows.map((r, i) => (
            <View key={i} style={styles.tr}>
              {r.map((c, j) => (
                <Text
                  key={j}
                  style={[
                    styles.td,
                    j === 3 && { fontWeight: "600", color: c === "Sim" ? colors.orange600 : colors.teal600 },
                  ]}
                >
                  {c}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    case "checks":
      return (
        <>
          {block.items.map((i) => (
            <View key={i} style={styles.check}>
              <Feather name="check" size={11} color={colors.teal600} style={{ marginTop: 2 }} />
              <Text style={styles.checkText}>{i}</Text>
            </View>
          ))}
        </>
      );
  }
}

export function ReportScreen({ onClose, onEditTreatment }: ReportScreenProps) {
  const { profile, progress, checkIns, cycles, fagerstrom, treatment } = useApp();
  const [printing, setPrinting] = useState(false);

  const model = useMemo(
    () =>
      profile && progress
        ? buildReport({ profile, progress, checkIns, cycles, fagerstrom, treatment })
        : null,
    [profile, progress, checkIns, cycles, fagerstrom, treatment]
  );

  if (!model) return null;

  const exportPdf = async () => {
    setPrinting(true);
    try {
      const html = reportHtml(model);
      if (Platform.OS === "web") {
        // No navegador, imprime numa janela própria só com o relatório.
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          setTimeout(() => w.print(), 300);
        }
      } else {
        await Print.printAsync({ html });
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Relatório de Acompanhamento" subtitle="Pré-visualização do PDF" onBack={onClose} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.paper}>
          <View style={styles.paperHeader}>
            <View style={styles.brand}>
              <Feather name="wind" size={26} color={colors.teal600} />
              <View>
                <Text style={styles.brandName}>LiberAr</Text>
                <Text style={styles.muted}>Relatório de acompanhamento do tabagismo</Text>
              </View>
            </View>
            <View style={styles.issued}>
              <Text style={styles.muted}>Emitido em</Text>
              <Text style={styles.strong}>{formatDate(model.issuedAt)}</Text>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            Documento gerado pelo próprio usuário a partir dos registros do aplicativo, para apoiar
            a consulta na unidade de saúde.{" "}
            <Text style={styles.disclaimerStrong}>
              Não substitui avaliação, diagnóstico ou prescrição profissional.
            </Text>
          </Text>

          {model.sections.map((s) => (
            <View key={s.n} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionNumber}>
                  <Text style={styles.sectionNumberText}>{s.n}</Text>
                </View>
                <Text style={styles.sectionTitle}>{s.title}</Text>
              </View>
              <View style={styles.sectionBody}>
                {s.blocks.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </View>
            </View>
          ))}

          <View style={styles.paperFooter}>
            <Text style={styles.footText}>
              Referências clínicas: Protocolo Clínico e Diretrizes Terapêuticas do Tabagismo
              (Ministério da Saúde / INCA) e Programa Nacional de Controle do Tabagismo. Dados
              tratados conforme a LGPD e exportados por iniciativa do próprio usuário.
            </Text>
            <Text style={styles.footText}>LiberAr | Relatório gerado em {formatDateTime(model.issuedAt)}</Text>
          </View>
        </View>
      </ScrollView>

      <Footer>
        <PrimaryButton
          label={printing ? "Gerando..." : "Salvar como PDF"}
          icon="file-text"
          onPress={exportPdf}
          disabled={printing}
        />
        <PrimaryButton label="Editar dados do tratamento" variant="secondary" onPress={onEditTreatment} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate200 },
  scroll: { padding: 16, paddingBottom: 32 },
  paper: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  paperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: colors.teal600,
    paddingBottom: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  brandName: { fontSize: 16, fontWeight: "700", color: colors.slate800 },
  issued: { alignItems: "flex-end" },
  muted: { fontSize: 10, color: colors.slate500, lineHeight: 14 },
  strong: { fontSize: 11, fontWeight: "700", color: colors.slate800 },
  disclaimer: {
    fontSize: 10,
    color: colors.slate500,
    lineHeight: 15,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 4,
    padding: 8,
    marginTop: 12,
  },
  disclaimerStrong: { fontWeight: "700", color: colors.slate700 },
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionNumber: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.teal600,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumberText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate800,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionBody: { paddingLeft: 28, gap: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
    borderStyle: "dashed",
  },
  rowLabel: { fontSize: 11, color: colors.slate500, flexShrink: 0, maxWidth: "55%" },
  rowValue: { fontSize: 11, fontWeight: "600", color: colors.slate800, textAlign: "right", flex: 1 },
  subtitle: { fontSize: 10, fontWeight: "600", color: colors.slate600, marginTop: 10, marginBottom: 4 },
  note: {
    fontSize: 10,
    color: colors.slate600,
    lineHeight: 15,
    backgroundColor: colors.slate50,
    borderRadius: 4,
    padding: 8,
  },
  empty: { fontSize: 11, color: colors.slate400, fontStyle: "italic", paddingVertical: 4 },
  score: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  scoreBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.teal600,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: { fontSize: 18, fontWeight: "700", color: "#0F766E" },
  scoreOf: { fontSize: 9, color: colors.slate500 },
  gap6: { gap: 6 },
  item: { borderWidth: 1, borderColor: colors.slate200, borderRadius: 4, padding: 8 },
  bar: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { fontSize: 10, color: colors.slate700, width: 120 },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.slate100, borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.teal500 },
  barCount: { fontSize: 10, fontWeight: "700", color: colors.slate800, width: 28, textAlign: "right" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  thead: { borderBottomColor: colors.slate200 },
  td: { flex: 1, fontSize: 10, color: colors.slate700, paddingVertical: 4 },
  th: { fontWeight: "600", color: colors.slate500 },
  check: { flexDirection: "row", gap: 6 },
  checkText: { fontSize: 10, color: colors.slate700, flex: 1 },
  paperFooter: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.slate200, gap: 4 },
  footText: { fontSize: 9, color: colors.slate400, lineHeight: 13 },
});
