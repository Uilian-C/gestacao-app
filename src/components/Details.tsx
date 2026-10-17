import { useState } from 'react';
import { AlertTriangle, Bell, CalendarHeart, Check, CheckCircle2, Clock, ExternalLink, FileText, Heart, HeartHandshake, Lock, NotebookPen, Pencil, RotateCcw, Scale, Trash2, Users } from 'lucide-react';
import { isAlertSymptom } from '../content/symptomCatalog';
import { specialtyOf } from '../data/specialties';
import { googleCalendarUrl } from '../lib/calendar';
import { formatBR, isOverdue, parseTimestamp } from '../lib/dates';
import { HIGH_DIASTOLIC, HIGH_SYSTOLIC, isHighBloodPressure, type ParsedMetric } from '../lib/health';
import { INTENSITY } from '../lib/intensity';
import { normalizeSymptomName, timeOfDayLabel } from '../lib/symptoms';
import type { Detail } from '../lib/details';
import type { Author, Consultation, PartnerComment, PartnerTask, SymptomItem } from '../types';
import AuthorBadge from './AuthorBadge';
import { MetricForm, MomentForm, SymptomForm, type NewEntry, type NewSymptom } from './forms/RecordForms';
import IntensityDots from './IntensityDots';
import LocationLinks from './LocationLinks';
import Sheet from './Sheet';
import { inputClass } from './styles';
import { ScheduleForm, type NewConsultation } from './tabs/ConsultationsTab';
import { TaskForm, type NewTask } from './tabs/TasksTab';
import { Button, Pill } from './ui';

// Detalhes de um registro numa janela: tudo o que foi anotado, e Editar e Excluir.
// As listas ficam enxutas; o resto aparece aqui.

export interface DetailHandlers {
  author: Author;
  trimester: 1 | 2 | 3;
  currentWeek: number;
  symptoms: SymptomItem[];
  busy: boolean;
  journalAvailable: boolean;
  onUpdateSymptom: (id: string, s: NewSymptom) => Promise<boolean>;
  onUpdateMetric: (id: string, m: ParsedMetric) => Promise<boolean>;
  onUpdateEntry: (id: string, e: NewEntry) => Promise<boolean>;
  onUpdateTask: (id: string, t: NewTask) => Promise<boolean>;
  onUpdateConsultation: (id: string, c: NewConsultation) => Promise<boolean>;
  onDelete: (d: Detail) => void;
  onComment: (symptomId: string, text: string) => Promise<boolean>;
  onDeleteComment: (c: PartnerComment) => void;
  onToggleTask: (t: PartnerTask) => void;
  onPrepare: (c: Consultation) => void;
}

const WHO: Record<string, string> = { mae: 'Mãe', pai: 'Pai', casal: 'Casal' };

function Facts({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-surface-2 px-3 py-2.5 min-w-0">
          <dt className="text-xs text-ink-mute">{label}</dt>
          <dd className="font-bold text-ink text-[15px] break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Actions({ onEdit, onDelete, children }: { onEdit?: () => void; onDelete?: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 mt-5">
      {children}
      {onEdit && (
        <Button tone="soft" onClick={onEdit} className="flex-1 min-w-[120px]">
          <Pencil /> Editar
        </Button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-alert hover:bg-alert-soft">
          <Trash2 className="w-4 h-4" /> Excluir
        </button>
      )}
    </div>
  );
}

export default function DetailSheet({ detail, onClose, ...h }: DetailHandlers & { detail: Detail; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const remove = () => {
    onClose();
    h.onDelete(detail);
  };
  const saved = (ok: boolean) => {
    if (ok) setEditing(false);
    return ok;
  };

  if (detail.kind === 'symptom') {
    const s = detail.item;
    const alert = isAlertSymptom(normalizeSymptomName(s.symptom_name), s.intensity);
    return (
      <Sheet icon={<NotebookPen />} title={editing ? 'Editar sintoma' : s.symptom_name} subtitle={editing ? null : <span className="flex flex-wrap items-center gap-2">{formatBR(s.log_date)} · semana {s.week_number} <AuthorBadge role={s.created_by} /></span>} onClose={editing ? () => setEditing(false) : onClose}>
        {editing ? (
          <SymptomForm initial={s} trimester={h.trimester} history={h.symptoms} busy={h.busy} currentWeek={h.currentWeek} onCreate={async v => saved(await h.onUpdateSymptom(s.id, v))} />
        ) : (
          <>
            {alert && (
              <p className="flex gap-2 rounded-2xl bg-alert-soft text-alert p-3 text-sm mb-3" role="alert">
                <AlertTriangle className="w-5 h-5 shrink-0" /> Pode ser um sinal de alerta: liguem para o obstetra ou procurem a maternidade.
              </p>
            )}
            <Facts
              items={[
                ['Intensidade', <span className="flex items-center gap-2">{INTENSITY[s.intensity - 1]} <IntensityDots value={s.intensity} /></span>],
                ['Tipo', s.category],
                ['Período', s.time_of_day ? timeOfDayLabel(s.time_of_day) : '—'],
              ]}
            />
            {s.notes && <p className="text-[15px] text-ink mt-4 whitespace-pre-line">{s.notes}</p>}
            <Care symptom={s} comments={detail.comments} busy={h.busy} onComment={h.onComment} onDeleteComment={h.onDeleteComment} />
            <Actions onEdit={() => setEditing(true)} onDelete={remove} />
          </>
        )}
      </Sheet>
    );
  }

  if (detail.kind === 'metric') {
    const m = detail.item;
    const high = isHighBloodPressure(m.systolic_bp, m.diastolic_bp);
    return (
      <Sheet icon={<Scale />} title={editing ? 'Editar medição' : 'Peso e pressão'} subtitle={editing ? null : <span className="flex flex-wrap items-center gap-2">{formatBR(m.recorded_at)} · semana {m.week_number} <AuthorBadge role={m.created_by} /></span>} onClose={editing ? () => setEditing(false) : onClose}>
        {editing ? (
          <MetricForm initial={m} author={h.author} busy={h.busy} currentWeek={h.currentWeek} onCreate={async v => saved(await h.onUpdateMetric(m.id, v))} />
        ) : (
          <>
            <Facts
              items={[
                ['Peso', m.weight_kg !== null ? `${m.weight_kg.toLocaleString('pt-BR')} kg` : '—'],
                ['Pressão', m.systolic_bp !== null ? `${m.systolic_bp}/${m.diastolic_bp} mmHg` : '—'],
              ]}
            />
            {high && <p className="text-sm text-alert font-semibold mt-3">Acima de {HIGH_SYSTOLIC}/{HIGH_DIASTOLIC}: contatem o obstetra.</p>}
            <Actions onEdit={() => setEditing(true)} onDelete={remove} />
          </>
        )}
      </Sheet>
    );
  }

  if (detail.kind === 'entry') {
    const e = detail.item;
    return (
      <Sheet icon={<Heart />} title={editing ? 'Editar momento' : 'Momento'} subtitle={editing ? null : <span className="flex flex-wrap items-center gap-2">{formatBR(e.entry_date)} <AuthorBadge role={e.author_role} /></span>} onClose={editing ? () => setEditing(false) : onClose}>
        {editing ? (
          <MomentForm initial={e} busy={h.busy} available={h.journalAvailable} onCreate={async v => saved(await h.onUpdateEntry(e.id, v))} />
        ) : (
          <>
            <p className="font-display text-[1.3rem] leading-snug text-ink whitespace-pre-line">{e.body}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Pill>{e.visibility === 'private' ? <><Lock /> Só você vê</> : <><Users /> Vocês dois veem</>}</Pill>
              {e.remind_on && <Pill tone="brand"><Bell /> Lembrar em {formatBR(e.remind_on)}</Pill>}
            </div>
            {e.mine ? <Actions onEdit={() => setEditing(true)} onDelete={remove} /> : <p className="text-xs text-ink-mute mt-5">Só quem escreveu pode editar ou excluir este momento.</p>}
          </>
        )}
      </Sheet>
    );
  }

  if (detail.kind === 'task') {
    const t = detail.item;
    const overdue = !t.is_completed && isOverdue(t.due_date);
    return (
      <Sheet icon={<CheckCircle2 />} title={editing ? 'Editar tarefa' : t.task_title} subtitle={editing ? null : <>Semana {t.week_number} · criada por {WHO[t.created_by].toLowerCase()}</>} onClose={editing ? () => setEditing(false) : onClose}>
        {editing ? (
          <TaskForm initial={t} selectedWeek={t.week_number} busy={h.busy} onCreate={async v => saved(await h.onUpdateTask(t.id, v))} onCancel={() => setEditing(false)} />
        ) : (
          <>
            {overdue && <p className="flex items-center gap-2 text-sm font-semibold text-alert mb-3"><Clock className="w-4 h-4" /> Atrasada desde {formatBR(t.due_date)}</p>}
            <Facts
              items={[
                ['Quem cuida', WHO[t.assigned_to]],
                ['Prioridade', t.priority],
                ['Prazo', t.due_date ? formatBR(t.due_date) : 'sem prazo'],
              ]}
            />
            {t.notes && <p className="text-[15px] text-ink mt-4 whitespace-pre-line">{t.notes}</p>}
            <Actions onEdit={() => setEditing(true)} onDelete={remove}>
              <Button
                onClick={() => {
                  h.onToggleTask(t);
                  onClose();
                }}
                className="w-full"
              >
                {t.is_completed ? <><RotateCcw /> Reabrir tarefa</> : <><Check /> Marcar como feita</>}
              </Button>
            </Actions>
          </>
        )}
      </Sheet>
    );
  }

  const c = detail.item;
  const spec = specialtyOf(c.specialty);
  const when = parseTimestamp(c.scheduled_at);
  return (
    <Sheet
      icon={<CalendarHeart />}
      title={editing ? 'Editar consulta' : spec.label}
      subtitle={editing ? null : `${when.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às ${when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
      onClose={editing ? () => setEditing(false) : onClose}
    >
      {editing ? (
        <ScheduleForm initial={c} busy={h.busy} onClose={() => setEditing(false)} onCreate={async v => saved(await h.onUpdateConsultation(c.id, v))} />
      ) : (
        <>
          <Facts items={[['Profissional', c.professional_name || '—'], ['Dúvidas anotadas', String(detail.pendingQuestions)]]} />
          {c.location && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-ink">{c.location}</p>
              <LocationLinks address={c.location} />
            </div>
          )}
          <a href={googleCalendarUrl(c)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-strong mt-4">
            <ExternalLink className="w-4 h-4" /> Adicionar ao Google Agenda
          </a>
          <Actions onEdit={() => setEditing(true)} onDelete={remove}>
            <Button
              onClick={() => {
                onClose();
                h.onPrepare(c);
              }}
              className="w-full"
            >
              <FileText /> Preparar resumo da consulta
            </Button>
          </Actions>
        </>
      )}
    </Sheet>
  );
}

/** "Cuidar": o que ajudou, a conversa do casal sobre o sintoma. */
function Care({ symptom, comments, busy, onComment, onDeleteComment }: { symptom: SymptomItem; comments: PartnerComment[]; busy: boolean; onComment: (id: string, text: string) => Promise<boolean>; onDeleteComment: (c: PartnerComment) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <section className="mt-5 space-y-2" aria-label="Cuidados">
      <h3 className="text-sm font-extrabold text-ink-soft flex items-center gap-1.5 font-sans">
        <HeartHandshake className="w-4 h-4 text-brand" /> Cuidar
      </h3>
      {comments.map(c => (
        <div key={c.id} className={`flex items-start gap-2 rounded-2xl px-3 py-2 text-[15px] ${c.author_role === 'pai' ? 'bg-pai-soft' : 'bg-mae-soft'}`}>
          <span className="flex-1 text-ink">
            {c.comment_text} <AuthorBadge role={c.author_role} />
          </span>
          <button type="button" onClick={() => onDeleteComment(c)} aria-label="Excluir cuidado" className="p-1 text-ink-mute hover:text-alert">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <form
        onSubmit={async e => {
          e.preventDefault();
          if (draft.trim() && (await onComment(symptom.id, draft.trim()))) setDraft('');
        }}
        className="flex gap-2"
      >
        <input aria-label={`Cuidado ou apoio em "${symptom.symptom_name}"`} className={`${inputClass} !py-2 text-sm`} placeholder="O que ajudou? (ex.: chá às 22h)" value={draft} onChange={e => setDraft(e.target.value)} />
        <Button type="submit" tone="soft" disabled={busy || !draft.trim()} className="!px-4 !py-2 shrink-0">Enviar</Button>
      </form>
    </section>
  );
}
