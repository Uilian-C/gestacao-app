import { useState } from 'react';
import { Bell, CheckSquare, ChevronDown, ChevronRight, FileCheck2 } from 'lucide-react';
import type { DetailTarget } from '../../lib/details';
import { appointmentTitle, kindInfo, kindOf, resultOf } from '../../lib/appointments';
import { formatBR, localDay, toISODate } from '../../lib/dates';
import { buildUpcoming, dayChip, type UpcomingItem } from '../../lib/upcoming';
import type { Celebration } from '../../lib/celebrations';
import type { ExamItem, JournalEntry } from '../../hooks/useGestationData';
import type { Consultation, PartnerTask } from '../../types';
import { WhoAvatars } from '../WhoPicker';
import { ScheduleForm, type NewConsultation } from './ConsultationsTab';

// Agenda → Próximos: tudo o que tem data, numa lista só. É aqui que se agenda
// consulta, exame, ultrassom ou vacina.

interface Props {
  consultations: Consultation[];
  tasks: PartnerTask[];
  journal: JournalEntry[];
  exams: ExamItem[];
  busy: boolean;
  migrationPending: boolean;
  onCreateConsultation: (c: NewConsultation) => Promise<boolean>;
  onOpen: (target: DetailTarget) => void;
  /** Exame ou ultrassom que aconteceu: guardar (ou ver) o resultado. */
  onResult: (c: Consultation) => void;
  /** Celebrações (migração 028): o dia e as tarefas entram aqui. */
  celebrations?: Celebration[] | null;
  onOpenCelebration?: (id: string) => void;
}

const TONE = {
  verde: { label: 'text-verde-strong', time: 'text-verde-strong' },
  azul: { label: 'text-azul-strong', time: 'text-azul-strong' },
  rosa: { label: 'text-rosa-strong', time: 'text-rosa-strong' },
} as const;

const targetOf = (i: UpcomingItem): DetailTarget => (i.consultation ? { kind: 'consultation', id: i.consultation.id } : i.task ? { kind: 'task', id: i.task.id } : { kind: 'entry', id: i.entry!.id });

export default function UpcomingTab(props: Props) {
  const up = buildUpcoming({ consultations: props.consultations, tasks: props.tasks, journal: props.journal, exams: props.exams, today: new Date(), celebrations: props.celebrations });
  const open = (i: UpcomingItem) => (i.celebration ? props.onOpenCelebration?.(i.celebration.id) : props.onOpen(targetOf(i)));
  const empty = up.today.length + up.week.length + up.later.length === 0;

  return (
    <div className="space-y-5">
      {props.migrationPending ? (
        <p className="text-sm text-warn bg-warn-soft rounded-2xl p-4">Para agendar, rodem a migração <code>db/migrations/002_consultas_e_padroes.sql</code> no Neon.</p>
      ) : (
        <ScheduleForm busy={props.busy} onCreate={props.onCreateConsultation} />
      )}

      {up.missingResults.length > 0 && (
        <Group title="Falta guardar o resultado" tone="text-alert">
          {up.missingResults.map(c => (
            <div key={c.id} className="px-4 py-3 flex items-center gap-3">
              <FileCheck2 className="w-5 h-5 text-verde shrink-0" />
              <button type="button" onClick={() => props.onOpen({ kind: 'consultation', id: c.id })} className="flex-1 min-w-0 text-left">
                <span className="block font-bold text-ink truncate">{appointmentTitle(c)}</span>
                <span className="block text-xs text-ink-mute">foi em {formatBR(toISODate(localDay(c.scheduled_at)))}</span>
              </button>
              <button type="button" onClick={() => props.onResult(c)} className="shrink-0 rounded-full bg-verde-soft text-verde-strong px-3.5 py-2 text-sm font-extrabold">
                Guardar resultado
              </button>
            </div>
          ))}
        </Group>
      )}

      {empty && <p className="px-1 text-[14px] text-ink-soft">Nada marcado por enquanto. Toquem em <strong>Agendar</strong> para pôr consultas, exames, ultrassons e vacinas aqui, com lembrete na véspera.</p>}

      {up.today.length > 0 && <Group title="Hoje"><Rows items={up.today} today onOpen={open} /></Group>}
      {up.thisWeek.length > 0 && <Group title="Esta semana"><Rows items={up.thisWeek} onOpen={open} /></Group>}
      {up.nextWeek.length > 0 && <Group title="Semana que vem"><Rows items={up.nextWeek} onOpen={open} /></Group>}
      {up.afterNextWeek.length > 0 && <Group title="Mais para frente"><Rows items={up.afterNextWeek} onOpen={open} /></Group>}

      {up.past.length > 0 && (
        <details className="rounded-[24px] bg-surface/60 px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold text-ink-soft">Já aconteceram ({up.past.length})</summary>
          <div className="mt-3 space-y-2">
            {up.past.map(c => {
              const result = resultOf(c, props.exams);
              return (
                <button key={c.id} type="button" onClick={() => props.onOpen({ kind: 'consultation', id: c.id })} className="w-full text-left rounded-2xl px-1 py-2.5 flex items-center gap-3">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">{kindInfo(kindOf(c)).label}</span>
                    <span className="block font-semibold text-ink truncate">{appointmentTitle(c)}</span>
                    <span className="block text-xs text-ink-mute">
                      {formatBR(toISODate(localDay(c.scheduled_at)))}
                      {result && ' · resultado guardado'}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
                </button>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

function Group({ title, tone = 'text-ink-mute', children }: { title: string; tone?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h2 className={`px-1 text-[12px] font-extrabold uppercase tracking-wider font-sans ${tone}`}>{title}</h2>
      <div className="rounded-[24px] bg-surface/80 divide-y divide-line/60 overflow-hidden">{children}</div>
    </section>
  );
}

/**
 * As linhas de um grupo. Duas ou mais tarefas no mesmo dia viram uma linha só
 * ("3 tarefas"), que abre no lugar: o dia não vira uma tripa de tarefas.
 */
function Rows({ items, today = false, onOpen }: { items: UpcomingItem[]; today?: boolean; onOpen: (i: UpcomingItem) => void }) {
  const isTask = (i: UpcomingItem) => !!(i.task || i.celebrationTask);
  const out: React.ReactNode[] = [];
  const seen = new Set<string>();
  for (const i of items) {
    if (!isTask(i)) {
      out.push(<Row key={i.id} item={i} today={today} onOpen={() => onOpen(i)} />);
      continue;
    }
    if (seen.has(i.day)) continue;
    seen.add(i.day);
    const same = items.filter(x => isTask(x) && x.day === i.day);
    out.push(same.length > 1 ? <TaskBundle key={`tarefas-${i.day}`} items={same} today={today} onOpen={onOpen} /> : <Row key={i.id} item={i} today={today} onOpen={() => onOpen(i)} />);
  }
  return <>{out}</>;
}

function TaskBundle({ items, today, onOpen }: { items: UpcomingItem[]; today: boolean; onOpen: (i: UpcomingItem) => void }) {
  const [open, setOpen] = useState(false);
  const chip = dayChip(items[0].day);
  const late = items.filter(i => i.overdue).length;
  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full text-left px-4 py-3 flex items-center gap-3">
        <span className="w-14 shrink-0 text-center">
          {today ? (
            <CheckSquare className={`w-6 h-6 mx-auto ${late ? 'text-alert' : 'text-azul-strong'}`} aria-hidden />
          ) : (
            <span className="block leading-tight">
              <span className="block text-[11px] font-extrabold uppercase text-ink-mute">{chip.weekday}</span>
              <span className="block font-display text-[1.25rem] font-semibold text-ink tabular">{chip.day}</span>
              <span className="block text-[10px] font-bold uppercase text-ink-mute">{chip.month}</span>
            </span>
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[11px] font-extrabold uppercase tracking-wide ${late ? 'text-alert' : 'text-azul-strong'}`}>{late ? `Tarefas · ${late} ${late === 1 ? 'atrasada' : 'atrasadas'}` : 'Tarefas'}</span>
          <span className="block font-bold text-ink">{items.length} tarefas</span>
          <span className="block text-xs text-ink-mute truncate">{items.map(i => i.title).join(' · ')}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-mute shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="pb-2">
          {items.map(i => (
            <li key={i.id}>
              <button type="button" onClick={() => onOpen(i)} aria-label={`${i.label}: ${i.title}: ver detalhes`} className="w-full text-left pl-[5.5rem] pr-4 py-2 flex items-center gap-2 hover:bg-surface-2/40">
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-ink truncate">{i.title}</span>
                  {i.detail && <span className="block text-xs text-ink-mute truncate">{i.detail}</span>}
                </span>
                <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Uma linha da agenda: hora (hoje) ou dia, o tipo, o nome e o detalhe. Toca e abre os detalhes. */
export function Row({ item: i, today = false, onOpen }: { item: UpcomingItem; today?: boolean; onOpen: () => void }) {
  const t = TONE[i.tone];
  const chip = dayChip(i.day);
  return (
    <button type="button" onClick={onOpen} aria-label={`${i.label}: ${i.title}: ver detalhes`} className="w-full text-left px-4 py-3 flex items-center gap-3 transition hover:bg-surface-2/40 active:scale-[0.995]">
      <span className="w-14 shrink-0 text-center">
        {today ? (
          i.time ? (
            <span className={`font-display text-[1.1rem] font-semibold tabular ${t.time}`}>{i.time}</span>
          ) : i.task || i.celebrationTask ? (
            <CheckSquare className={`w-6 h-6 mx-auto ${i.overdue ? 'text-alert' : t.time}`} aria-hidden />
          ) : (
            <Bell className={`w-6 h-6 mx-auto ${t.time}`} aria-hidden />
          )
        ) : (
          <span className="block leading-tight">
            <span className="block text-[11px] font-extrabold uppercase text-ink-mute">{chip.weekday}</span>
            <span className="block font-display text-[1.25rem] font-semibold text-ink tabular">{chip.day}</span>
            <span className="block text-[10px] font-bold uppercase text-ink-mute">{chip.month}</span>
          </span>
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[11px] font-extrabold uppercase tracking-wide ${i.overdue ? 'text-alert' : t.label}`}>
          {i.label}
          {!today && i.time && ` · ${i.time}`}
        </span>
        <span className="block font-bold text-ink truncate">{i.title}</span>
        {i.detail && <span className="block text-xs text-ink-mute truncate">{i.detail}</span>}
      </span>
      {i.consultation?.attendees && <WhoAvatars who={i.consultation.attendees} />}
      <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
    </button>
  );
}
