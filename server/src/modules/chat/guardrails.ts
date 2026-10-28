// Guardrails do assistente: detecção de crise (pré-LLM) e pós-filtro de
// medicamentos. Ver docs/backend-architecture.md (pipeline do chat).

/** Remove acentos e normaliza para comparação. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Padrões avaliados sobre o texto normalizado (sem acentos, minúsculo).
const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/, // suicídio, suicida, suicidar
  /\bme\s+matar\b/,
  /\bse\s+matar\b/,
  /\bmatar[-\s]?me\b/,
  /\btirar\s+(a\s+)?minha\s+(propria\s+)?vida\b/,
  /\btirar\s+a\s+vida\b/,
  /\bnao\s+quero\s+(mais\s+)?viver\b/,
  /\bnao\s+aguento\s+mais\s+viver\b/,
  /\bacabar\s+com\s+(a\s+minha\s+vida|tudo|a\s+vida)\b/,
  /\bme\s+machucar\b/,
  /\bme\s+cortar\b/,
  /\bme\s+ferir\b/,
  /\bauto\s*(mutila|agress|les)/,
  /\bsumir\s+(de\s+vez|pra\s+sempre|para\s+sempre)\b/,
  /\bdesaparecer\s+(de\s+vez|pra\s+sempre|para\s+sempre)\b/,
  /\bquero\s+morrer\b/,
  /\bqueria\s+(estar\s+)?mort[oa]\b/,
  /\bmelhor\s+(estar\s+)?mort[oa]\b/,
  /\bseria\s+melhor\s+(nao\s+existir|morrer)\b/,
  /\bnao\s+vale\s+(mais\s+)?a\s+pena\s+viver\b/,
  /\bpensei\s+em\s+(me\s+)?morrer\b/,
  /\bideacao\s+suicida\b/,
];

/** Sinais de ideação suicida ou autoagressão. */
export function detectCrisis(text: string): boolean {
  const t = normalize(text);
  return CRISIS_PATTERNS.some((re) => re.test(t));
}

/** Resposta fixa e acolhedora para situações de crise (nunca passa pelo LLM). */
export const CRISIS_REPLY =
  "Sinto muito que você esteja passando por uma dor tão grande. Você não está sozinho, e o que você sente importa. " +
  "Por favor, fale agora com alguém que possa te ouvir: o CVV atende 24 horas, de graça e com sigilo, pelo telefone 188 (ou pelo chat em cvv.org.br). " +
  "Se você estiver em perigo imediato, ligue para o SAMU no 192 ou vá ao pronto-socorro mais próximo. " +
  "Se puder, chame uma pessoa de confiança para ficar com você neste momento, e procure a UBS ou o CAPS mais perto — o Localizador na aba Explorar mostra o caminho. " +
  "Eu continuo aqui com você.";

export const MEDICATION_NOTICE =
  "Lembrete: ajustes de medicação são sempre com o profissional da sua UBS.";

const MEDICATION_PATTERNS: RegExp[] = [
  /\bbupropion/,
  /\bvareniclin/,
  /\badesivo/,
  /\bgoma/,
  /\bpastilha/,
  /\b\d+\s*mg\b/,
  /\bmg\b/,
  /\bdose\b/,
  /\bdoses\b/,
  /\bdosagem/,
  /\bposologia/,
];

/** Menção a medicamentos/dosagem na resposta. */
export function mentionsMedication(text: string): boolean {
  const t = normalize(text);
  return MEDICATION_PATTERNS.some((re) => re.test(t));
}

/** Anexa o lembrete de medicação quando a resposta fala de remédios/dosagem. */
export function medicationNotice(text: string): string {
  if (!mentionsMedication(text)) return text;
  if (normalize(text).includes(normalize(MEDICATION_NOTICE))) return text;
  return `${text.trimEnd()}\n\n${MEDICATION_NOTICE}`;
}
