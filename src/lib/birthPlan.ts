// Plano de parto com os mesmos temas da Caderneta da Gestante (acompanhante,
// alívio da dor, posições, procedimentos a evitar, cuidados com o bebê).
export interface PlanSection {
  id: string;
  title: string;
  hint?: string;
  options: string[];
}

export const PLAN_SECTIONS: PlanSection[] = [
  {
    id: 'ambiente',
    title: 'Ambiente e trabalho de parto',
    options: ['Luz baixa', 'Música própria', 'Liberdade para caminhar e mudar de posição', 'Comer e beber líquidos leves', 'Poucas pessoas na sala', 'Evitar exames de toque desnecessários'],
  },
  {
    id: 'alivio',
    title: 'Alívio da dor',
    hint: 'Métodos sem remédio costumam vir primeiro; a analgesia pode ser pedida a qualquer momento.',
    options: ['Banho morno (chuveiro ou banheira)', 'Bola de pilates', 'Massagem', 'Compressas mornas', 'Respiração e relaxamento', 'Analgesia (peridural) se eu pedir', 'Prefiro evitar analgesia'],
  },
  {
    id: 'posicoes',
    title: 'Posições para o nascimento',
    options: ['Escolher a posição na hora', 'De cócoras', 'De lado', 'De quatro apoios', 'Banqueta de parto', 'Semissentada'],
  },
  {
    id: 'evitar',
    title: 'Procedimentos que preferimos evitar',
    hint: 'Sem indicação médica clara, conversada com o casal.',
    options: ['Episiotomia (corte no períneo)', 'Ocitocina sintética de rotina', 'Romper a bolsa de rotina', 'Raspagem dos pelos', 'Lavagem intestinal', 'Jejum prolongado'],
  },
  {
    id: 'nascimento',
    title: 'Logo após o nascimento',
    options: ['Contato pele a pele imediato', 'Clampeamento tardio do cordão', 'O pai/acompanhante corta o cordão', 'Amamentar na primeira hora', 'Fotos e vídeo', 'Placenta: ver ou guardar'],
  },
  {
    id: 'bebe',
    title: 'Cuidados com o bebê',
    options: ['Exames feitos no colo da mãe quando possível', 'Adiar o primeiro banho', 'Alojamento conjunto (bebê no quarto)', 'Sem bicos, chupetas ou fórmula sem indicação', 'Acompanhante junto em todos os procedimentos'],
  },
  {
    id: 'cesarea',
    title: 'Se for cesárea',
    options: ['Acompanhante na sala', 'Campo baixo ou transparente para ver o nascimento', 'Contato pele a pele ainda no centro cirúrgico', 'Amamentar na sala de recuperação', 'Explicar cada etapa durante a cirurgia'],
  },
];

export interface BirthPlan {
  companion: string;
  doula: string;
  maternity: string;
  birthType: '' | 'normal' | 'cesarea' | 'decidir';
  choices: Record<string, string[]>;
  notes: Record<string, string>;
  discussedWithDoctor: boolean;
}

export const EMPTY_PLAN: BirthPlan = { companion: '', doula: '', maternity: '', birthType: '', choices: {}, notes: {}, discussedWithDoctor: false };

export function toPlan(data: Record<string, unknown> | null | undefined): BirthPlan {
  const d = (data ?? {}) as Partial<BirthPlan>;
  return {
    companion: typeof d.companion === 'string' ? d.companion : '',
    doula: typeof d.doula === 'string' ? d.doula : '',
    maternity: typeof d.maternity === 'string' ? d.maternity : '',
    birthType: d.birthType === 'normal' || d.birthType === 'cesarea' || d.birthType === 'decidir' ? d.birthType : '',
    choices: d.choices && typeof d.choices === 'object' ? (d.choices as Record<string, string[]>) : {},
    notes: d.notes && typeof d.notes === 'object' ? (d.notes as Record<string, string>) : {},
    discussedWithDoctor: d.discussedWithDoctor === true,
  };
}

const BIRTH_TYPE: Record<BirthPlan['birthType'], string> = { '': '', normal: 'Parto normal', cesarea: 'Cesárea', decidir: 'Decidir junto com a equipe' };

/** Quanto do plano já foi preenchido (0 a 1), para mostrar o progresso. */
export function planProgress(plan: BirthPlan): number {
  const basics = [plan.companion, plan.maternity, plan.birthType].filter(Boolean).length;
  const sections = PLAN_SECTIONS.filter(s => (plan.choices[s.id]?.length ?? 0) > 0 || plan.notes[s.id]?.trim()).length;
  return (basics + sections) / (3 + PLAN_SECTIONS.length);
}

export function planToText(plan: BirthPlan, motherName?: string | null): string {
  const lines = [`PLANO DE PARTO${motherName ? ` · ${motherName}` : ''}`];
  if (plan.birthType) lines.push(`Tipo de parto desejado: ${BIRTH_TYPE[plan.birthType]}`);
  if (plan.maternity) lines.push(`Maternidade: ${plan.maternity}`);
  if (plan.companion) lines.push(`Acompanhante: ${plan.companion}`);
  if (plan.doula) lines.push(`Doula: ${plan.doula}`);
  for (const s of PLAN_SECTIONS) {
    const chosen = plan.choices[s.id] ?? [];
    const note = plan.notes[s.id]?.trim();
    if (!chosen.length && !note) continue;
    lines.push('', s.title.toUpperCase(), ...chosen.map(c => `- ${c}`));
    if (note) lines.push(`Obs.: ${note}`);
  }
  lines.push('', plan.discussedWithDoctor ? 'Plano conversado com o obstetra.' : 'Plano ainda não conversado com o obstetra.');
  lines.push('Sabemos que imprevistos podem mudar o plano; pedimos que qualquer mudança seja explicada a nós.');
  return lines.join('\n');
}

export { BIRTH_TYPE };
