import { useEffect, useState } from 'react';
import { Heart, Loader2, Lock, Share2, Sparkles } from 'lucide-react';
import BrandMark from '../BrandMark';
import Placar, { PlacarBar } from '../espera/Placar';
import { tumtum } from '../../lib/feel';

// As páginas abertas da espera: o bolão (quem recebe o link no WhatsApp vota,
// sem conta) e o envelope do chá (quem guarda o segredo registra o resultado).
// São a primeira vez que muita gente vê o Tumtum: leves, bonitas, com a marca,
// e um convite discreto no pé para quem também está esperando um bebê.

type Sex = 'menina' | 'menino';
interface BolaoView {
  couple: string;
  week: number | null;
  plan: 'descobrir' | 'surpresa' | null;
  testDate: string | null;
  revealed: Sex | null;
  tally: { menina: number; menino: number };
  recent: Array<{ name: string; guess: Sex }>;
  mine: { name: string; guess: Sex } | null;
  teams?: { menina: string[]; menino: string[] };
  latest?: { name: string; guess: Sex; at: string } | null;
}

const TONE: Record<Sex, { soft: string; strong: string; bg: string; bar: string }> = {
  menina: { soft: 'bg-rosa-soft', strong: 'text-rosa-strong', bg: 'bg-rosa', bar: 'bg-rosa' },
  menino: { soft: 'bg-azul-soft', strong: 'text-azul-strong', bg: 'bg-azul', bar: 'bg-azul' },
};
const LABEL: Record<Sex, string> = { menina: 'Menina', menino: 'Menino' };

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
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
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

  const vote = async (guess: Sex) => {
    if (!name.trim()) return setError('Escreva seu nome para o casal saber quem palpitou.');
    setBusy(true);
    setError(null);
    try {
      setView(await call<BolaoView>('POST', '', { op: 'vote', t: token, name: name.trim(), guess }));
      setChanging(false);
      tumtum();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    const text = view.mine ? `Eu sou do Time ${LABEL[view.mine.guess]} no bolão de ${view.couple} 💌 E você? Escolhe o seu time:` : `Menino ou menina? Dá seu palpite no bolão de ${view.couple} 💌`;
    try {
      if (navigator.share) return await navigator.share({ text, url: window.location.href });
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
    } catch {
      /* cancelou: tudo bem */
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
            <h1 className={`tt-revelacao-nome font-display text-[3.2rem] leading-none ${TONE[r].strong}`}>É {r}!</h1>
            {view.mine && <p className="text-[15px] text-ink-soft pt-1">{view.mine.guess === r ? `${view.mine.name}, você acertou o palpite! 🎉` : `${view.mine.name}, não foi dessa vez no palpite 😄`}</p>}
          </>
        ) : (
          <>
            <h1 className="font-display text-[2.3rem] leading-tight text-ink">Menino ou menina?</h1>
            <p className="text-[14.5px] text-ink-soft">{view.plan === 'surpresa' ? 'Eles vão esperar até o parto para saber. Qual é o seu palpite?' : view.testDate ? `Eles descobrem em ${new Date(`${view.testDate}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}. Qual é o seu palpite?` : 'Qual é o seu palpite?'}</p>
          </>
        )}
      </section>

      {/* O placar: o mesmo do app, Time Menina × Time Menino. */}
      <section aria-label="O placar" className="rounded-[24px] bg-surface/85 px-5 py-4 shadow-soft">
        {view.teams ? <Placar teams={view.teams} latest={view.latest} highlight={view.mine?.name ?? null} /> : <PlacarBar menina={view.tally.menina} menino={view.tally.menino} />}
      </section>

      {!r &&
        (voted ? (
          <section className={`rounded-[24px] px-5 py-4 text-center ${TONE[view.mine!.guess].soft}`} role="status">
            <p className="font-display text-[1.45rem] text-ink">
              Você é do <span className={TONE[view.mine!.guess].strong}>Time {LABEL[view.mine!.guess]}</span>!
            </p>
            <p className="text-[13.5px] text-ink-soft">Quando eles descobrirem, é só abrir este link de novo para ver se você acertou.</p>
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" onClick={share} className={`inline-flex items-center gap-1.5 rounded-full ${TONE[view.mine!.guess].bg} px-4 py-2 text-[13.5px] font-extrabold text-white shadow-soft`}>
                <Share2 className="w-4 h-4" /> Chamar gente para o seu time
              </button>
              <button type="button" onClick={() => setChanging(true)} className="rounded-full px-3 py-2 text-[13px] font-bold text-ink-soft">
                Mudar
              </button>
            </div>
          </section>
        ) : (
          <section aria-labelledby="seu-palpite" className="rounded-[24px] bg-surface/85 px-5 py-4 shadow-soft space-y-3">
            <h2 id="seu-palpite" className="font-display text-[1.2rem] text-ink">
              Seu palpite
            </h2>
            <input aria-label="Seu nome" placeholder="Seu nome (tia Bia, vovó Rosa…)" value={name} maxLength={40} onChange={e => setName(e.target.value)} className="w-full rounded-full bg-surface-2 px-4 py-3 text-[15px] text-ink placeholder:text-ink-mute outline-none focus:ring-2 focus:ring-lilas/50" />
            <div className="grid grid-cols-2 gap-2">
              {(['menina', 'menino'] as const).map(s => (
                <button key={s} type="button" disabled={busy} onClick={() => void vote(s)} className={`rounded-[20px] ${TONE[s].bg} px-4 py-4 font-display text-[1.3rem] text-white shadow-soft transition active:scale-95 disabled:opacity-60`}>
                  {LABEL[s]}
                </button>
              ))}
            </div>
          </section>
        ))}
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
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Sex | null>(null);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    document.title = 'O segredo do chá · Tumtum';
    call<{ couple: string }>('GET', `?envelope=${encodeURIComponent(token)}`)
      .then(v => setCouple(v.couple))
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
            <div className="grid grid-cols-2 gap-2">
              {(['menina', 'menino'] as const).map(s => (
                <button key={s} type="button" aria-pressed={picked === s} onClick={() => (setPicked(s), setSure(false))} className={`rounded-[20px] px-4 py-4 font-display text-[1.3rem] transition ${picked === s ? `${TONE[s].bg} text-white shadow-soft` : 'bg-surface-2 text-ink'}`}>
                  É {s}
                </button>
              ))}
            </div>
            {picked && (
              <label className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
                <input type="checkbox" checked={sure} onChange={e => setSure(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--color-lilas)]" />
                <span>Conferi: é {picked}. Depois de fechar, o envelope não abre de novo por aqui.</span>
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
