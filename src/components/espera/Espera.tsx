import { useState } from 'react';
import { CalendarHeart, Check, ChevronRight, Heart, Loader2, Lock, NotebookPen, Send, Share2, Sparkles } from 'lucide-react';
import { daysToTest, esperaStage, rightGuesses, SEX_WORD, tally, type Espera, type GuessRole, type Sex, type SexPlan } from '../../lib/espera';
import { useScrollLock } from '../../hooks/useScrollLock';
import BrandMark from '../BrandMark';
import Sheet from '../Sheet';
import { Button, Segmented } from '../ui';

// A espera: menino ou menina? O cartão do Início muda com a jornada de cada
// casal (a pergunta, o bolão, a contagem para o exame, a surpresa até o parto,
// a revelação guardada, o "é menina"), a folha cuida do plano, do palpite e do
// registro, e a revelação abre como um envelope, no ritmo do tum-tum.

const ROLE_WORD: Record<GuessRole, string> = { mae: 'Mãe', pai: 'Pai', familia: 'Família' };
const SEX_TONE: Record<Sex, { soft: string; strong: string; bg: string; ring: string }> = {
  menina: { soft: 'bg-rosa-soft', strong: 'text-rosa-strong', bg: 'bg-rosa', ring: 'ring-rosa' },
  menino: { soft: 'bg-azul-soft', strong: 'text-azul-strong', bg: 'bg-azul', ring: 'ring-azul' },
};

/** O envelope fechado (desenhado), com o coração do Tumtum como lacre. */
function Envelope({ className = 'w-24 h-20' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 72" className={className} aria-hidden>
      <rect x="4" y="10" width="88" height="58" rx="10" fill="#fffaf6" stroke="#3a2a33" strokeOpacity=".2" strokeWidth="2" />
      <path d="M6 16 L48 44 L90 16" fill="none" stroke="#3a2a33" strokeOpacity=".3" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M48 52c-6-4.5-10-8-10-12.2 0-3 2.3-5.3 5.2-5.3 2 0 3.8 1.1 4.8 2.8 1-1.7 2.8-2.8 4.8-2.8 2.9 0 5.2 2.3 5.2 5.3C58 44 54 47.5 48 52z" className="fill-rosa" />
    </svg>
  );
}

const names = (partnerName: string | null, role: GuessRole, mine: boolean, me: string) => (mine ? me : role === 'familia' ? 'Família' : partnerName ?? ROLE_WORD[role]);

/** No Início, na parte "Vocês": a espera de cada casal, num cartão só. */
export function EsperaCard({ espera, today, babyName, partnerName, finalists, ideas, onOpen, onReveal, onNames }: { espera: Espera; today: string; babyName: string | null; partnerName: string | null; finalists: number; ideas: number; onOpen: () => void; onReveal: () => void; onNames: () => void }) {
  const stage = esperaStage(espera);
  const t = tally(espera);
  if (stage === 'sabem' && babyName) return null;
  if (stage === 'envelope') {
    return (
      <button type="button" onClick={onReveal} aria-label="Abrir a revelação: menino ou menina" className="w-full flex items-center gap-4 rounded-[26px] bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft px-5 py-4 text-left shadow-soft transition active:scale-[0.99]">
        <span className="tt-envelope shrink-0 text-ink">
          <Envelope className="w-16 h-12" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[12px] font-extrabold uppercase tracking-wide text-lilas-strong">{espera.sealed ? 'O segredo do chá' : 'Uma revelação para você'}</span>
          <span className="block font-display text-[1.2rem] leading-snug text-ink">{espera.sealed ? 'O envelope está guardado: menino ou menina?' : `${partnerName ?? 'Alguém'} guardou: menino ou menina?`}</span>
          <span className="block text-[13px] text-ink-soft">{espera.sealed ? 'Abram juntos, na hora da revelação 💌' : 'Toque para abrir 💌'}</span>
        </span>
      </button>
    );
  }
  const days = daysToTest(espera, today);
  const known = stage === 'sabem' && espera.sex ? espera.sex : null;
  const kicker = known ? 'A espera' : stage === 'surpresa' ? 'Vai ser surpresa' : 'A espera';
  const title =
    known
      ? `${SEX_WORD[known].title} ${SEX_WORD[known].emoji}`
      : stage === 'guardado'
        ? `Guardado para ${partnerName ?? 'abrir'} 💌`
        : stage === 'surpresa'
          ? 'Vocês escolheram esperar 🤍'
          : days === 0
            ? 'Hoje vocês descobrem!'
            : days !== null
              ? `Faltam ${days} ${days === 1 ? 'dia' : 'dias'} para saber`
              : 'Menino ou menina?';
  const sub = known
    ? finalists
      ? `${finalists} ${finalists === 1 ? 'nome' : 'nomes'} na lista final`
      : ideas
        ? `${ideas} ${ideas === 1 ? 'ideia' : 'ideias'} de nome · hora da lista final`
        : 'E o nome? Comecem o caderno'
    : stage === 'guardado'
      ? 'Só você sabe, até a outra pessoa abrir'
      : stage === 'pergunta'
        ? 'Já sabem, vão descobrir ou vai ser surpresa?'
        : t.total
          ? `Bolão: ${t.menina} menina · ${t.menino} menino`
          : 'Qual é o seu palpite? Abra o bolão';
  return (
    <button type="button" onClick={known ? onNames : onOpen} aria-label={`${title}: abrir`} className={`w-full flex items-center gap-3 rounded-[26px] px-5 py-4 text-left shadow-soft transition active:scale-[0.99] ${known ? `${SEX_TONE[known].soft}` : 'bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft'}`}>
      <span className="flex-1 min-w-0">
        <span className={`flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide ${known ? SEX_TONE[known].strong : 'text-lilas-strong'}`}>
          {known ? <NotebookPen className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />} {kicker}
        </span>
        <span className="block font-display text-[1.25rem] leading-snug text-ink">{title}</span>
        <span className="block text-[13px] text-ink-soft">{sub}</span>
        {!known && stage !== 'pergunta' && stage !== 'guardado' && (t.mae || t.pai) && (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {(['mae', 'pai'] as const).map(r =>
              t[r] ? (
                <span key={r} className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${SEX_TONE[t[r]!].soft} ${SEX_TONE[t[r]!].strong} ring-1 ring-surface`}>
                  {ROLE_WORD[r]}: {t[r]}
                </span>
              ) : null,
            )}
          </span>
        )}
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 text-ink-mute" aria-hidden />
    </button>
  );
}

export interface EsperaActions {
  onPlan: (plan: SexPlan | null, testDate: string | null) => Promise<boolean>;
  onGuess: (guess: Sex | null) => Promise<boolean>;
  onRegister: (sex: Sex | null, secret: boolean) => Promise<boolean>;
  onShare: (kind: 'teaser' | 'surpresa' | 'revelacao') => void;
  onNames: () => void;
  onReveal: () => void;
  /** O bolão aberto: cria (se preciso) e envia o link. */
  onBolaoLink?: () => void;
  /** O envelope do chá: cria um link para quem vai guardar o segredo. */
  onEnvelopeLink?: () => void;
}

/** A folha da espera: o plano, o bolão, o registro e os cartões. */
export function EsperaSheet({ espera, me, partnerName, today, busy, actions, onClose }: { espera: Espera; me: string; partnerName: string | null; today: string; busy: boolean; actions: EsperaActions; onClose: () => void }) {
  const stage = esperaStage(espera);
  const t = tally(espera);
  const [registering, setRegistering] = useState(false);
  const [picked, setPicked] = useState<Sex | null>(null);
  const [secret, setSecret] = useState(!!partnerName);
  const [date, setDate] = useState(espera.testDate ?? '');
  const right = rightGuesses(espera);
  const known = espera.sex && (stage === 'sabem' || stage === 'guardado') ? espera.sex : null;

  return (
    <Sheet title="A espera" subtitle="Menino ou menina? Cada casal vive de um jeito." icon={<Sparkles />} onClose={onClose}>
      <div className="space-y-6">
        {stage === 'envelope' && (
          <button type="button" onClick={actions.onReveal} className="w-full flex items-center gap-4 rounded-[22px] bg-lilas-soft px-4 py-4 text-left">
            <Envelope className="w-14 h-11 text-ink shrink-0" />
            <span className="flex-1 font-display text-[1.1rem] text-ink">{espera.sealed ? 'O segredo do chá está guardado no envelope' : `${partnerName ?? 'Alguém'} guardou uma revelação para você`}</span>
            <span className="rounded-full bg-surface px-3 py-1.5 text-[13px] font-extrabold text-lilas-strong">Abrir</span>
          </button>
        )}

        {known && (
          <section className={`rounded-[24px] px-5 py-5 text-center ${SEX_TONE[known].soft}`}>
            <p className={`text-[12px] font-extrabold uppercase tracking-[0.2em] ${SEX_TONE[known].strong}`}>{stage === 'guardado' ? 'Só você sabe, por enquanto' : 'Vocês já sabem'}</p>
            <p className="font-display text-[2.4rem] leading-tight text-ink">
              {SEX_WORD[known].title} {SEX_WORD[known].emoji}
            </p>
            {stage === 'guardado' ? (
              <p className="text-[13.5px] text-ink-soft">Guardado como surpresa: {partnerName ?? 'a outra pessoa'} recebe um envelope para abrir.</p>
            ) : (
              right.length > 0 && <p className="text-[13.5px] text-ink-soft">Acertaram o palpite: {right.map(g => names(partnerName, g.author_role, g.mine, me)).join(', ')} 🎉</p>
            )}
            {stage === 'sabem' && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => actions.onShare('revelacao')} className={`inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13.5px] font-extrabold shadow-soft ${SEX_TONE[known].strong}`}>
                  <Share2 className="w-4 h-4" /> Compartilhar a revelação
                </button>
                <button type="button" onClick={actions.onNames} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13.5px] font-extrabold text-ink-soft shadow-soft">
                  <NotebookPen className="w-4 h-4" /> Os nomes
                </button>
              </div>
            )}
          </section>
        )}

        {!known && stage !== 'envelope' && (
          <section aria-labelledby="espera-plano" className="space-y-3">
            <h3 id="espera-plano" className="text-[15px] font-bold text-ink">
              Como vai ser a espera de vocês?
            </h3>
            <Segmented
              value={espera.plan ?? ('nenhum' as SexPlan)}
              label="O plano"
              full
              onChange={p => void actions.onPlan(p, p === 'descobrir' ? date || null : null)}
              options={[
                { value: 'descobrir', label: 'Vamos descobrir' },
                { value: 'surpresa', label: 'Surpresa até o parto' },
              ]}
            />
            {espera.plan === 'descobrir' && (
              <label className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2.5">
                <CalendarHeart className="w-5 h-5 shrink-0 text-lilas-strong" aria-hidden />
                <span className="flex-1 text-[14px] text-ink-soft">Quando vão descobrir?</span>
                <input
                  type="date"
                  aria-label="Dia do exame ou do ultrassom"
                  value={date}
                  min={today}
                  onChange={e => {
                    setDate(e.target.value);
                    void actions.onPlan('descobrir', e.target.value || null);
                  }}
                  className="bg-transparent text-[14px] font-bold text-ink outline-none"
                />
              </label>
            )}
            {espera.plan === 'surpresa' && <p className="text-[13.5px] text-ink-soft">Bonito! O app fica neutro até o parto, e o bolão segue aberto para a família palpitar.</p>}
          </section>
        )}

        {!known && stage !== 'envelope' && (
          <section aria-labelledby="espera-bolao" className="space-y-3">
            <h3 id="espera-bolao" className="text-[15px] font-bold text-ink">
              O bolão
            </h3>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Seu palpite">
              {(['menina', 'menino'] as const).map(s => {
                const on = t.mine === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    disabled={busy}
                    onClick={() => void actions.onGuess(on ? null : s)}
                    className={`rounded-[20px] px-4 py-3.5 text-center transition active:scale-95 ${on ? `${SEX_TONE[s].soft} ring-2 ${SEX_TONE[s].ring}` : 'bg-surface-2'}`}
                  >
                    <span className={`block font-display text-[1.2rem] ${on ? SEX_TONE[s].strong : 'text-ink'}`}>{s === 'menina' ? 'Menina' : 'Menino'}</span>
                    <span className="block text-[12px] font-bold text-ink-mute">
                      {s === 'menina' ? t.menina : t.menino} {(s === 'menina' ? t.menina : t.menino) === 1 ? 'palpite' : 'palpites'}
                    </span>
                  </button>
                );
              })}
            </div>
            {espera.guesses.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Palpites">
                {espera.guesses
                  .filter(g => g.author_role !== 'familia')
                  .map(g => (
                    <li key={g.user_id} className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${SEX_TONE[g.guess].soft} ${SEX_TONE[g.guess].strong}`}>
                      {names(partnerName, g.author_role, g.mine, 'Você')}: {g.guess}
                    </li>
                  ))}
                {t.family > 0 && <li className="rounded-full bg-surface-2 px-3 py-1 text-[12.5px] font-bold text-ink-soft">Família e amigos: {t.family} {t.family === 1 ? 'palpite' : 'palpites'}</li>}
              </ul>
            )}
            {actions.onBolaoLink && (
              <div className="rounded-[20px] bg-lilas-soft/60 px-4 py-3 space-y-2">
                <p className="text-[13.5px] leading-snug text-ink-soft">
                  <span className="font-bold text-ink">O bolão aberto:</span> um link para a família e os amigos votarem pelo WhatsApp, sem baixar nada. Quando vocês descobrirem, cada um vê se acertou.
                </p>
                {(espera.publicVotes?.length ?? 0) > 0 && (
                  <ul className="flex flex-wrap gap-1.5" aria-label="Palpites pelo link">
                    {espera.publicVotes!.slice(-8).map((v, i) => (
                      <li key={`${v.name}-${i}`} className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${SEX_TONE[v.guess].soft} ${SEX_TONE[v.guess].strong}`}>
                        {v.name}: {v.guess}
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={actions.onBolaoLink} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13.5px] font-extrabold text-lilas-strong shadow-soft">
                  <Send className="w-4 h-4" /> {espera.bolaoToken ? 'Enviar o link do bolão' : 'Abrir o bolão para a família e os amigos'}
                </button>
              </div>
            )}
            <button type="button" onClick={() => actions.onShare(espera.plan === 'surpresa' ? 'surpresa' : 'teaser')} className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-lilas-strong">
              <Share2 className="w-4 h-4" /> {espera.plan === 'surpresa' ? 'Compartilhar: vai ser surpresa' : 'Compartilhar: menino ou menina?'}
            </button>
          </section>
        )}

        {!known && stage !== 'envelope' && espera.plan !== 'surpresa' && (
          <section aria-labelledby="espera-registro" className="rounded-[22px] bg-surface-2 px-4 py-4 space-y-3">
            {!registering ? (
              <button type="button" id="espera-registro" onClick={() => setRegistering(true)} className="w-full flex items-center gap-2 text-left">
                <Heart className="w-5 h-5 text-rosa-strong" />
                <span className="flex-1 font-display text-[1.1rem] text-ink">Já descobriram?</span>
                <ChevronRight className="w-4 h-4 text-ink-mute" />
              </button>
            ) : (
              <>
                <h3 id="espera-registro" className="font-display text-[1.1rem] text-ink">
                  É menina ou menino?
                </h3>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="O resultado">
                  {(['menina', 'menino'] as const).map(s => (
                    <button key={s} type="button" aria-pressed={picked === s} onClick={() => setPicked(s)} className={`rounded-[18px] px-4 py-3 font-display text-[1.15rem] transition ${picked === s ? `${SEX_TONE[s].bg} text-white` : 'bg-surface text-ink'}`}>
                      {s === 'menina' ? 'Menina' : 'Menino'}
                    </button>
                  ))}
                </div>
                {partnerName && (
                  <label className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
                    <input type="checkbox" checked={secret} onChange={e => setSecret(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--color-lilas)]" />
                    <span>
                      <span className="font-bold text-ink">
                        <Lock className="inline w-3.5 h-3.5 -mt-0.5" /> Guardar como surpresa para {partnerName}
                      </span>
                      <span className="block">{partnerName} recebe um envelope para abrir quando quiser.</span>
                    </span>
                  </label>
                )}
                <Button disabled={!picked || busy} onClick={() => void actions.onRegister(picked, secret && !!partnerName).then(ok => ok && setRegistering(false))} className="w-full">
                  {busy ? <Loader2 className="animate-spin" /> : <Check />} {secret && partnerName ? 'Guardar no envelope' : 'Guardar e revelar'}
                </Button>
              </>
            )}
            {actions.onEnvelopeLink && (
              <div className="border-t border-line/70 pt-3 space-y-1.5">
                <p className="text-[13.5px] leading-snug text-ink-soft">
                  <span className="font-bold text-ink">Vai ter chá revelação?</span> Mandem um link para quem vai guardar o segredo (a médica, a confeiteira, uma amiga). Ela registra o resultado e só vocês abrem, juntos, na hora.
                </p>
                {espera.envelopeToken && <p className="text-[12.5px] font-bold text-lilas-strong">Esperando quem guarda o segredo registrar 💌</p>}
                <button type="button" onClick={actions.onEnvelopeLink} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13.5px] font-extrabold text-lilas-strong shadow-soft">
                  <Send className="w-4 h-4" /> {espera.envelopeToken ? 'Enviar o link de novo' : 'Enviar o envelope do chá'}
                </button>
              </div>
            )}
          </section>
        )}

        {espera.sex && (
          <button type="button" onClick={() => void actions.onRegister(null, false)} className="text-[12.5px] font-bold text-ink-mute">
            Registraram errado? Desfazer o resultado
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** A revelação: o envelope fechado e, ao abrir, a cor, o coração e o "é menina". */
export function SexReveal({ espera, partnerName, me, onOpen, onShare, onMural, onDone }: { espera: Espera; partnerName: string | null; me: string; onOpen: () => Promise<boolean>; onShare: () => void; onMural: () => Promise<boolean>; onDone: () => void }) {
  useScrollLock();
  const [opening, setOpening] = useState(false);
  const [posted, setPosted] = useState(false);
  const sex = espera.sex;
  const closed = !sex;
  const right = rightGuesses(espera);
  // Quem acertou: o casal e a família pelo nome; quem votou pelo link entra também (até 4 nomes, depois "e mais N").
  const winners = [...right.map(g => names(partnerName, g.author_role, g.mine, me)), ...(espera.publicVotes ?? []).filter(v => v.guess === sex).map(v => v.name)];
  const winnersText = winners.length > 5 ? `${winners.slice(0, 4).join(', ')} e mais ${winners.length - 4}` : winners.join(', ');
  const tone = sex ? SEX_TONE[sex] : null;
  return (
    <div role="dialog" aria-label="A revelação" className={`tt-revelacao fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden overscroll-contain px-6 text-center bg-gradient-to-b ${sex === 'menina' ? 'from-rosa-soft via-rosa-soft' : sex === 'menino' ? 'from-azul-soft via-azul-soft' : 'from-lilas-soft via-rosa-soft'} to-surface`}>
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} className={`tt-revelacao-eco absolute left-1/2 top-[38%] w-56 h-56 -ml-28 -mt-28 rounded-full border-2 ${sex === 'menino' ? 'border-azul/40' : 'border-rosa/40'}`} style={{ animationDelay: `${i * 0.5}s` }} aria-hidden />
      ))}
      {closed ? (
        <>
          <span className="tt-envelope relative text-ink">
            <Envelope className="w-40 h-32" />
          </span>
          <p className="mt-5 text-[12px] font-extrabold uppercase tracking-[0.25em] text-lilas-strong">{espera.sealed ? 'O segredo do chá' : 'Uma revelação para você'}</p>
          <p className="font-display text-[1.8rem] leading-tight text-ink mt-1 max-w-[320px]">{espera.sealed ? 'Menino ou menina? Abram juntos.' : `${partnerName ?? 'Alguém'} guardou: menino ou menina?`}</p>
          <div className="mt-7 flex flex-col gap-2 w-full max-w-[300px]">
            <button
              type="button"
              disabled={opening}
              onClick={async () => {
                setOpening(true);
                await onOpen();
                setOpening(false);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lilas text-white px-5 py-3 font-extrabold shadow-soft disabled:opacity-60"
            >
              {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Abrir o envelope
            </button>
            <button type="button" onClick={onDone} className="rounded-full px-5 py-2.5 text-[14px] font-bold text-ink-soft">
              Abrir depois, juntos
            </button>
          </div>
        </>
      ) : (
        <>
          <BrandMark animated className="tt-revelacao-coracao relative w-36 h-36" />
          <p className={`tt-revelacao-texto mt-4 text-[12px] font-extrabold uppercase tracking-[0.25em] ${tone!.strong}`}>A revelação</p>
          <p className="tt-revelacao-nome font-display text-[3.6rem] leading-none text-ink mt-2">{SEX_WORD[sex!].title}</p>
          <p className="tt-revelacao-texto mt-3 text-[15px] text-ink-soft max-w-[340px]">
            {winners.length ? `Acertaram o palpite: ${winnersText} 🎉` : 'Um capítulo novo da história de vocês.'}
          </p>
          <div className="tt-revelacao-texto mt-6 flex flex-col gap-2 w-full max-w-[320px]">
            <button type="button" onClick={onShare} className={`inline-flex items-center justify-center gap-2 rounded-full ${tone!.bg} text-white px-5 py-3 font-extrabold shadow-soft`}>
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
            {!posted && (
              <button
                type="button"
                onClick={async () => {
                  if (await onMural()) setPosted(true);
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-surface px-5 py-3 font-extrabold shadow-soft ${tone!.strong}`}
              >
                <Heart className="w-4 h-4" /> Guardar no livro e no Mural
              </button>
            )}
            <button type="button" onClick={onDone} className="rounded-full px-5 py-2.5 text-[14px] font-bold text-ink-soft">
              Continuar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** No app da família: o bolão (o palpite de quem é da família) e, depois, a revelação. */
export function FamilyBolao({ espera, busy, onGuess }: { espera: Espera; busy: boolean; onGuess: (guess: Sex | null) => Promise<boolean> }) {
  const t = tally(espera);
  const stage = esperaStage(espera);
  if (stage === 'sabem' && espera.sex) {
    const mine = espera.guesses.find(g => g.mine);
    return (
      <section aria-label="A revelação" className={`rounded-[24px] px-5 py-4 text-center ${SEX_TONE[espera.sex].soft}`}>
        <p className={`text-[12px] font-extrabold uppercase tracking-[0.2em] ${SEX_TONE[espera.sex].strong}`}>A revelação</p>
        <p className="font-display text-[2rem] leading-tight text-ink">
          {SEX_WORD[espera.sex].title} {SEX_WORD[espera.sex].emoji}
        </p>
        {mine && <p className="text-[13.5px] text-ink-soft">{mine.guess === espera.sex ? 'Você acertou o palpite! 🎉' : 'Não foi dessa vez no palpite 😄'}</p>}
      </section>
    );
  }
  return (
    <section aria-labelledby="bolao-familia" className="rounded-[24px] bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft px-5 py-4 space-y-3">
      <div>
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-lilas-strong">{stage === 'surpresa' ? 'Vai ser surpresa até o parto' : 'O bolão'}</p>
        <h2 id="bolao-familia" className="font-display text-[1.3rem] text-ink">
          Menino ou menina? Qual é o seu palpite?
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Seu palpite">
        {(['menina', 'menino'] as const).map(s => {
          const on = t.mine === s;
          return (
            <button key={s} type="button" aria-pressed={on} disabled={busy} onClick={() => void onGuess(on ? null : s)} className={`rounded-[18px] px-4 py-3 transition active:scale-95 ${on ? `bg-surface ring-2 ${SEX_TONE[s].ring}` : 'bg-surface/70'}`}>
              <span className={`block font-display text-[1.15rem] ${on ? SEX_TONE[s].strong : 'text-ink'}`}>{s === 'menina' ? 'Menina' : 'Menino'}</span>
              <span className="block text-[12px] font-bold text-ink-mute">{s === 'menina' ? t.menina : t.menino} palpites</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
