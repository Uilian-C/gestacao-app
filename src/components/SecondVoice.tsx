import { useContext, useState } from 'react';
import { PenLine } from 'lucide-react';
import type { JournalEntry } from '../hooks/useGestationData';
import { PeopleContext, authorOf, firstName } from '../lib/people';
import Avatar from './Avatar';
import { inputClass } from './styles';
import { Button } from './ui';

// As páginas a duas vozes: quando um dos dois guarda um momento, o outro
// completa com o que sentiu. A segunda voz fica no mesmo registro, logo
// abaixo da primeira, com a cor e a foto de quem escreveu.

/** A segunda voz, só para ler (Mural e livro). */
export function VoiceQuote({ entry, compact = false }: { entry: JournalEntry; compact?: boolean }) {
  const people = useContext(PeopleContext);
  if (!entry.voice_body || !entry.voice_role) return null;
  const who = authorOf(people, !!entry.voice_mine, entry.voice_role);
  const name = who ? firstName(who.name) : entry.voice_role === 'mae' ? 'Mãe' : 'Pai';
  const tone = entry.voice_role === 'mae' ? 'border-rosa' : 'border-azul';
  return (
    <figure className={`border-l-[3px] ${tone} pl-3 ${compact ? 'space-y-0.5' : 'space-y-1'}`}>
      <figcaption className="flex items-center gap-1.5 text-[12px] font-extrabold text-ink-soft">
        <Avatar member={who} role={entry.voice_role} className="w-5 h-5 text-[9px]" /> {entry.voice_mine ? 'Você' : name} completou
      </figcaption>
      <blockquote className={`text-ink whitespace-pre-line ${compact ? 'text-[14.5px] line-clamp-4' : 'font-display text-[1.12rem] leading-snug'}`}>{entry.voice_body}</blockquote>
    </figure>
  );
}

/**
 * Nos detalhes: a segunda voz e, para quem não escreveu, o convite para
 * completar (já aberto quando ainda não há nada).
 */
export function SecondVoice({ entry, onSave }: { entry: JournalEntry; onSave: (body: string) => Promise<boolean> }) {
  const people = useContext(PeopleContext);
  const canWrite = !entry.mine && entry.visibility !== 'private' && (!entry.voice_body || !!entry.voice_mine);
  const [editing, setEditing] = useState(canWrite && !entry.voice_body);
  const [text, setText] = useState(entry.voice_mine ? (entry.voice_body ?? '') : '');
  const [saving, setSaving] = useState(false);
  if (!canWrite) return entry.voice_body ? <div className="mt-4"><VoiceQuote entry={entry} /></div> : null;
  const author = authorOf(people, false, entry.author_role);
  const save = async () => {
    setSaving(true);
    if (await onSave(text.trim())) setEditing(false);
    setSaving(false);
  };
  if (!editing) {
    return (
      <div className="mt-4 space-y-2">
        <VoiceQuote entry={entry} />
        <button type="button" onClick={() => setEditing(true)} className="text-[13px] font-bold text-ink-mute hover:text-ink">
          Editar o que você escreveu
        </button>
      </div>
    );
  }
  return (
    <section aria-label="A sua voz" className="mt-4 rounded-2xl bg-surface-2/70 p-3.5 space-y-2.5">
      <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
        <PenLine className="w-4 h-4 text-rosa-strong" />
        {entry.folder === 'carta' ? 'Escreva a sua parte da carta' : author ? `${firstName(author.name)} guardou este momento. E você, o que sentiu?` : 'E você, o que sentiu neste momento?'}
      </p>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={2000} aria-label="O que você sentiu" placeholder="Do seu jeito, com as suas palavras…" className={inputClass} />
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || (!text.trim() && !entry.voice_body)}>
          {text.trim() ? 'Guardar a minha voz' : 'Tirar a minha voz'}
        </Button>
        {entry.voice_body && (
          <Button tone="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
      </div>
    </section>
  );
}
