import { useContext } from 'react';
import { CalendarDays, Camera, ChevronRight, HeartPulse, Sparkles, Stethoscope } from 'lucide-react';
import { firstName, memberWithRole, PeopleContext } from '../../lib/people';
import { moodLabel } from '../../lib/moods';
import { parseLocalDate } from '../../lib/dates';
import { summaryHeadline, type WeekSummary } from '../../lib/weekSummary';
import Avatar from '../Avatar';

// Início, no domingo e na segunda: o resumo da semana do casal (abre pelo
// cartão do carrossel "Nesta semana").

const ddmm = (iso: string) => parseLocalDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function WeekSummaryCard({ summary, week, onMood, onMural }: { summary: WeekSummary; week: number; onMood: () => void; onMural: () => void }) {
  const people = useContext(PeopleContext);
  const nameOf = (role: 'mae' | 'pai') => {
    const m = memberWithRole(people, role);
    return m ? firstName(m.name) : role === 'mae' ? 'Mãe' : 'Pai';
  };
  const next = [summary.next.appointments && `${summary.next.appointments} ${summary.next.appointments === 1 ? 'compromisso' : 'compromissos'}`, summary.next.tasks && `${summary.next.tasks} ${summary.next.tasks === 1 ? 'tarefa' : 'tarefas'} com prazo`].filter(Boolean);

  return (
    <section aria-label="Resumo da semana" className="relative rounded-[28px] bg-gradient-to-br from-rosa-soft to-azul-soft p-5 space-y-3.5">
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">
          <Sparkles className="w-3.5 h-3.5" /> Resumo da semana · {ddmm(summary.from)} a {ddmm(summary.to)}
        </p>
        <h2 className="font-display text-[1.3rem] leading-snug text-ink mt-1">{summaryHeadline(summary)}</h2>
      </div>

      <button type="button" onClick={onMood} className="w-full rounded-2xl bg-surface/80 p-3 space-y-2 text-left">
        <span className="flex items-center justify-between text-xs font-bold text-ink-soft">
          Como vocês estiveram <ChevronRight className="w-4 h-4 text-ink-mute" />
        </span>
        {summary.people.map(p => (
          <span key={p.role} className="flex items-center gap-2.5 text-sm">
            <Avatar member={memberWithRole(people, p.role)} role={p.role} className="w-7 h-7 text-[11px]" />
            <span className="flex-1 min-w-0 text-ink">
              <strong>{nameOf(p.role)}</strong> marcou {p.days} de 7 dias{p.top ? <span className="text-ink-soft"> · mais {moodLabel(p.top, p.role).toLowerCase()}</span> : null}
            </span>
            <span className="flex gap-0.5" aria-hidden>
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className={`w-1.5 h-4 rounded-full ${i < p.days ? (p.role === 'pai' ? 'bg-azul' : 'bg-rosa') : 'bg-surface-2'}`} />
              ))}
            </span>
          </span>
        ))}
      </button>

      <ul className="grid grid-cols-3 gap-2 text-center">
        <Stat icon={<Camera />} value={summary.posts} label={summary.posts === 1 ? 'post no Mural' : 'posts no Mural'} onClick={onMural} />
        <Stat icon={<Stethoscope />} value={summary.appointments} label={summary.appointments === 1 ? 'compromisso' : 'compromissos'} />
        <Stat icon={<HeartPulse />} value={summary.symptoms} label={summary.symptoms === 1 ? 'sintoma anotado' : 'sintomas anotados'} />
      </ul>

      <p className="flex items-center gap-2 text-sm text-ink">
        <CalendarDays className="w-4 h-4 text-brand shrink-0" />
        {next.length ? `Nos próximos 7 dias da semana ${week}: ${next.join(' e ')}.` : `Semana ${week} sem compromissos marcados por enquanto.`}
      </p>
    </section>
  );
}

function Stat({ icon, value, label, onClick }: { icon: React.ReactNode; value: number; label: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="flex justify-center text-ink-mute [&_svg]:w-4 [&_svg]:h-4">{icon}</span>
      <span className="block font-display text-[1.4rem] leading-none text-ink tabular mt-1">{value}</span>
      <span className="block text-[11px] text-ink-soft leading-tight mt-0.5">{label}</span>
    </>
  );
  return (
    <li className="rounded-2xl bg-surface/80">
      {onClick ? (
        <button type="button" onClick={onClick} className="w-full px-2 py-2.5">
          {inner}
        </button>
      ) : (
        <div className="px-2 py-2.5">{inner}</div>
      )}
    </li>
  );
}
