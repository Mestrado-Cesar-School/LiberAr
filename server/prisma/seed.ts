// Seed idempotente: unidades de saúde (UBS/CAPS de Belo Horizonte) e usuário
// de demonstração (demo@liberar.app / Liberar123). Rode com `npm run db:seed`.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const pad2 = (n: number) => String(n).padStart(2, "0");
/** AAAA-MM-DD no fuso local (mesma regra de dayKey do app). */
const dayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const daysAgo = (days: number, hours = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d;
};

type UnitSeed = {
  id: string;
  name: string;
  kind: "UBS" | "CAPS";
  address: string;
  distanceKm: number;
  hours: string;
  phone: string;
  services: string[];
  lat: number;
  lng: number;
};

// As 5 primeiras são as mesmas de src/data/ubsUnits.ts do app (mesmos ids).
const HEALTH_UNITS: UnitSeed[] = [
  { id: "ubs-centro", name: "UBS Centro", kind: "UBS", address: "Rua das Flores, 120 — Centro", distanceKm: 0.8, hours: "Seg a Sex, 7h às 19h", phone: "(31) 3222-0101", services: ["Grupo de apoio PNCT", "Adesivos de nicotina", "Clínico geral"], lat: -19.9208, lng: -43.9378 },
  { id: "ubs-santa-luzia", name: "UBS Santa Luzia", kind: "UBS", address: "Av. Brasil, 950 — Santa Luzia", distanceKm: 1.6, hours: "Seg a Sex, 7h às 17h", phone: "(31) 3222-0202", services: ["Grupo de apoio PNCT", "Acompanhamento psicológico"], lat: -19.9325, lng: -43.9292 },
  { id: "caps-ad-esperanca", name: "CAPS AD Esperança", kind: "CAPS", address: "Rua do Cedro, 45 — Jardim América", distanceKm: 2.3, hours: "Seg a Sáb, 8h às 18h", phone: "(31) 3222-0303", services: ["Dependência química", "Terapia em grupo", "Atendimento familiar"], lat: -19.9469, lng: -43.9651 },
  { id: "ubs-vila-nova", name: "UBS Vila Nova", kind: "UBS", address: "Rua Ipê Amarelo, 310 — Vila Nova", distanceKm: 3.1, hours: "Seg a Sex, 7h às 19h", phone: "(31) 3222-0404", services: ["Grupo de apoio PNCT", "Bupropiona (avaliação médica)"], lat: -19.8958, lng: -43.9602 },
  { id: "caps-ii-acolher", name: "CAPS II Acolher", kind: "CAPS", address: "Av. das Palmeiras, 1200 — Boa Vista", distanceKm: 4.7, hours: "24 horas", phone: "(31) 3222-0505", services: ["Saúde mental", "Urgências psicossociais", "Oficinas terapêuticas"], lat: -19.8862, lng: -43.9103 },
  // Unidades adicionais (Belo Horizonte/MG)
  { id: "ubs-savassi", name: "UBS Savassi", kind: "UBS", address: "Rua Pernambuco, 740 — Savassi", distanceKm: 1.9, hours: "Seg a Sex, 7h às 19h", phone: "(31) 3277-1010", services: ["Grupo de apoio PNCT", "Clínico geral", "Enfermagem"], lat: -19.9372, lng: -43.9318 },
  { id: "ubs-santa-efigenia", name: "UBS Santa Efigênia", kind: "UBS", address: "Rua Domingos Vieira, 310 — Santa Efigênia", distanceKm: 2.6, hours: "Seg a Sex, 7h às 17h", phone: "(31) 3277-2020", services: ["Grupo de apoio PNCT", "Adesivos de nicotina", "Goma de nicotina"], lat: -19.9255, lng: -43.9222 },
  { id: "ubs-padre-eustaquio", name: "UBS Padre Eustáquio", kind: "UBS", address: "Rua Padre Eustáquio, 2100 — Padre Eustáquio", distanceKm: 5.4, hours: "Seg a Sex, 7h às 19h", phone: "(31) 3277-3030", services: ["Grupo de apoio PNCT", "Acompanhamento psicológico", "Clínico geral"], lat: -19.9085, lng: -43.9795 },
  { id: "ubs-pampulha", name: "UBS Pampulha", kind: "UBS", address: "Av. Antônio Carlos, 6500 — Pampulha", distanceKm: 8.2, hours: "Seg a Sex, 7h às 19h", phone: "(31) 3277-4040", services: ["Grupo de apoio PNCT", "Bupropiona (avaliação médica)", "Enfermagem"], lat: -19.8667, lng: -43.9648 },
  { id: "ubs-barreiro", name: "UBS Barreiro", kind: "UBS", address: "Av. Sinfrônio Brochado, 580 — Barreiro", distanceKm: 11.5, hours: "Seg a Sex, 7h às 17h", phone: "(31) 3277-5050", services: ["Grupo de apoio PNCT", "Clínico geral"], lat: -19.9757, lng: -44.0192 },
  { id: "caps-ad-venda-nova", name: "CAPS AD Venda Nova", kind: "CAPS", address: "Rua Padre Pedro Pinto, 1055 — Venda Nova", distanceKm: 13.8, hours: "Seg a Sex, 7h às 19h", phone: "(31) 3277-6060", services: ["Dependência química", "Terapia em grupo", "Redução de danos"], lat: -19.8138, lng: -43.9522 },
  { id: "caps-iii-floresta", name: "CAPS III Floresta", kind: "CAPS", address: "Rua Itajubá, 220 — Floresta", distanceKm: 2.1, hours: "24 horas", phone: "(31) 3277-7070", services: ["Saúde mental", "Acolhimento noturno", "Atendimento familiar"], lat: -19.9123, lng: -43.9262 },
];

async function seedHealthUnits() {
  for (const u of HEALTH_UNITS) {
    const data = { ...u, city: "Belo Horizonte", state: "MG" };
    await prisma.healthUnit.upsert({ where: { id: u.id }, create: data, update: data });
  }
  return HEALTH_UNITS.length;
}

async function seedDemoUser() {
  const email = "demo@liberar.app";
  const passwordHash = await bcrypt.hash("Liberar123", 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: "Mariana Silva", passwordHash, authMethod: "email", avatar: 47, termsAcceptedAt: new Date() },
    update: { name: "Mariana Silva", passwordHash },
  });

  const profileData = {
    quitDate: daysAgo(14, 8),
    cigsPerDay: 15,
    packPrice: 12.5,
    cigsPerPack: 20,
    usageType: "cigarro",
    stopMethod: "abrupto",
    smokeDuration: "5-10",
    stopReason: "saude",
    stopReasonText: "Quero respirar melhor e dar o exemplo para minha filha.",
    mainFear: "ansiedade",
    tourDone: true,
    reminderEnabled: true,
    reminderHour: 20,
    reminderMinute: 0,
    reminderDays: [1, 2, 3, 4, 5],
  };
  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...profileData },
    update: {},
  });

  // Check-ins dos últimos 10 dias (hoje fica livre para o check-in da demo).
  const moods = ["anxious", "good", "hard", "good", "good", "anxious", "good", "hard", "good", "good"] as const;
  const cravings = [4, 3, 5, 2, 2, 4, 2, 3, 1, 2];
  const symptomPool = [
    ["Irritabilidade", "Ansiedade"], ["Insônia"], ["Ansiedade", "Dificuldade de concentração", "Aumento do apetite"],
    [], ["Dor de cabeça"], ["Irritabilidade", "Inquietação"], ["Aumento do apetite"], ["Humor deprimido", "Insônia"], [], ["Tosse"],
  ];
  let checkIns = 0;
  for (let i = 0; i < 10; i++) {
    const date = daysAgo(10 - i);
    date.setHours(20, 15 + i, 0, 0);
    const day = dayKey(date);
    const smoked = i === 2; // um lapso registrado no 3º dia da série
    const data = {
      date,
      mood: moods[i],
      smoked,
      cigarettes: smoked ? 2 : 0,
      craving: cravings[i],
      symptoms: symptomPool[i],
    };
    await prisma.checkIn.upsert({
      where: { userId_day: { userId: user.id, day } },
      create: { userId: user.id, day, ...data },
      update: {},
    });
    checkIns++;
  }

  if ((await prisma.fagerstromResult.count({ where: { userId: user.id } })) === 0) {
    const applied = daysAgo(12);
    await prisma.fagerstromResult.create({
      data: {
        userId: user.id,
        score: 6,
        label: "Elevada", // classifyFagerstrom(6) no app
        date: `${pad2(applied.getDate())}/${pad2(applied.getMonth() + 1)}/${applied.getFullYear()}`,
      },
    });
  }

  const treatmentData = {
    viaApp: true,
    ubs: "UBS Centro",
    professional: "Enf. Carla Mendes — equipe PNCT",
    startDate: dayKey(daysAgo(10)),
    adesivo: "ad14",
    oral: "goma2",
    med: null,
    adherence: "parcial",
    sideEffects: ["Irritação na pele (adesivo)", "Insônia"],
    notes: "Grupo de apoio às quartas, 18h. Trocar adesivo para 7 mg na 5ª semana.",
  };
  await prisma.treatment.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...treatmentData },
    update: {},
  });

  if ((await prisma.triggerEntry.count({ where: { userId: user.id } })) === 0) {
    await prisma.triggerEntry.createMany({
      data: [
        { userId: user.id, date: daysAgo(8), place: "Após café", emotion: "Ansiedade", people: "Sozinho(a)", intensity: 4, gaveIn: true, note: "Primeiro café da manhã sem cigarro foi o mais difícil." },
        { userId: user.id, date: daysAgo(5), place: "Bar", emotion: "Alegria", people: "Com amigos", intensity: 5, gaveIn: false, note: "Pedi água com gás e saí para respirar quando bateu a vontade." },
        { userId: user.id, date: daysAgo(2), place: "Trabalho", emotion: "Estresse", people: "No trabalho", intensity: 3, gaveIn: false, note: "Usei a respiração 4-4-6 do app." },
      ],
    });
  }

  return { email, checkIns };
}

async function main() {
  const units = await seedHealthUnits();
  const demo = await seedDemoUser();
  const summary = {
    healthUnits: units,
    demoUser: demo.email,
    demoPassword: "Liberar123",
    checkIns: await prisma.checkIn.count({ where: { user: { email: demo.email } } }),
    fagerstrom: await prisma.fagerstromResult.count({ where: { user: { email: demo.email } } }),
    triggers: await prisma.triggerEntry.count({ where: { user: { email: demo.email } } }),
  };
  console.log("Seed concluído:", summary);
}

main()
  .catch((err) => {
    console.error("Falha no seed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
