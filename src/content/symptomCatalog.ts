export interface CommonSymptom {
  name: string;
  category: 'Físico' | 'Digestivo' | 'Emocional' | 'Sono';
}

// Sintomas frequentes por trimestre. Servem de atalho no registro; os nomes
// são os mesmos de lib/symptomCanon.ts, que junta as variações de cada um.
export const COMMON_SYMPTOMS: Record<1 | 2 | 3, CommonSymptom[]> = {
  1: [
    { name: 'Enjoo', category: 'Digestivo' },
    { name: 'Vômito', category: 'Digestivo' },
    { name: 'Cansaço', category: 'Físico' },
    { name: 'Sonolência', category: 'Sono' },
    { name: 'Seios doloridos', category: 'Físico' },
    { name: 'Tontura', category: 'Físico' },
    { name: 'Oscilação de humor', category: 'Emocional' },
    { name: 'Azia', category: 'Digestivo' },
  ],
  2: [
    { name: 'Azia', category: 'Digestivo' },
    { name: 'Dor lombar', category: 'Físico' },
    { name: 'Câimbras', category: 'Físico' },
    { name: 'Intestino preso', category: 'Digestivo' },
    { name: 'Congestão nasal', category: 'Físico' },
    { name: 'Ansiedade', category: 'Emocional' },
    { name: 'Insônia', category: 'Sono' },
    { name: 'Dor de cabeça', category: 'Físico' },
  ],
  3: [
    { name: 'Azia', category: 'Digestivo' },
    { name: 'Dor lombar', category: 'Físico' },
    { name: 'Inchaço', category: 'Físico' },
    { name: 'Falta de ar', category: 'Físico' },
    { name: 'Insônia', category: 'Sono' },
    { name: 'Contrações de treinamento', category: 'Físico' },
    { name: 'Dor pélvica', category: 'Físico' },
    { name: 'Ansiedade', category: 'Emocional' },
  ],
};

export const SYMPTOM_CATEGORIES = ['Físico', 'Digestivo', 'Emocional', 'Sono'] as const;

// Sinais de alerta da Caderneta da Gestante. Comparados com o nome já
// normalizado (minúsculo e sem acento).
const ALERT_TERMS = [
  'sangramento',
  'perda de liquido',
  'vazamento de liquido',
  'bolsa rompeu',
  'visao turva',
  'visao embacada',
  'pontos brilhantes',
  'febre',
  'convuls',
  'desmaio',
  'mexendo menos',
  'mexe menos',
  'movimentos diminu',
  'nao sinto o bebe',
  'contracoes regulares',
  'dor abdominal forte',
  'dor forte na barriga',
];

// Sintomas comuns que viram alerta quando fortes (intensidade 4 ou 5).
const ALERT_WHEN_STRONG = ['dor de cabeca', 'inchaco', 'dor abdominal', 'dor na barriga', 'falta de ar'];

// Sangramentos comuns e benignos na gestação (nariz, gengiva) não entram no alerta.
const BENIGN_BLEEDING = ['nariz', 'nasal', 'gengiva'];

export function isAlertSymptom(normalizedName: string, intensity: number): boolean {
  const benign = BENIGN_BLEEDING.some(t => normalizedName.includes(t));
  if (!benign && ALERT_TERMS.some(t => normalizedName.includes(t))) return true;
  return intensity >= 4 && ALERT_WHEN_STRONG.some(t => normalizedName.includes(t));
}

export const ALERT_SIGNS = [
  'Sangramento vaginal',
  'Perda de líquido pela vagina',
  'Dor de cabeça forte, visão turva ou pontos brilhantes',
  'Inchaço súbito no rosto, mãos ou pés',
  'Febre',
  'Bebê mexendo menos que o normal',
  'Contrações regulares antes de 37 semanas',
  'Dor forte na barriga',
];
