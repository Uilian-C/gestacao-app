import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, CloudRain, Loader2, Ruler, Scale } from 'lucide-react';
import { api, ApiError, photoUrl, type FamilyState, type Me } from '../../api';
import type { JournalEntry, NameIdea, Reaction, ReactionKind, ThreadComment } from '../../hooks/useGestationData';
import { BabyNameContext, markNameSeen, nameSeen } from '../../lib/baby';
import NameSpace, { NameReveal, NameTeaser } from '../BabyNames';
import { weekInfo } from '../../content/weeks';
import { clampWeek, gestationalAge, parseLocalDate } from '../../lib/dates';
import { FOLDER, bellyShots, weekOn } from '../../lib/folders';
import { PeopleContext, RelativesContext } from '../../lib/people';
import { coupleNames } from '../../lib/relatives';
import Avatar from '../Avatar';
import BabyArt from '../BabyArt';
import BabyGrowth, { type BellyShot } from '../BabyGrowth';
import { stageAt } from '../../content/growth';
import type { BabyTone } from '../../content/babyTones';
import BrandMark from '../BrandMark';
import PushPrompt from '../PushPrompt';
import Sheet from '../Sheet';
import { ReactionBar, Thread } from '../Social';
import Mural from '../tabs/Mural';
import FamilyProfileSheet from './FamilyProfileSheet';

// O Tumtum de quem é da família (migração 023): a semana do bebê, a evolução
// da barriguinha e o Mural com o que o casal guardou para a família, com
// abraço e conversa. Saúde, exames, agenda e o resto ficam só com o casal.

/** O que o servidor manda para um familiar (api/_lib/gestation.ts → fetchFamilyView). */
export interface FamilyView {
  familyView: true;
  profile: { dumDate: string | null };
  journal: JournalEntry[];
  reactions: Reaction[];
  threads: ThreadComment[];
  socialAvailable: boolean;
  /** Tom do bebê escolhido pelo casal (migração 024). */
  babyTone?: BabyTone | null;
  /** O nome escolhido (migração 025) e as ideias de nome (migração 026). */
  babyName?: string | null;
  babyNameAt?: string | null;
  nameIdeas?: NameIdea[] | null;
}

interface Props {
  me: Me;
  family: FamilyState;
  onFamilyChange: (family: FamilyState | null) => void;
  onAccessLost: () => void;
  onSignOut: () => void;
}

const REACTION_KINDS: ReactionKind[] = ['abraco', 'forca', 'aqui', 'festa'];

export default function FamilyApp({ me, family, onFamilyChange, onAccessLost, onSignOut }: Props) {
  const [view, setView] = useState<FamilyView | null>((me.data as FamilyView | undefined)?.familyView ? (me.data as FamilyView) : null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [profile, setProfile] = useState(false);
  const [names, setNames] = useState(false);
  // A revelação do nome, uma vez por aparelho, quando o casal escolhe.
  const [revealSeen, setRevealSeen] = useState(nameSeen);
  const [revealAgain, setReveal] = useState<string | null>(null);
  const chosenName = view?.babyName ?? null;
  const reveal = revealAgain ?? (chosenName && revealSeen !== chosenName ? chosenName : null);
  const relatives = useMemo(() => family.relatives ?? [], [family.relatives]);
  const self = relatives.find(r => r.me);
  const couple = coupleNames(family.members.map(m => m.name));

  // Os dados vêm junto com a abertura (/api/family); sem eles, busca aqui.
  const [attempt, setAttempt] = useState(view ? -1 : 0);
  useEffect(() => {
    if (attempt < 0) return;
    let cancelled = false;
    api
      .data<FamilyView>()
      .then(next => !cancelled && setView(next))
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) onAccessLost();
        else setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, onAccessLost]);
  const load = () => {
    setFailed(false);
    setAttempt(a => Math.max(0, a) + 1);
  };

  const mutate = async (op: string, payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.mutate(op, payload);
      if (res.data) setView(res.data as FamilyView);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar. Verifique a conexão.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const react = (_type: string, targetId: string, kind: ReactionKind, on: boolean) => void mutate('react', { targetType: 'entry', targetId, kind, on });
  const comment = (entryId: string, body: string) => mutate('comment', { targetType: 'entry', targetId: entryId, body });

  if (!view) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 text-center">
        {failed ? (
          <div className="space-y-3">
            <CloudRain className="w-8 h-8 mx-auto text-ink-mute" />
            <p className="text-ink-soft">Não foi possível conectar. Verifique a internet.</p>
            <button type="button" onClick={load} className="bg-brand text-on-accent font-semibold px-5 py-2.5 rounded-full text-sm">Tentar de novo</button>
          </div>
        ) : (
          <Loader2 className="w-6 h-6 animate-spin text-ink-mute" aria-label="Carregando" />
        )}
      </div>
    );
  }

  const dumDate = view.profile.dumDate;
  const babyWeek = dumDate ? clampWeek(gestationalAge(dumDate)?.weeks ?? 4) : 4;
  const closeReveal = () => {
    if (reveal) {
      markNameSeen(reveal);
      setRevealSeen(reveal);
    }
    setReveal(null);
  };
  const entry = open ? view.journal.find(e => e.id === open) : null;

  return (
    <BabyNameContext.Provider value={view.babyName ?? null}>
    <PeopleContext.Provider value={family.members}>
      <RelativesContext.Provider value={relatives}>
        <div className="min-h-screen bg-canvas text-ink">
          <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur border-b border-line/60">
            <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
              <BrandMark animated className="w-9 h-9" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="font-display text-[1.15rem] text-ink truncate">{couple ? `A gestação de ${couple}` : 'Tumtum'}</p>
                <p className="text-xs text-ink-mute truncate">Você acompanha como {self?.relation?.toLowerCase() ?? 'família'}</p>
              </div>
              <button type="button" onClick={() => setProfile(true)} aria-label="Seu perfil" className="rounded-full">
                <Avatar member={self} role="familia" className="w-10 h-10 text-sm" />
              </button>
            </div>
          </header>

          <main className="max-w-[640px] mx-auto px-4 py-5 space-y-5 pb-16">
            {dumDate ? <BabyWeek dumDate={dumDate} tone={view.babyTone ?? 'tumtum'} parents={couple} belly={bellyShots(view.journal, dumDate)} onOpenEntry={setOpen} /> : <p className="rounded-[24px] bg-surface shadow-soft p-5 text-sm text-ink-soft">O casal ainda não informou a data da gestação. Logo a semana do bebê aparece aqui.</p>}
            {/* A família também dá palpite no nome (quem escolhe é o casal); depois, vê a história dele. */}
            {view.nameIdeas && !view.babyName && <NameTeaser ideas={view.nameIdeas} onOpen={() => setNames(true)} />}
            {view.nameIdeas && view.babyName && (
              <button type="button" onClick={() => setNames(true)} className="w-full rounded-[22px] bg-surface shadow-soft px-5 py-3 text-left text-[14px] font-bold text-rosa-strong">
                A história do nome de {view.babyName} ›
              </button>
            )}
            {names && view.nameIdeas && (
              <NameSpace
                ideas={view.nameIdeas}
                tone={view.babyTone ?? 'tumtum'}
                week={babyWeek}
                couple={false}
                chosenAt={view.babyNameAt}
                onClose={() => setNames(false)}
                onReveal={setReveal}
                actions={{
                  onAdd: (name, note) => mutate('addNameIdea', { name, ...(note ? { note } : {}) }),
                  onLike: (id, on) => mutate('likeNameIdea', { id, on }),
                  onDelete: id => mutate('deleteNameIdea', { id }),
                  onNote: (id, note) => mutate('noteNameIdea', { id, note }),
                  onComment: (id, body) => mutate('commentNameIdea', { id, body }),
                  onDeleteComment: id => mutate('deleteNameComment', { id }),
                }}
              />
            )}
            {reveal && <NameReveal name={reveal} tone={view.babyTone ?? 'tumtum'} week={babyWeek} onDone={closeReveal} />}
            {dumDate && <Belly entries={view.journal} dumDate={dumDate} onOpen={setOpen} />}
            <PushPrompt relative />
            <section aria-labelledby="mural-familia" className="space-y-3">
              <h2 id="mural-familia" className="text-[1.2rem] text-ink">Mural da família</h2>
              {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-2.5">{error}</p>}
              <Mural
                entries={view.journal}
                members={family.members}
                role="familia"
                dumDate={dumDate ?? view.journal[0]?.entry_date ?? ''}
                reactions={view.reactions}
                threads={view.threads}
                social={view.socialAvailable}
                journalAvailable
                onReact={react}
                onComment={comment}
                onOpen={setOpen}
              />
            </section>
          </main>

          {entry && (
            <Sheet title={FOLDER[entry.folder].singular} subtitle={dumDate ? `Semana ${weekOn(dumDate, entry.entry_date)}` : undefined} onClose={() => setOpen(null)}>
              <div className="space-y-4">
                {entry.photos.map(p => (
                  <img key={p.id} src={photoUrl(p.id)} alt="" className="w-full rounded-2xl bg-surface-2" />
                ))}
                {entry.body && <p className="text-ink whitespace-pre-line">{entry.body}</p>}
                {view.socialAvailable && (
                  <>
                    <ReactionBar targetType="entry" targetId={entry.id} reactions={view.reactions} kinds={REACTION_KINDS} onReact={react} />
                    <Thread
                      comments={view.threads.filter(c => c.target_type === 'entry' && c.target_id === entry.id)}
                      busy={busy}
                      onSend={body => comment(entry.id, body)}
                      onDelete={c => void mutate('deleteComment', { id: c.id })}
                    />
                  </>
                )}
                {error && <p role="alert" className="text-sm text-alert">{error}</p>}
              </div>
            </Sheet>
          )}

          {profile && <FamilyProfileSheet me={me} family={family} onClose={() => setProfile(false)} onFamilyChange={onFamilyChange} onSignOut={onSignOut} />}
        </div>
      </RelativesContext.Provider>
    </PeopleContext.Provider>
    </BabyNameContext.Provider>
  );
}

/** A semana do bebê: tamanho, peso, o que acontece e quanto falta. */
function BabyWeek({ dumDate, tone, parents, belly, onOpenEntry }: { dumDate: string; tone: BabyTone; parents: string; belly: BellyShot[]; onOpenEntry: (id: string) => void }) {
  const [growth, setGrowth] = useState(false);
  const age = gestationalAge(dumDate);
  if (!age) return null;
  const week = clampWeek(age.weeks);
  const info = weekInfo(week);
  const due = age.dpp.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  return (
    <section aria-label="Semana do bebê" className="rounded-[28px] bg-surface shadow-soft p-5 space-y-3 text-center">
      {/* O mesmo bebê que o casal vê, no tom que eles escolheram. */}
      <button type="button" onClick={() => setGrowth(true)} aria-label="Abrir a jornada do bebê" className="block mx-auto rounded-full">
        <BabyArt week={week} beat tone={tone} className="w-48 h-48" />
      </button>
      <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">
        {age.weeks} semanas{age.days ? ` e ${age.days} ${age.days === 1 ? 'dia' : 'dias'}` : ''} · {info.trimester}º trimestre
      </p>
      <p className="font-display text-[1.5rem] leading-tight text-ink">{stageAt(week).title}</p>
      <p className="text-ink-soft">Do tamanho de {info.fruit}</p>
      <p className="text-[15px] text-ink">{info.milestone}</p>
      <div className="flex flex-wrap justify-center gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-ink-soft"><Ruler className="w-3.5 h-3.5" /> {info.size}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-ink-soft"><Scale className="w-3.5 h-3.5" /> {info.weight}</span>
        {age.daysToDpp > 0 && <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1.5 font-bold text-brand-strong">Faltam {age.daysToDpp} dias · previsão {due}</span>}
      </div>
      <button type="button" onClick={() => setGrowth(true)} className="w-full flex items-center justify-center gap-1 rounded-[18px] bg-surface-2/80 px-4 py-2.5 text-sm font-bold text-ink hover:bg-surface-2">
        Jornada do bebê <ChevronRight className="w-4 h-4" />
      </button>
      {growth && (
        <Sheet title="Jornada do bebê" subtitle={`Da 4ª à 40ª semana · o bebê está na ${week}ª`} onClose={() => setGrowth(false)}>
          <BabyGrowth
            currentWeek={week}
            hereText="o bebê está aqui"
            tone={tone}
            parents={parents}
            belly={belly}
            onOpenEntry={id => {
              setGrowth(false);
              onOpenEntry(id);
            }}
          />
        </Sheet>
      )}
    </section>
  );
}

/** A barriguinha que o casal mostrou para a família, semana a semana. */
function Belly({ entries, dumDate, onOpen }: { entries: JournalEntry[]; dumDate: string; onOpen: (id: string) => void }) {
  const photos = entries
    .filter(e => e.folder === 'barriga' && e.photos.length > 0)
    .sort((a, b) => parseLocalDate(a.entry_date).getTime() - parseLocalDate(b.entry_date).getTime());
  if (photos.length === 0) return null;
  return (
    <section aria-label="Barriguinha" className="rounded-[28px] bg-lilas-soft p-4 space-y-3">
      <h2 className="text-[12px] font-extrabold uppercase tracking-wide text-lilas-strong font-sans">A barriguinha</h2>
      <ol className="flex gap-2 overflow-x-auto no-scrollbar">
        {photos.map(e => {
          const week = weekOn(dumDate, e.entry_date);
          const p = e.photos[0];
          return (
            <li key={e.id} className="shrink-0">
              <button type="button" onClick={() => onOpen(e.id)} aria-label={`Barriguinha na semana ${week}: ver`} className="relative block w-[72px] aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
                <img src={photoUrl(p.id, p.thumb)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 pb-1 pt-3 text-center text-[10px] font-extrabold text-white bg-gradient-to-t from-black/60 to-transparent">sem. {week}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
