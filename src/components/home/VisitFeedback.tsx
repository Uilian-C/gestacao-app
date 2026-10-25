import { useState } from 'react';
import { HelpCircle, Smile, Sparkles } from 'lucide-react';
import type { Consultation } from '../../types';
import { appointmentTitle } from '../../lib/appointments';
import { formatBR, localDay, toISODate } from '../../lib/dates';

// "Como foi a consulta?": algumas horas depois, um toque para contar. Fecha o
// ciclo do cuidado e leva o pico da consulta (ver o bebê) para dentro do app.

export type VisitStatus = 'bem' | 'duvida' | 'novidade';

export default function VisitFeedback({ visit, questions, onAnswer }: { visit: Consultation; questions: number; onAnswer: (status: VisitStatus) => void }) {
  const ultra = visit.kind === 'ultrassom';
  const [busy, setBusy] = useState(false);
  const pick = (s: VisitStatus) => {
    if (busy) return;
    setBusy(true);
    onAnswer(s);
  };
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-ink-soft">
        {appointmentTitle(visit)} · {formatBR(toISODate(localDay(visit.scheduled_at)))}
      </p>
      <Option disabled={busy} onPick={() => pick('bem')} icon={<Smile />} title="Tudo bem" text="Que bom. Fica guardado na jornada de vocês." />
      <Option disabled={busy} onPick={() => pick('duvida')} icon={<HelpCircle />} title="Ficou uma dúvida" text={questions ? `Anotem para a próxima, e as respostas das ${questions} que vocês levaram.` : 'Anotem para levar na próxima consulta.'} />
      <Option disabled={busy} onPick={() => pick('novidade')} icon={<Sparkles />} title="Teve novidade" text={ultra ? 'Guardem como foi ver o bebê, com a foto do ultrassom.' : 'Guardem no diário, para o livro de vocês.'} />
    </div>
  );
}

function Option({ icon, title, text, disabled, onPick }: { icon: React.ReactNode; title: string; text: string; disabled: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} disabled={disabled} className="w-full flex items-center gap-3 rounded-[20px] bg-surface-2/70 px-4 py-3 text-left transition active:scale-[0.99]">
      <span className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center shrink-0 text-verde-strong [&_svg]:w-5 [&_svg]:h-5">{icon}</span>
      <span className="min-w-0">
        <span className="block font-display text-[1.05rem] leading-tight text-ink">{title}</span>
        <span className="block mt-0.5 text-[13px] text-ink-soft">{text}</span>
      </span>
    </button>
  );
}
