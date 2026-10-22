import { useContext, useState } from 'react';
import { Heart, Loader2, Plus, Sparkles, X } from 'lucide-react';
import type { FamilyMember, Relative } from '../api';
import type { BabyTone } from '../content/babyTones';
import type { NameIdea } from '../hooks/useGestationData';
import { BabyNameContext, rankIdeas } from '../lib/baby';
import { PeopleContext, RelativesContext, firstName } from '../lib/people';
import Avatar from './Avatar';
import BabyArt from './BabyArt';

// A escolha do nome como parte da jornada, e não como um campo frio: cada um
// (e a família) sugere nomes, curte os favoritos, e o casal escolhe quando
// estiver pronto, sem pressa. A escolha vira festa e pode ir para o Mural.

export interface NameActions {
  onAdd: (name: string) => Promise<boolean>;
  onLike: (id: string, on: boolean) => Promise<boolean> | void;
  onDelete: (id: string) => Promise<boolean> | void;
  /** Só o casal escolhe. */
  onChoose?: (name: string) => Promise<boolean>;
  /** Depois de escolher: guardar o momento no Mural. */
  onShareChoice?: (name: string) => Promise<boolean>;
}


/** Quem é quem, pelo id (casal ou família). */
function usePerson() {
  const members = useContext(PeopleContext);
  const relatives = useContext(RelativesContext);
  return (id: string): FamilyMember | Relative | undefined => members.find(m => m.userId === id) ?? relatives.find(r => r.userId === id);
}

export default function BabyNames({ ideas, tone, week, couple, actions }: { ideas: NameIdea[]; tone: BabyTone; week: number; couple: boolean; actions: NameActions }) {
  const chosen = useContext(BabyNameContext);
  const person = usePerson();
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [party, setParty] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const ranked = rankIdeas(ideas);

  if (party) return <NameParty name={party} tone={tone} week={week} onShare={actions.onShareChoice} onDone={() => setParty(null)} />;

  const add = async () => {
    const name = draft.trim();
    if (!name) return;
    setAdding(true);
    const ok = await actions.onAdd(name.charAt(0).toUpperCase() + name.slice(1));
    setAdding(false);
    if (ok) setDraft('');
  };

  return (
    <div className="space-y-4">
      {chosen && !changing ? (
        <section className="rounded-[26px] bg-gradient-to-b from-rosa-soft to-surface px-5 py-5 text-center">
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">O nome escolhido</p>
          <p className="font-display text-[2.2rem] leading-tight text-ink">{chosen}</p>
          {couple && (
            <button type="button" onClick={() => setChanging(true)} className="mt-1 text-[13px] font-bold text-ink-soft">
              Mudaram de ideia? Trocar o nome
            </button>
          )}
        </section>
      ) : (
        <section className="rounded-[26px] bg-gradient-to-b from-rosa-soft to-surface px-5 py-5">
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">Escolhendo o nome</p>
          <h3 className="font-display text-[1.45rem] leading-tight text-ink">Qual vai ser o nome?</h3>
          <p className="text-[13.5px] text-ink-soft mt-1">
            {couple ? 'Sem pressa: muitos casais só decidem perto do parto. Guardem aqui as ideias, curtam as favoritas e deixem a família dar palpite.' : 'Sugira os nomes de que você gosta e curta os favoritos. Quem escolhe é o casal.'}
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={e => {
              e.preventDefault();
              void add();
            }}
          >
            <input aria-label="Sugerir um nome" placeholder="Sugerir um nome" value={draft} onChange={e => setDraft(e.target.value)} maxLength={40} className="flex-1 min-w-0 rounded-full bg-surface px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-mute outline-none ring-1 ring-line focus:ring-2 focus:ring-rosa/50" />
            <button type="submit" disabled={adding || !draft.trim()} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rosa text-white px-4 py-2.5 text-[14px] font-extrabold disabled:opacity-50">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Sugerir
            </button>
          </form>
        </section>
      )}

      {ranked.length > 0 && (
        <section className="space-y-2">
          <h3 className="px-1 text-[12px] font-extrabold uppercase tracking-wide text-ink-mute">{chosen && !changing ? 'Os nomes que fizeram parte da escolha' : 'As ideias de vocês'}</h3>
          <ul className="space-y-2" aria-label="Ideias de nome">
            {ranked.map((idea, i) => {
              const liked = idea.likes.some(l => l.mine);
              const by = person(idea.author_id);
              const isChosen = chosen?.toLowerCase() === idea.name.toLowerCase();
              return (
                <li key={idea.id} className={`rounded-2xl px-3.5 py-2.5 ${isChosen ? 'bg-rosa-soft ring-2 ring-rosa/40' : 'bg-surface shadow-soft'}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className="font-display text-[1.3rem] leading-tight text-ink truncate">{idea.name}</span>
                        {i === 0 && idea.likes.length > 1 && !chosen && <span className="shrink-0 text-[10.5px] font-extrabold uppercase text-rosa">favorito</span>}
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px] text-ink-mute">
                        sugerido por {idea.mine ? 'você' : by ? firstName(by.name) : 'alguém da família'}
                        <span className="flex -space-x-1.5">
                          {idea.likes.slice(0, 5).map(l => (
                            <Avatar key={l.user_id} member={person(l.user_id)} role={l.author_role} className="w-5 h-5 text-[8px] ring-2 ring-surface" />
                          ))}
                        </span>
                      </span>
                    </span>
                    <button type="button" onClick={() => actions.onLike(idea.id, !liked)} aria-pressed={liked} aria-label={`${liked ? 'Descurtir' : 'Curtir'} ${idea.name}`} className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold transition active:scale-95 ${liked ? 'bg-rosa text-white' : 'bg-surface-2 text-ink-soft'}`}>
                      <Heart className={`w-4 h-4 ${liked ? 'fill-white' : ''}`} /> {idea.likes.length || ''}
                    </button>
                    {(couple || idea.mine) && (
                      <button type="button" onClick={() => actions.onDelete(idea.id)} aria-label={`Tirar ${idea.name}`} className="shrink-0 w-8 h-8 rounded-full text-ink-mute hover:bg-surface-2 flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {couple && actions.onChoose && (!chosen || changing) && (
                    confirm === idea.id ? (
                      <div className="mt-2 flex items-center gap-2 rounded-xl bg-rosa-soft px-3 py-2">
                        <span className="flex-1 text-[13.5px] text-ink">É esse? {idea.name} vai para o livro e para o app todo.</span>
                        <button
                          type="button"
                          disabled={choosing}
                          onClick={async () => {
                            setChoosing(true);
                            const ok = await actions.onChoose!(idea.name);
                            setChoosing(false);
                            if (ok) {
                              setConfirm(null);
                              setChanging(false);
                              setParty(idea.name);
                            }
                          }}
                          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rosa text-white px-3.5 py-1.5 text-[13px] font-extrabold"
                        >
                          {choosing && <Loader2 className="w-4 h-4 animate-spin" />} É esse!
                        </button>
                        <button type="button" onClick={() => setConfirm(null)} className="shrink-0 text-[13px] font-bold text-ink-soft">
                          Ainda não
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirm(idea.id)} className="mt-1 text-[12.5px] font-bold text-rosa-strong">
                        Escolher este nome
                      </button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A festa da escolha: o bebê com o nome, e o convite para guardar o momento no Mural. */
function NameParty({ name, tone, week, onShare, onDone }: { name: string; tone: BabyTone; week: number; onShare?: (name: string) => Promise<boolean>; onDone: () => void }) {
  const [sharing, setSharing] = useState(false);
  return (
    <section aria-label="Nome escolhido" className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-rosa-soft via-lilas-soft to-surface px-5 py-8 text-center space-y-3">
      {Array.from({ length: 10 }, (_, i) => (
        <Heart key={i} className="tt-nome-coracao absolute w-4 h-4 fill-rosa text-rosa" style={{ left: `${8 + i * 9}%`, animationDelay: `${(i % 5) * 0.35}s` }} aria-hidden />
      ))}
      <BabyArt week={Math.min(40, Math.max(4, week))} beat tone={tone} className="w-40 h-40 mx-auto" />
      <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-rosa">Escolhido com amor</p>
      <p className="font-display text-[2.6rem] leading-none text-ink">{name}</p>
      <p className="text-[14px] text-ink-soft">Agora {name} está na capa do livro, na jornada e em cada cantinho do app.</p>
      <div className="flex flex-col gap-2 pt-2">
        {onShare && (
          <button
            type="button"
            disabled={sharing}
            onClick={async () => {
              setSharing(true);
              const ok = await onShare(name);
              setSharing(false);
              if (ok) onDone();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-rosa text-white px-5 py-3 font-extrabold shadow-soft disabled:opacity-60"
          >
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Guardar este momento no Mural
          </button>
        )}
        <button type="button" onClick={onDone} className="text-[13.5px] font-bold text-ink-soft">
          Agora não
        </button>
      </div>
    </section>
  );
}

/** No Início (e no app da família), enquanto o nome não foi escolhido: a pergunta, os favoritos e o convite. */
export function NameTeaser({ ideas, onOpen }: { ideas: NameIdea[]; onOpen: () => void }) {
  const top = rankIdeas(ideas).slice(0, 3);
  return (
    <button type="button" onClick={onOpen} aria-label="Escolhendo o nome do bebê: abrir" className="w-full text-left rounded-[26px] bg-gradient-to-br from-rosa-soft via-lilas-soft to-surface shadow-soft px-5 py-4 transition active:scale-[0.99]">
      <span className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide text-rosa">
        <Sparkles className="w-3.5 h-3.5" /> Escolhendo o nome
      </span>
      <span className="block font-display text-[1.35rem] leading-tight text-ink mt-0.5">Qual vai ser o nome?</span>
      {top.length > 0 ? (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {top.map(i => (
            <span key={i.id} className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-[14px] font-display text-ink shadow-soft">
              {i.name}
              {i.likes.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-sans font-bold text-rosa">
                  <Heart className="w-3 h-3 fill-rosa" /> {i.likes.length}
                </span>
              )}
            </span>
          ))}
          {ideas.length > 3 && <span className="self-center text-[12px] font-bold text-ink-mute">e mais ideias</span>}
        </span>
      ) : (
        <span className="block text-[13.5px] text-ink-soft mt-1">Guardem aqui as ideias de nome, curtam as favoritas e peçam palpite à família.</span>
      )}
      <span className="mt-2 block text-[13px] font-bold text-rosa-strong">{top.length ? 'Ver as ideias e curtir ›' : 'Sugerir o primeiro nome ›'}</span>
    </button>
  );
}
