import { useState } from 'react';
import { Loader2, Moon } from 'lucide-react';
import type { Mood } from '../../hooks/useGestationData';
import type { Author } from '../../types';
import { MOODS, MOOD_COLOR, moodLabel } from '../../lib/moods';
import MoodFace from '../MoodFace';
import Sheet from '../Sheet';
import { Button } from '../ui';

// "O Tumtum de hoje": fechar o dia em um minuto. O humor (já vem marcado, se
// a pessoa contou de manhã) e uma frase; os dois viram a página do dia no
// livro, e a outra pessoa recebe "Ana fechou o dia: '…'. E o seu?".

export default function DayClose({
  role,
  mood: startMood,
  partnerName,
  partner,
  busy,
  onSave,
  onClose,
}: {
  role: Author;
  mood: Mood | null;
  partnerName: string | null;
  partner: { mood: Mood | null; phrase: string | null } | null;
  busy: boolean;
  onSave: (mood: Mood | null, body: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [mood, setMood] = useState<Mood | null>(startMood);
  const [body, setBody] = useState('');
  const ready = !!mood || body.trim().length > 0;
  const who = partnerName ?? (role === 'pai' ? 'Ela' : 'Ele');
  return (
    <Sheet title="O Tumtum de hoje" subtitle="Um minuto para fechar o dia. Vira uma página do livro de vocês." icon={<Moon />} onClose={onClose}>
      <div className="space-y-5">
        {partner && (
          <p className="rounded-2xl bg-lilas-soft/70 px-4 py-3 text-[14px] leading-snug text-ink-soft">
            <span className="font-extrabold text-lilas-strong">{who} já fechou o dia</span>
            {partner.mood && <span> · {moodLabel(partner.mood, role === 'pai' ? 'mae' : 'pai').toLowerCase()}</span>}
            {partner.phrase && <span className="block font-display text-[1rem] text-ink">“{partner.phrase.slice(0, 140)}”</span>}
          </p>
        )}
        <fieldset>
          <legend className="text-[15px] font-bold text-ink mb-2">Como foi o seu dia?</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {MOODS.map(m => {
              const on = mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setMood(on ? null : m.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-bold transition active:scale-95 ${on ? `bg-surface-2 ring-2 ring-current ${MOOD_COLOR[m.id].text}` : 'text-ink-soft hover:bg-surface-2'}`}
                >
                  <MoodFace path={m.face} />
                  {m[role === 'pai' ? 'pai' : 'mae']}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="block">
          <span className="block text-[15px] font-bold text-ink mb-2">Uma frase sobre hoje</span>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, 280))}
            rows={3}
            placeholder="O que fica deste dia? Um chute, um desejo, um medo, uma risada…"
            className="w-full rounded-2xl bg-surface-2 px-4 py-3 text-[15px] text-ink placeholder:text-ink-mute outline-none focus:ring-2 focus:ring-brand/40 resize-none"
          />
          <span className="block text-[12px] text-ink-mute mt-1">{partnerName ? `${partnerName} vai ver e receber um aviso.` : 'Fica no Dia a dia e no livro.'}</span>
        </label>
        <Button onClick={() => void onSave(mood, body.trim()).then(ok => ok && onClose())} disabled={!ready || busy} className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : <Moon />} Fechar o dia
        </Button>
      </div>
    </Sheet>
  );
}
