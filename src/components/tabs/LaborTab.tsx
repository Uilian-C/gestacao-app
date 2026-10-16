import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ClipboardCopy, Footprints, Luggage, Printer, RefreshCw, RotateCcw, Timer, Trash2 } from 'lucide-react';
import { BAG_ITEM_COUNT, HOSPITAL_BAG } from '../../data/hospitalBag';
import { BIRTH_TYPE, PLAN_SECTIONS, planProgress, planToText, toPlan, type BirthPlan } from '../../lib/birthPlan';
import { formatBR, parseTimestamp, toISODate } from '../../lib/dates';
import { formatDuration, laborStatus, summarizeKicks, timeContractions, type LaborStatus } from '../../lib/labor';
import type { Author, BirthPlanRecord, Contraction, KickSession } from '../../types';
import AuthorBadge from '../AuthorBadge';
import { inputClass } from '../styles';
import { Button, Card, Chip, EmptyState, Field, Segmented, SectionTitle } from '../ui';

type View = 'movimentos' | 'contracoes' | 'plano' | 'mala';

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

export default function LaborTab(props: Props) {
  const [view, setView] = useState<View>(() => (props.currentWeek >= 28 ? 'movimentos' : 'plano'));

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h2 className="text-[1.2rem] text-ink">Reta final</h2>
        <div className="-mx-1 px-1 overflow-x-auto no-scrollbar [&>div]:flex-nowrap">
          <Segmented
            label="Ferramenta"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'movimentos', label: 'Movimentos' },
              { value: 'contracoes', label: 'Contrações' },
              { value: 'plano', label: 'Plano' },
              { value: 'mala', label: 'Mala' },
            ]}
          />
        </div>
      </div>

      {!props.available && view !== 'mala' && (
        <p className="text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">
          Para salvar contagens, contrações e o plano, rodem a migração <code>db/migrations/004_parto.sql</code> no Neon.
        </p>
      )}

      {view === 'movimentos' && <KickCounter {...props} />}
      {view === 'contracoes' && <ContractionTimer {...props} />}
      {view === 'plano' && <BirthPlanEditor key={props.birthPlan?.updated_at ?? 'novo'} {...props} />}
      {view === 'mala' && <HospitalBag {...props} />}
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
            <p className="font-semibold text-ink">Plano de parto</p>
            <p className="text-xs text-ink-mute">
              {Math.round(progress * 100)}% preenchido
              {birthPlan?.updated_at && <> · salvo em {formatBR(birthPlan.updated_at)}</>}
            </p>
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

function HospitalBag({ packed, checksAvailable, busy, onTogglePacked }: Props) {
  const done = HOSPITAL_BAG.reduce((n, g) => n + g.items.filter(i => packed.has(i.id)).length, 0);
  return (
    <Card>
      <SectionTitle icon={<Luggage className="w-5 h-5" />} title="Mala da maternidade" subtitle="Deixem pronta até 36 semanas. Confiram também a lista da maternidade de vocês." />
      {!checksAvailable && <p className="text-xs text-warn bg-warn-soft rounded-2xl px-3 py-2 mb-3">Para marcar itens, rode a migração 007 no Neon.</p>}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={BAG_ITEM_COUNT} aria-label="Itens separados">
          <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${(done / BAG_ITEM_COUNT) * 100}%` }} />
        </div>
        <span className="text-xs text-ink-mute tabular">{done} de {BAG_ITEM_COUNT}</span>
      </div>
      <div className="space-y-5">
        {HOSPITAL_BAG.map(g => (
          <div key={g.id}>
            <h3 className="text-sm font-semibold text-ink mb-1">{g.title}</h3>
            <ul>
              {g.items.map(i => {
                const isDone = packed.has(i.id);
                return (
                  <li key={i.id}>
                    <label className="flex items-center gap-3 py-2 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 accent-[var(--c-ok)] shrink-0" checked={isDone} disabled={busy || !checksAvailable} onChange={e => onTogglePacked(i.id, e.target.checked)} />
                      <span className={`text-sm ${isDone ? 'text-ink-mute line-through' : 'text-ink'}`}>{i.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
