import { Bell, BookHeart, ChevronRight, HeartPulse, Images, LayoutList, Lock, Plus } from 'lucide-react';
import { photoUrl, type FamilyMember } from '../../api';
import type { Folder, JournalEntry, Reaction, ThreadComment } from '../../hooks/useGestationData';
import { formatBR, toISODate } from '../../lib/dates';
import type { DetailTarget } from '../../lib/details';
import { FOLDER, FOLDERS, TONE, bellyWeeks, byMonth, shortDate, weekOn } from '../../lib/folders';
import type { Author, DiaryView } from '../../types';
import AuthorBadge from '../AuthorBadge';
import { MentionText } from '../Mentions';
import { SocialCount, type OnReact } from '../Social';
import Mural from './Mural';
import { Card } from '../ui';

// O Diário é o fichário afetivo da gestação: momentos, dia a dia, ideias,
// cartas para o bebê e a barriga semana a semana. Abre no Mural (tudo junto,
// como uma rede social de vocês dois); o Fichário guarda por pasta. Sintomas, peso e pressão
// ficam em Cuidados → Saúde, junto do que a equipe médica acompanha.

interface Props {
  view: DiaryView;
  onView: (v: DiaryView) => void;
  journal: JournalEntry[];
  journalAvailable: boolean;
  /** A migração 012 já rodou: pastas e fotos. */
  photosAvailable: boolean;
  dumDate: string;
  reactions: Reaction[];
  threads: ThreadComment[];
  members: FamilyMember[];
  role: Author;
  /** A migração 011 já rodou: abraços e conversa. */
  socialAvailable: boolean;
  onReact: OnReact;
  onComment: (entryId: string, body: string) => Promise<boolean>;
  /** Abre os detalhes (com reações, conversa, editar e excluir). */
  onOpen: (target: DetailTarget) => void;
  /** Abre o formulário já na pasta (e com uma ideia para começar). */
  onWrite: (folder: Folder, idea?: string) => void;
  /** Leva para Cuidados → Saúde. */
  onOpenHealth: () => void;
}

export default function DiaryTab(props: Props) {
  const entries = props.journal;
  const count = (f: Folder) => entries.filter(e => e.folder === f).length;
  const social = (e: JournalEntry) => ({
    reactions: props.reactions.filter(r => r.target_type === 'entry' && r.target_id === e.id).length,
    comments: props.threads.filter(c => c.target_type === 'entry' && c.target_id === e.id).length,
  });

  return (
    <div className="space-y-5">
      <FolderStrip value={props.view} onChange={props.onView} count={count} total={entries.length} folders={props.photosAvailable} />
      {props.view === 'mural' ? (
        <Mural
          entries={entries}
          members={props.members}
          role={props.role}
          dumDate={props.dumDate}
          reactions={props.reactions}
          threads={props.threads}
          social={props.socialAvailable}
          journalAvailable={props.journalAvailable}
          onReact={props.onReact}
          onComment={props.onComment}
          onOpen={id => props.onOpen({ kind: 'entry', id })}
          onWrite={props.onWrite}
        />
      ) : props.view === 'tudo' ? (
        <Cover {...props} count={count} social={social} />
      ) : (
        <FolderPage {...props} folder={props.view} entries={entries.filter(e => e.folder === props.view)} social={social} />
      )}
    </div>
  );
}

/** As abas do diário: o Mural, o Fichário e uma por pasta, deslizando para o lado no celular. */
function FolderStrip({ value, onChange, count, total, folders }: { value: DiaryView; onChange: (v: DiaryView) => void; count: (f: Folder) => number; total: number; folders: boolean }) {
  const tab = 'shrink-0 inline-flex items-center gap-1.5 rounded-full pl-3 pr-3.5 py-2 text-[13px] font-bold transition';
  return (
    <nav className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar" aria-label="Pastas do diário">
      <button type="button" onClick={() => onChange('mural')} aria-current={value === 'mural' ? 'page' : undefined} className={`${tab} ${value === 'mural' ? 'bg-ink text-surface' : 'bg-surface text-ink-soft shadow-soft'}`}>
        <LayoutList className="w-4 h-4" /> Mural
      </button>
      <button type="button" onClick={() => onChange('tudo')} aria-current={value === 'tudo' ? 'page' : undefined} className={`${tab} ${value === 'tudo' ? 'bg-ink text-surface' : 'bg-surface text-ink-soft shadow-soft'}`}>
        <BookHeart className="w-4 h-4" /> Fichário <span className="tabular opacity-70">{total}</span>
      </button>
      {folders && FOLDERS.map(f => {
        const on = value === f.id;
        const t = TONE[f.tone];
        return (
          <button key={f.id} type="button" onClick={() => onChange(f.id)} aria-current={on ? 'page' : undefined} className={`${tab} ${on ? t.solid : `${t.soft} ${t.text}`}`}>
            <f.Icon className="w-4 h-4" /> {f.label}
            {count(f.id) > 0 && <span className="tabular opacity-70">{count(f.id)}</span>}
          </button>
        );
      })}
    </nav>
  );
}

type SocialOf = (e: JournalEntry) => { reactions: number; comments: number };

/** Capa do fichário: as pastas, os últimos registros e o caminho para a saúde. */
function Cover({ journal, dumDate, photosAvailable, journalAvailable, onView, onOpen, onWrite, onOpenHealth, count, social }: Props & { count: (f: Folder) => number; social: SocialOf }) {
  const recent = journal.slice(0, 5);
  const photos = journal.filter(e => e.photos.length > 0).length;
  const belly = journal.filter(e => e.folder === 'barriga' && e.photos.length > 0).slice(0, 4);

  return (
    <>
      <section className="rounded-[28px] p-5 bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-rosa-strong">Fichário de vocês</p>
        <h2 className="font-display text-[1.6rem] leading-tight text-ink mt-1">O que vocês querem lembrar</h2>
        <p className="text-sm text-ink-soft mt-1">
          {journal.length === 0
            ? 'Momentos, o dia a dia, ideias, cartas para o bebê e a barriga crescendo, cada coisa na sua pasta.'
            : `${journal.length} ${journal.length === 1 ? 'registro' : 'registros'}${photos ? ` · ${photos} com fotos` : ''}`}
        </p>
        {!journalAvailable && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2 mt-3">Para guardar no diário, rode a migração 008 no Neon.</p>}
      </section>

      {photosAvailable && (
        <div className="grid grid-cols-2 gap-3">
          {FOLDERS.map(f => {
            const t = TONE[f.tone];
            const last = journal.find(e => e.folder === f.id);
            const wide = f.id === 'barriga';
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onView(f.id)}
                aria-label={`Abrir a pasta ${f.title}`}
                className={`${wide ? 'col-span-2' : ''} relative overflow-hidden text-left rounded-3xl p-4 ${t.soft} transition hover:brightness-[0.98] active:scale-[0.99]`}
              >
                <span className={`absolute top-0 left-5 h-1.5 w-12 rounded-b-full ${t.solid}`} aria-hidden />
                <div className="flex items-center gap-2">
                  <span className={`w-9 h-9 rounded-2xl flex items-center justify-center ${t.solid}`}>
                    <f.Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-extrabold text-ink leading-tight">{f.label}</span>
                    <span className={`block text-xs font-bold ${t.text}`}>{count(f.id) ? `${count(f.id)} ${count(f.id) === 1 ? 'registro' : 'registros'}` : 'Vazia'}</span>
                  </span>
                </div>
                {wide && belly.length > 0 ? (
                  <div className="mt-3 flex gap-2">
                    {belly.map(e => (
                      <img key={e.id} src={photoUrl(e.photos[0].id, e.photos[0].thumb)} alt={`Barriga na semana ${weekOn(dumDate, e.entry_date)}`} className="w-16 h-20 rounded-xl object-cover bg-surface" loading="lazy" />
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-ink-soft mt-2 line-clamp-2 min-h-[2.5em]">{last ? last.body || f.hint : f.hint}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <Card>
          <h2 className="text-sm font-extrabold text-ink-soft mb-3">Últimos registros</h2>
          <div className="space-y-2.5">
            {recent.map(e => (
              <EntryCard key={e.id} entry={e} dumDate={dumDate} showFolder={photosAvailable} social={social(e)} onOpen={() => onOpen({ kind: 'entry', id: e.id })} />
            ))}
          </div>
        </Card>
      )}

      {journal.length === 0 && journalAvailable && (
        <button type="button" onClick={() => onWrite('momento')} className="w-full rounded-3xl border-2 border-dashed border-line p-5 text-left hover:bg-surface transition">
          <span className="flex items-center gap-2 font-extrabold text-rosa-strong">
            <Plus className="w-5 h-5" /> Guardar o primeiro registro
          </span>
          <span className="block text-sm text-ink-soft mt-1">Pode ser simples: “hoje ouvimos o coração”.</span>
        </button>
      )}

      <button type="button" onClick={onOpenHealth} className="w-full flex items-center gap-3 rounded-3xl bg-surface p-4 text-left shadow-soft hover:brightness-[0.99]">
        <span className="w-9 h-9 rounded-2xl bg-verde-soft text-verde flex items-center justify-center shrink-0">
          <HeartPulse className="w-[18px] h-[18px]" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-ink">Sintomas, peso e pressão</span>
          <span className="block text-xs text-ink-mute">Ficam em Cuidados → Saúde, com os gráficos e o resumo para a consulta.</span>
        </span>
        <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
      </button>
    </>
  );
}

/** Uma pasta aberta: o que ela guarda, o botão de escrever e os registros por mês. */
function FolderPage({ folder, entries, dumDate, journalAvailable, onOpen, onWrite, social }: Props & { folder: Folder; entries: JournalEntry[]; social: SocialOf }) {
  const f = FOLDER[folder];
  const t = TONE[f.tone];

  return (
    <>
      <section className={`rounded-[28px] p-5 ${t.soft}`}>
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${t.solid}`}>
            <f.Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[1.45rem] leading-tight text-ink">{f.title}</h2>
            <p className="text-sm text-ink-soft mt-0.5">{f.hint}</p>
          </div>
        </div>
        <button type="button" disabled={!journalAvailable} onClick={() => onWrite(folder)} className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-soft transition active:scale-[0.99] disabled:opacity-50 ${t.solid}`}>
          {folder === 'barriga' ? <Images className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {folder === 'barriga' ? 'Foto desta semana' : folder === 'carta' ? 'Escrever uma carta' : 'Escrever'}
        </button>
      </section>

      {entries.length === 0 ? (
        <div className="rounded-3xl bg-surface p-5 shadow-soft">
          <p className="font-bold text-ink">Pasta vazia, por enquanto.</p>
          <p className="text-sm text-ink-soft mt-1">Algumas ideias para começar:</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {f.ideas.slice(0, 4).map(i => (
              <button key={i} type="button" disabled={!journalAvailable} onClick={() => onWrite(folder, folder === 'barriga' ? undefined : i)} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${t.soft} ${t.text}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
      ) : folder === 'barriga' ? (
        <BellyGrid entries={entries} dumDate={dumDate} onOpen={id => onOpen({ kind: 'entry', id })} />
      ) : (
        byMonth(entries).map(group => (
          <section key={group.key} className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-mute px-1">{group.label}</h3>
            {group.items.map(e => (
              <EntryCard key={e.id} entry={e} dumDate={dumDate} social={social(e)} onOpen={() => onOpen({ kind: 'entry', id: e.id })} />
            ))}
          </section>
        ))
      )}
    </>
  );
}

/** A barriga semana a semana: a foto mais recente de cada semana, da última para a primeira. */
function BellyGrid({ entries, dumDate, onOpen }: { entries: JournalEntry[]; dumDate: string; onOpen: (id: string) => void }) {
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-label="Fotos da barriga por semana">
      {bellyWeeks(entries, dumDate).map(({ week, items }) => {
        const e = items.find(i => i.photos.length > 0) ?? items[0];
        const photo = e.photos[0];
        return (
          <li key={week}>
            <button type="button" onClick={() => onOpen(e.id)} aria-label={`Barriguinha na semana ${week}: ver detalhes`} className="group relative block w-full aspect-[3/4] overflow-hidden rounded-3xl bg-lilas-soft text-left">
              {photo ? (
                <img src={photoUrl(photo.id, photo.thumb)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-[1.02]" />
              ) : (
                <span className="absolute inset-0 p-4 font-display text-ink">{e.body}</span>
              )}
              <span className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white">
                <span className="block font-extrabold leading-tight">Semana {week}</span>
                <span className="block text-[11px] opacity-90">
                  {formatBR(e.entry_date)}
                  {items.length > 1 && ` · +${items.length - 1}`}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Um registro na lista, com o jeito da pasta (a carta parece carta). */
function EntryCard({ entry: e, dumDate, showFolder = false, social, onOpen }: { entry: JournalEntry; dumDate: string; showFolder?: boolean; social: { reactions: number; comments: number }; onOpen: () => void }) {
  const f = FOLDER[e.folder];
  const t = TONE[f.tone];
  const upcoming = e.remind_on && e.remind_on >= toISODate(new Date());
  const letter = e.folder === 'carta';
  const serif = e.folder === 'momento' || letter;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${f.singular}: ver detalhes`}
      className={`w-full text-left rounded-2xl px-4 py-3 flex items-start gap-3 transition hover:brightness-[0.98] active:scale-[0.995] ${letter ? 'bg-surface border-l-4 border-azul shadow-soft' : t.soft}`}
    >
      <f.Icon className={`w-4 h-4 shrink-0 mt-1 ${t.text} ${e.folder === 'momento' ? 'fill-current' : ''}`} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className={`text-[11px] font-bold uppercase tracking-wide ${t.text}`}>
          {showFolder && `${f.label} · `}
          {shortDate(e.entry_date)} · semana {weekOn(dumDate, e.entry_date)}
        </p>
        {e.body && (
          <p className={`text-ink line-clamp-4 whitespace-pre-line ${serif ? 'font-display text-[1.05rem] leading-snug' : 'text-[15px]'} ${letter ? 'italic' : ''}`}>
            <MentionText text={e.body} />
          </p>
        )}
        {e.photos.length > 0 && (
          <div className="flex gap-1.5">
            {e.photos.slice(0, 3).map(p => (
              <img key={p.id} src={photoUrl(p.id, p.thumb)} alt="" loading="lazy" className="w-14 h-14 rounded-xl object-cover bg-surface-2" />
            ))}
            {e.photos.length > 3 && <span className="w-14 h-14 rounded-xl bg-surface-2 text-ink-soft text-sm font-bold flex items-center justify-center">+{e.photos.length - 3}</span>}
          </div>
        )}
        <p className="text-xs text-ink-mute flex flex-wrap items-center gap-x-2 gap-y-1">
          {letter && <span className="font-display italic text-ink-soft">— {e.author_role === 'mae' ? 'mãe' : 'pai'}</span>}
          {e.visibility === 'private' && (
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> só você
            </span>
          )}
          {e.remind_on && (
            <span className={`inline-flex items-center gap-1 ${upcoming ? 'text-brand font-semibold' : ''}`}>
              <Bell className="w-3 h-3" /> lembrar em {formatBR(e.remind_on)}
            </span>
          )}
          {!letter && <AuthorBadge role={e.author_role} />}
          <SocialCount reactions={social.reactions} comments={social.comments} />
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-ink-mute shrink-0 self-center" />
    </button>
  );
}
