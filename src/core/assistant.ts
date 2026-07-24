// Controlador de Contexto & Guardrails (ver diagrama: Core do Sistema).
//
// Neste protótipo as respostas são geradas por regras locais inspiradas em
// técnicas de TCC (terapia cognitivo-comportamental). Em produção, este módulo
// é o ponto único de integração com a API de LLM (OpenAI/AWS Bedrock):
// `buildPrompt()` monta o prompt estruturado seguro com o contexto do usuário
// e as respostas passam pelo filtro `applyGuardrails()` antes de chegar à UI.

import { Progress, UserProfile } from "./types";

export type AssistantContext = {
  profile: UserProfile;
  progress: Progress;
};

type Rule = {
  keywords: string[];
  reply: (ctx: AssistantContext) => string;
};

const firstName = (ctx: AssistantContext) => ctx.profile.name.split(" ")[0];

const RULES: Rule[] = [
  {
    keywords: ["fissura", "vontade", "desejo", "cigarro agora"],
    reply: (ctx) =>
      `Respira comigo, ${firstName(ctx)}. A fissura é como uma onda: sobe, atinge o pico e passa em poucos minutos. ` +
      "Tente a técnica dos 4 Ds: espere (Delay), beba água (Drink), respire fundo (Deep breathing) e se distraia (Distract). " +
      "Se preferir, toque no botão laranja que eu te guio numa respiração agora.",
  },
  {
    keywords: ["ansios", "ansiedade", "nervos", "inquiet"],
    reply: () =>
      "É completamente normal sentir ansiedade nessa fase — seu corpo está se reequilibrando sem a nicotina. " +
      "Que tal 2 minutos de respiração 4-7-8? Inspire por 4s, segure por 7s e solte por 8s. " +
      "Identificar o gatilho também ajuda: o que estava acontecendo quando a ansiedade apareceu?",
  },
  {
    keywords: ["fumei", "recaída", "recai", "falhei", "errei"],
    reply: (ctx) =>
      `${firstName(ctx)}, um deslize não apaga o caminho que você já percorreu — são ${ctx.progress.days} dias de aprendizado. ` +
      "Na TCC chamamos isso de lapso, não de fracasso. O importante é entender o gatilho e seguir em frente hoje mesmo. " +
      "Registre no check-in diário, sem culpa. Amanhã o contador continua com você.",
  },
  {
    keywords: ["triste", "deprimi", "sozinho", "desisto", "não aguento"],
    reply: () =>
      "Sinto muito que você esteja passando por isso. Você não está sozinho nessa caminhada. " +
      "Se a tristeza apertar, o CVV atende 24h no telefone 188 — é gratuito e sigiloso. " +
      "E que tal procurar o grupo de apoio do PNCT na UBS mais próxima? Posso te mostrar o caminho na aba Explorar.",
  },
  {
    keywords: ["economi", "dinheiro", "quanto"],
    reply: (ctx) =>
      `Até agora você já economizou R$ ${ctx.progress.moneySaved.toFixed(2).replace(".", ",")} e evitou ` +
      `${ctx.progress.cigsAvoided} cigarros. Que tal planejar uma recompensa com parte desse valor? Celebrar vitórias é parte do tratamento!`,
  },
  {
    keywords: ["respira", "exercício", "acalmar"],
    reply: () =>
      "Vamos lá! Exercício da respiração quadrada: inspire contando até 4, segure 4, expire 4 e pause 4. " +
      "Repita 5 ciclos. Ela ativa o sistema nervoso parassimpático e reduz a fissura em poucos minutos.",
  },
];

const DEFAULT_REPLIES = [
  (ctx: AssistantContext) =>
    `Você está há ${ctx.progress.days} dias e ${ctx.progress.hours} horas livre do cigarro, ${firstName(ctx)} — cada hora conta! ` +
    "Como você está se sentindo agora? Posso te ajudar com técnicas de respiração, dicas contra a fissura ou só conversar.",
  (ctx: AssistantContext) =>
    `Estou aqui por você, ${firstName(ctx)}. Me conte mais: é uma vontade de fumar, ansiedade, ou só bateu aquele momento difícil? ` +
    "Juntos a gente encontra uma estratégia.",
];

/** Gera a resposta do assistente com os guardrails locais do protótipo. */
export function generateReply(userText: string, ctx: AssistantContext): string {
  const text = userText.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.reply(ctx);
  }
  const pick = userText.length % DEFAULT_REPLIES.length;
  return DEFAULT_REPLIES[pick](ctx);
}

export function welcomeMessage(ctx: AssistantContext): string {
  return (
    `Olá ${firstName(ctx)}! Como você está lidando com a vontade hoje? ` +
    `Já são ${ctx.progress.days} dias de liberdade — cada dia é uma vitória. Estou aqui se precisar conversar.`
  );
}

/** Sugestões rápidas exibidas acima do campo de texto. */
export const QUICK_REPLIES = [
  "Estou com fissura 🔥",
  "Me sinto ansiosa",
  "Quanto já economizei?",
  "Quero um exercício de respiração",
];
