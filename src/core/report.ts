// Gerador do Relatório de Acompanhamento (exportação em PDF para a consulta
// na UBS). Monta um modelo único de seções que alimenta tanto a
// pré-visualização na tela quanto o HTML impresso pelo expo-print.

import { evaluateAchievements, MILESTONES } from "./achievementRules";
import { formatBRL, formatDate, formatDateTime } from "./progressEngine";
import { CheckIn, Cycle, FagerstromResult, Progress, Treatment, UserProfile } from "./types";
import {
  ADHERENCE_OPTIONS,
  labelOf,
  MAIN_FEAR_OPTIONS,
  MED_OPTIONS,
  MOOD_OPTIONS,
  SMOKE_DURATION_OPTIONS,
  STOP_REASON_OPTIONS,
  TRN_ADESIVO,
  TRN_ORAL,
  USAGE_OPTIONS,
} from "../data/clinical";

export type ReportBlock =
  | { kind: "rows"; rows: [string, string][] }
  | { kind: "subtitle"; text: string }
  | { kind: "note"; text: string }
  | { kind: "empty"; text: string }
  | { kind: "score"; score: number; label: string; date: string }
  | { kind: "items"; items: { title: string; text: string }[] }
  | { kind: "bars"; bars: { label: string; count: number; ratio: number }[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "checks"; items: string[] };

export type ReportSection = { n: number; title: string; blocks: ReportBlock[] };

export type ReportModel = {
  issuedAt: Date;
  sections: ReportSection[];
};

type Input = {
  profile: UserProfile;
  progress: Progress;
  checkIns: CheckIn[];
  cycles: Cycle[];
  fagerstrom: FagerstromResult | null;
  treatment: Treatment;
};

export function buildReport({ profile, progress, checkIns, cycles, fagerstrom, treatment }: Input): ReportModel {
  const today = new Date();
  const moodLabel = (m: CheckIn["mood"]) => MOOD_OPTIONS.find((o) => o.id === m)?.label ?? "-";

  const cravings = checkIns.filter((c) => c.craving > 0).map((c) => c.craving);
  const avgCraving = cravings.length
    ? (cravings.reduce((a, b) => a + b, 0) / cravings.length).toFixed(1)
    : "Sem registro";

  const symptomCount: Record<string, number> = {};
  checkIns.forEach((c) => (c.symptoms ?? []).forEach((s) => (symptomCount[s] = (symptomCount[s] ?? 0) + 1)));
  const topSymptoms = Object.entries(symptomCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const moodCount: Record<string, number> = {};
  checkIns.forEach((c) => c.mood && (moodCount[c.mood] = (moodCount[c.mood] ?? 0) + 1));
  const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0];

  const start = treatment.startDate ? new Date(`${treatment.startDate}T00:00:00`) : null;
  const weeksOnTreatment = start
    ? Math.max(1, Math.floor((today.getTime() - start.getTime()) / 604_800_000) + 1)
    : null;

  const meds = [
    TRN_ADESIVO.find((o) => o.value === treatment.adesivo),
    TRN_ORAL.find((o) => o.value === treatment.oral),
    MED_OPTIONS.find((o) => o.value === treatment.med),
  ].filter(Boolean) as { label: string; note?: string }[];

  const unlocked = evaluateAchievements(progress.totalMinutes).filter((a) => a.unlocked);
  const usesCigarette = profile.usageType !== "vape";
  const usesVape = profile.usageType === "vape" || profile.usageType === "ambos";

  const sections: ReportSection[] = [
    {
      n: 1,
      title: "Identificação",
      blocks: [
        {
          kind: "rows",
          rows: [
            ["Nome", profile.name],
            ["E-mail", profile.email],
            ["Tempo de tabagismo", labelOf(SMOKE_DURATION_OPTIONS, profile.smokeDuration)],
            ["Produto utilizado", labelOf(USAGE_OPTIONS, profile.usageType)],
            ["Principal motivação", labelOf(STOP_REASON_OPTIONS, profile.stopReason)],
            ["Maior receio", labelOf(MAIN_FEAR_OPTIONS, profile.mainFear)],
          ],
        },
      ],
    },
    {
      n: 2,
      title: "Processo de cessação",
      blocks: [
        {
          kind: "rows",
          rows: [
            [
              "Método escolhido",
              profile.stopMethod === "gradual"
                ? "Redução gradual"
                : profile.stopMethod === "abrupto"
                  ? "Parada abrupta (de uma vez)"
                  : "Não informado",
            ],
            ["Dia D (data da parada)", formatDateTime(new Date(profile.quitDate))],
            ["Tempo sem fumar", `${progress.days} dia(s), ${progress.hours}h ${progress.minutes}min`],
            ["Recaídas registradas", `${cycles.length} ${cycles.length === 1 ? "reinício" : "reinícios"}`],
          ],
        },
        ...(cycles.length
          ? [
              { kind: "subtitle" as const, text: "Ciclos anteriores" },
              {
                kind: "rows" as const,
                rows: cycles.map((c): [string, string] => [c.label, `${c.days} dia(s) sem fumar`]),
              },
            ]
          : []),
      ],
    },
    {
      n: 3,
      title: "Perfil de consumo e impacto",
      blocks: [
        {
          kind: "rows",
          rows: [
            ...(usesCigarette
              ? ([
                  ["Cigarros por dia antes da parada", `${profile.cigsPerDay} cigarro(s)`],
                  ["Preço do maço informado", formatBRL(profile.packPrice)],
                  ["Cigarros não fumados no período", `${progress.cigsAvoided.toLocaleString("pt-BR")} cigarro(s)`],
                ] as [string, string][])
              : []),
            ...(usesVape && profile.vape
              ? ([
                  ["Vape: concentração de nicotina", `${profile.vape.nicotineMg} mg/mL`],
                  ["Vape: duração do pod/refil", `${profile.vape.podDays} dia(s)`],
                ] as [string, string][])
              : []),
            ["Economia estimada", formatBRL(progress.moneySaved)],
          ],
        },
      ],
    },
    {
      n: 4,
      title: "Grau de dependência (Fagerström)",
      blocks: fagerstrom
        ? [
            { kind: "score", score: fagerstrom.score, label: fagerstrom.label, date: fagerstrom.date },
            {
              kind: "note",
              text:
                fagerstrom.score >= 5
                  ? "Escore igual ou maior que 5 é um dos critérios previstos no protocolo do SUS para indicação de apoio medicamentoso, a ser avaliado pelo profissional de saúde."
                  : "Escore abaixo de 5. O protocolo prioriza a abordagem cognitivo-comportamental, com apoio medicamentoso avaliado caso a caso.",
            },
          ]
        : [{ kind: "empty", text: "Teste ainda não realizado no aplicativo." }],
    },
    {
      n: 5,
      title: "Tratamento em curso",
      blocks: [
        {
          kind: "rows",
          rows: [
            [
              "Chegou ao tratamento pelo app",
              treatment.viaApp === true ? "Sim" : treatment.viaApp === false ? "Não" : "Não informado",
            ],
            ["Unidade de saúde", treatment.ubs || "Não informado"],
            ["Profissional ou equipe", treatment.professional || "Não informado"],
            ["Início do tratamento", start ? formatDate(start) : "Não informado"],
            ...(weeksOnTreatment ? ([["Semana de tratamento", `${weeksOnTreatment}ª semana`]] as [string, string][]) : []),
            ["Adesão relatada", labelOf(ADHERENCE_OPTIONS, treatment.adherence)],
          ],
        },
        { kind: "subtitle", text: "Medicamentos em uso" },
        meds.length
          ? { kind: "items", items: meds.map((m) => ({ title: m.label, text: m.note ?? "" })) }
          : { kind: "empty", text: "Nenhum medicamento registrado." },
        { kind: "subtitle", text: "Efeitos adversos relatados" },
        treatment.sideEffects.length
          ? { kind: "note", text: treatment.sideEffects.join(" | ") }
          : { kind: "empty", text: "Nenhum efeito adverso relatado." },
        ...(treatment.notes
          ? [
              { kind: "subtitle" as const, text: "Observações do usuário" },
              { kind: "note" as const, text: treatment.notes },
            ]
          : []),
      ],
    },
    {
      n: 6,
      title: "Acompanhamento diário e sintomas",
      blocks: [
        {
          kind: "rows",
          rows: [
            ["Check-ins registrados", String(checkIns.length)],
            ["Dias com uso relatado", String(checkIns.filter((c) => c.smoked).length)],
            ["Fissura média (0 a 5)", avgCraving],
            ...(topMood ? ([["Humor predominante", moodLabel(topMood[0] as CheckIn["mood"])]] as [string, string][]) : []),
          ],
        },
        { kind: "subtitle", text: "Sintomas de abstinência mais relatados" },
        topSymptoms.length
          ? {
              kind: "bars",
              bars: topSymptoms.map(([label, count]) => ({
                label,
                count,
                ratio: count / Math.max(1, checkIns.length),
              })),
            }
          : { kind: "empty", text: "Nenhum sintoma registrado nos check-ins." },
        ...(checkIns.length
          ? [
              { kind: "subtitle" as const, text: "Últimos registros" },
              {
                kind: "table" as const,
                head: ["Data", "Humor", "Fissura", "Fumou"],
                rows: checkIns
                  .slice(-8)
                  .reverse()
                  .map((c) => [
                    formatDate(new Date(c.date)),
                    moodLabel(c.mood),
                    c.craving > 0 ? `${c.craving}/5` : "-",
                    c.smoked ? "Sim" : "Não",
                  ]),
              },
            ]
          : []),
      ],
    },
    {
      n: 7,
      title: "Marcos de saúde alcançados",
      blocks: [
        { kind: "note", text: `${unlocked.length} de ${MILESTONES.length} marcos alcançados` },
        unlocked.length
          ? { kind: "checks", items: unlocked.map((m) => `${m.title} - ${m.desc}`) }
          : { kind: "empty", text: "Nenhum marco alcançado ainda. Eles começam a partir de 20 minutos sem fumar." },
      ],
    },
  ];

  return { issuedAt: today, sections };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function blockHtml(b: ReportBlock): string {
  switch (b.kind) {
    case "rows":
      return b.rows
        .map(([l, v]) => `<div class="row"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`)
        .join("");
    case "subtitle":
      return `<p class="sub">${esc(b.text)}</p>`;
    case "note":
      return `<p class="note">${esc(b.text)}</p>`;
    case "empty":
      return `<p class="empty">${esc(b.text)}</p>`;
    case "score":
      return `<div class="score"><div class="box"><b>${b.score}</b><small>de 10</small></div><div><p class="strong">Dependência ${esc(b.label.toLowerCase())}</p><p class="muted">Aplicado em ${esc(b.date)}</p></div></div>`;
    case "items":
      return b.items
        .map((i) => `<div class="item"><p class="strong">${esc(i.title)}</p><p class="muted">${esc(i.text)}</p></div>`)
        .join("");
    case "bars":
      return b.bars
        .map(
          (x) =>
            `<div class="bar"><span>${esc(x.label)}</span><i><em style="width:${Math.round(x.ratio * 100)}%"></em></i><b>${x.count}x</b></div>`
        )
        .join("");
    case "table":
      return `<table><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    case "checks":
      return b.items.map((i) => `<p class="check">✓ ${esc(i)}</p>`).join("");
  }
}

export type ReportHtmlOptions = {
  /**
   * Barra de ações no topo da página (só faz sentido no navegador): botão
   * "Imprimir / Salvar como PDF" e dica de uso. Fica oculta na impressão.
   */
  toolbar?: boolean;
};

const TOOLBAR_HTML =
  `<div class="toolbar no-print"><div><strong>Relatório pronto.</strong> ` +
  `Para gerar o PDF, use <em>Imprimir</em> e escolha <em>Salvar como PDF</em>.</div>` +
  `<button type="button" onclick="window.print()">Imprimir / Salvar como PDF</button></div>`;

export function reportHtml(model: ReportModel, options: ReportHtmlOptions = {}): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Relatório LiberAr</title><style>
  .toolbar{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:16px;background:#0d9488;color:#fff;padding:12px 16px;margin:-32px -32px 24px;font-size:13px}
  .toolbar button{background:#fff;color:#0f766e;border:0;border-radius:6px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}
  @media print{.no-print{display:none !important}}
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1e293b;margin:32px;font-size:12px}
  header{display:flex;justify-content:space-between;border-bottom:2px solid #0d9488;padding-bottom:10px}
  h1{font-size:18px;margin:0}.muted{color:#64748b;font-size:11px;margin:2px 0}
  .disclaimer{background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;font-size:11px;color:#64748b;margin-top:12px}
  section{margin-top:18px;page-break-inside:avoid}h2{font-size:12px;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:8px}
  h2 span{background:#0d9488;color:#fff;border-radius:4px;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:10px}
  .body{padding-left:26px}.row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px dashed #e2e8f0;padding:5px 0}
  .row span{color:#64748b}.sub{font-weight:600;color:#475569;margin:10px 0 4px}.note{background:#f8fafc;border-radius:4px;padding:6px;white-space:pre-line}
  .empty{color:#94a3b8;font-style:italic}.strong{font-weight:700;margin:0}.item{border:1px solid #e2e8f0;border-radius:4px;padding:6px;margin-bottom:4px}
  .score{display:flex;gap:12px;align-items:center;margin-bottom:6px}.box{width:52px;height:52px;border:2px solid #0d9488;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .box b{font-size:18px;color:#0f766e}.bar{display:flex;align-items:center;gap:8px;margin:3px 0}.bar span{width:170px}.bar i{flex:1;height:9px;background:#f1f5f9;border-radius:2px;overflow:hidden}
  .bar em{display:block;height:100%;background:#14b8a6}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:4px;border-bottom:1px solid #f1f5f9}th{color:#64748b}
  .check{margin:2px 0}footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:9px;color:#94a3b8}
  </style></head><body>
  ${options.toolbar ? TOOLBAR_HTML : ""}
  <header><div><h1>LiberAr</h1><p class="muted">Relatório de acompanhamento do tabagismo</p></div>
  <div style="text-align:right"><p class="muted">Emitido em</p><p class="strong">${formatDate(model.issuedAt)}</p></div></header>
  <p class="disclaimer">Documento gerado pelo próprio usuário a partir dos registros do aplicativo, para apoiar a consulta na unidade de saúde. <b>Não substitui avaliação, diagnóstico ou prescrição profissional.</b></p>
  ${model.sections
    .map(
      (s) =>
        `<section><h2><span>${s.n}</span>${esc(s.title)}</h2><div class="body">${s.blocks.map(blockHtml).join("")}</div></section>`
    )
    .join("")}
  <footer>Referências clínicas: Protocolo Clínico e Diretrizes Terapêuticas do Tabagismo (Ministério da Saúde / INCA) e Programa Nacional de Controle do Tabagismo. Dados tratados conforme a LGPD e exportados por iniciativa do próprio usuário.<br/>LiberAr | Relatório gerado em ${formatDateTime(model.issuedAt)}</footer>
  </body></html>`;
}
