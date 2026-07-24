// Base Estática de Unidades UBS/CAPS (ver diagrama: Camada de Dados).
// Dados de exemplo do protótipo; em produção viriam do CNES/DataSUS.

import { HealthUnit } from "../core/types";

export const HEALTH_UNITS: HealthUnit[] = [
  {
    id: "ubs-centro",
    name: "UBS Centro",
    kind: "UBS",
    address: "Rua das Flores, 120 — Centro",
    distanceKm: 0.8,
    hours: "Seg a Sex, 7h às 19h",
    phone: "(31) 3222-0101",
    services: ["Grupo de apoio PNCT", "Adesivos de nicotina", "Clínico geral"],
  },
  {
    id: "ubs-santa-luzia",
    name: "UBS Santa Luzia",
    kind: "UBS",
    address: "Av. Brasil, 950 — Santa Luzia",
    distanceKm: 1.6,
    hours: "Seg a Sex, 7h às 17h",
    phone: "(31) 3222-0202",
    services: ["Grupo de apoio PNCT", "Acompanhamento psicológico"],
  },
  {
    id: "caps-ad-esperanca",
    name: "CAPS AD Esperança",
    kind: "CAPS",
    address: "Rua do Cedro, 45 — Jardim América",
    distanceKm: 2.3,
    hours: "Seg a Sáb, 8h às 18h",
    phone: "(31) 3222-0303",
    services: ["Dependência química", "Terapia em grupo", "Atendimento familiar"],
  },
  {
    id: "ubs-vila-nova",
    name: "UBS Vila Nova",
    kind: "UBS",
    address: "Rua Ipê Amarelo, 310 — Vila Nova",
    distanceKm: 3.1,
    hours: "Seg a Sex, 7h às 19h",
    phone: "(31) 3222-0404",
    services: ["Grupo de apoio PNCT", "Bupropiona (avaliação médica)"],
  },
  {
    id: "caps-ii-acolher",
    name: "CAPS II Acolher",
    kind: "CAPS",
    address: "Av. das Palmeiras, 1200 — Boa Vista",
    distanceKm: 4.7,
    hours: "24 horas",
    phone: "(31) 3222-0505",
    services: ["Saúde mental", "Urgências psicossociais", "Oficinas terapêuticas"],
  },
];
