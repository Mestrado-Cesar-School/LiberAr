// Conteúdo educativo do Explorar (diagrama: Camada de Dados — "Injeta
// Literatura PNCT"). Textos de apoio baseados em orientações do Programa
// Nacional de Controle do Tabagismo (INCA/Ministério da Saúde) e da OMS.

import { Feather } from "@expo/vector-icons";

export type ArticleSection = {
  heading?: string;
  body: string;
};

export type Article = {
  id: string;
  title: string;
  category: string;
  summary: string;
  readMinutes: number;
  icon: keyof typeof Feather.glyphMap;
  colorFrom: string;
  colorTo: string;
  sections: ArticleSection[];
};

export const ARTICLES: Article[] = [
  {
    id: "pnct",
    title: "Guias do PNCT",
    category: "Oficial",
    summary: "Passo a passo do Programa Nacional de Controle do Tabagismo.",
    readMinutes: 4,
    icon: "file-text",
    colorFrom: "#3B82F6",
    colorTo: "#60A5FA",
    sections: [
      {
        body:
          "O Programa Nacional de Controle do Tabagismo (PNCT) é a política pública do " +
          "Ministério da Saúde, coordenada pelo INCA, que oferece tratamento gratuito para " +
          "parar de fumar em todo o SUS. O apoio combina abordagem cognitivo-comportamental " +
          "e, quando necessário, medicamentos.",
      },
      {
        heading: "1. Procure uma unidade",
        body:
          "Vá à Unidade Básica de Saúde (UBS) mais próxima e pergunte pelo grupo de apoio ao " +
          "tabagista. Muitas cidades também oferecem o tratamento em CAPS e ambulatórios " +
          "especializados. Use a aba Explorar do LiberAr para localizar a unidade mais perto.",
      },
      {
        heading: "2. Participe das sessões em grupo",
        body:
          "O tratamento costuma ter 4 sessões estruturadas nas primeiras semanas, seguidas de " +
          "encontros de manutenção. Em grupo, você aprende a reconhecer gatilhos, lidar com a " +
          "fissura e prevenir recaídas — cercado de pessoas que vivem o mesmo desafio.",
      },
      {
        heading: "3. Avalie o apoio medicamentoso",
        body:
          "Quando indicado pela equipe de saúde, o SUS fornece adesivos e gomas de nicotina, " +
          "além de medicamentos como bupropiona. Eles reduzem os sintomas de abstinência e " +
          "aumentam suas chances de sucesso. A avaliação é sempre individual e gratuita.",
      },
      {
        body:
          "Lembre-se: recair faz parte do processo para muitas pessoas. O importante é não " +
          "desistir — cada nova tentativa aumenta a probabilidade de você parar de vez.",
      },
    ],
  },
  {
    id: "respiracao",
    title: "Técnicas de Respiração",
    category: "Prática",
    summary: "Reduza a ansiedade em poucos minutos com exercícios simples.",
    readMinutes: 3,
    icon: "wind",
    colorFrom: "#14B8A6",
    colorTo: "#2DD4BF",
    sections: [
      {
        body:
          "A vontade de fumar (fissura) raramente dura mais que 3 a 5 minutos. Respirar de " +
          "forma consciente ativa o sistema nervoso parassimpático, que acalma o corpo e ajuda " +
          "essa onda a passar. Aqui vão três técnicas para usar no momento da fissura.",
      },
      {
        heading: "Respiração 4-4-6",
        body:
          "Inspire pelo nariz contando até 4, segure o ar por 4 segundos e expire lentamente " +
          "pela boca contando até 6. Repita por 5 ciclos. É a técnica que o Botão de Emergência " +
          "do LiberAr guia para você com o círculo animado.",
      },
      {
        heading: "Respiração 4-7-8",
        body:
          "Inspire por 4 segundos, segure por 7 e expire por 8. O tempo maior de expiração " +
          "intensifica o relaxamento. Ótima para momentos de ansiedade mais forte ou para " +
          "ajudar a dormir.",
      },
      {
        heading: "Os 4 Ds da fissura",
        body:
          "Enquanto respira, lembre dos 4 Ds: Delay (espere o pico passar), Drink (beba água " +
          "gelada em goles), Deep breathing (respire fundo) e Distract (mude de atividade). " +
          "Combinando respiração e distração, a vontade perde a força.",
      },
    ],
  },
  {
    id: "ciencia",
    title: "Fatos Científicos",
    category: "Ciência",
    summary: "O que acontece com seu corpo e seu cérebro ao parar de fumar.",
    readMinutes: 4,
    icon: "activity",
    colorFrom: "#8B5CF6",
    colorTo: "#A855F7",
    sections: [
      {
        body:
          "Parar de fumar desencadeia uma sequência notável de recuperação no corpo — algumas " +
          "mudanças começam em minutos. Conhecer essa linha do tempo ajuda a manter a " +
          "motivação nos dias difíceis.",
      },
      {
        heading: "O que muda no corpo",
        body:
          "Em 20 minutos, a pressão arterial e os batimentos se normalizam. Em 8 horas, o nível " +
          "de oxigênio no sangue volta ao normal. Em 24 horas, o risco de infarto começa a cair. " +
          "Em 2 a 12 semanas, a circulação e a função pulmonar melhoram de forma perceptível.",
      },
      {
        heading: "O papel da nicotina no cérebro",
        body:
          "A nicotina estimula a liberação de dopamina, criando a sensação de prazer e o ciclo de " +
          "dependência. Ao parar, o cérebro leva algumas semanas para reequilibrar seus receptores " +
          "— por isso a irritabilidade e a ansiedade iniciais são temporárias e passam.",
      },
      {
        heading: "Ganhos a longo prazo",
        body:
          "Em 1 ano sem fumar, o risco de doença coronariana cai para cerca da metade do de um " +
          "fumante. Com o tempo, os riscos de AVC e de diversos tipos de câncer continuam " +
          "diminuindo. Nunca é tarde para o corpo começar a se recuperar.",
      },
    ],
  },
  {
    id: "cerebro",
    title: "O que acontece com seu cérebro ao parar de fumar",
    category: "Ciência",
    summary: "Como os receptores de nicotina se reequilibram nas primeiras semanas.",
    readMinutes: 4,
    icon: "cpu",
    colorFrom: "#6366F1",
    colorTo: "#818CF8",
    sections: [
      {
        body:
          "A nicotina ativa os receptores de dopamina no cérebro, criando uma sensação passageira de " +
          "prazer. Com o tempo, esses receptores se multiplicam e passam a exigir doses cada vez maiores " +
          "para o mesmo efeito.",
      },
      {
        body:
          "Ao parar de fumar, o cérebro leva de 2 a 12 semanas para reequilibrar esses receptores. É por " +
          "isso que a fissura, a irritabilidade e a dificuldade de concentração ficam mais intensas nas " +
          "primeiras semanas — e depois vão embora.",
      },
      {
        body:
          "Depois de 3 meses, a densidade dos receptores volta próxima à de quem nunca fumou. É a prova " +
          "biológica de que o corpo está te recuperando.",
      },
    ],
  },
  {
    id: "respiracao-478",
    title: "Respiração 4-7-8: como usar na fissura",
    category: "Prática",
    summary: "Uma técnica simples para atravessar o pico da vontade de fumar.",
    readMinutes: 3,
    icon: "wind",
    colorFrom: "#0EA5E9",
    colorTo: "#38BDF8",
    sections: [
      {
        body:
          "A fissura por nicotina dura em média 3 a 5 minutos, mesmo sem fumar. A respiração 4-7-8 do " +
          "Dr. Andrew Weil ajuda o corpo a atravessar esse pico ativando o sistema parassimpático.",
      },
      {
        heading: "Como fazer",
        body:
          "Inspire pelo nariz por 4 segundos, segure por 7 segundos, expire pela boca por 8 segundos. " +
          "Repita 4 vezes.",
      },
      {
        body:
          "Use sempre que sentir uma fissura forte. Com 2 semanas de prática, o corpo aprende a se " +
          "acalmar em segundos.",
      },
    ],
  },
  {
    id: "dinheiro",
    title: "Quanto um fumante gasta em 10 anos",
    category: "Motivação",
    summary: "O custo do cigarro vai muito além do preço do maço.",
    readMinutes: 2,
    icon: "dollar-sign",
    colorFrom: "#F59E0B",
    colorTo: "#FBBF24",
    sections: [
      {
        body:
          "Um maço por dia a R$ 12 significa cerca de R$ 4.380 por ano. Em 10 anos, são R$ 43.800 — " +
          "dinheiro suficiente para trocar de carro, dar entrada num imóvel ou fazer 4 viagens " +
          "internacionais.",
      },
      {
        body:
          "E esse cálculo ignora o aumento anual de preço e os custos indiretos: consultas médicas, " +
          "dentária, perda de produtividade, seguro de vida mais caro.",
      },
      {
        body:
          "O card 'Dinheiro Economizado' na tela inicial mostra o seu número real. Olhe pra ele quando a " +
          "vontade bater.",
      },
    ],
  },
  {
    id: "sus",
    title: "Como o SUS trata o tabagismo de graça",
    category: "Oficial",
    summary: "Grupos de apoio e medicamentos gratuitos na UBS mais próxima.",
    readMinutes: 5,
    icon: "plus-square",
    colorFrom: "#10B981",
    colorTo: "#34D399",
    sections: [
      {
        body:
          "O Programa Nacional de Controle do Tabagismo (PNCT) do Ministério da Saúde oferece " +
          "tratamento gratuito em UBSs de todo o Brasil.",
      },
      {
        body:
          "O tratamento combina duas frentes: abordagem cognitivo-comportamental em grupo (4 sessões " +
          "semanais + reforços mensais por 12 meses) e apoio medicamentoso quando indicado.",
      },
      {
        body:
          "Os medicamentos disponíveis são adesivo de nicotina (21, 14 e 7 mg), goma de mascar de " +
          "nicotina (2 mg), pastilha de nicotina (2 mg) e bupropiona (150 mg). A escolha depende do grau " +
          "de dependência medido pelo Teste de Fagerström.",
      },
      {
        body:
          "Procure a UBS mais próxima e pergunte pelo grupo de cessação do tabagismo. Nenhum documento " +
          "além do CPF é necessário.",
      },
    ],
  },
];
