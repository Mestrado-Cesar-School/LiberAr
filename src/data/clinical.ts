// Catálogos clínicos e de acompanhamento (diagrama: Camada de Dados —
// "Injeta Literatura PNCT"). Baseados no Protocolo Clínico e Diretrizes
// Terapêuticas do Tabagismo (Ministério da Saúde / INCA).

import { MainFear, Mood, SmokeDuration, StopReason, Treatment, UsageType } from "../core/types";

export type Option<T extends string = string> = { value: T; label: string; note?: string };

export const WITHDRAWAL_SYMPTOMS = [
  "Irritabilidade", "Ansiedade", "Dificuldade de concentração", "Insônia",
  "Aumento do apetite", "Humor deprimido", "Inquietação", "Dor de cabeça",
  "Tosse", "Constipação intestinal",
];

export const MOOD_OPTIONS: { id: Mood; emoji: string; label: string }[] = [
  { id: "anxious", emoji: "😰", label: "Ansiosa" },
  { id: "good", emoji: "😎", label: "Bem" },
  { id: "hard", emoji: "😫", label: "Difícil" },
];

export const MOOD_EMOJI: Record<Mood, string> = {
  anxious: "😰",
  good: "😎",
  hard: "😫",
};

export const TRN_ADESIVO: Option[] = [
  { value: "ad21", label: "Adesivo de nicotina 21 mg/24h", note: "Etapa inicial na dependência elevada (Fagerström 8-10 ou mais de 20 cigarros/dia). Uso por 4 semanas." },
  { value: "ad14", label: "Adesivo de nicotina 14 mg/24h", note: "Segunda etapa do desmame, ou início na dependência moderada (Fagerström 5-7). Uso por 4 semanas." },
  { value: "ad7", label: "Adesivo de nicotina 7 mg/24h", note: "Etapa final do desmame. Uso por 4 semanas." },
];

export const TRN_ORAL: Option[] = [
  { value: "goma2", label: "Goma de mascar de nicotina 2 mg", note: "1 tablete a cada 1 a 2 horas nas semanas 1 a 4 (máximo de 15 por dia), espaçando gradualmente até a 12ª semana." },
  { value: "goma4", label: "Goma de mascar de nicotina 4 mg", note: "Reservada aos casos de dependência muito elevada, conforme avaliação profissional." },
  { value: "past2", label: "Pastilha de nicotina 2 mg", note: "1 pastilha a cada 1 a 2 horas nas semanas 1 a 4 (máximo de 15 por dia), espaçando gradualmente até a 12ª semana." },
];

export const MED_OPTIONS: Option[] = [
  { value: "bup150", label: "Bupropiona 150 mg/dia", note: "1 comprimido de 150 mg pela manhã. Esquema usado do 1º ao 3º dia de tratamento." },
  { value: "bup300", label: "Bupropiona 300 mg/dia", note: "150 mg pela manhã e 150 mg oito horas depois, a partir do 4º dia. Dose máxima de 300 mg/dia, por cerca de 12 semanas." },
  { value: "vareniclina", label: "Vareniclina", note: "Uso conforme prescrição e acompanhamento médico." },
];

export const ADHERENCE_OPTIONS: Option[] = [
  { value: "total", label: "Sem falhas" },
  { value: "parcial", label: "Algumas falhas" },
  { value: "irregular", label: "Uso irregular" },
];

export const SIDE_EFFECTS = [
  "Irritação na pele (adesivo)", "Insônia", "Boca seca", "Náusea",
  "Dor de cabeça", "Tontura", "Soluços", "Alteração da pressão arterial",
];

export const EMPTY_TREATMENT: Treatment = {
  viaApp: null,
  ubs: "",
  professional: "",
  startDate: "",
  adesivo: null,
  oral: null,
  med: null,
  adherence: null,
  sideEffects: [],
  notes: "",
};

export const SMOKE_DURATION_OPTIONS: Option<SmokeDuration>[] = [
  { value: "lt1", label: "Menos de 1 ano" },
  { value: "1-5", label: "1 a 5 anos" },
  { value: "5-10", label: "5 a 10 anos" },
  { value: "gt10", label: "Mais de 10 anos" },
];

export const STOP_REASON_OPTIONS: Option<StopReason>[] = [
  { value: "saude", label: "💪 Saúde" },
  { value: "familia", label: "👨‍👩‍👧 Família" },
  { value: "dinheiro", label: "💰 Dinheiro" },
  { value: "estetica", label: "✨ Estética" },
  { value: "outro", label: "💬 Outro" },
];

export const MAIN_FEAR_OPTIONS: Option<MainFear>[] = [
  { value: "peso", label: "⚖️ Ganho de peso" },
  { value: "ansiedade", label: "😰 Ansiedade" },
  { value: "social", label: "🤝 Convívio social" },
  { value: "abstinencia", label: "🌡️ Abstinência física" },
];

export const USAGE_OPTIONS: Option<UsageType>[] = [
  { value: "cigarro", label: "Cigarro" },
  { value: "vape", label: "Vape" },
  { value: "ambos", label: "Cigarro e vape" },
];

/** Rótulo de uma opção pelo valor, ou "Não informado". */
export function labelOf<T extends string>(options: Option<T>[], value: T | null | undefined): string {
  const found = options.find((o) => o.value === value);
  return found ? found.label.replace(/^\S+\s(?=[A-ZÀ-Ú])/u, "") : "Não informado";
}

export const TRIGGER_PLACES = ["Casa", "Trabalho", "Bar", "Carro", "Rua", "Após café", "Após refeição"];
export const TRIGGER_EMOTIONS = ["Ansiedade", "Estresse", "Tristeza", "Tédio", "Raiva", "Alegria", "Cansaço"];
export const TRIGGER_PEOPLE = ["Sozinho(a)", "Com amigos", "Com família", "No trabalho", "Com fumantes"];

export const AVATARS = [47, 32, 12, 5, 68, 26, 44, 15];
export const avatarUri = (id: number | undefined, size = 150) =>
  `https://i.pravatar.cc/${size}?img=${id ?? 47}`;

// Teste de Fagerström para Dependência de Nicotina (versão INCA).
export const FAGERSTROM_QUESTIONS: { q: string; options: { label: string; value: number }[] }[] = [
  {
    q: "Em quanto tempo depois de acordar você fuma o primeiro cigarro?",
    options: [
      { label: "Dentro de 5 minutos", value: 3 },
      { label: "6-30 minutos", value: 2 },
      { label: "31-60 minutos", value: 1 },
      { label: "Depois de 60 minutos", value: 0 },
    ],
  },
  {
    q: "Você acha difícil ficar sem fumar em lugares onde é proibido (por exemplo, na igreja, no cinema, em bibliotecas, e outros)?",
    options: [
      { label: "Sim", value: 1 },
      { label: "Não", value: 0 },
    ],
  },
  {
    q: "Qual o cigarro do dia que traz mais satisfação?",
    options: [
      { label: "O primeiro da manhã", value: 1 },
      { label: "Outros", value: 0 },
    ],
  },
  {
    q: "Quantos cigarros você fuma por dia?",
    options: [
      { label: "Menos de 10", value: 0 },
      { label: "De 11 a 20", value: 1 },
      { label: "De 21 a 30", value: 2 },
      { label: "Mais de 31", value: 3 },
    ],
  },
  {
    q: "Você fuma mais frequentemente pela manhã?",
    options: [
      { label: "Sim", value: 1 },
      { label: "Não", value: 0 },
    ],
  },
  {
    q: "Você fuma mesmo doente, quando precisa ficar na cama a maior parte do tempo?",
    options: [
      { label: "Sim", value: 1 },
      { label: "Não", value: 0 },
    ],
  },
];

export type FagerstromClass = { label: string; color: string; bg: string; border: string };

export function classifyFagerstrom(score: number): FagerstromClass {
  if (score <= 2) return { label: "Muito baixa", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" };
  if (score <= 4) return { label: "Baixa", color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4" };
  if (score === 5) return { label: "Média", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
  if (score <= 7) return { label: "Elevada", color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" };
  return { label: "Muito elevada", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" };
}

export const TERMS_SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Aceitação dos Termos",
    body: "Ao utilizar o aplicativo LiberAr, você concorda com estes Termos de Uso e com nossa Política de Privacidade. Caso não concorde, não utilize o aplicativo.",
  },
  {
    title: "2. Descrição do Serviço",
    body: "O LiberAr é um aplicativo de apoio à cessação do tabagismo baseado em princípios de psicologia cognitivo-comportamental. Ele oferece ferramentas de acompanhamento, conteúdo educativo e suporte motivacional. O aplicativo NÃO substitui acompanhamento médico, psicológico ou farmacológico profissional.",
  },
  {
    title: "3. Responsabilidades do Usuário",
    body: "Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Você concorda em não utilizar o aplicativo para fins ilegais ou não autorizados.",
  },
  {
    title: "4. Coleta e Uso de Dados (LGPD)",
    body: "Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), coletamos apenas os dados estritamente necessários para o funcionamento do serviço:\n• Nome e e-mail para identificação;\n• Dados de uso (hábitos, check-ins, humor) para personalização do acompanhamento.\nSeus dados são armazenados de forma segura e não serão compartilhados com terceiros sem seu consentimento, exceto quando exigido por lei.",
  },
  {
    title: "5. Direitos do Titular",
    body: "Você tem direito a: acessar seus dados, corrigir informações incorretas, solicitar a exclusão de seus dados, e exportar seu histórico. Para exercer esses direitos, acesse a seção \"Perfil\" do aplicativo.",
  },
  {
    title: "6. Limitação de Responsabilidade",
    body: "O LiberAr é uma ferramenta de apoio e não garante resultados específicos no processo de cessação do tabagismo. Em situações de crise, ligue para o CVV (188) ou busque atendimento médico de emergência.",
  },
  {
    title: "7. Propriedade Intelectual",
    body: "Todo o conteúdo do aplicativo — textos, ilustrações, design e código — é protegido por direitos autorais e não pode ser reproduzido sem autorização prévia.",
  },
  {
    title: "8. Alterações nos Termos",
    body: "Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos você sobre mudanças significativas por meio do próprio aplicativo. O uso continuado após as alterações implica aceitação dos novos termos.",
  },
  {
    title: "9. Contato",
    body: "Dúvidas sobre privacidade ou estes termos? Entre em contato pelo e-mail: privacidade@liberar.app",
  },
];
