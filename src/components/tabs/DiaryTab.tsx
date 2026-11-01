import { useContext, useState } from 'react';
import { ArrowLeft, Bell, ChevronDown, ChevronUp, PartyPopper, ChevronRight, Images, Lock, Play, Plus, Smile, Sparkles } from 'lucide-react';
import { photoUrl, type FamilyMember } from '../../api';
import type { Checkin, EntryPhoto, Folder, JournalEntry, Reaction, ThreadComment } from '../../hooks/useGestationData';
import { formatBR, toISODate } from '../../lib/dates';
import type { DetailTarget } from '../../lib/details';
import { FOLDER, MOMENT_FOLDERS, TONE, bellyWeeks, groupEntries, shortDate, weekOn, type GroupBy } from '../../lib/folders';
import type { Author, DiaryView } from '../../types';
import AuthorBadge from '../AuthorBadge';
import { MentionText } from '../Mentions';
import { SocialCount, type OnReact } from '../Social';
import Mural from './Mural';
import { BookView } from '../Book';
import { CelebrationList, type CelebrationActions } from '../Celebrations';
import { daysTo, pendingTasks, type Celebration } from '../../lib/celebrations';
import type { BabyTone } from '../../content/babyTones';
import { coupleNames } from '../../lib/relatives';
import { freshChapter, type Chapter } from '../../lib/chapters';
import MoodTab from './MoodTab';
import { Segmented, SubTabs } from '../ui';
import Sheet from '../Sheet';
import FirstTimes from '../FirstTimes';
import BellyGrowthPlayer from '../BellyGrowthPlayer';
import { firstTimesAlbum, nextFirstTime } from '../../lib/firstTimes';
import type { FirstTimeId } from '../../content/firstTimes';
import { BabyNameContext } from '../../lib/baby';

// O Diário é o fichário afetivo da gestação, em três lugares só: o Mural (tudo
// junto, do mais novo ao mais antigo, como uma rede social de vocês dois), o
// Fichário (as pastas, com as Celebrações e o Humor como pastas especiais) e o
// Livro (a história de vocês). Cada pasta abre como uma página com "voltar".

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
  /** Check-ins do dia (Diário → Humor). */
  checkins: Checkin[];
  /** Abre os detalhes (com reações, conversa, editar e excluir). */
  onOpen: (target: DetailTarget) => void;
  /** Abre o formulário já na pasta (e com uma ideia para começar). */
  onWrite: (folder?: Folder, idea?: string, firstTime?: FirstTimeId) => void;
  /** Leva para Cuidados. */
  onOpenHealth: () => void;
  /** O livro de vocês: um capítulo por semana. */
  book: Chapter[];
  /** O tom do bebê (o desenho de cada capítulo). */
  babyTone: BabyTone;
  /** Celebrações (migração 028); null antes da migração. */
  celebrations?: Celebration[] | null;
  celebrationActions?: CelebrationActions;
  onOpenCelebration?: (id: string) => void;
  /** Abre a escolha do nome do bebê (vai para a capa do livro). */
  onOpenNames?: () => void;
}

export default function DiaryTab(props: Props) {
  const entries = props.journal;
  // "Momentos" junta o dia a dia e as ideias (cada registro mantém a sua pasta, como etiqueta).
  const inFolder = (e: JournalEntry, f: Folder) => (f === 'momento' ? MOMENT_FOLDERS.includes(e.folder) : e.folder === f);
  const count = (f: Folder) => entries.filter(e => inFolder(e, f)).length;
  const social = (e: JournalEntry) => ({
    reactions: props.reactions.filter(r => r.target_type === 'entry' && r.target_id === e.id).length,
    comments: props.threads.filter(c => c.target_type === 'entry' && c.target_id === e.id).length,
  });

  const inFichario = props.view !== 'mural' && props.view !== 'livro';
  const back = () => props.onView('tudo');
  const top = inFichario ? 'tudo' : props.view;

  return (
    <div>
      <nav aria-label="Pastas do diário">
        <SubTabs
          label="Parte do diário"
          value={top as 'mural' | 'tudo' | 'livro'}
          onChange={props.onView}
          options={[
            { value: 'mural', label: 'Mural' },
            { value: 'tudo', label: 'Fichário' },
            { value: 'livro', label: 'Livro' },
          ]}
        />
      </nav>
      {props.view === 'humor' ? (
        <SubPage title="Humor" hint="Como vocês estão, semana a semana" onBack={back}>
          <MoodTab checkins={props.checkins} journal={entries} dumDate={props.dumDate} onOpenEntry={id => props.onOpen({ kind: 'entry', id })} />
        </SubPage>
      ) : props.view === 'mural' ? (
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
      ) : props.view === 'livro' ? (
        <BookView
          book={props.book}
          tone={props.babyTone}
          parents={coupleNames(props.members.map(m => m.name))}
          fresh={freshChapter(props.book, props.dumDate, new Date())}
          onOpenEntry={id => props.onOpen({ kind: 'entry', id })}
          onWrite={props.journalAvailable ? () => props.onWrite() : undefined}
          onNames={props.onOpenNames}
        />
      ) : props.view === 'celebracoes' ? (
        <SubPage title="Celebrações" hint="Os encontros que vão fazer parte da história de vocês" onBack={back}>
          {props.celebrations ? (
            <CelebrationList celebrations={props.celebrations} actions={props.celebrationActions!} onOpen={props.onOpenCelebration!} />
          ) : (
            <p className="rounded-[24px] bg-surface/80 p-5 text-sm text-ink-soft">Para planejar as celebrações, rode a migração db/migrations/028_celebracoes.sql no Neon.</p>
          )}
        </SubPage>
      ) : props.view === 'tudo' ? (
        <Fichario {...props} count={count} />
      ) : (
        <FolderPage {...props} folder={props.view} entries={entries.filter(e => inFolder(e, props.view as Folder))} social={social} />
      )}
    </div>
  );
}

/** Uma página dentro do Fichário: "voltar", o nome e uma linha do que guarda. */
function SubPage({ title, hint, onBack, action, children }: { title: string; hint: string; onBack: () => void; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft">
          <ArrowLeft className="w-4 h-4" /> Fichário
        </button>
        <div className="flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            <h1 className="font-display text-[1.5rem] leading-tight text-ink">{title}</h1>
            <p className="text-[13.5px] text-ink-soft">{hint}</p>
          </div>
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

type SocialOf = (e: JournalEntry) => { reactions: number; comments: number };

const remembered = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const remember = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: só não lembra */
  }
};

const GROUPS: Array<{ value: GroupBy; label: string }> = [
  { value: 'mes', label: 'Mês' },
  { value: 'semana', label: 'Semana' },
  { value: 'trimestre', label: 'Trimestre' },
];

/**
 * Os registros de uma pasta, agrupados por mês, semana ou trimestre (a escolha
 * fica lembrada por pasta). O grupo mais novo vem aberto; os outros, recolhidos,
 * com quantos registros e as fotinhos, para achar rápido.
 */
function Grouped({ folder, entries, dumDate, social, onOpen }: { folder: Folder; entries: JournalEntry[]; dumDate: string; social: SocialOf; onOpen: (id: string) => void }) {
  const key = `tumtum-fichario-grupo-${folder}`;
  const [by, setBy] = useState<GroupBy>(() => remembered(key, 'mes') as GroupBy);
  const groups = groupEntries(entries, by, dumDate);
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.slice(0, 1).map(g => g.key)));
  const pick = (v: GroupBy) => {
    setBy(v);
    remember(key, v);
    setOpen(new Set(groupEntries(entries, v, dumDate).slice(0, 1).map(g => g.key)));
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-mute">Ver por</span>
        <Segmented label="Agrupar por" size="sm" value={by} onChange={pick} options={GROUPS} />
      </div>
      {groups.map(g => {
        const isOpen = open.has(g.key);
        const photos = g.items.flatMap(e => e.photos).slice(0, 4);
        return (
          <section key={g.key} className="rounded-3xl bg-surface/80">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() =>
                setOpen(prev => {
                  const next = new Set(prev);
                  if (next.has(g.key)) next.delete(g.key);
                  else next.add(g.key);
                  return next;
                })
              }
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <span className="flex-1 min-w-0">
                <span className="block font-extrabold text-ink first-letter:uppercase">{g.label}</span>
                <span className="block text-[12px] text-ink-mute">{g.items.length === 1 ? '1 registro' : `${g.items.length} registros`}</span>
              </span>
              {!isOpen && photos.length > 0 && (
                <span className="flex -space-x-2" aria-hidden>
                  {photos.map(p => (
                    <img key={p.id} src={photoUrl(p.id, p.thumb)} alt="" loading="lazy" className="w-8 h-8 rounded-lg object-cover ring-2 ring-surface" />
                  ))}
                </span>
              )}
              {isOpen ? <ChevronUp className="w-4 h-4 text-ink-mute shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-mute shrink-0" />}
            </button>
            {isOpen && (
              <div className="space-y-2.5 px-3 pb-3">
                {g.items.map(e => (
                  <EntryCard key={e.id} entry={e} dumDate={dumDate} showFolder={folder === 'momento'} social={social(e)} onOpen={() => onOpen(e.id)} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * O Fichário: as pastas num relance, sem capa. As Celebrações e o Humor são
 * pastas especiais; a barriguinha mostra as últimas fotos. Um toque abre.
 */
function Fichario({ journal, dumDate, photosAvailable, journalAvailable, onView, onWrite, onOpen, count, celebrations }: Props & { count: (f: Folder) => number }) {
  const babyName = useContext(BabyNameContext);
  const [album, setAlbum] = useState(false);
  const firsts = firstTimesAlbum(journal, babyName);
  const firstsDone = firsts.filter(c => c.done).length;
  const nextFirst = nextFirstTime(firsts, weekOn(dumDate, toISODate(new Date())));
  const next = (celebrations ?? []).map(c => ({ c, days: daysTo(c.event_at) })).filter(x => x.days === null || x.days >= 0).sort((a, b) => (a.days ?? 999) - (b.days ?? 999))[0];
  const nextHint = next
    ? `${next.c.title} · ${next.days === null ? 'sem data ainda' : next.days === 0 ? 'hoje' : next.days === 1 ? 'amanhã' : `em ${next.days} dias`}${pendingTasks(next.c).length ? ` · ${pendingTasks(next.c).length} por fazer` : ''}`
    : 'Chá de bebê, revelação, ensaio de fotos…';

  return (
    <div className="space-y-3">
      {!journalAvailable && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2">Para guardar no diário, rode a migração 008 no Neon.</p>}

      {/* As pastas como num fichário de papel: a aba, os furinhos e as fotos espiando de dentro. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {journalAvailable && (
          <AlbumFolder wide label="Primeiras vezes" hint={`${firstsDone} de ${firsts.length}${nextFirst ? ` · próxima: ${nextFirst.ft.title.toLowerCase()}` : ' · o álbum completo!'}`} Icon={Sparkles} soft="bg-gradient-to-br from-rosa-soft to-lilas-soft" tab="bg-lilas-soft" text="text-lilas-strong" aria="Abrir o álbum das primeiras vezes" onClick={() => setAlbum(true)} />
        )}
        {photosAvailable &&
          (['momento', 'carta', 'barriga'] as Folder[]).map(id => {
            const f = FOLDER[id];
            const t = TONE[f.tone];
            const n = count(id);
            const photos = journal.filter(e => (id === 'momento' ? MOMENT_FOLDERS.includes(e.folder) : e.folder === id) && e.photos.length > 0).slice(0, id === 'barriga' ? 4 : 2).map(e => e.photos[0]);
            return (
              <AlbumFolder
                key={id}
                wide={id === 'barriga'}
                label={f.label}
                hint={n ? `${n} ${n === 1 ? 'registro' : 'registros'}` : id === 'barriga' ? 'Uma foto por semana' : 'Vazia, por enquanto'}
                Icon={f.Icon}
                soft={t.soft}
                tab={t.soft}
                text={t.text}
                photos={photos}
                aria={`Abrir a pasta ${f.title}`}
                onClick={() => onView(id)}
              />
            );
          })}
      </div>

      {/* As pastas especiais, numa linha: as celebrações e o humor de vocês. */}
      {(celebrations !== undefined || photosAvailable) && (
        <div className="flex flex-wrap gap-2 px-1">
          {celebrations !== undefined && (
            <button type="button" onClick={() => onView('celebracoes')} aria-label="Abrir a pasta Celebrações" className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-rosa-soft px-3 py-1.5 text-[13px] font-bold text-rosa-strong">
              <PartyPopper className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="truncate">Celebrações{next ? ` · ${nextHint}` : ''}</span>
            </button>
          )}
          {photosAvailable && (
            <button type="button" onClick={() => onView('humor')} aria-label="Abrir a pasta Humor" className="inline-flex items-center gap-1.5 rounded-full bg-warm-soft px-3 py-1.5 text-[13px] font-bold text-warm">
              <Smile className="w-3.5 h-3.5" aria-hidden /> Humor de vocês
            </button>
          )}
        </div>
      )}

      {album && (
        <Sheet title="Primeiras vezes" subtitle="O álbum dos marcos de vocês" onClose={() => setAlbum(false)}>
          <FirstTimes
            cards={firsts}
            onWrite={c => onWrite(c.ft.id === 'barriga' ? 'barriga' : 'momento', c.ft.starter, c.ft.id)}
            onOpenEntry={id => (setAlbum(false), onOpen({ kind: 'entry', id }))}
          />
        </Sheet>
      )}

      {journal.length === 0 && journalAvailable && (
        <button type="button" onClick={() => onWrite()} className="w-full rounded-[24px] border-2 border-dashed border-line p-5 text-left transition hover:bg-surface/60">
          <span className="flex items-center gap-2 font-extrabold text-rosa-strong">
            <Plus className="w-5 h-5" /> Guardar o primeiro registro
          </span>
          <span className="block text-sm text-ink-soft mt-1">Pode ser simples: “hoje ouvimos o coração”.</span>
        </button>
      )}
    </div>
  );
}

/**
 * Uma pasta do fichário: a aba em cima, os três furinhos do fichário na
 * lateral e, quando há fotos, as polaroides espiando de dentro, como num álbum
 * de bebê.
 */
function AlbumFolder({ label, hint, Icon, soft, tab, text, photos = [], wide = false, aria, onClick }: { label: string; hint: string; Icon: typeof Smile; soft: string; tab: string; text: string; photos?: EntryPhoto[]; wide?: boolean; aria: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={aria} className={`${wide ? 'col-span-2' : ''} relative pt-3 text-left transition active:scale-[0.98]`}>
      <span aria-hidden className={`absolute top-0 left-5 h-5 w-20 rounded-t-[12px] ${tab}`} />
      {/* Todas as pastas com a mesma altura e o mesmo jeito: ícone, nome e a dica embaixo. */}
      <span className={`relative flex flex-col min-h-[112px] rounded-[20px] rounded-tl-[8px] ${soft} pl-6 pr-3.5 py-3 overflow-hidden`}>
        <span aria-hidden className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-canvas/90 shadow-[inset_0_1px_1px_rgba(0,0,0,0.12)]" />
          ))}
        </span>
        <Icon className={`w-5 h-5 shrink-0 ${text}`} />
        <span className={`block mt-1.5 font-display text-[1.15rem] leading-tight text-ink ${photos.length ? (wide ? 'pr-36' : 'pr-14') : 'pr-5'}`}>{label}</span>
        <span className={`block mt-auto pt-1 text-[12.5px] font-bold leading-snug ${text} ${photos.length ? (wide ? 'pr-36' : 'pr-14') : 'pr-5'} ${wide ? 'truncate' : 'line-clamp-2'}`}>{hint}</span>
        {photos.length > 0 && (
          <span aria-hidden className={`absolute right-3 bottom-2.5 flex ${wide ? '-space-x-3' : '-space-x-4'}`}>
            {photos.map((ph, i) => (
              <span key={ph.id} className={`block bg-white p-1 pb-2.5 rounded-[4px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] ${i % 2 ? 'rotate-6' : '-rotate-6'}`}>
                <img src={photoUrl(ph.id, ph.thumb)} alt="" loading="lazy" className="w-11 h-12 object-cover rounded-[2px]" />
              </span>
            ))}
          </span>
        )}
        <ChevronRight aria-hidden className="absolute top-3 right-3 w-4 h-4 text-ink-mute/70" />
      </span>
    </button>
  );
}

/** Uma pasta aberta: o que ela guarda, o botão de escrever e os registros por mês. */
function FolderPage({ folder, entries: all, dumDate, journalAvailable, onOpen, onWrite, onView, social }: Props & { folder: Folder; entries: JournalEntry[]; social: SocialOf }) {
  // Em Momentos moram também o dia a dia e as ideias: um filtro mostra só um deles.
  const moments = folder === 'momento';
  const [only, setOnly] = useState<Folder | 'todos'>('todos');
  const entries = moments && only !== 'todos' ? all.filter(e => e.folder === only) : all;
  const writeIn: Folder = moments && only !== 'todos' ? only : folder;
  const f = FOLDER[writeIn];
  const t = TONE[f.tone];

  return (
    <SubPage
      title={moments ? 'Momentos' : f.title}
      hint={moments ? 'Os momentos especiais, o dia a dia e as ideias de vocês.' : f.hint}
      onBack={() => onView('tudo')}
      action={
        <button type="button" disabled={!journalAvailable} onClick={() => onWrite(writeIn)} className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-bold transition active:scale-[0.98] disabled:opacity-50 ${t.solid}`}>
          {folder === 'barriga' ? <Images className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {folder === 'barriga' ? 'Foto' : folder === 'carta' ? 'Escrever' : 'Guardar'}
        </button>
      }
    >
      {moments && (
        <Segmented
          label="Mostrar"
          size="sm"
          full
          value={only}
          onChange={setOnly}
          options={[
            { value: 'todos', label: 'Tudo' },
            ...MOMENT_FOLDERS.map(id => ({ value: id, label: FOLDER[id].label })),
          ]}
        />
      )}
      {entries.length === 0 ? (
        <div className="rounded-[24px] bg-surface/80 p-5">
          <p className="font-bold text-ink">Pasta vazia, por enquanto.</p>
          <p className="text-sm text-ink-soft mt-1">Algumas ideias para começar:</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {f.ideas.slice(0, 4).map(i => (
              <button key={i} type="button" disabled={!journalAvailable} onClick={() => onWrite(writeIn, folder === 'barriga' ? undefined : i)} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${t.soft} ${t.text}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
      ) : folder === 'barriga' ? (
        <BellyGrid entries={entries} dumDate={dumDate} onOpen={id => onOpen({ kind: 'entry', id })} />
      ) : (
        <Grouped key={`${folder}-${only}`} folder={folder} entries={entries} dumDate={dumDate} social={social} onOpen={id => onOpen({ kind: 'entry', id })} />
      )}
    </SubPage>
  );
}

/** A barriga semana a semana: a foto mais recente de cada semana, da última para a primeira. */
function BellyGrid({ entries, dumDate, onOpen }: { entries: JournalEntry[]; dumDate: string; onOpen: (id: string) => void }) {
  // O crescendo: com 4 semanas ou mais de foto, a barriga passa como um filminho.
  const [film, setFilm] = useState(false);
  const shots = bellyWeeks(entries, dumDate)
    .map(w => ({ week: w.week, photo: w.items.find(i => i.photos.length > 0)?.photos[0] }))
    .filter((w): w is { week: number; photo: EntryPhoto } => !!w.photo)
    .sort((a, b) => a.week - b.week);
  return (
    <>
    {shots.length >= 4 ? (
      <button type="button" onClick={() => setFilm(true)} className="mb-3 w-full flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-lilas-soft to-rosa-soft px-4 py-3 text-left">
        <Play className="w-5 h-5 text-lilas-strong shrink-0" />
        <span>
          <span className="block font-display text-[1.05rem] text-ink">Ver o crescendo</span>
          <span className="block text-[12.5px] text-ink-soft">{shots.length} semanas de barriga, uma depois da outra</span>
        </span>
      </button>
    ) : (
      shots.length > 0 && <p className="mb-3 px-1 text-[13px] text-ink-soft">Com 4 semanas de foto, a barriga vira um filminho: faltam {4 - shots.length}.</p>
    )}
    {film && (
      <Sheet title="O crescendo" subtitle="A barriga, semana a semana" onClose={() => setFilm(false)}>
        <BellyGrowthPlayer shots={shots} />
      </Sheet>
    )}
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
    </>
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
      className={`w-full text-left rounded-2xl px-4 py-3 flex items-start gap-3 transition hover:brightness-[0.98] active:scale-[0.995] ${letter ? 'bg-surface border-l-4 border-azul' : t.soft}`}
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
