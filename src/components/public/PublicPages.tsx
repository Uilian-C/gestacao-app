import { useEffect, useRef, useState } from 'react';
import { Check, Heart, Loader2, Lock, Share2, Sparkles } from 'lucide-react';
import BrandMark from '../BrandMark';
import Placar, { PlacarBar } from '../espera/Placar';
import { tumtum } from '../../lib/feel';
import { OPTION, questionFor } from '../../lib/espera';
import { drawCard, shareImage, voterCard } from '../../lib/shareCard';

// As páginas abertas da espera: o bolão (quem recebe o link no WhatsApp vota,
// sem conta) e o envelope do chá (quem guarda o segredo registra o resultado).
// São a primeira vez que muita gente vê o Tumtum: leves, bonitas, com a marca,
// e um convite discreto no pé para quem também está esperando um bebê.

type Sex = 'menina' | 'menino' | 'meninas' | 'meninos' | 'casal';
interface BolaoView {
  couple: string;
  week: number | null;
  plan: 'descobrir' | 'surpresa' | null;
  testDate: string | null;
  revealed: Sex | null;
  /** As opções do bolão (menina/menino; para gêmeos, meninas/casal/meninos). */
  options?: Sex[];
  twins?: boolean;
  tally: Partial<Record<Sex, number>>;
  recent: Array<{ name: string; guess: Sex }>;
  mine: { name: string; guess: Sex } | null;
  teams?: Partial<Record<Sex, string[]>>;
  latest?: { name: string; guess: Sex; at: string } | null;
}

const ROSA = { soft: 'bg-rosa-soft', strong: 'text-rosa-strong', bg: 'bg-rosa', bar: 'bg-rosa' };
const AZUL = { soft: 'bg-azul-soft', strong: 'text-azul-strong', bg: 'bg-azul', bar: 'bg-azul' };
const LILAS = { soft: 'bg-lilas-soft', strong: 'text-lilas-strong', bg: 'bg-lilas', bar: 'bg-lilas' };
const TONE: Record<Sex, { soft: string; strong: string; bg: string; bar: string }> = { menina: ROSA, meninas: ROSA, menino: AZUL, meninos: AZUL, casal: LILAS };
/** O nome do time sem o "Time" ("Menina", "Casal"…). */
const LABEL: Record<Sex, string> = { menina: 'Menina', menino: 'Menino', meninas: 'Meninas', meninos: 'Meninos', casal: 'Casal' };
const NAME_KEY = 'tumtum:palpite-nome';

async function call<T>(method: 'GET' | 'POST', query: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/palpite${query}`, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Não foi possível carregar agora.');
  return data;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(closest-side,var(--color-rosa-soft),var(--color-lilas-soft)_60%,transparent)] opacity-80 blur-2xl" aria-hidden />
      <main className="relative mx-auto max-w-[480px] px-4 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-12 space-y-5">
        <header className="flex items-center justify-center gap-2">
          <BrandMark className="w-8 h-8" />
          <span className="font-display text-[1.35rem] text-ink">tumtum</span>
        </header>
        {children}
      </main>
    </div>
  );
}

/** O convite no pé: para quem também está esperando um bebê. */
function Invite({ onClick }: { onClick: () => void }) {
  return (
    <a href="/" onClick={onClick} className="block rounded-[24px] bg-surface/80 px-5 py-4 shadow-soft">
      <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-lilas-strong">
        <Heart className="w-3.5 h-3.5" /> Esperando um bebê também?
      </span>
      <span className="block font-display text-[1.15rem] leading-snug text-ink mt-0.5">O Tumtum é o app do casal na gestação</span>
      <span className="block text-[13.5px] text-ink-soft">O diário, as consultas, o bolão e um livro do bebê que se escreve sozinho. Criem o espaço de vocês ›</span>
    </a>
  );
}

function Loading({ error }: { error: string | null }) {
  return (
    <Frame>
      <div className="rounded-[24px] bg-surface/80 p-8 text-center text-ink-soft" role="status">
        {error ? <p>{error}</p> : <Loader2 className="w-6 h-6 mx-auto animate-spin" aria-label="Carregando" />}
      </div>
    </Frame>
  );
}

export function BolaoPage({ token }: { token: string }) {
  const [view, setView] = useState<BolaoView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  // O nome é obrigatório: sem ele, o campo chama a atenção (treme e mostra o aviso logo embaixo).
  const [nameMissing, setNameMissing] = useState(0);
  const [justVoted, setJustVoted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (justVoted) doneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [justVoted]);
  useEffect(() => {
    document.title = 'Menino ou menina? · Bolão no Tumtum';
    call<BolaoView>('GET', `?t=${encodeURIComponent(token)}`)
      .then(v => {
        setView(v);
        if (v.mine) setName(v.mine.name);
      })
      .catch(err => setError((err as Error).message));
  }, [token]);
  if (!view) return <Loading error={error} />;
  const twins = !!view.twins;
  const options: Sex[] = view.options ?? ['menina', 'menino'];

  const vote = async (guess: Sex) => {
    if (name.trim().length < 2) {
      setNameMissing(n => n + 1);
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setView(await call<BolaoView>('POST', '', { op: 'vote', t: token, name: name.trim(), guess }));
      setChanging(false);
      setJustVoted(true);
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* sem armazenamento: só não lembra */
      }
      tumtum();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  /** Sair do bolão: apaga o palpite (o nome sai do placar). */
  const leave = async () => {
    setBusy(true);
    setError(null);
    try {
      setView(await call<BolaoView>('POST', '', { op: 'unvote', t: token }));
      setLeaving(false);
      setJustVoted(false);
      setChanging(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const shareText = () => (view.mine ? `Eu sou do Time ${LABEL[view.mine.guess]} no bolão de ${view.couple} 💌 E você? Escolhe o seu time: ${window.location.href}` : `${questionFor(twins)} Dá seu palpite no bolão de ${view.couple} 💌 ${window.location.href}`);
  /** Só o link (texto), pelo compartilhar do celular ou copiado. */
  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ text: shareText() });
      await navigator.clipboard.writeText(shareText());
    } catch {
      /* cancelou: tudo bem */
    }
  };
  /** O cartão "Eu sou do Time Menina!" (stories e status), com o link junto na mensagem. */
  const shareCardImage = async (download: boolean) => {
    if (!view.mine) return;
    setSharing(true);
    try {
      const blob = await drawCard(voterCard({ guess: view.mine.guess, couple: view.couple, options, counts: view.tally }), 'story');
      await shareImage(blob, `bolao-time-${view.mine.guess}`, download, shareText());
    } catch (err) {
      console.error(err);
      await share();
    } finally {
      setSharing(false);
    }
  };
  const r = view.revealed;
  const voted = view.mine && !changing;

  return (
    <Frame>
      <section className="text-center space-y-1 pt-2">
        <p className="text-[13px] font-extrabold text-rosa">{view.week !== null ? `${view.couple} · semana ${view.week}` : view.couple}</p>
        {r ? (
          <>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-ink-mute">A revelação</p>
            <h1 className={`tt-revelacao-nome font-display text-[3.2rem] leading-none ${TONE[r].strong}`}>{OPTION[r].title}!</h1>
            {view.mine && <p className="text-[15px] text-ink-soft pt-1">{view.mine.guess === r ? `${view.mine.name}, você acertou o palpite! 🎉` : `${view.mine.name}, não foi dessa vez no palpite 😄`}</p>}
          </>
        ) : (
          <>
            <h1 className="font-display text-[2.3rem] leading-tight text-ink">{questionFor(twins)}</h1>
            {twins && <p className="text-[13px] font-extrabold text-lilas-strong">São gêmeos! 👶👶</p>}
            <p className="text-[14.5px] text-ink-soft">{view.plan === 'surpresa' ? 'Eles vão esperar até o parto para saber. Qual é o seu palpite?' : view.testDate ? `Eles descobrem em ${new Date(`${view.testDate}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}. Qual é o seu palpite?` : 'Qual é o seu palpite?'}</p>
          </>
        )}
      </section>

      {!r &&
        (voted ? (
          <section ref={doneRef} className={`tt-carimbo rounded-[24px] px-5 py-5 text-center shadow-soft ${TONE[view.mine!.guess].soft}`} role="status" aria-label="Palpite registrado">
            <span className={`mx-auto mb-2 flex w-12 h-12 items-center justify-center rounded-full ${TONE[view.mine!.guess].bg} text-white shadow-soft`} aria-hidden>
              <Check className="w-6 h-6" strokeWidth={3} />
            </span>
            <p className={`text-[12px] font-extrabold uppercase tracking-[0.2em] ${TONE[view.mine!.guess].strong}`}>Palpite registrado</p>
            <p className="font-display text-[1.45rem] leading-snug text-ink">
              {view.mine!.name}, você é do <span className={TONE[view.mine!.guess].strong}>Time {LABEL[view.mine!.guess]}</span>!
            </p>
            <p className="text-[13.5px] text-ink-soft">Seu nome já está no placar. Quando eles descobrirem, é só abrir este link de novo para ver se você acertou.</p>
            <div className="mt-4 space-y-2">
              <button type="button" disabled={sharing} onClick={() => void shareCardImage(false)} className={`w-full inline-flex items-center justify-center gap-2 rounded-full ${TONE[view.mine!.guess].bg} px-4 py-3 text-[14.5px] font-extrabold text-white shadow-soft disabled:opacity-60`}>
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Postar que sou do Time {LABEL[view.mine!.guess]}
              </button>
              <p className="text-[12px] text-ink-mute">Um cartão para os stories e o status, com o link do bolão junto.</p>
              <div className="flex flex-wrap justify-center gap-x-1 [&>button]:whitespace-nowrap">
                <button type="button" onClick={() => void share()} className="rounded-full px-3 py-1.5 text-[13px] font-bold text-ink-soft">
                  Só o link
                </button>
                <button type="button" disabled={sharing} onClick={() => void shareCardImage(true)} className="rounded-full px-3 py-1.5 text-[13px] font-bold text-ink-soft">
                  Salvar imagem
                </button>
                <button type="button" onClick={() => (setChanging(true), setJustVoted(false))} className="rounded-full px-3 py-1.5 text-[13px] font-bold text-ink-soft">
                  Mudar
                </button>
              </div>
            </div>
            {leaving ? (
              <div className="mt-3 rounded-2xl bg-surface/80 px-4 py-3 space-y-2" role="group" aria-label="Sair do bolão">
                <p className="text-[13.5px] text-ink">Tirar o seu palpite? Seu nome sai do placar.</p>
                <div className="flex justify-center gap-2">
                  <button type="button" disabled={busy} onClick={() => void leave()} className="rounded-full bg-alert px-4 py-1.5 text-[13px] font-extrabold text-white disabled:opacity-60">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, sair do bolão'}
                  </button>
                  <button type="button" onClick={() => setLeaving(false)} className="rounded-full px-4 py-1.5 text-[13px] font-bold text-ink-soft">
                    Ficar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setLeaving(true)} className="mt-2 text-[12.5px] font-bold text-ink-mute underline-offset-2 hover:underline">
                Sair do bolão
              </button>
            )}
          </section>
        ) : (
          <section aria-labelledby="seu-palpite" className="rounded-[24px] bg-surface/90 px-5 py-5 shadow-soft space-y-4">
            <h2 id="seu-palpite" className="font-display text-[1.3rem] text-ink">
              Dê o seu palpite
            </h2>
            <div className="space-y-1.5">
              <label htmlFor="palpite-nome" className="block text-[13.5px] font-extrabold text-ink">
                1. Seu nome <span className="font-bold text-ink-mute">(obrigatório)</span>
              </label>
              <input
                id="palpite-nome"
                ref={nameRef}
                key={nameMissing}
                aria-label="Seu nome"
                aria-invalid={nameMissing > 0 && name.trim().length < 2}
                aria-describedby="palpite-nome-aviso"
                placeholder="Como o casal te chama (tia Bia, vovó Rosa…)"
                value={name}
                maxLength={40}
                onChange={e => setName(e.target.value)}
                className={`w-full rounded-full bg-surface-2 px-4 py-3 text-[15px] text-ink placeholder:text-ink-mute outline-none focus:ring-2 focus:ring-lilas/50 ${nameMissing > 0 && name.trim().length < 2 ? 'tt-tremer ring-2 ring-alert' : ''}`}
              />
              {nameMissing > 0 && name.trim().length < 2 && (
                <p id="palpite-nome-aviso" role="alert" className="px-2 text-[13px] font-bold text-alert">
                  Escreva seu nome primeiro, para o casal saber que o palpite é seu.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-[13.5px] font-extrabold text-ink">2. Escolha o seu time</p>
              <div className={`grid ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                {options.map(s => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => void vote(s)}
                    className={`rounded-[20px] ${TONE[s].bg} px-4 py-4 font-display text-[1.3rem] text-white shadow-soft transition active:scale-95 disabled:opacity-60 ${name.trim().length < 2 ? 'opacity-45' : ''}`}
                  >
                    {busy ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : twins ? OPTION[s].label : `Time ${LABEL[s]}`}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ))}

      {/* O placar: o mesmo do app, Time Menina × Time Menino. */}
      <section aria-label="O placar" className="rounded-[24px] bg-surface/85 px-5 py-4 shadow-soft">
        {view.teams ? <Placar teams={view.teams} latest={view.latest} highlight={view.mine?.name ?? null} /> : <PlacarBar options={options} counts={view.tally} />}
      </section>

      {error && (
        <p role="alert" className="rounded-2xl bg-alert-soft px-4 py-2.5 text-center text-sm text-alert">
          {error}
        </p>
      )}
      <Invite onClick={() => void call('POST', '', { op: 'conhecer', t: token }).catch(() => undefined)} />
    </Frame>
  );
}

export function EnvelopePage({ token }: { token: string }) {
  const [couple, setCouple] = useState<string | null>(null);
  const [envOptions, setEnvOptions] = useState<Sex[]>(['menina', 'menino']);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Sex | null>(null);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    document.title = 'O segredo do chá · Tumtum';
    call<{ couple: string; options?: Sex[] }>('GET', `?envelope=${encodeURIComponent(token)}`)
      .then(v => {
        setCouple(v.couple);
        if (v.options) setEnvOptions(v.options);
      })
      .catch(err => setError((err as Error).message));
  }, [token]);
  if (!couple && !done) return <Loading error={error} />;
  const seal = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await call('POST', '', { op: 'seal', envelope: token, sex: picked });
      tumtum();
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Frame>
      {done ? (
        <section className="rounded-[26px] bg-surface/85 px-5 py-8 text-center shadow-soft space-y-2" role="status">
          <span className="tt-envelope inline-block">
            <Lock className="w-12 h-12 mx-auto text-lilas-strong" />
          </span>
          <h1 className="font-display text-[1.8rem] text-ink">Envelope fechado 💌</h1>
          <p className="text-[14.5px] text-ink-soft">O segredo está guardado. {couple} só vão saber na hora de abrir, juntos. Obrigado por fazer parte desse momento!</p>
        </section>
      ) : (
        <>
          <section className="text-center space-y-1.5 pt-2">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-lilas-strong">O segredo do chá</p>
            <h1 className="font-display text-[2rem] leading-tight text-ink">{couple} confiaram a você o segredo 💌</h1>
            <p className="text-[14.5px] text-ink-soft">Quando souber se é menino ou menina, registre aqui. Ninguém vê: o casal só abre o envelope na hora da revelação.</p>
          </section>
          <section aria-label="O resultado" className="rounded-[24px] bg-surface/85 px-5 py-4 shadow-soft space-y-3">
            <div className={`grid ${envOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
              {envOptions.map(s => (
                <button key={s} type="button" aria-pressed={picked === s} onClick={() => (setPicked(s), setSure(false))} className={`rounded-[20px] px-3 py-4 font-display text-[1.15rem] leading-tight transition ${picked === s ? `${TONE[s].bg} text-white shadow-soft` : 'bg-surface-2 text-ink'}`}>
                  {OPTION[s].title}
                </button>
              ))}
            </div>
            {picked && (
              <label className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
                <input type="checkbox" checked={sure} onChange={e => setSure(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--color-lilas)]" />
                <span>Conferi: {OPTION[picked].it}. Depois de fechar, o envelope não abre de novo por aqui.</span>
              </label>
            )}
            <button type="button" disabled={!picked || !sure || busy} onClick={() => void seal()} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-lilas px-5 py-3 font-extrabold text-white shadow-soft disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Fechar o envelope
            </button>
          </section>
          {error && (
            <p role="alert" className="rounded-2xl bg-alert-soft px-4 py-2.5 text-center text-sm text-alert">
              {error}
            </p>
          )}
        </>
      )}
    </Frame>
  );
}
