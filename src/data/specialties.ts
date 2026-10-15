export type SpecialtyId =
  | 'obstetra'
  | 'nutricionista'
  | 'psicologia'
  | 'fisioterapia'
  | 'endocrino'
  | 'cardiologia'
  | 'ultrassom'
  | 'odontologia'
  | 'outra';

export interface Specialty {
  id: SpecialtyId;
  label: string;
  emoji: string;
  /** Categorias de sintoma que interessam a esta especialidade. 'todas' = tudo. */
  symptomCategories: string[] | 'todas';
  weight: boolean;
  bloodPressure: boolean;
  /** O que o resumo destaca, em uma frase para o casal. */
  focus: string;
}

export const SPECIALTIES: Specialty[] = [
  { id: 'obstetra', label: 'Obstetra (pré-natal)', emoji: '🩺', symptomCategories: 'todas', weight: true, bloodPressure: true, focus: 'Todos os sintomas, peso, pressão e as dúvidas da gestação.' },
  { id: 'nutricionista', label: 'Nutricionista', emoji: '🥗', symptomCategories: ['Digestivo'], weight: true, bloodPressure: false, focus: 'Ganho de peso e sintomas digestivos, como enjoo, azia e intestino.' },
  { id: 'psicologia', label: 'Psicologia', emoji: '🫶', symptomCategories: ['Emocional', 'Sono'], weight: false, bloodPressure: false, focus: 'Humor, ansiedade e sono dos registros do período.' },
  { id: 'fisioterapia', label: 'Fisioterapia', emoji: '🧘', symptomCategories: ['Físico'], weight: true, bloodPressure: false, focus: 'Dores, câimbras e desconfortos físicos, com intensidade e frequência.' },
  { id: 'endocrino', label: 'Endocrinologia', emoji: '🔬', symptomCategories: ['Digestivo', 'Físico'], weight: true, bloodPressure: false, focus: 'Peso e sintomas ligados a glicemia e metabolismo.' },
  { id: 'cardiologia', label: 'Cardiologia', emoji: '❤️', symptomCategories: ['Físico'], weight: true, bloodPressure: true, focus: 'Pressão arterial em detalhe, inchaço, falta de ar e tontura.' },
  { id: 'ultrassom', label: 'Ultrassom / exames', emoji: '🖥️', symptomCategories: [], weight: false, bloodPressure: false, focus: 'Idade gestacional, DPP e as dúvidas sobre exames.' },
  { id: 'odontologia', label: 'Dentista (pré-natal odontológico)', emoji: '🦷', symptomCategories: [], weight: false, bloodPressure: false, focus: 'Idade gestacional e as dúvidas anotadas para o dentista.' },
  { id: 'outra', label: 'Outra especialidade', emoji: '📋', symptomCategories: 'todas', weight: true, bloodPressure: true, focus: 'Um resumo completo do período.' },
];

export function specialtyOf(id: string | null | undefined): Specialty {
  return SPECIALTIES.find(s => s.id === id) ?? SPECIALTIES[0];
}

/** Dúvidas sem especialidade são do obstetra. */
export function questionSpecialty(specialty: string | null | undefined): SpecialtyId {
  return (SPECIALTIES.find(s => s.id === specialty)?.id ?? 'obstetra') as SpecialtyId;
}
