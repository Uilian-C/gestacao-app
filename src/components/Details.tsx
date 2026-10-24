import { useContext, useState } from 'react';
import { appointmentTitle, hasResult, kindInfo, kindOf, resultOf } from '../lib/appointments';
import { AlertTriangle, Bell, CalendarHeart, Check, CheckCircle2, ChevronRight, Clock, ExternalLink, FileText, HeartHandshake, Lock, NotebookPen, Pencil, RotateCcw, Route, Scale, Trash2, Users } from 'lucide-react';
import { isAlertSymptom } from '../content/symptomCatalog';
import { googleCalendarUrl } from '../lib/calendar';
import { formatBR, isOverdue, localDay, parseLocalDate, parseTimestamp, stampText, toISODate } from '../lib/dates';
import { HIGH_DIASTOLIC, HIGH_SYSTOLIC, isHighBloodPressure } from '../lib/health';
import { INTENSITY } from '../lib/intensity';
import { normalizeSymptomName, timeOfDayLabel } from '../lib/symptoms';
import type { Detail } from '../lib/details';
import type { Author, Consultation, PartnerComment, PartnerTask, SymptomItem } from '../types';
import { photoUrl, type FamilyMember } from '../api';
import { FOLDER, TONE, weekOn } from '../lib/folders';
import AuthorBadge from './AuthorBadge';
import { MentionText } from './Mentions';
import { WhoAvatars } from './WhoPicker';
import { PeopleContext, authorOf, firstName, whoName } from '../lib/people';
import Avatar from './Avatar';
import { reminderTime, timeLabel } from '../lib/reminders';
import PhotoViewer from './PhotoViewer';
import { EntryForm, type NewEntry } from './forms/EntryForm';
import { MetricForm, SymptomForm, type NewMetric, type NewSymptom } from './forms/RecordForms';
import IntensityDots from './IntensityDots';
import LocationLinks from './LocationLinks';
import Sheet from './Sheet';
import { inputClass } from './styles';
import { ScheduleForm, type NewConsultation } from './tabs/ConsultationsTab';
import { TaskForm, type NewTask } from './tabs/TasksTab';
import { Button, Pill } from './ui';
import { ReactionBar, Thread, type OnReact } from './Social';
import AppointmentIcon from './AppointmentIcon';
import type { ExamItem, Reaction, ThreadComment } from '../hooks/useGestationData';

// Detalhes de um registro numa janela: tudo o que foi anotado, e Editar e Excluir.
// As listas ficam enxutas; o resto aparece aqui.

export interface DetailHandlers {
  author: Author;
  trimester: 1 | 2 | 3;
  currentWeek: number;
  symptoms: SymptomItem[];
  busy: boolean;
  journalAvailable: boolean;
  /** Pastas e fotos do diário (migração 012). */
  photosAvailable: boolean;
  dumDate: string;
  onUpdateSymptom: (id: string, s: NewSymptom) => Promise<boolean>;
  onUpdateMetric: (id: string, m: NewMetric) => Promise<boolean>;
  onUpdateEntry: (id: string, e: NewEntry) => Promise<boolean>;
  onUpdateTask: (id: string, t: NewTask) => Promise<boolean>;
  onUpdateConsultation: (id: string, c: NewConsultation) => Promise<boolean>;
  onDelete: (d: Detail) => void;
  onComment: (symptomId: string, text: string) => Promise<boolean>;
  onDeleteComment: (c: PartnerComment) => void;
  onToggleTask: (t: PartnerTask) => void;
  onPrepare: (c: Consultation) => void;
  /** Exame ou ultrassom agendado: guarda o resultado, ou abre o que já foi guardado. */
  onResult: (c: Consultation) => void;
  exams: ExamItem[];
  /** Reações e conversa (migração 011). */
  socialAvailable: boolean;
  reactions: Reaction[];
  threads: ThreadComment[];
  onReact: OnReact;
  onThread: (targetType: 'entry' | 'exam', targetId: string, body: string) => Promise<boolean>;
  onDeleteThread: (c: ThreadComment) => void;
  /** Agendamento ligado a um item da jornada: abre o item na jornada (Cuidados). */
  onOpenJourney: (itemId: string) => void;
  /** Nome do item da jornada (inclui os itens do casal). */
  journeyTitle: (itemId: string) => string | null;
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

/** Nome de quem escreveu (pelo espaço); sem a pessoa, "Mãe" ou "Pai". */
function nameOfAuthor(people: FamilyMember[], mine: boolean, role: Author) {
  const who = authorOf(people, mine, role);
  return who ? firstName(who.name) : role === 'mae' ? 'Mãe' : 'Pai';
}

export default function DetailSheet({ detail, onClose, ...h }: DetailHandlers & { detail: Detail; onClose: () => void }) {
  const people = useContext(PeopleContext);
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<number | null>(null);
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
      <Sheet icon={<NotebookPen />} title={editing ? 'Editar sintoma' : s.symptom_name} subtitle={editing ? null : <span className="flex flex-wrap items-center gap-2">{formatBR(s.log_date)} · semana {s.week_number} <AuthorBadge role={s.created_by} />{s.created_at && <span className="w-full text-[11.5px] text-ink-mute">Registrado {stampText(s.created_at)}</span>}</span>} onClose={editing ? () => setEditing(false) : onClose}>
        {editing ? (
          <SymptomForm initial={s} author={h.author} dumDate={h.dumDate} trimester={h.trimester} history={h.symptoms} busy={h.busy} onCreate={async v => saved(await h.onUpdateSymptom(s.id, v))} />
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
            {h.socialAvailable && (
              <div className="mt-4">
                <ReactionBar targetType="symptom" targetId={s.id} reactions={h.reactions} onReact={h.onReact} />
              </div>
            )}
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
          <MetricForm initial={m} dumDate={h.dumDate} busy={h.busy} onCreate={async v => saved(await h.onUpdateMetric(m.id, v))} />
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
    const f = FOLDER[e.folder];
    const t = TONE[f.tone];
    const week = weekOn(h.dumDate, e.entry_date);
    const letter = e.folder === 'carta';
    return (
      <Sheet
        icon={<f.Icon />}
        title={editing ? `Editar: ${f.singular.toLowerCase()}` : e.folder === 'barriga' ? `Barriguinha · semana ${week}` : letter ? 'Carta para o bebê' : f.singular}
        subtitle={editing ? null : <span className="flex flex-wrap items-center gap-1.5"><Avatar member={authorOf(people, e.mine, e.author_role)} role={e.author_role} className="w-5 h-5 text-[9px]" /> <strong className="font-bold text-ink-soft">{nameOfAuthor(people, e.mine, e.author_role)}</strong> · {formatBR(e.entry_date)} · semana {week}{e.created_at && <span className="w-full text-[11.5px] text-ink-mute">Registrado {stampText(e.created_at)}</span>}</span>}
        onClose={editing ? () => setEditing(false) : onClose}
      >
        {editing ? (
          <EntryForm initial={e} busy={h.busy} available={h.journalAvailable} photosAvailable={h.photosAvailable} dumDate={h.dumDate} onSave={async v => saved(await h.onUpdateEntry(e.id, v))} />
        ) : (
          <>
            {e.photos.length > 0 && (
              <div className={`grid gap-2 mb-4 ${e.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {e.photos.map((p, i) => (
                  <button key={p.id} type="button" onClick={() => setPhoto(i)} aria-label={`Ver foto ${i + 1} em tela cheia`} className={`block overflow-hidden rounded-2xl ${e.photos.length === 1 ? 'mx-auto w-fit max-w-full' : 'bg-surface-2'}`}>
                    {/* Uma foto: inteira e nítida, no tamanho dela (sem faixas cinzas dos lados). Várias: quadradinhos. */}
                    <img src={e.photos.length === 1 ? photoUrl(p.id) : photoUrl(p.id, p.thumb)} alt="" decoding="async" className={e.photos.length === 1 ? 'block w-auto max-w-full h-auto max-h-[55vh]' : 'w-full aspect-square object-cover'} />
                  </button>
                ))}
              </div>
            )}
            {e.body && (
              <div className={letter ? `rounded-2xl p-4 border-l-4 border-azul ${t.soft}` : ''}>
                <p className={`font-display text-[1.3rem] leading-snug text-ink whitespace-pre-line ${letter ? 'italic' : ''}`}>
                  <MentionText text={e.body} />
                </p>
                {letter && <p className="font-display italic text-ink-soft text-right mt-3">— {e.author_role === 'mae' ? 'mãe' : 'pai'}</p>}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {h.photosAvailable && (
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${t.soft} ${t.text}`}>
                  <f.Icon className="w-3 h-3" /> {f.title}
                </span>
              )}
              <Pill>{e.visibility === 'private' ? <><Lock /> Só você vê</> : e.visibility === 'family' ? <><Users /> Vocês dois e a família veem</> : <><Users /> Vocês dois veem</>}</Pill>
              {e.remind_on && <Pill tone="brand"><Bell /> Lembrar em {formatBR(e.remind_on)}</Pill>}
            </div>
            {h.socialAvailable && (
              <div className="mt-5 space-y-4">
                <ReactionBar targetType="entry" targetId={e.id} reactions={h.reactions} onReact={h.onReact} />
                <Thread comments={h.threads.filter(c => c.target_type === 'entry' && c.target_id === e.id)} busy={h.busy} onSend={body => h.onThread('entry', e.id, body)} onDelete={h.onDeleteThread} />
              </div>
            )}
            {e.mine ? <Actions onEdit={() => setEditing(true)} onDelete={remove} /> : <p className="text-xs text-ink-mute mt-5">Só quem escreveu pode editar ou excluir este registro.</p>}
            {photo !== null && e.photos.length > 0 && (
              <PhotoViewer
                title={e.folder === 'barriga' ? `Barriguinha · semana ${week}` : f.singular}
                subtitle={formatBR(e.entry_date)}
                photos={e.photos.map(p => ({ id: p.id, src: photoUrl(p.id) }))}
                index={Math.min(photo, e.photos.length - 1)}
                onIndex={setPhoto}
                onClose={() => setPhoto(null)}
              />
            )}
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
                ['Quem cuida', <span key="quem" className="inline-flex items-center gap-1.5"><WhoAvatars who={t.assigned_to} /> {whoName(people, t.assigned_to)}</span>],
                ['Prioridade', t.priority],
                ['Prazo', t.due_date ? formatBR(t.due_date) : 'sem prazo'],
                ...(t.remind_on ? [['Lembrete', `${formatBR(t.remind_on)}, às ${timeLabel(reminderTime(t.remind_at))}`] as [string, string]] : []),
              ]}
            />
            {t.notes && <p className="text-[15px] text-ink mt-4 whitespace-pre-line">{t.notes}</p>}
            {h.socialAvailable && t.is_completed && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-ok flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Feita!</p>
                <ReactionBar targetType="task" targetId={t.id} reactions={h.reactions} kinds={['festa']} onReact={h.onReact} />
              </div>
            )}
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
  const kind = kindOf(c);
  const consulta = kind === 'consulta';
  const result = resultOf(c, h.exams);
  const happened = parseTimestamp(c.scheduled_at) <= new Date() || localDay(c.scheduled_at).getTime() <= parseLocalDate(toISODate(new Date())).getTime();
  const when = parseTimestamp(c.scheduled_at);
  return (
    <Sheet
      icon={<CalendarHeart />}
      title={editing ? `Editar ${kindInfo(kind).label.toLowerCase()}` : appointmentTitle(c)}
      subtitle={editing ? null : `${when.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às ${when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
      onClose={editing ? () => setEditing(false) : onClose}
    >
      {editing ? (
        <ScheduleForm initial={c} busy={h.busy} onClose={() => setEditing(false)} onCreate={async v => saved(await h.onUpdateConsultation(c.id, v))} />
      ) : (
        <>
          <Facts
            items={[
              ...(consulta
                ? [['Profissional', c.professional_name || '—'], ['Dúvidas anotadas', String(detail.pendingQuestions)]]
                : [['Tipo', <span key="tipo" className="inline-flex items-center gap-1.5"><AppointmentIcon kind={kind} className="w-4 h-4 text-brand" /> {kindInfo(kind).label}</span>], ['Laboratório ou clínica', c.professional_name || '—'], ...(hasResult(c) ? [['Resultado', result ? 'guardado' : 'ainda não'] as [string, string]] : [])]) as Array<[string, React.ReactNode]>,
              ...(c.attendees
                ? [['Quem vai', <span key="quem" className="inline-flex items-center gap-1.5"><WhoAvatars who={c.attendees} /> {whoName(people, c.attendees)}</span>] as [string, React.ReactNode]]
                : []),
            ]}
          />
          {c.plan_item && h.journeyTitle(c.plan_item) && (
            <button
              type="button"
              onClick={() => {
                onClose();
                h.onOpenJourney(c.plan_item!);
              }}
              className="mt-4 w-full flex items-center gap-3 rounded-2xl bg-brand-soft px-3.5 py-2.5 text-left"
            >
              <Route className="w-4 h-4 text-brand-strong shrink-0" />
              <span className="flex-1 min-w-0 text-sm">
                <span className="block text-xs font-bold text-brand-strong">Faz parte da jornada do pré-natal</span>
                <span className="block font-semibold text-ink truncate">{h.journeyTitle(c.plan_item)}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-brand-strong shrink-0" />
            </button>
          )}
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
            {consulta ? (
              <Button
                onClick={() => {
                  onClose();
                  h.onPrepare(c);
                }}
                className="w-full"
              >
                <FileText /> Preparar a consulta
              </Button>
            ) : (
              hasResult(c) &&
              (result || happened) && (
                <Button
                  onClick={() => {
                    onClose();
                    h.onResult(c);
                  }}
                  className="w-full"
                >
                  <FileText /> {result ? 'Ver resultado' : 'Guardar resultado'}
                </Button>
              )
            )}
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
