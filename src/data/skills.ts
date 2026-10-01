export interface TalentEffect {
  level: number;
  patienceBonus: number;
  patienceLossTolerated?: boolean;
  assayAccuracy?: number;
  workshopRiskReduction?: number;
  description: string;
}

export interface TalentNode {
  id: string;
  name: string;
  category: string;
  maxLevel: number;
  effects: TalentEffect[];
  field: 'assayAccuracyRank' | 'tatliDilLevel' | 'workshopCareRank';
  branch: string;
  baseDescription: string;
}

export type TalentId = 'ayar_ustaligi' | 'tatli_dil' | 'usta_eli';

/** One canonical catalogue for effects, prerequisites and presentation. */
export const TALENT_NODES: TalentNode[] = [
  {
    id: 'ayar_ustaligi', name: 'Ayar Ustalığı', category: 'ekspertiz', branch: 'Ekspertiz',
    field: 'assayAccuracyRank', maxLevel: 3,
    baseDescription: 'Mihenk taşı yanlış ayar beyanını %60 olasılıkla yakalar.',
    effects: [
      { level: 1, patienceBonus: 0, assayAccuracy: .7, description: 'Mihenk taşı yanlış ayar beyanını %70 olasılıkla yakalar.' },
      { level: 2, patienceBonus: 0, assayAccuracy: .8, description: 'Mihenk taşı yanlış ayar beyanını %80 olasılıkla yakalar.' },
      { level: 3, patienceBonus: 0, assayAccuracy: .9, description: 'Mihenk taşı yanlış ayar beyanını %90 olasılıkla yakalar.' },
    ],
  },
  {
    id: 'tatli_dil',
    name: 'Tatlı Dil & Esnaf Nüktesi',
    category: 'sarraflik',
    maxLevel: 3,
    field: 'tatliDilLevel', branch: 'Esnaflık',
    baseDescription: 'Müşteriler temel sabırlarıyla gelir; ek pazarlık hakkı verilmez.',
    effects: [
      { level: 1, patienceBonus: 1, description: 'Tüm müşterilerin başlangıç sabrını +1 artırır.' },
      { level: 2, patienceBonus: 2, description: 'Tüm müşterilerin başlangıç sabrını +2 artırır.' },
      {
        level: 3,
        patienceBonus: 2,
        patienceLossTolerated: true,
        description: 'Sabrı +2 artırır ve yüksek kârlı tekliflerde sabır düşme riskini azaltır.',
      },
    ],
  },
  {
    id: 'usta_eli', name: 'Usta Eli', category: 'atolye', branch: 'Atölye',
    field: 'workshopCareRank', maxLevel: 3,
    baseDescription: 'Atölye riski iş zorluğu, yoğunluk, personel ve ekipmandan hesaplanır.',
    effects: [
      { level: 1, patienceBonus: 0, workshopRiskReduction: .02, description: 'Yeni kendi atölye işlerinde riski en fazla 2 yüzde puan azaltır.' },
      { level: 2, patienceBonus: 0, workshopRiskReduction: .04, description: 'Yeni kendi atölye işlerinde riski en fazla 4 yüzde puan azaltır.' },
      { level: 3, patienceBonus: 0, workshopRiskReduction: .06, description: 'Yeni kendi atölye işlerinde riski en fazla 6 yüzde puan azaltır.' },
    ],
  },
];

export const TALENT_BY_ID = new Map(TALENT_NODES.map(node => [node.id, node]));
