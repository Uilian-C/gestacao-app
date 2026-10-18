import { useContext } from 'react';
import { ArrowRight, AtSign, CalendarPlus, Check, CheckCircle2, ChevronRight, Clock, Flag, Heart, MessageCircle } from 'lucide-react';
import { photoUrl } from '../../api';
import type { JournalEntry, ThreadComment } from '../../hooks/useGestationData';
import { appointmentTitle, kindInfo, kindOf } from '../../lib/appointments';
import { daysBetween, formatBR, isOverdue, parseLocalDate, parseTimestamp, toISODate } from '../../lib/dates';
import { inDays, nextMilestone } from '../../lib/milestones';
import { PeopleContext, firstName, whoName } from '../../lib/people';
import type { Author, Consultation, PartnerTask } from '../../types';
import Avatar from '../Avatar';
import LocationLinks from '../LocationLinks';
import { WhoAvatars } from '../WhoPicker';

// Os cartões do Início que fazem dele o painel do casal: o próximo compromisso,
// as novidades da outra pessoa, as tarefas de cada um e os marcos da gestação.

/** "Hoje, 14:00", "Amanhã, 09:30" ou "Em 3 dias · ter, 21 out · 14:00". */
function whenText(at: Date, now: Date) {
  const days = daysBetween(parseLocalDate(toISODate(now)), parseLocalDate(toISODate(at)));
  const time = at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `Hoje, ${time}`;
  if (days === 1) return `Amanhã, ${time}`;
  const date = at.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  return `Em ${days} dias · ${date} · ${time}`;
}

/** O próximo agendamento em destaque: quando, o quê, quem vai e como chegar. */
export function NextAppointment({ consultations, onOpen, onSchedule }: { consultations: Consultation[]; onOpen: (c: Consultation) => void; onSchedule: () => void }) {
  const people = useContext(PeopleContext);
  const now = new Date();
  const next = consultations.filter(c => parseTimestamp(c.scheduled_at) >= now).sort((a, b) => parseTimestamp(a.scheduled_at).getTime() - parseTimestamp(b.scheduled_at).getTime())[0];

  if (!next) {
    return (
      <button type="button" onClick={onSchedule} className="w-full flex items-center gap-3 rounded-[24px] bg-surface shadow-soft p-4 text-left">
        <span className="w-10 h-10 rounded-2xl bg-verde-soft text-verde flex items-center justify-center shrink-0">
          <CalendarPlus className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-ink">Nada agendado por enquanto</span>
          <span className="block text-xs text-ink-mute">Agendem a próxima consulta, exame ou ultrassom.</span>
        </span>
        <ArrowRight className="w-4 h-4 text-ink-mute shrink-0" />
      </button>
    );
  }

  const kind = kindInfo(kindOf(next));
  const at = parseTimestamp(next.scheduled_at);
  return (
    <section aria-label="Próximo compromisso" className="rounded-[28px] bg-verde-soft p-5 space-y-3">
      <button type="button" onClick={() => onOpen(next)} className="w-full text-left space-y-1" aria-label={`Próximo compromisso: ${appointmentTitle(next)}: ver detalhes`}>
        <span className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-extrabold uppercase tracking-wide text-verde-strong">Próximo compromisso</span>
          <ChevronRight className="w-4 h-4 text-verde-strong" />
        </span>
        <span className="block font-display text-[1.45rem] leading-tight text-ink">{whenText(at, now)}</span>
        <span className="block text-[15px] font-bold text-ink">
          {kind.emoji} {appointmentTitle(next)}
        </span>
        {next.professional_name && <span className="block text-sm text-ink-soft">{next.professional_name}</span>}
      </button>
      {next.attendees && (
        <p className="flex items-center gap-2 text-sm text-ink">
          <WhoAvatars who={next.attendees} />
          {next.attendees === 'casal' ? `Vão ${whoName(people, 'casal')}` : `${whoName(people, next.attendees)} vai`}
        </p>
      )}
      {next.location && <LocationLinks address={next.location} />}
    </section>
  );
}

/** Novidades da outra pessoa no Mural desde a última visita (ou o último registro dela, se não houver nada novo). */
export function PartnerNews({ entries, comments, mentions, photos, fallback, onMural, onOpenEntry }: {
  entries: JournalEntry[];
  comments: ThreadComment[];
  mentions: number;
  photos: Array<{ id: string; thumb: boolean; entryId: string }>;
  fallback?: JournalEntry;
  onMural: () => void;
  onOpenEntry: (id: string) => void;
}) {
  const people = useContext(PeopleContext);
  const partner = people.find(m => !m.me);
  const name = partner ? firstName(partner.name) : null;

  if (entries.length + comments.length === 0) {
    if (!fallback) return null;
    return (
      <button type="button" onClick={() => onOpenEntry(fallback.id)} className="w-full text-left rounded-[28px] bg-surface shadow-soft p-4 space-y-2.5">
        <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-rosa-strong">
          <Heart className="w-4 h-4 fill-current" /> Do diário · {name ?? (fallback.author_role === 'mae' ? 'da mãe' : 'do pai')}
        </span>
        {fallback.photos?.[0] && <img src={photoUrl(fallback.photos[0].id, fallback.photos[0].thumb)} alt="" loading="lazy" className="w-full max-h-56 rounded-2xl object-cover bg-surface-2" />}
        {fallback.body && <p className="font-display text-[1.1rem] leading-snug text-ink line-clamp-3">{fallback.body}</p>}
        <span className="block text-sm font-extrabold text-rosa-strong">Abrir e mandar um abraço</span>
      </button>
    );
  }

  const latest = entries[0];
  return (
    <section aria-label="Novidades no Mural" className="rounded-[28px] bg-surface shadow-soft p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar member={partner} role={partner?.role ?? 'pai'} className="w-10 h-10 text-sm" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.1rem] text-ink leading-tight">Novidades no Mural</h2>
          <p className="text-xs text-ink-mute">desde a sua última visita</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5 text-[13px] font-bold">
        {entries.length > 0 && (
          <li className="inline-flex items-center gap-1 rounded-full bg-rosa-soft text-rosa-strong px-3 py-1">
            <Heart className="w-3.5 h-3.5" /> {name ?? 'A outra pessoa'} postou {entries.length === 1 ? '1 registro' : `${entries.length} registros`}
          </li>
        )}
        {comments.length > 0 && (
          <li className="inline-flex items-center gap-1 rounded-full bg-surface-2 text-ink-soft px-3 py-1">
            <MessageCircle className="w-3.5 h-3.5" /> {comments.length === 1 ? '1 comentário' : `${comments.length} comentários`}
          </li>
        )}
        {mentions > 0 && (
          <li className="inline-flex items-center gap-1 rounded-full bg-brand text-on-accent px-3 py-1">
            <AtSign className="w-3.5 h-3.5" /> marcou você{mentions > 1 ? ` ${mentions} vezes` : ''}
          </li>
        )}
      </ul>
      {photos.length > 0 ? (
        <div className="grid grid-cols-4 gap-1.5">
          {photos.map(p => (
            <button key={p.id} type="button" onClick={() => onOpenEntry(p.entryId)} aria-label="Abrir o registro da foto" className="aspect-square overflow-hidden rounded-xl bg-surface-2">
              <img src={photoUrl(p.id, p.thumb)} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        latest?.body && <p className="font-display text-[1.05rem] leading-snug text-ink line-clamp-2">{latest.body}</p>
      )}
      <button type="button" onClick={onMural} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-rosa-strong">
        Ver no Mural <ArrowRight className="w-4 h-4" />
      </button>
    </section>
  );
}

const PRIORITY: Record<string, number> = { Alta: 0, Média: 1, Baixa: 2 };

/** As tarefas de cada um: quantas faltam por pessoa e as suas próximas, para concluir ali mesmo. */
export function SharedTasks({ tasks, role, onToggle, onOpenTask, onAll }: { tasks: PartnerTask[]; role: Author; onToggle: (t: PartnerTask) => void; onOpenTask: (t: PartnerTask) => void; onAll: () => void }) {
  const people = useContext(PeopleContext);
  if (tasks.length === 0) return null;
  const open = tasks.filter(t => !t.is_completed);
  const late = open.filter(t => isOverdue(t.due_date)).length;
  const count = (who: PartnerTask['assigned_to']) => open.filter(t => t.assigned_to === who).length;
  const mine = open
    .filter(t => t.assigned_to === role || t.assigned_to === 'casal')
    .sort((a, b) => Number(isOverdue(b.due_date)) - Number(isOverdue(a.due_date)) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || PRIORITY[a.priority] - PRIORITY[b.priority])
    .slice(0, 3);

  return (
    <section aria-labelledby="tarefas-casal" className="rounded-[28px] bg-surface shadow-soft p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="tarefas-casal" className="text-[1.2rem] text-ink">Tarefas de vocês</h2>
        <button type="button" onClick={onAll} className="text-sm font-bold text-brand-strong">
          Ver todas
        </button>
      </div>
      {open.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-ink">
          <CheckCircle2 className="w-5 h-5 text-ok" /> Tudo em dia. Bom trabalho em equipe!
        </p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2" aria-label="Quantas faltam para cada um">
            {(['mae', 'pai', 'casal'] as const).map(who => (
              <li key={who} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 pl-1 pr-3 py-1 text-[13px] font-bold text-ink">
                <WhoAvatars who={who} className="w-6 h-6 text-[10px]" />
                {who === 'casal' ? 'Os dois' : whoName(people, who)} · <span className="tabular">{count(who)}</span>
              </li>
            ))}
            {late > 0 && (
              <li className="inline-flex items-center gap-1 rounded-full bg-alert-soft text-alert px-3 py-1 text-[13px] font-bold">
                <Clock className="w-3.5 h-3.5" /> {late === 1 ? '1 atrasada' : `${late} atrasadas`}
              </li>
            )}
          </ul>
          {mine.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-ink-mute">Suas próximas</p>
              <ul className="divide-y divide-line">
                {mine.map(t => {
                  const overdue = isOverdue(t.due_date);
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-2">
                      <button type="button" onClick={() => onToggle(t)} aria-label={`Concluir "${t.task_title}"`} className="w-7 h-7 shrink-0 rounded-full border-2 border-ink-mute hover:border-brand hover:bg-brand-soft flex items-center justify-center group">
                        <Check className="w-4 h-4 text-brand opacity-0 group-hover:opacity-100" />
                      </button>
                      <button type="button" onClick={() => onOpenTask(t)} className="flex-1 min-w-0 text-left">
                        <span className="block font-semibold text-ink truncate">{t.task_title}</span>
                        <span className={`block text-xs ${overdue ? 'text-alert font-bold' : 'text-ink-mute'}`}>
                          {t.assigned_to === 'casal' ? 'dos dois' : 'sua'}
                          {t.due_date && ` · ${overdue ? 'atrasada desde' : 'até'} ${formatBR(t.due_date)}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** A gestação inteira numa barra (com os trimestres) e o próximo marco. */
export function MilestoneBar({ dumDate, todayIso }: { dumDate: string; todayIso: string }) {
  const elapsed = daysBetween(parseLocalDate(dumDate), parseLocalDate(todayIso));
  const pct = Math.min(100, Math.max(0, (elapsed / 280) * 100));
  const next = nextMilestone(dumDate, todayIso);
  return (
    <div className="space-y-2.5">
      <div className="relative h-2.5 rounded-full bg-surface-2" role="progressbar" aria-label="Quanto da gestação já passou" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rosa to-lilas" style={{ width: `${pct}%` }} />
        {/* Começo do 2º e do 3º trimestre. */}
        {[13, 28].map(w => (
          <span key={w} className="absolute -top-0.5 h-3.5 w-0.5 rounded-full bg-surface" style={{ left: `${(w * 7 * 100) / 280}%` }} aria-hidden />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-ink-mute" aria-hidden>
        <span>1º tri</span>
        <span>2º tri</span>
        <span>3º tri</span>
      </div>
      {next && (
        <p className="flex items-start gap-2 rounded-2xl bg-surface-2/70 px-3.5 py-2.5 text-sm text-ink">
          <Flag className="w-4 h-4 mt-0.5 text-rosa shrink-0" />
          <span>
            <strong>{next.days === 0 ? 'Hoje' : `Próximo marco, ${inDays(next.days)}`}:</strong> {next.milestone.title}.{' '}
            <span className="text-ink-soft">{next.milestone.text}</span>
          </span>
        </p>
      )}
    </div>
  );
}
