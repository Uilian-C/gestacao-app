import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronRight, ClipboardCopy, FileHeart, Footprints, Luggage, Printer, RefreshCw, RotateCcw, Siren, Timer, Trash2 } from 'lucide-react';
import { HOSPITAL_BAG } from '../../content/hospitalBag';
import type { ListItem } from '../../hooks/useGestationData';
import { AddItem, HiddenItems, MenuButton, RowMenu } from '../EditableList';
import { useRowMenu } from '../../hooks/useRowMenu';
import { BIRTH_TYPE, PLAN_SECTIONS, planProgress, planToText, toPlan, type BirthPlan } from '../../lib/birthPlan';
import { formatBR, parseTimestamp, toISODate } from '../../lib/dates';
import { formatDuration, laborStatus, summarizeKicks, timeContractions, type LaborStatus } from '../../lib/labor';
import type { Author, BirthPlanRecord, Contraction, KickSession } from '../../types';
import AlertSigns from '../AlertSigns';
import AuthorBadge from '../AuthorBadge';
import Sheet from '../Sheet';
import { inputClass } from '../styles';
import { Button, Card, Chip, EmptyState, Field, Segmented, SectionTitle } from '../ui';

type Tool = 'movimentos' | 'contracoes' | 'plano' | 'mala';
type BagGroupId = 'mae' | 'bebe' | 'acompanhante';

interface Props {
  author: Author;
  currentWeek: number;
  motherName: string | null;
  kickSessions: KickSession[];
  contractions: Contraction[];
  birthPlan: BirthPlanRecord | null;
  available: boolean;
  busy: boolean;
  onSaveKicks: (s: { startedAt: string; endedAt: string; kicks: number; target: number }) => Promise<boolean>;
  onDeleteKicks: (s: KickSession) => void;
  onSaveContraction: (c: { startedAt: string; endedAt: string }) => Promise<boolean>;
  onDeleteContraction: (id: string) => void;
  onSavePlan: (plan: BirthPlan) => Promise<boolean>;
  onRefresh: () => void;
  onNotify: (text: string) => void;
  /** Itens da mala já separados. */
  packed: Set<string>;
  checksAvailable: boolean;
  onTogglePacked: (itemId: string, done: boolean) => void;
  /** Itens que o casal pôs na mala e os da lista padrão que ocultou. */
  bagItems: ListItem[];
  hiddenBag: Set<string>;
  listsAvailable: boolean;
  onAddItem: (title: string, group: BagGroupId) => Promise<boolean>;
  onRenameItem: (item: ListItem, title: string) => Promise<boolean>;
  onDeleteItem: (item: ListItem) => void;
  onHideItem: (itemId: string, hidden: boolean) => void;
}

// O que está em andamento fica guardado no aparelho: fechar o app no meio não perde a contagem.
const KICK_KEY = 'nossa-gestacao:contagem-movimentos';
const CONTRACTION_KEY = 'nossa-gestacao:contracao-em-andamento';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Armazenamento bloqueado: a contagem vale só enquanto a tela estiver aberta.
  }
}

/** Relógio que atualiza a cada segundo enquanto `active`. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

// O Parto por fases: uma página só, com a fase em que vocês estão em destaque
// e as ferramentas de cada fase (o plano e a mala; os movimentos; as
// contrações e a hora de ir). Cada uma abre como página com "voltar".

type PhaseId = 'preparar' | 'reta' | 'hora';
const PHASES: Array<{ id: PhaseId; title: string; weeks: string; from: number; text: string }> = [
  { id: 'preparar', title: 'Preparar', weeks: 'até 28 semanas', from: 0, text: 'Com calma, um pouco por vez: o plano de parto e a mala.' },
  { id: 'reta', title: 'Reta final', weeks: '28 a 36 semanas', from: 28, text: 'Contar os movimentos do bebê e deixar a mala pronta até 36 semanas.' },
  { id: 'hora', title: 'Chegou a hora', weeks: '37 semanas em diante', from: 37, text: 'Marcar as contrações juntos e saber a hora de ir para a maternidade.' },
];
const phaseOf = (week: number) => [...PHASES].reverse().find(p => week >= p.from)!.id;

const TOOLS: Record<Tool, { title: string; subtitle: string }> = {
  plano: { title: 'Plano de parto', subtitle: 'O que vocês desejam para o nascimento, para conversar com o obstetra.' },
  mala: { title: 'Mala da maternidade', subtitle: 'Deixem pronta até 36 semanas. Ajustem ao que a maternidade de vocês pede.' },
  movimentos: { title: 'Movimentos do bebê', subtitle: 'Contar até 10 movimentos ajuda a notar mudanças.' },
  contracoes: { title: 'Contrações', subtitle: 'Um sente, o outro marca. O app avisa quando chegar a hora.' },
};

export default function LaborTab(props: Props) {
  const [tool, setTool] = useState<Tool | null>(null);
  const back = () => {
    setTool(null);
    window.scrollTo({ top: 0 });
  };

  if (tool) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <button type="button" onClick={back} className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft">
            <ArrowLeft className="w-4 h-4" /> Parto
          </button>
          <div className="px-1">
            <h1 className="font-display text-[1.5rem] leading-tight text-ink">{TOOLS[tool].title}</h1>
            <p className="text-[14px] text-ink-soft">{TOOLS[tool].subtitle}</p>
          </div>
        </div>
        {!props.available && tool !== 'mala' && (
          <p className="text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">
            Para salvar contagens, contrações e o plano, rodem a migração <code>db/migrations/004_parto.sql</code> no Neon.
          </p>
        )}
        {tool === 'movimentos' && <KickCounter {...props} />}
        {tool === 'contracoes' && <ContractionTimer {...props} />}
        {tool === 'plano' && <BirthPlanEditor key={props.birthPlan?.updated_at ?? 'novo'} {...props} />}
        {tool === 'mala' && <HospitalBag {...props} />}
      </div>
    );
  }
  return (
    <LaborHome
      {...props}
      onOpen={t => {
        setTool(t);
        window.scrollTo({ top: 0 });
      }}
    />
  );
}

function LaborHome(props: Props & { onOpen: (t: Tool) => void }) {
  const [signs, setSigns] = useState(false);
  const week = props.currentWeek;
  const now = phaseOf(week);
  const at = PHASES.findIndex(p => p.id === now);
  const phase = PHASES[at];
  const toTerm = Math.max(0, 40 - week);

  const plan = props.birthPlan ? Math.round(planProgress(toPlan(props.birthPlan.data)) * 100) : 0;
  const bag = bagGroups(props);
  const bagTotal = bag.reduce((n, g) => n + g.rows.length, 0);
  const bagDone = bag.reduce((n, g) => n + g.rows.filter(r => props.packed.has(r.id)).length, 0);
  const lastKick = summarizeKicks(props.kickSessions)[0];
  const today = toISODate(new Date());
  const contractionsToday = props.contractions.filter(c => toISODate(parseTimestamp(c.started_at)) === today).length;

  const rows: Record<PhaseId, Array<{ id: string; icon: React.ReactNode; title: string; hint: string; done?: boolean; tone?: 'alert'; onClick: () => void }>> = {
    preparar: [
      { id: 'plano', icon: <FileHeart />, title: 'Plano de parto', hint: plan ? `${plan}% preenchido${props.birthPlan && toPlan(props.birthPlan.data).discussedWithDoctor ? ' · conversado com o obstetra' : ''}` : 'Ainda em branco', done: plan >= 100, onClick: () => props.onOpen('plano') },
      { id: 'mala', icon: <Luggage />, title: 'Mala da maternidade', hint: `${bagDone} de ${bagTotal} itens separados`, done: bagTotal > 0 && bagDone === bagTotal, onClick: () => props.onOpen('mala') },
    ],
    reta: [
      { id: 'movimentos', icon: <Footprints />, title: 'Movimentos do bebê', hint: lastKick ? `Última: ${lastKick.session.kicks}/${lastKick.session.target} em ${Math.round(lastKick.minutes)} min, ${formatBR(lastKick.session.started_at)}` : week < 28 ? 'Costuma começar em 28 semanas' : 'Nenhuma contagem ainda', onClick: () => props.onOpen('movimentos') },
    ],
    hora: [
      { id: 'contracoes', icon: <Timer />, title: 'Contrações', hint: contractionsToday ? `${contractionsToday} hoje` : 'Um sente, o outro marca', onClick: () => props.onOpen('contracoes') },
      { id: 'sinais', icon: <Siren />, title: 'Quando ir para a maternidade', hint: 'Os sinais que não esperam', tone: 'alert', onClick: () => setSigns(true) },
    ],
  };

  return (
    <div className="space-y-5">
      {/* A fase de agora, com o caminho até o colo. */}
      <section aria-label="A fase de vocês" className="rounded-[28px] bg-gradient-to-br from-rosa-soft via-lilas-soft/70 to-azul-soft/50 p-5 space-y-4">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa-strong">
            Semana {week} · {toTerm ? `faltam ${toTerm} ${toTerm === 1 ? 'semana' : 'semanas'}` : 'a qualquer momento'}
          </p>
          <h2 className="font-display text-[1.5rem] leading-tight text-ink mt-0.5">{phase.title}</h2>
          <p className="text-[14px] text-ink-soft mt-0.5">{phase.text}</p>
        </div>
        <ol className="flex items-center gap-1.5" aria-label="As fases até o parto">
          {PHASES.map((p, i) => (
            <li key={p.id} className="flex-1 min-w-0" aria-current={i === at ? 'step' : undefined}>
              <span className={`block h-1.5 rounded-full ${i < at ? 'bg-rosa/60' : i === at ? 'bg-rosa' : 'bg-surface/80'}`} />
              <span className={`block mt-1.5 text-[11.5px] truncate ${i === at ? 'font-extrabold text-rosa-strong' : 'font-semibold text-ink-mute'}`}>{p.title}</span>
            </li>
          ))}
        </ol>
        {now === 'hora' && (
          <button type="button" onClick={() => props.onOpen('contracoes')} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rosa text-on-accent px-5 py-3 text-[15px] font-extrabold">
            <Timer className="w-5 h-5" /> Marcar contrações
          </button>
        )}
      </section>

      {/* As fases, na ordem: a de agora em destaque; cada linha abre a ferramenta. */}
      {PHASES.map((p, i) => (
        <section key={p.id} aria-labelledby={`fase-${p.id}`} className="space-y-2">
          <h3 id={`fase-${p.id}`} className="flex items-baseline gap-2 px-1">
            <span className={`text-[15px] font-extrabold ${i === at ? 'text-ink' : 'text-ink-soft'}`}>{p.title}</span>
            <span className="text-[12.5px] text-ink-mute">{p.weeks}</span>
            {i === at && <span className="rounded-full bg-rosa-soft text-rosa-strong px-2 py-0.5 text-[11px] font-extrabold">agora</span>}
          </h3>
          <ul className={`rounded-[24px] divide-y divide-line/60 ${i === at ? 'bg-surface' : 'bg-surface/60'}`}>
            {rows[p.id].map(r => (
              <li key={r.id}>
                <button type="button" onClick={r.onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                  <span className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px] ${r.tone === 'alert' ? 'bg-alert-soft text-alert' : r.done ? 'bg-ok-soft text-ok' : 'bg-rosa-soft text-rosa-strong'}`}>{r.done ? <Check /> : r.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-ink">{r.title}</span>
                    <span className="block text-[12.5px] text-ink-soft truncate">{r.hint}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {signs && (
        <Sheet title="Quando ir para a maternidade" onClose={() => setSigns(false)}>
          <AlertSigns open />
        </Sheet>
      )}
    </div>
  );
}

/* ---------------- Movimentos do bebê ---------------- */

interface KickRun {
  startedAt: string;
  kicks: number;
  target: number;
}

function KickCounter({ currentWeek, kickSessions, available, busy, onSaveKicks, onDeleteKicks }: Props) {
  const [run, setRunState] = useState<KickRun | null>(() => readJson<KickRun>(KICK_KEY));
  const setRun = (next: KickRun | null) => {
    setRunState(next);
    writeJson(KICK_KEY, next);
  };
  const now = useNow(run !== null);
  const elapsed = run ? now - new Date(run.startedAt).getTime() : 0;
  const reached = run ? run.kicks >= run.target : false;
  const history = summarizeKicks(kickSessions).slice(0, 10);

  const save = async () => {
    if (!run) return;
    const ok = await onSaveKicks({ startedAt: run.startedAt, endedAt: new Date().toISOString(), kicks: run.kicks, target: run.target });
    if (ok) setRun(null);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
      <Card className="text-center space-y-5">
        {currentWeek < 28 && <p className="text-sm text-ink-mute">A contagem costuma começar a partir de 28 semanas, quando o obstetra orientar.</p>}
        {!run ? (
          <div className="space-y-4 py-4">
            <p className="text-ink-soft max-w-sm mx-auto">Num momento em que o bebê costuma estar ativo, a mãe deita de lado e o casal conta cada movimento até chegar à meta.</p>
            <Button onClick={() => setRun({ startedAt: new Date().toISOString(), kicks: 0, target: 10 })} className="!px-8 !py-3 !text-base">
              <Footprints className="w-5 h-5" /> Começar contagem
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex justify-center gap-8 tabular">
              <div>
                <p className="text-xs text-ink-mute">Movimentos</p>
                <p className="text-4xl font-semibold text-ink">{run.kicks}<span className="text-xl text-ink-mute">/{run.target}</span></p>
              </div>
              <div>
                <p className="text-xs text-ink-mute">Tempo</p>
                <p className="text-4xl font-semibold text-ink">{formatDuration(elapsed)}</p>
              </div>
            </div>
            <button
              onClick={() => setRun({ ...run, kicks: run.kicks + 1 })}
              className="mx-auto w-44 h-44 rounded-full bg-brand text-on-accent text-2xl font-semibold shadow-lg active:scale-95 transition flex flex-col items-center justify-center gap-1"
              aria-label="Registrar um movimento"
            >
              <Footprints className="w-8 h-8" />
              Mexeu!
            </button>
            {reached && <p className="text-ok font-semibold">Meta alcançada em {formatDuration(elapsed)}. Podem salvar.</p>}
            <div className="flex flex-wrap justify-center gap-2">
              <Button tone="ghost" onClick={() => setRun({ ...run, kicks: Math.max(0, run.kicks - 1) })} disabled={run.kicks === 0}>
                <RotateCcw className="w-4 h-4" /> Desfazer
              </Button>
              <Button tone="ghost" onClick={() => setRun(null)}>Descartar</Button>
              <Button onClick={save} disabled={busy || !available || run.kicks === 0}>Concluir e salvar</Button>
            </div>
          </div>
        )}
        <p className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-3 text-left flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Se o bebê está mexendo menos do que costuma, não esperem a contagem terminar nem a próxima consulta: procurem a maternidade.</span>
        </p>
      </Card>

      <Card>
        <SectionTitle title="Contagens anteriores" subtitle="Comparar o tempo até a meta ajuda a notar mudanças." />
        {history.length === 0 ? (
          <EmptyState icon={<Footprints />} title="Nenhuma contagem ainda" />
        ) : (
          <ul className="space-y-2">
            {history.map(({ session, minutes, reachedTarget }) => (
              <li key={session.id} className={`flex items-center justify-between gap-2 rounded-2xl border p-3 ${reachedTarget ? 'border-transparent bg-surface-2/60' : 'border-alert/40 bg-alert-soft/40'}`}>
                <div className="min-w-0">
                  <p className="font-semibold text-ink tabular">
                    {session.kicks}/{session.target} em {Math.round(minutes)} min
                  </p>
                  <p className="text-xs text-ink-mute flex flex-wrap items-center gap-1.5">
                    {parseTimestamp(session.started_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    <AuthorBadge role={session.created_by} />
                    {!reachedTarget && <span className="text-alert font-semibold">meta não alcançada</span>}
                  </p>
                </div>
                <button onClick={() => onDeleteKicks(session)} aria-label="Excluir contagem" className="p-1.5 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Contrações ---------------- */

const SIGNAL: Record<LaborStatus['signal'], { tone: 'neutral' | 'brand' | 'warn' | 'alert'; title: string; text: string }> = {
  nenhum: { tone: 'neutral', title: 'Nenhuma contração na última hora', text: 'Toque em "Começou" quando sentir a próxima.' },
  irregular: { tone: 'neutral', title: 'Ainda sem ritmo', text: 'Contrações espaçadas ou irregulares. Continuem marcando.' },
  ritmo: { tone: 'warn', title: 'Começando a ganhar ritmo', text: 'Sigam marcando. Preparem a mala e o caminho até a maternidade.' },
  '511': { tone: 'alert', title: 'Padrão 5-1-1: hora de ligar', text: 'Contrações a cada 5 minutos ou menos, de 1 minuto, por 1 hora. Liguem para o obstetra ou sigam para a maternidade, como combinado.' },
  prematuro: { tone: 'alert', title: 'Contrações frequentes antes de 37 semanas', text: 'Isso é sinal de alerta. Procurem a maternidade.' },
};

function ContractionTimer({ currentWeek, contractions, available, busy, onSaveContraction, onDeleteContraction, onRefresh }: Props) {
  const [startedAt, setStartedState] = useState<string | null>(() => readJson<string>(CONTRACTION_KEY));
  const setStarted = (v: string | null) => {
    setStartedState(v);
    writeJson(CONTRACTION_KEY, v);
  };
  const now = useNow(true);
  const timed = timeContractions(contractions);
  const status = laborStatus(timed, currentWeek, new Date(now));
  const today = toISODate(new Date(now));
  const todays = timed.filter(c => toISODate(c.start) === today).reverse();
  const signal =
    status.signal === 'ritmo' && currentWeek < 37
      ? { tone: 'warn' as const, title: 'Contrações com ritmo antes de 37 semanas', text: 'Fiquem atentos: se chegarem a 4 ou mais em 1 hora, ou vierem com dor, sangramento ou perda de líquido, procurem a maternidade.' }
      : SIGNAL[status.signal];
  const toneClass = { neutral: 'bg-surface-2 text-ink', brand: 'bg-brand-soft text-ink', warn: 'bg-warn-soft text-ink', alert: 'bg-alert-soft text-alert' }[signal.tone];

  const finish = async () => {
    if (!startedAt) return;
    const ok = await onSaveContraction({ startedAt, endedAt: new Date().toISOString() });
    if (ok) setStarted(null);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
      <Card className="text-center space-y-5">
        <div className="py-2 space-y-4">
          {startedAt ? (
            <>
              <p className="text-xs text-ink-mute">Contração em andamento</p>
              <p className="text-5xl font-semibold text-ink tabular">{formatDuration(now - new Date(startedAt).getTime())}</p>
              <button onClick={finish} disabled={busy || !available} className="mx-auto w-44 h-44 rounded-full bg-alert text-white text-2xl font-semibold shadow-lg active:scale-95 transition disabled:opacity-50">
                Terminou
              </button>
              <Button tone="ghost" onClick={() => setStarted(null)}>Cancelar esta</Button>
            </>
          ) : (
            <>
              <p className="text-ink-soft max-w-sm mx-auto">Um sente, o outro marca: toque quando a contração começar e de novo quando terminar.</p>
              <button onClick={() => setStarted(new Date().toISOString())} disabled={!available} className="mx-auto w-44 h-44 rounded-full bg-brand text-on-accent text-2xl font-semibold shadow-lg active:scale-95 transition disabled:opacity-50">
                Começou
              </button>
            </>
          )}
        </div>

        <div className={`rounded-2xl p-4 text-left space-y-1 ${toneClass}`} role={signal.tone === 'alert' ? 'alert' : undefined}>
          <p className="font-semibold flex items-center gap-2">{signal.tone === 'alert' && <AlertTriangle className="w-4 h-4" />}{signal.title}</p>
          <p className="text-sm">{signal.text}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-left">
          <Stat label="Na última hora" value={String(status.lastHourCount)} />
          <Stat label="Duração média" value={status.avgDurationSec !== null ? formatDuration(status.avgDurationSec * 1000) : '—'} />
          <Stat label="Intervalo médio" value={status.avgIntervalMin !== null ? `${status.avgIntervalMin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} min` : '—'} />
        </div>

        <p className="text-xs text-ink-mute text-left">
          Independentemente do ritmo, procurem a maternidade se a bolsa romper, se houver sangramento ou se o bebê mexer menos. Em gestações seguintes ou partos rápidos anteriores, o obstetra pode pedir para ir antes do 5-1-1.
        </p>
      </Card>

      <Card>
        <SectionTitle
          title="Hoje"
          subtitle="Intervalo contado do início de uma ao início da próxima."
          action={
            <button onClick={onRefresh} aria-label="Atualizar com o outro celular" className="p-2 rounded-full text-ink-mute hover:bg-surface-2">
              <RefreshCw className="w-4 h-4" />
            </button>
          }
        />
        {todays.length === 0 ? (
          <EmptyState icon={<Timer />} title="Nenhuma contração hoje" />
        ) : (
          <ul className="space-y-2">
            {todays.map(c => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-2xl border border-transparent bg-surface-2/60 p-3">
                <div className="min-w-0 tabular">
                  <p className="font-semibold text-ink">
                    {c.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {formatDuration(c.durationSec * 1000)}
                  </p>
                  <p className="text-xs text-ink-mute flex items-center gap-1.5">
                    {c.intervalMin !== null ? `${c.intervalMin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} min depois da anterior` : 'primeira'}
                    <AuthorBadge role={c.author} />
                  </p>
                </div>
                <button onClick={() => onDeleteContraction(c.id)} aria-label="Excluir contração" className="p-1.5 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="text-xs text-ink-mute">{label}</p>
      <p className="text-xl font-semibold text-ink tabular">{value}</p>
    </div>
  );
}

/* ---------------- Plano de parto ---------------- */

function BirthPlanEditor({ birthPlan, motherName, available, busy, onSavePlan, onNotify }: Props) {
  const [plan, setPlan] = useState<BirthPlan>(() => toPlan(birthPlan?.data));
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const update = (patch: Partial<BirthPlan>) => {
    setPlan(p => ({ ...p, ...patch }));
    setDirty(true);
  };
  const toggle = (section: string, option: string) => {
    const current = plan.choices[section] ?? [];
    update({ choices: { ...plan.choices, [section]: current.includes(option) ? current.filter(o => o !== option) : [...current, option] } });
  };
  const progress = planProgress(plan);

  const save = async () => {
    if (await onSavePlan(plan)) setDirty(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planToText(plan, motherName));
      onNotify('Plano copiado. Cole no WhatsApp ou no e-mail do obstetra.');
    } catch {
      onNotify('Não foi possível copiar. Use Imprimir / PDF.');
    }
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="no-print flex flex-wrap justify-between gap-2">
          <Button tone="ghost" onClick={() => setPreview(false)}>Voltar a editar</Button>
          <div className="flex gap-2">
            <Button tone="soft" onClick={copy}><ClipboardCopy className="w-4 h-4" /> Copiar texto</Button>
            <Button onClick={() => window.print()}><Printer className="w-4 h-4" /> Imprimir / PDF</Button>
          </div>
        </div>
        <article className="print-area rounded-[28px] bg-surface shadow-soft p-6 md:p-8 space-y-5 print:border-0 print:p-0">
          <header className="border-b border-line pb-4 space-y-1">
            <p className="text-sm font-semibold text-brand">Plano de parto</p>
            <h2 className="text-2xl font-semibold text-ink">{motherName ?? 'Gestante'}</h2>
            <dl className="grid sm:grid-cols-2 gap-2 pt-2 text-sm">
              {plan.birthType && <div><dt className="text-ink-mute text-xs">Parto desejado</dt><dd className="font-semibold">{BIRTH_TYPE[plan.birthType]}</dd></div>}
              {plan.maternity && <div><dt className="text-ink-mute text-xs">Maternidade</dt><dd className="font-semibold">{plan.maternity}</dd></div>}
              {plan.companion && <div><dt className="text-ink-mute text-xs">Acompanhante</dt><dd className="font-semibold">{plan.companion}</dd></div>}
              {plan.doula && <div><dt className="text-ink-mute text-xs">Doula</dt><dd className="font-semibold">{plan.doula}</dd></div>}
            </dl>
          </header>
          {PLAN_SECTIONS.map(s => {
            const chosen = plan.choices[s.id] ?? [];
            const note = plan.notes[s.id]?.trim();
            if (!chosen.length && !note) return null;
            return (
              <section key={s.id} className="space-y-1.5 break-inside-avoid">
                <h3 className="font-semibold text-ink">{s.title}</h3>
                <ul className="list-disc pl-5 text-sm text-ink space-y-0.5">{chosen.map(c => <li key={c}>{c}</li>)}</ul>
                {note && <p className="text-sm text-ink-soft">{note}</p>}
              </section>
            );
          })}
          <footer className="border-t border-line pt-3 text-xs text-ink-mute space-y-1">
            <p>{plan.discussedWithDoctor ? 'Plano conversado com o obstetra.' : 'Plano ainda não conversado com o obstetra.'}</p>
            <p>Sabemos que imprevistos podem mudar o plano; pedimos que qualquer mudança seja explicada a nós.</p>
          </footer>
        </article>
      </div>
    );
  }

  const summary = (id: string) => {
    const n = (plan.choices[id] ?? []).length + (plan.notes[id]?.trim() ? 1 : 0);
    return n ? `${(plan.choices[id] ?? []).length} escolha${(plan.choices[id] ?? []).length === 1 ? '' : 's'}` : 'em aberto';
  };
  const basics = [plan.birthType && BIRTH_TYPE[plan.birthType], plan.maternity, plan.companion].filter(Boolean).join(' · ') || 'em aberto';

  return (
    <div className="space-y-4">
      <Card className="!py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink">{Math.round(progress * 100)}% preenchido</p>
            <p className="text-xs text-ink-mute">{birthPlan?.updated_at ? `Salvo em ${formatBR(birthPlan.updated_at)}` : 'Ainda não salvo'}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button tone="ghost" onClick={() => setPreview(true)} className="!px-3"><Printer className="w-4 h-4" /> Ver</Button>
            <Button onClick={save} disabled={busy || !available || !dirty} className="!px-4">{dirty ? 'Salvar' : 'Salvo'}</Button>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Plano preenchido">
          <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      </Card>

      <Card className="!py-2">
        <ul className="divide-y divide-line">
          <PlanRow title="O básico" summary={basics} open={openSection === 'basico'} onToggle={() => setOpenSection(openSection === 'basico' ? null : 'basico')}>
            <div className="space-y-4">
              <Segmented label="Tipo de parto" size="sm" value={plan.birthType || 'decidir'} onChange={v => update({ birthType: v })} options={[{ value: 'normal', label: 'Normal' }, { value: 'cesarea', label: 'Cesárea' }, { value: 'decidir', label: 'Decidir com a equipe' }]} />
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Maternidade" htmlFor="p-mat"><input id="p-mat" className={inputClass} value={plan.maternity} onChange={e => update({ maternity: e.target.value })} /></Field>
                <Field label="Acompanhante" htmlFor="p-acomp" hint="Direito garantido por lei."><input id="p-acomp" className={inputClass} value={plan.companion} onChange={e => update({ companion: e.target.value })} /></Field>
                <Field label="Doula (opcional)" htmlFor="p-doula"><input id="p-doula" className={inputClass} value={plan.doula} onChange={e => update({ doula: e.target.value })} /></Field>
              </div>
            </div>
          </PlanRow>
          {PLAN_SECTIONS.map(s => (
            <PlanRow key={s.id} title={s.title} summary={summary(s.id)} open={openSection === s.id} onToggle={() => setOpenSection(openSection === s.id ? null : s.id)}>
              <div className="space-y-3">
                {s.hint && <p className="text-xs text-ink-mute">{s.hint}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {s.options.map(o => (
                    <Chip key={o} active={(plan.choices[s.id] ?? []).includes(o)} onClick={() => toggle(s.id, o)}>{o}</Chip>
                  ))}
                </div>
                <input aria-label={`Observações sobre ${s.title}`} className={`${inputClass} !py-2 text-sm`} placeholder="Observação (opcional)" value={plan.notes[s.id] ?? ''} onChange={e => update({ notes: { ...plan.notes, [s.id]: e.target.value } })} />
              </div>
            </PlanRow>
          ))}
        </ul>
      </Card>

      <label className="flex items-center gap-3 cursor-pointer px-2">
        <input type="checkbox" className="w-5 h-5 accent-[var(--c-brand)]" checked={plan.discussedWithDoctor} onChange={e => update({ discussedWithDoctor: e.target.checked })} />
        <span className="text-sm text-ink">Já conversamos este plano com o obstetra</span>
      </label>
      {dirty && (
        <div className="sticky bottom-28 md:bottom-4 z-10 flex justify-center">
          <Button onClick={save} disabled={busy || !available} className="shadow-lift">Salvar alterações</Button>
        </div>
      )}
    </div>
  );
}

function PlanRow({ title, summary, open, onToggle, children }: { title: string; summary: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 py-3 text-left">
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink text-[15px]">{title}</span>
          <span className="block text-xs text-ink-mute truncate">{summary}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-mute transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </li>
  );
}

/* ---------------- Mala da maternidade ---------------- */

/** Cada grupo da mala: os itens da lista padrão que valem para o casal e os que eles puseram. */
function bagGroups({ bagItems, hiddenBag }: Pick<Props, 'bagItems' | 'hiddenBag'>) {
  return HOSPITAL_BAG.map(g => ({
    ...g,
    rows: [
      ...g.items.filter(i => !hiddenBag.has(i.id)).map(i => ({ id: i.id, label: i.label, custom: null as ListItem | null })),
      ...bagItems.filter(i => (i.bag_group ?? 'mae') === g.id).map(i => ({ id: i.id, label: i.title, custom: i })),
    ],
  }));
}

function HospitalBag({ packed, checksAvailable, busy, onTogglePacked, bagItems, hiddenBag, listsAvailable, onAddItem, onRenameItem, onDeleteItem, onHideItem }: Props) {
  const menu = useRowMenu();
  const groups = bagGroups({ bagItems, hiddenBag });
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const done = groups.reduce((n, g) => n + g.rows.filter(r => packed.has(r.id)).length, 0);
  const hidden = HOSPITAL_BAG.flatMap(g => g.items).filter(i => hiddenBag.has(i.id));

  return (
    <Card>
      {!checksAvailable && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2 mb-3">Para marcar itens, rode a migração 007 no Neon.</p>}
      {!listsAvailable && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2 mb-3">Para pôr itens próprios na mala, rode a migração 011 no Neon.</p>}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Itens separados">
          <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        <span className="text-xs text-ink-mute tabular">{done} de {total}</span>
      </div>
      <div className="space-y-5">
        {groups.map(g => (
          <div key={g.id}>
            <h3 className="text-sm font-semibold text-ink mb-1">{g.title}</h3>
            <ul>
              {g.rows.map(r => {
                const isDone = packed.has(r.id);
                return (
                  <li key={r.id}>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 min-w-0 flex items-center gap-3 py-2 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 accent-[var(--c-ok)] shrink-0" checked={isDone} disabled={busy || !checksAvailable} onChange={e => onTogglePacked(r.id, e.target.checked)} />
                        <span className={`text-sm ${isDone ? 'text-ink-mute line-through' : 'text-ink'}`}>{r.label}</span>
                        {r.custom && <span className="text-[11px] font-bold text-brand-strong bg-brand-soft rounded-full px-2 py-0.5 shrink-0">de vocês</span>}
                      </label>
                      {listsAvailable && <MenuButton open={menu.open === r.id} label={r.label} onClick={() => menu.toggle(r.id)} />}
                    </div>
                    {menu.open === r.id && (
                      <RowMenu
                        onDone={menu.close}
                        actions={
                          r.custom
                            ? { custom: { title: r.label, onRename: t => onRenameItem(r.custom!, t), onDelete: () => onDeleteItem(r.custom!) } }
                            : { onHide: () => onHideItem(r.id, true) }
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            {listsAvailable && <AddItem placeholder={g.id === 'bebe' ? 'Ex.: Pomada para assaduras' : g.id === 'mae' ? 'Ex.: Travesseiro de amamentação' : 'Ex.: Cobertor'} disabled={busy} onAdd={title => onAddItem(title, g.id as BagGroupId)} />}
          </div>
        ))}
      </div>
      <HiddenItems items={hidden} onShow={id => onHideItem(id, false)} />
    </Card>
  );
}
