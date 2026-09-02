export interface TalentEffect {
  level: number;
  patienceBonus: number;
  patienceLossTolerated?: boolean;
  description: string;
}

export interface TalentNode {
  id: string;
  name: string;
  category: string;
  maxLevel: number;
  effects: TalentEffect[];
}

/** Gelecekteki yetenek ağacı ekranının data-driven kayıt defteri. */
export const TALENT_NODES: TalentNode[] = [
  {
    id: 'tatli_dil',
    name: 'Tatlı Dil & Esnaf Nüktesi',
    category: 'sarraflik',
    maxLevel: 3,
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
];

export const TALENT_BY_ID = new Map(TALENT_NODES.map(node => [node.id, node]));
