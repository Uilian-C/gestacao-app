import { Camera, Heart, Lightbulb, Mail, Sun, type LucideIcon } from 'lucide-react';
import type { Folder, JournalEntry } from '../hooks/useGestationData';
import { parseLocalDate } from './dates';

// O fichário do diário: cada registro fica numa pasta. A saúde (sintomas,
// peso e pressão) não entra aqui: fica em Cuidados, junto da equipe médica.

export type FolderTone = 'rosa' | 'coral' | 'verde' | 'azul' | 'lilas';

export interface FolderInfo {
  id: Folder;
  /** Nome curto (chips) e nome inteiro (capa da pasta). */
  label: string;
  title: string;
  /** Um registro desta pasta ("Carta", "Ideia"...). */
  singular: string;
  Icon: LucideIcon;
  /** Do que a pasta cuida, numa linha. */
  hint: string;
  tone: FolderTone;
  /** Texto de exemplo do campo e ideias para começar. */
  placeholder: string;
  ideas: string[];
  /** Nome do botão de guardar. */
  save: string;
}

export const FOLDERS: FolderInfo[] = [
  {
    id: 'momento',
    singular: 'Momento',
    Icon: Heart,
    label: 'Momentos',
    title: 'Momentos especiais',
    hint: 'As primeiras vezes e as notícias que vocês vão querer lembrar.',
    tone: 'rosa',
    placeholder: 'O que aconteceu? Ex.: ouvimos o coração pela primeira vez.',
    ideas: ['Ouvimos o coração', 'Primeiro chute', 'Contamos para a família', 'Contamos no trabalho', 'Descobrimos o sexo', 'Escolhemos o nome', 'Chá de bebê', 'Ensaio de fotos'],
    save: 'Guardar momento',
  },
  {
    id: 'dia',
    singular: 'Dia a dia',
    Icon: Sun,
    label: 'Dia a dia',
    title: 'Dia a dia',
    hint: 'Como foi o dia, o humor, os desejos, o que mudou na rotina.',
    tone: 'coral',
    placeholder: 'Como foi hoje? Ex.: dia tranquilo, muita vontade de manga.',
    ideas: ['Hoje me senti…', 'Desejo do dia', 'O que mudou na rotina', 'Uma conversa boa', 'Um medo que passou', 'Um dia difícil'],
    save: 'Guardar no dia a dia',
  },
  {
    id: 'ideia',
    singular: 'Ideia',
    Icon: Lightbulb,
    label: 'Ideias',
    title: 'Ideias e planos',
    hint: 'Nomes, enxoval, quarto, chá de bebê: o que vocês não querem esquecer.',
    tone: 'verde',
    placeholder: 'Qual é a ideia? Ex.: nomes que gostamos: Helena, Theo.',
    ideas: ['Nomes que gostamos', 'Ideia para o quarto', 'Lista do enxoval', 'Chá de bebê', 'Presente para lembrar', 'Perguntar para a família'],
    save: 'Guardar ideia',
  },
  {
    id: 'carta',
    singular: 'Carta',
    Icon: Mail,
    label: 'Cartas',
    title: 'Cartas para o bebê',
    hint: 'Para ler junto um dia: o que vocês sentem agora, escrito para ele ou ela.',
    tone: 'azul',
    placeholder: 'Querido bebê, …',
    ideas: ['Querido bebê,', 'Quando soubemos de você…', 'O que sonhamos para você', 'Hoje você mexeu e…'],
    save: 'Guardar carta',
  },
  {
    id: 'barriga',
    singular: 'Barriguinha',
    Icon: Camera,
    label: 'Barriguinha',
    title: 'Barriguinha',
    hint: 'Uma foto por semana para ver a barriga crescer.',
    tone: 'lilas',
    placeholder: 'Uma legenda (opcional). Ex.: de lado, no espelho do quarto.',
    ideas: ['Primeira foto de lado', 'Já não fecha a calça', 'Com a roupa do ensaio'],
    save: 'Guardar foto',
  },
];

export const FOLDER = Object.fromEntries(FOLDERS.map(f => [f.id, f])) as Record<Folder, FolderInfo>;

/** Classes de cada tom (o Tailwind precisa dos nomes inteiros no código). */
export const TONE: Record<FolderTone, { solid: string; soft: string; text: string; ring: string }> = {
  rosa: { solid: 'bg-rosa text-white', soft: 'bg-rosa-soft', text: 'text-rosa-strong', ring: 'ring-rosa' },
  coral: { solid: 'bg-coral text-white', soft: 'bg-coral-soft', text: 'text-coral-strong', ring: 'ring-coral' },
  verde: { solid: 'bg-verde text-white', soft: 'bg-verde-soft', text: 'text-verde-strong', ring: 'ring-verde' },
  azul: { solid: 'bg-azul text-white', soft: 'bg-azul-soft', text: 'text-azul-strong', ring: 'ring-azul' },
  lilas: { solid: 'bg-lilas text-white', soft: 'bg-lilas-soft', text: 'text-lilas-strong', ring: 'ring-lilas' },
};

/** Semana da gestação numa data (a partir da DUM). */
export function weekOn(dumDate: string, iso: string) {
  return Math.max(0, Math.floor((parseLocalDate(iso).getTime() - parseLocalDate(dumDate).getTime()) / (7 * 86_400_000)));
}

/** Registros por mês, do mais recente ao mais antigo ("outubro de 2026"). */
export function byMonth(entries: JournalEntry[]) {
  const groups = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const key = e.entry_date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => {
      const [y, m] = key.split('-').map(Number);
      return { key, label: new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), items };
    });
}

/** Fotos da barriga por semana: a mais recente de cada semana vira a capa. */
export function bellyWeeks(entries: JournalEntry[], dumDate: string) {
  const weeks = new Map<number, JournalEntry[]>();
  for (const e of entries) {
    if (e.folder !== 'barriga') continue;
    const w = weekOn(dumDate, e.entry_date);
    weeks.set(w, [...(weeks.get(w) ?? []), e]);
  }
  return [...weeks.entries()].sort((a, b) => b[0] - a[0]).map(([week, items]) => ({ week, items }));
}

/** As fotos da barriga com a semana de cada uma (a primeira foto de cada registro), para a linha do crescimento. */
export function bellyShots(entries: JournalEntry[], dumDate: string) {
  return entries
    .filter(e => e.folder === 'barriga' && e.photos.length > 0)
    .map(e => ({ week: weekOn(dumDate, e.entry_date), entryId: e.id, photo: e.photos[0] }));
}

/** Data curta para os cartões: "14 out" (com o ano, se não for o atual). */
export function shortDate(iso: string) {
  const d = parseLocalDate(iso);
  const text = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  return text.replace(/\./g, '').replace(/ de /g, ' ');
}
