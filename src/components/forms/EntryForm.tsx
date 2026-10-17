import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, ImagePlus, Loader2, Lock, Users, X } from 'lucide-react';
import { photoUrl } from '../../api';
import { WORK_RIGHTS, WORK_RIGHTS_SOURCE, WORK_TERMS } from '../../content/workRights';
import type { Folder, JournalEntry } from '../../hooks/useGestationData';
import { formatBR, parseLocalDate, toISODate } from '../../lib/dates';
import { FileProblem, preparePhoto, type PreparedPhoto } from '../../lib/examFiles';
import { FOLDER, FOLDERS, TONE, weekOn } from '../../lib/folders';
import Guide from '../Guide';
import { inputClass } from '../styles';
import { Button, Segmented } from '../ui';

// Registro do fichário: a pasta, o texto, as fotos (até 4), quem vê e um
// lembrete opcional. Com `initial`, abre preenchido para editar.

export interface NewEntry {
  date: string;
  body: string;
  visibility: 'private' | 'shared';
  remindOn: string | null;
  folder: Folder;
  /** Fotos novas, já reduzidas no celular. */
  photos: PreparedPhoto[];
  /** Fotos que já estavam no registro e devem sair. */
  removePhotos: string[];
}

const MAX_PHOTOS = 4;

const addDays = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

export function EntryForm({ busy, available, photosAvailable, dumDate, folder: startFolder = 'momento', idea, initial, onSave }: {
  busy: boolean;
  available: boolean;
  /** A migração 012 já rodou (pastas e fotos). */
  photosAvailable: boolean;
  dumDate: string;
  folder?: Folder;
  /** Texto para começar (vindo de uma ideia da pasta). */
  idea?: string;
  initial?: JournalEntry;
  onSave: (e: NewEntry) => Promise<boolean>;
}) {
  const today = toISODate(new Date());
  const [folder, setFolder] = useState<Folder>(initial?.folder ?? (photosAvailable ? startFolder : 'momento'));
  const [body, setBody] = useState(initial?.body ?? idea ?? '');
  const [date, setDate] = useState(initial?.entry_date ?? today);
  const [visibility, setVisibility] = useState<'private' | 'shared'>(initial?.visibility ?? 'shared');
  const [remindOn, setRemindOn] = useState<string | null>(initial?.remind_on ?? null);
  const [showDate, setShowDate] = useState(false);
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  // A pasta escolhida aparece inteira na fileira (sem scrollIntoView, que mexe na página toda).
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (strip.current && el) strip.current.scrollTo({ left: Math.max(0, el.offsetLeft - 16), behavior: 'smooth' });
  }, [folder]);
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach(u => URL.revokeObjectURL(u)), []);

  const info = FOLDER[folder];
  const tone = TONE[info.tone];
  const kept = (initial?.photos ?? []).filter(p => !removed.includes(p.id));
  const room = MAX_PHOTOS - kept.length - photos.length;
  const belly = folder === 'barriga';
  const hasPhoto = kept.length + photos.length > 0;
  const canSave = available && !busy && !preparing && (body.trim() !== '' || (belly && hasPhoto));
  const chip = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition';

  const addFiles = async (files: File[]) => {
    setProblem(null);
    if (files.length > room) setProblem(`Cada registro guarda até ${MAX_PHOTOS} fotos.`);
    setPreparing(true);
    try {
      for (const file of files.slice(0, Math.max(0, room))) {
        const p = await preparePhoto(file);
        previews.current.push(p.preview);
        setPhotos(list => [...list, p]);
      }
    } catch (err) {
      setProblem(err instanceof FileProblem ? err.message : 'Não foi possível abrir a foto. Tente outra.');
    } finally {
      setPreparing(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const ok = await onSave({ date, body: body.trim(), visibility, remindOn, folder, photos, removePhotos: removed });
    if (ok && !initial) {
      setBody('');
      setPhotos([]);
      setRemindOn(null);
    }
  };

  const photoStrip = (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" aria-label="Fotos do registro">
        {kept.map(p => (
          <Thumb key={p.id} src={photoUrl(p.id, p.thumb)} onRemove={() => setRemoved(r => [...r, p.id])} />
        ))}
        {photos.map((p, i) => (
          <Thumb key={p.preview} src={p.preview} onRemove={() => setPhotos(list => list.filter((_, j) => j !== i))} />
        ))}
        {room > 0 && (
          <button
            type="button"
            onClick={() => picker.current?.click()}
            disabled={preparing || busy}
            className={`${belly && !hasPhoto ? 'w-full h-36 flex-col text-base' : 'w-20 h-20 flex-col text-[11px]'} rounded-2xl border-2 border-dashed border-line ${tone.text} font-bold inline-flex items-center justify-center gap-1 hover:bg-surface-2 transition disabled:opacity-60`}
          >
            {preparing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className={belly && !hasPhoto ? 'w-8 h-8' : 'w-5 h-5'} />}
            {belly && !hasPhoto ? 'Tirar ou escolher a foto' : 'Foto'}
          </button>
        )}
      </div>
      <input
        ref={picker}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label="Escolher fotos"
        onChange={e => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) void addFiles(files);
        }}
      />
      {problem && <p className="text-sm font-semibold text-alert" role="alert">{problem}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {!available && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2">Para guardar no diário, rode a migração 008 no Neon.</p>}

      {photosAvailable ? (
        <div ref={strip} className="relative -mx-1 px-1 flex gap-1.5 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="Pasta">
          {FOLDERS.map(f => {
            const on = f.id === folder;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setFolder(f.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold transition ${on ? TONE[f.tone].solid : `${TONE[f.tone].soft} ${TONE[f.tone].text}`}`}
              >
                <f.Icon className="w-3.5 h-3.5" /> {f.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-ink-mute">Pastas e fotos do diário aparecem depois da migração 012 no Neon.</p>
      )}

      {belly && photosAvailable && (
        <>
          <p className={`text-sm font-bold ${tone.text}`}>Semana {weekOn(dumDate, date)} · {date === today ? 'hoje' : formatBR(date)}</p>
          {photoStrip}
        </>
      )}

      <div className="space-y-2">
        <textarea
          aria-label={belly ? 'Legenda' : 'O que aconteceu?'}
          rows={belly ? 2 : folder === 'carta' ? 6 : 4}
          className={`${inputClass} resize-none ${folder === 'carta' ? 'font-display text-[1.05rem] leading-relaxed' : ''}`}
          placeholder={info.placeholder}
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={4000}
        />
        <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Ideias">
          {info.ideas.map(i => (
            <button key={i} type="button" onClick={() => setBody(b => (b.trim() ? b : i))} className="shrink-0 rounded-full px-3 py-1 text-[13px] bg-surface-2 text-ink-soft hover:text-ink">
              {i}
            </button>
          ))}
        </div>
      </div>

      {!belly && photosAvailable && photoStrip}

      <div className="flex flex-wrap items-center gap-1.5">
        <Segmented
          label="Quem vê"
          size="sm"
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'shared', label: <span className="flex items-center gap-1"><Users className="w-3 h-3" />Nós dois</span> },
            { value: 'private', label: <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Só eu</span> },
          ]}
        />
        {!initial && (
          <button type="button" onClick={() => setShowDate(v => !v)} className={`${chip} ${date !== today ? 'bg-brand-soft text-brand-strong' : 'bg-surface-2 text-ink-soft'}`}>
            {date === today ? 'Hoje' : formatBR(date)} <ChevronDown className="w-3 h-3" />
          </button>
        )}
        <button type="button" onClick={() => setRemindOn(r => (r ? null : addDays(today, 15)))} className={`${chip} ${remindOn ? 'bg-brand-soft text-brand-strong' : 'text-ink-mute hover:text-ink'}`}>
          <Bell className="w-3 h-3" /> {remindOn ? `Lembrar em ${formatBR(remindOn)}` : 'Lembrar'}
        </button>
      </div>
      {showDate && <input type="date" aria-label="Data do registro" max={today} className={inputClass} value={date} onChange={e => setDate(e.target.value || today)} />}
      {remindOn && (
        <div className="flex flex-wrap items-center gap-1.5">
          {[7, 15, 30].map(n => (
            <button key={n} type="button" onClick={() => setRemindOn(addDays(today, n))} className={`${chip} ${remindOn === addDays(today, n) ? 'bg-brand text-on-accent' : 'bg-surface-2 text-ink-soft'}`}>
              em {n} dias
            </button>
          ))}
          <input type="date" aria-label="Data do lembrete" min={today} className={`${inputClass} !py-1.5 !w-auto text-sm`} value={remindOn} onChange={e => setRemindOn(e.target.value || null)} />
        </div>
      )}
      <p className="text-xs text-ink-mute -mt-1">
        {visibility === 'private' ? 'Só você vai ver, nem a outra pessoa do espaço.' : 'Vocês dois vão ver.'}
        {remindOn && ' O lembrete aparece no Início e na Agenda.'}
      </p>

      {WORK_TERMS.test(body) && (
        <Guide title="Seus direitos no trabalho" source={WORK_RIGHTS_SOURCE}>
          <ul className="space-y-1">
            {WORK_RIGHTS.map(r => (
              <li key={r} className="flex gap-2">
                <span className="text-brand">•</span>
                {r}
              </li>
            ))}
          </ul>
        </Guide>
      )}

      <Button type="submit" disabled={!canSave} className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <info.Icon />} {initial ? 'Salvar alterações' : info.save}
      </Button>
    </form>
  );
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <span className="relative w-20 h-20 shrink-0">
      <img src={src} alt="" className="w-20 h-20 rounded-2xl object-cover bg-surface-2" />
      <button type="button" onClick={onRemove} aria-label="Tirar esta foto" className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-ink text-surface flex items-center justify-center shadow-soft">
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
