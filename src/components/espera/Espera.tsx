import { useState } from 'react';
import { AlertTriangle, CalendarHeart, Check, ChevronRight, Heart, Loader2, Lock, NotebookPen, Send, Share2, Sparkles } from 'lucide-react';
import { daysToTest, esperaStage, isTwins, latestVote, OPTION, questionFor, rightGuesses, SEX_WORD, tally, teamsOf, type Espera, type GuessRole, type Sex, type SexPlan } from '../../lib/espera';
import { useScrollLock } from '../../hooks/useScrollLock';
import BrandMark from '../BrandMark';
import Sheet from '../Sheet';
import { Button, Segmented } from '../ui';
import Placar, { PlacarBar } from './Placar';

// A espera: menino ou menina? O cartão do Início muda com a jornada de cada
// casal (a pergunta, o bolão, a contagem para o exame, a surpresa até o parto,
// a revelação guardada, o "é menina"), a folha cuida do plano, do palpite e do
// registro, e a revelação abre como um envelope, no ritmo do tum-tum.

const ROLE_WORD: Record<GuessRole, string> = { mae: 'Mãe', pai: 'Pai', familia: 'Família' };
const ROSA = { soft: 'bg-rosa-soft', strong: 'text-rosa-strong', bg: 'bg-rosa', ring: 'ring-rosa' };
const AZUL = { soft: 'bg-azul-soft', strong: 'text-azul-strong', bg: 'bg-azul', ring: 'ring-azul' };
const LILAS = { soft: 'bg-lilas-soft', strong: 'text-lilas-strong', bg: 'bg-lilas', ring: 'ring-lilas' };
const SEX_TONE: Record<Sex, { soft: string; strong: string; bg: string; ring: string }> = { menina: ROSA, meninas: ROSA, menino: AZUL, meninos: AZUL, casal: LILAS };

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
  const ask = questionFor(isTwins(espera)).toLowerCase();
  if (stage === 'envelope') {
    return (
      <button type="button" onClick={onReveal} aria-label={`Abrir a revelação: ${isTwins(espera) ? 'meninas, meninos ou um casal' : 'menino ou menina'}`} className="w-full flex items-center gap-4 rounded-[26px] bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft px-5 py-4 text-left shadow-soft transition active:scale-[0.99]">
        <span className="tt-envelope shrink-0 text-ink">
          <Envelope className="w-16 h-12" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[12px] font-extrabold uppercase tracking-wide text-lilas-strong">{espera.sealed ? 'O segredo do chá' : 'Uma revelação para você'}</span>
          <span className="block font-display text-[1.2rem] leading-snug text-ink">{espera.sealed ? `O envelope está guardado: ${ask}` : `${partnerName ?? 'Alguém'} guardou: ${ask}`}</span>
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
              : questionFor(isTwins(espera));
  const sub = known
    ? finalists
      ? `${finalists} ${finalists === 1 ? 'nome' : 'nomes'} na lista final`
      : ideas
        ? `${ideas} ${ideas === 1 ? 'ideia' : 'ideias'} de nome · hora da lista final`
        : isTwins(espera)
          ? 'E os nomes? Comecem o caderno'
          : 'E o nome? Comecem o caderno'
    : stage === 'guardado'
      ? 'Só você sabe, até a outra pessoa abrir'
      : stage === 'pergunta'
        ? 'Já sabem, vão descobrir ou vai ser surpresa?'
        : t.total
          ? `${t.total} ${t.total === 1 ? 'palpite' : 'palpites'} no bolão`
          : 'Qual é o seu palpite? Abra o bolão';
  return (
    <button type="button" onClick={known ? onNames : onOpen} aria-label={`${title}: abrir`} className={`w-full flex items-center gap-3 rounded-[26px] px-5 py-4 text-left shadow-soft transition active:scale-[0.99] ${known ? `${SEX_TONE[known].soft}` : 'bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft'}`}>
      <span className="flex-1 min-w-0">
        <span className={`flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide ${known ? SEX_TONE[known].strong : 'text-lilas-strong'}`}>
          {known ? <NotebookPen className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />} {kicker}
        </span>
        <span className="block font-display text-[1.25rem] leading-snug text-ink">{title}</span>
        <span className="block text-[13px] text-ink-soft">{sub}</span>
        {!known && stage !== 'pergunta' && stage !== 'guardado' && t.total > 0 && (
          <span className="mt-2 block">
            <PlacarBar options={t.options} counts={t.counts} size="sm" />
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
  /** Um bebê ou gêmeos (migração 037). */
  onBabies?: (babies: 1 | 2) => Promise<boolean>;
  /** Chamar mais gente: o cartão do placar com o link do bolão aberto. */
  onInvite?: () => void;
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
  // Com o plano já escolhido (ao abrir a folha), ele vira uma linha com "Mudar" e
  // o bolão ganha o destaque. Na primeira vez, fica aberto até marcarem a data.
  const [configured] = useState(espera.plan !== null);
  const [editing, setEditing] = useState(false);
  const [confirmBabies, setConfirmBabies] = useState<1 | 2 | null>(null);
  const planControls = (
<section aria-labelledby="espera-plano" className="space-y-3">
            <h3 id="espera-plano" className={configured ? 'sr-only' : 'text-[15px] font-bold text-ink'}>
              Como vai ser a espera de vocês?
            </h3>
            {actions.onBabies && (
              <Segmented
                value={t.options.length === 3 ? 'gemeos' : 'um'}
                label="Quantos bebês"
                full
                onChange={v => {
                  const n = v === 'gemeos' ? 2 : 1;
                  if (n === (isTwins(espera) ? 2 : 1)) return;
                  // Com palpites no placar, confirma antes: as opções do bolão mudam.
                  if (t.total > 0) setConfirmBabies(n);
                  else void actions.onBabies!(n);
                }}
                options={[
                  { value: 'um', label: 'Um bebê' },
                  { value: 'gemeos', label: 'Gêmeos 👶👶' },
                ]}
              />
            )}
            {confirmBabies && (
              <div role="alertdialog" aria-label="Mudar a quantidade de bebês" className="rounded-2xl bg-lilas-soft px-4 py-3 space-y-2.5">
                <p className="text-[13.5px] leading-snug text-ink">
                  <span className="font-bold">{confirmBabies === 2 ? 'Mudar para gêmeos?' : 'Mudar para um bebê?'}</span> O bolão passa a ser {confirmBabies === 2 ? 'duas meninas, um casal ou dois meninos' : 'menina ou menino'}. Os {t.total} {t.total === 1 ? 'palpite de agora fica guardado' : 'palpites de agora ficam guardados'} e {t.total === 1 ? 'volta' : 'voltam'} se vocês desfizerem a mudança.
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => void actions.onBabies!(confirmBabies).then(() => setConfirmBabies(null))} className="flex-1 rounded-full bg-lilas-strong px-4 py-2 text-[13.5px] font-extrabold text-white disabled:opacity-60">
                    Sim, mudar
                  </button>
                  <button type="button" onClick={() => setConfirmBabies(null)} className="flex-1 rounded-full bg-surface px-4 py-2 text-[13.5px] font-bold text-ink-soft">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
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
  );

  return (
    <Sheet title="A espera" subtitle={`${questionFor(isTwins(espera))} Cada casal vive de um jeito.`} icon={<Sparkles />} onClose={onClose}>
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

        {!known && stage !== 'envelope' && !configured && planControls}
        {!known && stage !== 'envelope' && (
          <section aria-labelledby="espera-bolao" className="rounded-[24px] bg-surface shadow-soft px-4 py-4 space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id="espera-bolao" className="font-display text-[1.25rem] text-ink">
                O bolão
              </h3>
              {t.total > 0 && <span className="text-[12.5px] font-bold text-ink-mute">{t.total} {t.total === 1 ? 'palpite' : 'palpites'}</span>}
            </div>
            <Placar teams={teamsOf(espera)} latest={latestVote(espera)} highlight="Você" />
            {/* O seu palpite: um toque entra para um time (de novo, sai). */}
            <div role="group" aria-label="Seu palpite" className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold text-ink-soft shrink-0">Seu time:</span>
              {t.options.map(s => {
                const on = t.mine === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    disabled={busy}
                    onClick={() => void actions.onGuess(on ? null : s)}
                    className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-[14px] font-extrabold transition active:scale-95 ${on ? `${SEX_TONE[s].bg} text-white shadow-soft` : `${SEX_TONE[s].soft} ${SEX_TONE[s].strong}`}`}
                  >
                    {OPTION[s].label}
                  </button>
                );
              })}
            </div>
            {actions.onInvite && (
              <div className="space-y-1.5">
                <Button onClick={actions.onInvite} className="w-full">
                  <Send /> Chamar mais gente
                </Button>
                <p className="text-center text-[12px] text-ink-mute">O link do bolão vai junto com o placar: quem recebe vota pelo WhatsApp, sem baixar nada.</p>
              </div>
            )}
          </section>
        )}

        {!known && stage !== 'envelope' && configured && (
          <section aria-label="Como vai ser a espera" className="rounded-[22px] bg-surface-2 px-4 py-3 space-y-3">
            {!editing ? (
              <div className="flex items-center gap-3">
                <CalendarHeart className="w-5 h-5 shrink-0 text-lilas-strong" aria-hidden />
                <p className="flex-1 min-w-0 text-[13.5px] text-ink-soft">
                  <span className="font-bold text-ink">{isTwins(espera) ? 'Gêmeos' : 'Um bebê'}</span>
                  {' · '}
                  {espera.plan === 'surpresa' ? 'Surpresa até o parto' : espera.testDate ? `Descobrem em ${new Date(`${espera.testDate}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}` : 'Vão descobrir'}
                  {!!espera.parked && <span className="block text-[12px] text-ink-mute">{espera.parked} {espera.parked === 1 ? 'palpite guardado' : 'palpites guardados'} de antes da mudança</span>}
                </p>
                <button type="button" onClick={() => setEditing(true)} className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-[12.5px] font-extrabold text-ink-soft shadow-soft">
                  Mudar
                </button>
              </div>
            ) : (
              <>
                <p className="flex items-start gap-2 rounded-2xl bg-surface px-3 py-2.5 text-[12.5px] leading-snug text-ink-soft" role="note">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-lilas-strong" aria-hidden />
                  <span>Quem já votou vê as mudanças. Trocar entre um bebê e gêmeos muda as opções do bolão.</span>
                </p>
                {planControls}
                <button type="button" onClick={() => (setEditing(false), setConfirmBabies(null))} className="w-full rounded-full bg-surface px-4 py-2 text-[13.5px] font-extrabold text-ink-soft shadow-soft">
                  Pronto
                </button>
              </>
            )}
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
                  {t.options.length === 3 ? 'Os gêmeos são…' : 'É menina ou menino?'}
                </h3>
                <div className={`grid ${t.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`} role="group" aria-label="O resultado">
                  {t.options.map(s => (
                    <button key={s} type="button" aria-pressed={picked === s} onClick={() => setPicked(s)} className={`rounded-[18px] px-3 py-3 font-display text-[1.05rem] leading-tight transition ${picked === s ? `${SEX_TONE[s].bg} text-white` : 'bg-surface text-ink'}`}>
                      {OPTION[s].label}
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
          <p className="font-display text-[1.8rem] leading-tight text-ink mt-1 max-w-[320px]">{espera.sealed ? `${questionFor(isTwins(espera))} Abram juntos.` : `${partnerName ?? 'Alguém'} guardou: ${questionFor(isTwins(espera)).toLowerCase()}`}</p>
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
          {t.options.length === 3 ? 'Os gêmeos: qual é o seu palpite?' : 'Menino ou menina? Qual é o seu palpite?'}
        </h2>
      </div>
      <div className={`grid ${t.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`} role="group" aria-label="Seu palpite">
        {t.options.map(s => {
          const on = t.mine === s;
          return (
            <button key={s} type="button" aria-pressed={on} disabled={busy} onClick={() => void onGuess(on ? null : s)} className={`rounded-[18px] px-3 py-3 transition active:scale-95 ${on ? `bg-surface ring-2 ${SEX_TONE[s].ring}` : 'bg-surface/70'}`}>
              <span className={`block font-display text-[1.05rem] leading-tight ${on ? SEX_TONE[s].strong : 'text-ink'}`}>{OPTION[s].label}</span>
              <span className="block text-[12px] font-bold text-ink-mute">{t.counts[s] ?? 0} palpites</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
