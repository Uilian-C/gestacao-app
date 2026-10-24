import { specialtyOf, questionSpecialty, type Specialty, type SpecialtyId } from '../data/specialties';
import type { Consultation, HealthMetric, PartnerComment, QuestionItem, SymptomItem } from '../types';
import { daysBetween, formatBR, gestationalAge, localDay, parseLocalDate, parseTimestamp, toISODate, type GestationalAge } from './dates';
import { isHighBloodPressure, pressureInsights } from './health';
import { careNotesFor, computeSymptomStats, findPatterns, inPeriod, timeOfDayLabel, toEntries, type Insight, type Period, type SymptomStats } from './symptoms';
import { BMI_LABEL, GAIN_STATUS_LABEL, bmi, bmiClass, expectedGain, gainStatus, type BmiClass, type GainStatus } from './weightGain';

export interface ReportInput {
  specialtyId: SpecialtyId;
  period: Period;
  today: Date;
  dumDate: string;
  preWeightKg: number | null;
  heightCm: number | null;
  symptoms: SymptomItem[];
  comments: PartnerComment[];
  metrics: HealthMetric[];
  questions: QuestionItem[];
  consultation?: Consultation | null;
}

export interface WeightSummary {
  first: { kg: number; date: string; week: number };
  last: { kg: number; date: string; week: number };
  periodDelta: number;
  totalGain: number | null;
  bmiValue: number | null;
  bmiClass: BmiClass | null;
  status: GainStatus | null;
  expected: [number, number] | null;
}

export interface BloodPressureSummary {
  readings: Array<{ date: string; week: number; systolic: number; diastolic: number; high: boolean }>;
  highCount: number;
}

export interface ConsultationReport {
  specialty: Specialty;
  consultation: Consultation | null;
  period: Period;
  weekFrom: number;
  weekTo: number;
  age: GestationalAge | null;
  dpp: Date | null;
  insights: Insight[];
  symptoms: Array<SymptomStats & { care: PartnerComment[] }>;
  hiddenSymptomCount: number;
  weight: WeightSummary | null;
  bloodPressure: BloodPressureSummary | null;
  pendingQuestions: QuestionItem[];
  answeredQuestions: QuestionItem[];
}

const weekAt = (dumDate: string, date: Date) => Math.max(0, Math.floor(daysBetween(parseLocalDate(dumDate), date) / 7));

/** Do dia seguinte à última consulta da mesma especialidade até hoje; sem consulta anterior, os últimos 30 dias. */
export function defaultReportPeriod(consultations: Consultation[], specialtyId: SpecialtyId, today: Date): Period {
  const previous = consultations
    .filter(c => c.specialty === specialtyId)
    .map(c => localDay(c.scheduled_at))
    .filter(d => daysBetween(d, today) > 0)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const from = previous ? new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1) : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
  return { from, to: today };
}

export function buildReport(input: ReportInput): ConsultationReport {
  const specialty = specialtyOf(input.specialtyId);
  const { period } = input;
  const relevant = (category: string) => specialty.symptomCategories === 'todas' || specialty.symptomCategories.includes(category);

  const entries = toEntries(input.symptoms);
  const allStats = computeSymptomStats(entries, period);
  // Sinais de alerta entram em qualquer resumo, mesmo fora do foco da especialidade.
  const symptoms = allStats.filter(s => relevant(s.category) || s.isAlert).map(s => ({ ...s, care: careNotesFor(s, input.comments) }));
  const shownKeys = new Set(symptoms.map(s => s.key));
  const insights = [
    ...pressureInsights(input.metrics, period),
    ...findPatterns(entries, period).filter(i => i.tone === 'alerta' || !i.symptomKey || shownKeys.has(i.symptomKey)),
  ];

  const periodMetrics = input.metrics.filter(m => inPeriod(parseLocalDate(m.recorded_at), period));

  let weight: WeightSummary | null = null;
  const weights = periodMetrics.filter(m => m.weight_kg !== null);
  if (specialty.weight && weights.length > 0) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const bmiValue = input.preWeightKg && input.heightCm ? bmi(input.preWeightKg, input.heightCm) : null;
    const cls = bmiValue ? bmiClass(bmiValue) : null;
    const totalGain = input.preWeightKg ? last.weight_kg! - input.preWeightKg : null;
    weight = {
      first: { kg: first.weight_kg!, date: first.recorded_at, week: first.week_number },
      last: { kg: last.weight_kg!, date: last.recorded_at, week: last.week_number },
      periodDelta: last.weight_kg! - first.weight_kg!,
      totalGain,
      bmiValue,
      bmiClass: cls,
      status: cls && totalGain !== null ? gainStatus(totalGain, last.week_number, cls) : null,
      expected: cls ? expectedGain(last.week_number, cls) : null,
    };
  }

  let bloodPressure: BloodPressureSummary | null = null;
  const bpReadings = periodMetrics.filter(m => m.systolic_bp !== null && m.diastolic_bp !== null);
  if ((specialty.bloodPressure || bpReadings.some(m => isHighBloodPressure(m.systolic_bp, m.diastolic_bp))) && bpReadings.length > 0) {
    const readings = bpReadings.map(m => ({
      date: m.recorded_at,
      week: m.week_number,
      systolic: m.systolic_bp!,
      diastolic: m.diastolic_bp!,
      high: isHighBloodPressure(m.systolic_bp, m.diastolic_bp),
    }));
    bloodPressure = { readings, highCount: readings.filter(r => r.high).length };
  }

  const forThisSpecialty = input.questions.filter(q => questionSpecialty(q.specialty) === specialty.id);
  const age = gestationalAge(input.dumDate, input.today);

  return {
    specialty,
    consultation: input.consultation ?? null,
    period,
    weekFrom: weekAt(input.dumDate, period.from),
    weekTo: weekAt(input.dumDate, period.to),
    age,
    dpp: age?.dpp ?? null,
    insights,
    symptoms,
    hiddenSymptomCount: allStats.length - symptoms.length,
    weight,
    bloodPressure,
    pendingQuestions: forThisSpecialty.filter(q => !q.doctor_answer),
    answeredQuestions: forThisSpecialty.filter(q => q.doctor_answer && q.answered_at && inPeriod(localDay(q.answered_at), period)),
  };
}

const kg = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
const signedKg = (n: number) => `${n >= 0 ? '+' : ''}${kg(n)}`;
const one = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export const TREND_LABEL = { subindo: 'piorando', descendo: 'melhorando', estavel: 'estável', novo: 'novo no período' } as const;

/** Versão em texto para mandar por WhatsApp ou e-mail ao profissional. */
export function reportToText(r: ConsultationReport, ficha: string[] = []): string {
  const lines: string[] = [];
  lines.push(`RESUMO PARA CONSULTA · ${r.specialty.label.toUpperCase()}`);
  if (r.consultation) {
    const when = parseTimestamp(r.consultation.scheduled_at);
    lines.push(`Consulta: ${when.toLocaleDateString('pt-BR')} às ${when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${r.consultation.professional_name ? ` · ${r.consultation.professional_name}` : ''}`);
  }
  if (ficha.length) {
    lines.push('', 'FICHA DA GESTANTE', ...ficha.map(l => `- ${l}`), '');
  } else if (r.age) {
    lines.push(`Idade gestacional hoje: ${r.age.weeks} semanas e ${r.age.days} dias · DPP ${r.age.dpp.toLocaleDateString('pt-BR')}`);
  }
  lines.push(`Período analisado: ${formatBR(toISODate(r.period.from))} a ${formatBR(toISODate(r.period.to))} (semanas ${r.weekFrom} a ${r.weekTo})`);

  if (r.insights.length) {
    lines.push('', 'PONTOS DE ATENÇÃO');
    for (const i of r.insights) lines.push(`- ${i.title}. ${i.detail}`);
  }

  if (r.symptoms.length) {
    lines.push('', 'SINTOMAS NO PERÍODO');
    for (const s of r.symptoms) {
      const parts = [`${s.count}x`, `intensidade média ${one(s.avgIntensity)}/5 (máx. ${s.maxIntensity})`];
      if (s.trend) parts.push(TREND_LABEL[s.trend]);
      if (s.timeOfDay.dominant && s.timeOfDay.known >= 2) parts.push(`mais de ${timeOfDayLabel(s.timeOfDay.dominant).toLowerCase()}`);
      lines.push(`- ${s.name}: ${parts.join(', ')}`);
      lines.push(`  · datas: ${s.entries.map(e => `${e.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} (${e.intensity})`).join(', ')}`);
      for (const c of s.care.slice(-2)) lines.push(`  · cuidado: ${c.comment_text}`);
    }
  } else {
    lines.push('', 'Nenhum sintoma registrado no período para esta especialidade.');
  }

  if (r.weight) {
    lines.push('', 'PESO');
    lines.push(`- ${kg(r.weight.first.kg)} (sem. ${r.weight.first.week}) → ${kg(r.weight.last.kg)} (sem. ${r.weight.last.week}): ${signedKg(r.weight.periodDelta)} no período`);
    if (r.weight.totalGain !== null) {
      let line = `- Ganho desde antes da gravidez: ${signedKg(r.weight.totalGain)}`;
      if (r.weight.bmiClass && r.weight.expected && r.weight.status)
        line += ` (${GAIN_STATUS_LABEL[r.weight.status]} de ${one(r.weight.expected[0])}-${one(r.weight.expected[1])} kg para ${BMI_LABEL[r.weight.bmiClass].toLowerCase()})`;
      lines.push(line);
    }
  }

  if (r.bloodPressure) {
    lines.push('', 'PRESSÃO ARTERIAL');
    for (const b of r.bloodPressure.readings) lines.push(`- ${formatBR(b.date)} (sem. ${b.week}): ${b.systolic}/${b.diastolic} mmHg${b.high ? ' ⚠️' : ''}`);
  }

  if (r.pendingQuestions.length) {
    lines.push('', 'DÚVIDAS DO CASAL');
    for (const q of r.pendingQuestions) lines.push(`- ${q.questions_to_ask}`);
  }

  return lines.join('\n');
}
