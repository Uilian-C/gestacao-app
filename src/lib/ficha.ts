// Ficha da gestante: o mesmo cabeçalho em todas as telas e em todo resumo,
// na ordem em que um especialista costuma perguntar.
import type { HealthMetric, PregnancyProfile } from '../types';
import { formatBR, gestationalAge, parseLocalDate } from './dates';
import { isHighBloodPressure } from './health';
import { BMI_LABEL, bmi, bmiClass } from './weightGain';

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function maternalAge(birthDate: string, today: Date = new Date()): number {
  const b = parseLocalDate(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age;
}

/** Notação obstétrica: G (gestações, incluindo a atual), P (partos), A (abortos/perdas). */
export function gpaLabel(p: Pick<PregnancyProfile, 'gestations' | 'births' | 'abortions' | 'cesareans'>): string | null {
  if (p.gestations === null) return null;
  const parts = [`G${p.gestations}`, `P${p.births ?? 0}`, `A${p.abortions ?? 0}`].join(' ');
  const cesarea = p.cesareans ? ` (${p.cesareans} ${p.cesareans === 1 ? 'cesárea' : 'cesáreas'})` : '';
  const first = p.gestations === 1 ? ' · primeira gestação' : '';
  return `${parts}${cesarea}${first}`;
}

export interface FichaItem {
  key: string;
  label: string;
  value: string | null;
  /** Destaque discreto para algo que o profissional precisa notar. */
  attention?: boolean;
}

export function buildFicha(profile: PregnancyProfile & { dumDate: string }, metrics: HealthMetric[], today: Date = new Date()): FichaItem[] {
  const age = gestationalAge(profile.dumDate, today);
  const mAge = profile.motherBirthDate ? maternalAge(profile.motherBirthDate, today) : null;
  const pre = profile.preWeightKg && profile.heightCm ? bmi(profile.preWeightKg, profile.heightCm) : null;
  const lastWeight = [...metrics].reverse().find(m => m.weight_kg !== null);
  const lastBp = [...metrics].reverse().find(m => m.systolic_bp !== null && m.diastolic_bp !== null);
  const kg = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

  const items: FichaItem[] = [
    { key: 'gestante', label: 'Gestante', value: [profile.motherName, mAge !== null ? `${mAge} anos` : null].filter(Boolean).join(', ') || null, attention: mAge !== null && mAge >= 35 },
    { key: 'ig', label: 'Idade gestacional', value: age ? `${age.weeks} semanas e ${age.days} ${age.days === 1 ? 'dia' : 'dias'}` : null },
    { key: 'trimestre', label: 'Trimestre', value: age ? `${age.trimester}º` : null },
    { key: 'dum', label: 'DUM', value: formatBR(profile.dumDate) },
    { key: 'dpp', label: 'DPP', value: age ? age.dpp.toLocaleDateString('pt-BR') : null },
    { key: 'gpa', label: 'Gestações e partos', value: gpaLabel(profile) },
    { key: 'sangue', label: 'Tipo sanguíneo', value: profile.bloodType, attention: !!profile.bloodType?.endsWith('-') },
    {
      key: 'imc',
      label: 'Peso antes da gravidez',
      value: profile.preWeightKg && profile.heightCm && pre ? `${kg(profile.preWeightKg)} · ${profile.heightCm} cm · IMC ${pre.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} (${BMI_LABEL[bmiClass(pre)].toLowerCase()})` : null,
    },
    {
      key: 'peso',
      label: 'Peso atual',
      value: lastWeight?.weight_kg != null ? `${kg(lastWeight.weight_kg)} em ${formatBR(lastWeight.recorded_at)}${profile.preWeightKg ? ` (${lastWeight.weight_kg - profile.preWeightKg >= 0 ? '+' : ''}${kg(lastWeight.weight_kg - profile.preWeightKg)})` : ''}` : null,
    },
    {
      key: 'pa',
      label: 'Última pressão',
      value: lastBp ? `${lastBp.systolic_bp}/${lastBp.diastolic_bp} mmHg em ${formatBR(lastBp.recorded_at)}` : null,
      attention: lastBp ? isHighBloodPressure(lastBp.systolic_bp, lastBp.diastolic_bp) : false,
    },
    { key: 'alergias', label: 'Alergias', value: profile.allergies, attention: !!profile.allergies && !/^(nenhuma|não|nao)/i.test(profile.allergies) },
    { key: 'medicacoes', label: 'Medicações em uso', value: profile.medications },
    { key: 'condicoes', label: 'Condições prévias', value: profile.conditions },
  ];
  return items;
}

/** Linha curta para o topo de todas as telas. */
export function fichaSummary(profile: PregnancyProfile & { dumDate: string }, today: Date = new Date()): string[] {
  const age = gestationalAge(profile.dumDate, today);
  const mAge = profile.motherBirthDate ? maternalAge(profile.motherBirthDate, today) : null;
  return [
    [profile.motherName?.split(' ')[0], mAge !== null ? `${mAge} anos` : null].filter(Boolean).join(', '),
    age ? `${age.weeks}s ${age.days}d` : '',
    age ? `${age.trimester}º tri` : '',
    age ? `DPP ${age.dpp.toLocaleDateString('pt-BR')}` : '',
    profile.gestations !== null ? `G${profile.gestations}P${profile.births ?? 0}A${profile.abortions ?? 0}` : '',
    profile.bloodType ?? '',
  ].filter(Boolean);
}

export function fichaToText(items: FichaItem[]): string[] {
  return items.map(i => `${i.label}: ${i.value ?? 'não informado'}`);
}

/** Campos da ficha que o casal ainda não preencheu (peso e pressão vêm do diário). */
export function missingFicha(items: FichaItem[]): string[] {
  return items.filter(i => i.value === null && !['peso', 'pa'].includes(i.key)).map(i => i.label);
}
