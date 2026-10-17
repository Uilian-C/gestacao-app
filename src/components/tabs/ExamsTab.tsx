import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronRight, FileText, FlaskConical, ImagePlus, Loader2, Lock, Paperclip, Plus, ScanHeart, Search, Trash2, Users, X } from 'lucide-react';
import { examFileUrl } from '../../api';
import { PLAN_ITEMS, type PlanItem } from '../../content/prenatalPlan';
import type { ExamFile, ExamItem, ExamKind, Reaction, ThreadComment } from '../../hooks/useGestationData';
import { ReactionBar, SocialCount, Thread, type OnReact } from '../Social';
import Sheet from '../Sheet';
import { bySeries, byTrimester, searchExams } from '../../lib/examArchive';
import { formatBR, gestationalAge, localDay, parseLocalDate, toISODate } from '../../lib/dates';
import { planExams } from '../../lib/journey';
import { FileProblem, formatSize, prepareFile, type PreparedFile } from '../../lib/examFiles';
import { appointmentTitle, kindOf } from '../../lib/appointments';
import type { Consultation } from '../../types';
import AuthorBadge from '../AuthorBadge';
import PhotoViewer from '../PhotoViewer';
import { inputClass } from '../styles';
import { Button, Card, Chip, EmptyState, Field, Pill, SectionTitle, Segmented } from '../ui';

export interface NewExam {
  kind: ExamKind;
  title: string;
  date: string;
  planItem: string | null;
  notes: string | null;
  visibility: 'private' | 'shared';
  /** Agendamento de onde veio o resultado. */
  appointmentId?: string | null;
}

/** Grava o exame (ou junta arquivos a um que já existe). Devolve a mensagem de erro, ou null se deu certo. */
export type SaveExam = (exam: NewExam | null, examId: string | null, files: PreparedFile[], onProgress: (sent: number) => void) => Promise<string | null>;

interface Props {
  exams: ExamItem[];
  available: boolean;
  dumDate: string;
  currentWeek: number;
  bloodType: string | null;
  busy: boolean;
  onSave: SaveExam;
  onDelete: (exam: ExamItem) => void;
  onDeleteFile: (exam: ExamItem, file: ExamFile) => void;
  /** Abre já o formulário para este item da jornada (vindo do Início). */
  initialPlanItem?: string | null;
  /** Abre já o formulário preenchido com este agendamento (exame ou ultrassom que aconteceu). */
  fromAppointment?: Consultation | null;
  /** Leva até este resultado na lista. */
  focusExam?: string | null;
  social: ExamSocial;
}

/** Reações e conversa nos exames (migração 011). */
export interface ExamSocial {
  available: boolean;
  reactions: Reaction[];
  threads: ThreadComment[];
  onReact: OnReact;
  onThread: (targetType: 'exam', targetId: string, body: string) => Promise<boolean>;
  onDeleteThread: (c: ThreadComment) => void;
}

const KIND_LABEL: Record<ExamKind, string> = { ultrassom: 'Ultrassom', exame: 'Exame', outro: 'Outro' };
const KIND_ICON: Record<ExamKind, typeof ScanHeart> = { ultrassom: ScanHeart, exame: FlaskConical, outro: FileText };
const isImage = (f: ExamFile) => f.content_type.startsWith('image/');

const kindFor = (item: PlanItem): ExamKind => (item.id.startsWith('morfo') ? 'ultrassom' : 'exame');

export default function ExamsTab(props: Props) {
  const [filter, setFilter] = useState<ExamKind | 'todos'>('todos');
  const [formFor, setFormFor] = useState<PlanItem | 'novo' | 'agendado' | null>(() => (props.fromAppointment ? 'agendado' : (PLAN_ITEMS.find(i => i.id === props.initialPlanItem) ?? null)));
  const [viewer, setViewer] = useState<{ exam: ExamItem; index: number } | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'tempo' | 'exame'>('tempo');
  // Vindo de "Ver resultado" (agendamento ou calendário), o resultado já abre.
  const [openId, setOpenId] = useState<string | null>(props.focusExam ?? null);

  const plan = planExams(props.bloodType);
  const saved = new Set(props.exams.map(e => e.plan_item).filter(Boolean));
  // Exames da jornada com a janela aberta agora e ainda sem resultado guardado.
  const dueNow = plan.filter(i => !saved.has(i.id) && props.currentWeek >= i.from && props.currentWeek <= i.to + 2);
  const shown = searchExams(
    props.exams.filter(e => filter === 'todos' || e.kind === filter),
    query,
  );
  const opened = openId ? props.exams.find(e => e.id === openId) : undefined;
  const row = (e: ExamItem) => <ExamRow key={e.id} exam={e} dumDate={props.dumDate} social={props.social} onOpen={() => setOpenId(e.id)} />;
  const kinds = (['ultrassom', 'exame', 'outro'] as ExamKind[]).filter(k => props.exams.some(e => e.kind === k));

  // Se o exame aberto no visualizador sumir (apagado), fecha.
  const viewing = viewer && props.exams.find(e => e.id === viewer.exam.id);
  const viewerImages = viewing ? viewing.files.filter(isImage) : [];

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          icon={<ScanHeart className="w-5 h-5" />}
          title="Resultados"
          subtitle="Laudos, fotos e PDFs dos exames e ultrassons já feitos, num lugar só. Para marcar um exame, use Agendados."
        />

        {props.available && props.exams.length > 0 && !formFor && (
          <Button onClick={() => setFormFor('novo')} className="w-full mb-4">
            <Camera /> Guardar resultado
          </Button>
        )}

        {!props.available && (
          <p className="text-sm text-warn bg-warn-soft rounded-2xl p-4">
            Para guardar exames, rode a migração <code>db/migrations/010_exames.sql</code> no Neon.
          </p>
        )}

        {props.available && formFor && (
          <ExamForm
            key={typeof formFor === 'string' ? formFor : formFor.id}
            plan={plan}
            preset={typeof formFor === 'string' ? null : formFor}
            appointment={formFor === 'agendado' ? props.fromAppointment : null}
            busy={props.busy}
            onSave={props.onSave}
            onDone={() => setFormFor(null)}
          />
        )}

        {props.available && !formFor && dueNow.length > 0 && (
          <div className="rounded-2xl bg-brand-soft/60 p-4 space-y-2 mb-4">
            <p className="text-sm font-semibold text-ink">Na janela agora</p>
            <div className="flex flex-wrap gap-2">
              {dueNow.map(i => (
                <button key={i.id} type="button" onClick={() => setFormFor(i)} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm text-ink shadow-soft hover:text-brand">
                  <Camera className="w-3.5 h-3.5" /> {i.short}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-mute">Toque para guardar o resultado quando ficar pronto. O item é marcado como feito na jornada.</p>
          </div>
        )}

        {props.available && !formFor && props.exams.length === 0 && (
          <EmptyState icon={<Camera />} title="Nenhum exame guardado ainda">
            <p>Tire uma foto do resultado ou junte o PDF do laboratório. Fica tudo aqui, para vocês dois.</p>
            <div className="pt-3">
              <Button onClick={() => setFormFor('novo')}>
                <Plus /> Guardar o primeiro exame
              </Button>
            </div>
          </EmptyState>
        )}

        {props.exams.length > 0 && (
          <div className="space-y-3 mb-4">
            <label className="relative block">
              <Search className="w-4 h-4 text-ink-mute absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
              <input type="search" aria-label="Buscar resultado" placeholder="Buscar: hemograma, morfológico, glicemia..." className={`${inputClass} !pl-10`} value={query} onChange={e => setQuery(e.target.value)} />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Segmented label="Organizar" size="sm" value={mode} onChange={setMode} options={[{ value: 'tempo', label: 'Linha do tempo' }, { value: 'exame', label: 'Por exame' }]} />
              {kinds.length > 1 && (
                <div className="flex flex-wrap gap-1.5" aria-label="Filtrar">
                  <Chip active={filter === 'todos'} onClick={() => setFilter('todos')}>Todos</Chip>
                  {kinds.map(k => (
                    <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
                      {KIND_LABEL[k]}s · {props.exams.filter(e => e.kind === k).length}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {props.exams.length > 0 && shown.length === 0 && <p className="text-sm text-ink-mute py-6 text-center">Nenhum resultado com “{query}”.</p>}

        {query.trim() ? (
          <div className="space-y-2">{shown.map(row)}</div>
        ) : mode === 'tempo' ? (
          <div className="space-y-3">
            {byTrimester(shown, props.dumDate).map((g, i) => (
              <details key={g.trimester} open={i === 0} className="group rounded-2xl bg-surface-2/40 px-3 py-2">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 py-1.5">
                  <span className="font-extrabold text-ink">{g.label}</span>
                  <span className="text-xs font-bold text-ink-mute flex items-center gap-1">
                    {g.items.length} {g.items.length === 1 ? 'resultado' : 'resultados'}
                    <ChevronDown className="w-4 h-4 transition group-open:rotate-180" />
                  </span>
                </summary>
                <div className="space-y-3 pt-1 pb-2">
                  {g.months.map(m => (
                    <section key={m.key} className="space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-mute px-1">{m.label}</h4>
                      {m.items.map(row)}
                    </section>
                  ))}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {bySeries(shown).map(sr =>
              sr.items.length === 1 ? (
                row(sr.items[0])
              ) : (
                <details key={sr.key} className="group rounded-2xl bg-surface-2/40 px-3 py-2">
                  <summary className="cursor-pointer list-none flex items-center gap-3 py-1.5">
                    <KindIcon kind={sr.kind} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-ink truncate">{sr.label}</span>
                      <span className="block text-xs text-ink-mute">
                        {sr.items.length} resultados · de {formatBR(sr.first)} a {formatBR(sr.last)}
                      </span>
                    </span>
                    <ChevronDown className="w-4 h-4 text-ink-mute transition group-open:rotate-180" />
                  </summary>
                  <div className="space-y-2 pt-1 pb-2">{sr.items.map(row)}</div>
                </details>
              ),
            )}
          </div>
        )}
      </Card>

      {opened && (
        <Sheet title={opened.title} onClose={() => setOpenId(null)}>
          <ExamCard
            exam={opened}
            dumDate={props.dumDate}
            busy={props.busy}
            social={props.social}
            onSave={props.onSave}
            onOpen={index => setViewer({ exam: opened, index })}
            onDelete={() => {
              setOpenId(null);
              props.onDelete(opened);
            }}
          />
        </Sheet>
      )}

      {viewing && viewerImages.length > 0 && (
        <PhotoViewer
          title={viewing.title}
          subtitle={formatBR(viewing.exam_date)}
          photos={viewerImages.map(f => ({ id: f.id, src: examFileUrl(f.id) }))}
          index={Math.min(viewer!.index, viewerImages.length - 1)}
          onIndex={index => setViewer({ exam: viewing, index })}
          onClose={() => setViewer(null)}
          onDelete={p => props.onDeleteFile(viewing, viewerImages.find(f => f.id === p.id)!)}
        />
      )}
    </div>
  );
}

/** Escolher fotos e PDFs: a câmera direto ou a galeria/arquivos. */
function FilePicker({ onAdd, disabled, compact = false }: { onAdd: (files: File[]) => void; disabled: boolean; compact?: boolean }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const take = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) onAdd(files);
  };
  const button = compact
    ? 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-surface-2 text-ink-soft hover:text-ink disabled:opacity-50'
    : 'flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line px-4 py-5 text-sm font-semibold text-ink-soft hover:border-brand hover:text-brand disabled:opacity-50';
  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'flex gap-3'}>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={take} aria-label="Tirar foto" />
      <input ref={gallery} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={take} aria-label="Escolher fotos ou PDF" />
      <button type="button" disabled={disabled} onClick={() => camera.current?.click()} className={button}>
        <Camera className={compact ? 'w-3.5 h-3.5' : 'w-6 h-6'} /> Tirar foto
      </button>
      <button type="button" disabled={disabled} onClick={() => gallery.current?.click()} className={button}>
        {compact ? <Paperclip className="w-3.5 h-3.5" /> : <ImagePlus className="w-6 h-6" />} {compact ? 'Juntar arquivo' : 'Fotos ou PDF'}
      </button>
    </div>
  );
}

/** Prepara cada arquivo escolhido; os que não dá para usar viram uma mensagem. */
async function prepareAll(picked: File[]) {
  const ready: PreparedFile[] = [];
  let problem: string | null = null;
  for (const f of picked) {
    try {
      ready.push(await prepareFile(f));
    } catch (err) {
      problem = err instanceof FileProblem ? err.message : `Não foi possível preparar "${f.name}".`;
    }
  }
  return { ready, problem };
}

const releasePreviews = (files: PreparedFile[]) => files.forEach(f => f.preview && URL.revokeObjectURL(f.preview));

/** Lista de arquivos preparados, ainda não enviados. */
function usePrepared() {
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const kept = useRef<PreparedFile[]>([]);
  useEffect(() => () => releasePreviews(kept.current), []);

  const add = async (picked: File[]) => {
    setPreparing(true);
    setProblem(null);
    const { ready, problem } = await prepareAll(picked);
    kept.current.push(...ready);
    setProblem(problem);
    setFiles(prev => [...prev, ...ready]);
    setPreparing(false);
  };
  const remove = (i: number) => setFiles(prev => prev.filter((_, j) => j !== i));
  return { files, preparing, problem, setProblem, add, remove };
}

function PreparedList({ files, onRemove }: { files: PreparedFile[]; onRemove: (i: number) => void }) {
  if (files.length === 0) return null;
  return (
    <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-surface-2">
          {f.preview ? (
            <img src={f.preview} alt={f.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center">
              <FileText className="w-6 h-6 text-ink-mute" />
              <span className="text-[11px] text-ink-soft line-clamp-2 break-all">{f.name}</span>
            </div>
          )}
          <span className="absolute bottom-1 left-1 rounded-full bg-black/55 text-white text-[10px] px-1.5">{formatSize(f.size)}</span>
          <button type="button" onClick={() => onRemove(i)} aria-label={`Tirar ${f.name}`} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Formulário de exame. `bare`: sem moldura nem título, para usar dentro da janela de registro. */
export function ExamForm({ plan, preset, appointment, busy, onSave, onDone, bare = false }: { plan: PlanItem[]; preset: PlanItem | null; appointment?: Consultation | null; busy: boolean; onSave: SaveExam; onDone: () => void; bare?: boolean }) {
  const today = toISODate(new Date());
  // Vindo de um agendamento: tipo, nome, item da jornada e data já preenchidos.
  const fromDay = appointment ? toISODate(localDay(appointment.scheduled_at)) : null;
  const [kind, setKind] = useState<ExamKind>(appointment ? (kindOf(appointment) === 'ultrassom' ? 'ultrassom' : 'exame') : preset ? kindFor(preset) : 'ultrassom');
  const [planItem, setPlanItem] = useState<string>(appointment?.plan_item && plan.some(i => i.id === appointment.plan_item) ? appointment.plan_item : (preset?.id ?? ''));
  const [title, setTitle] = useState(appointment ? appointmentTitle(appointment) : (preset?.title ?? ''));
  const [date, setDate] = useState(fromDay && fromDay < today ? fromDay : today);
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'shared'>('shared');
  const [sent, setSent] = useState<number | null>(null);
  const picked = usePrepared();

  const choosePlan = (id: string) => {
    const item = plan.find(i => i.id === id);
    const previous = plan.find(i => i.id === planItem);
    setPlanItem(id);
    if (item) {
      setKind(kindFor(item));
      if (!title.trim() || title === previous?.title) setTitle(item.title);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSent(0);
    const error = await onSave({ kind, title: title.trim(), date, planItem: planItem || null, notes: notes.trim() || null, visibility, appointmentId: appointment?.id ?? null }, null, picked.files, setSent);
    setSent(null);
    if (error) picked.setProblem(error);
    else onDone();
  };

  const sending = sent !== null;
  return (
    <form onSubmit={submit} className={bare ? 'space-y-4' : 'space-y-4 rounded-2xl bg-surface-2/50 p-4 mb-5'}>
      {!bare && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base text-ink">{appointment ? `Resultado: ${appointmentTitle(appointment)}` : 'Guardar resultado'}</h3>
          <button type="button" onClick={onDone} aria-label="Fechar" className="p-1.5 rounded-full text-ink-mute hover:text-ink hover:bg-surface-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <FilePicker onAdd={picked.add} disabled={sending || picked.preparing} />
      {picked.preparing && (
        <p className="flex items-center gap-2 text-sm text-ink-mute">
          <Loader2 className="w-4 h-4 animate-spin" /> Preparando as fotos...
        </p>
      )}
      <PreparedList files={picked.files} onRemove={picked.remove} />

      <Segmented label="Tipo" size="sm" value={kind} onChange={setKind} options={(['ultrassom', 'exame', 'outro'] as ExamKind[]).map(k => ({ value: k, label: KIND_LABEL[k] }))} />

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Da jornada do pré-natal" htmlFor="exame-jornada" hint="Opcional. Marca o item como feito.">
          <select id="exame-jornada" className={inputClass} value={planItem} onChange={e => choosePlan(e.target.value)}>
            <option value="">Nenhum (outro exame)</option>
            {plan.map(i => (
              <option key={i.id} value={i.id}>
                {i.short} ({i.from}–{i.to} sem.)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data do exame" htmlFor="exame-data">
          <input id="exame-data" type="date" max={today} className={inputClass} value={date} onChange={e => setDate(e.target.value || today)} />
        </Field>
      </div>

      <Field label="Nome" htmlFor="exame-nome">
        <input id="exame-nome" className={inputClass} maxLength={120} placeholder="Ex.: Ultrassom obstétrico, Hemograma" value={title} onChange={e => setTitle(e.target.value)} />
      </Field>

      <Field label="Observações" htmlFor="exame-obs">
        <textarea id="exame-obs" rows={2} maxLength={2000} className={`${inputClass} resize-none`} placeholder="Ex.: a médica disse que está tudo normal; repetir em 4 semanas." value={notes} onChange={e => setNotes(e.target.value)} />
      </Field>

      <div className="space-y-1.5">
        <Segmented
          label="Quem vê"
          size="sm"
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'shared', label: <span className="flex items-center gap-1"><Users className="w-3 h-3" />Nós dois</span> },
            { value: 'private', label: <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Só eu</span> },
          ]}
        />
        <p className="text-xs text-ink-mute">{visibility === 'private' ? 'Só você vai ver este exame e os arquivos dele.' : 'Vocês dois vão ver este exame.'}</p>
      </div>

      {picked.problem && <p className="text-sm text-alert" role="alert">{picked.problem}</p>}

      <Button type="submit" disabled={busy || sending || picked.preparing || !title.trim()} className="w-full">
        {sending ? <Loader2 className="animate-spin" /> : <Plus />}
        {sending ? (picked.files.length ? `Enviando ${Math.min(sent! + 1, picked.files.length)} de ${picked.files.length}...` : 'Guardando...') : picked.files.length ? `Guardar com ${picked.files.length} ${picked.files.length === 1 ? 'arquivo' : 'arquivos'}` : 'Guardar'}
      </Button>
    </form>
  );
}

function KindIcon({ kind }: { kind: ExamKind }) {
  const Icon = KIND_ICON[kind];
  return (
    <span className="w-9 h-9 rounded-full bg-surface text-brand flex items-center justify-center shrink-0">
      <Icon className="w-[18px] h-[18px]" />
    </span>
  );
}

/** Linha enxuta do arquivo: abre o resultado completo numa janela (as fotos só carregam lá). */
function ExamRow({ exam: e, dumDate, social, onOpen }: { exam: ExamItem; dumDate: string; social: ExamSocial; onOpen: () => void }) {
  const week = gestationalAge(dumDate, parseLocalDate(e.exam_date))?.weeks;
  const photos = e.files.filter(isImage).length;
  const pdfs = e.files.length - photos;
  const plan = e.plan_item ? PLAN_ITEMS.find(i => i.id === e.plan_item) : null;
  const reactions = social.available ? social.reactions.filter(r => r.target_type === 'exam' && r.target_id === e.id).length : 0;
  const comments = social.available ? social.threads.filter(c => c.target_type === 'exam' && c.target_id === e.id).length : 0;
  return (
    <button type="button" onClick={onOpen} aria-label={`${e.title}: abrir resultado`} className="w-full text-left rounded-2xl bg-surface px-3 py-2.5 flex items-center gap-3 shadow-soft transition hover:brightness-[0.99] active:scale-[0.995]">
      <KindIcon kind={e.kind} />
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-ink truncate">{e.title}</span>
        <span className="block text-xs text-ink-mute truncate">
          {formatBR(e.exam_date)}
          {week !== undefined && week >= 1 && ` · ${week} sem.`}
          {photos > 0 && ` · ${photos} ${photos === 1 ? 'foto' : 'fotos'}`}
          {pdfs > 0 && ` · ${pdfs} PDF`}
          {plan && ` · jornada`}
        </span>
      </span>
      {e.visibility === 'private' && <Lock className="w-3.5 h-3.5 text-ink-mute shrink-0" aria-label="só você" />}
      <SocialCount reactions={reactions} comments={comments} />
      <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
    </button>
  );
}

function ExamCard({ exam: e, dumDate, busy, social, onSave, onOpen, onDelete }: { exam: ExamItem; dumDate: string; busy: boolean; social: ExamSocial; onSave: SaveExam; onOpen: (imageIndex: number) => void; onDelete: () => void }) {
  const [talking, setTalking] = useState(false);
  const talk = social.threads.filter(c => c.target_type === 'exam' && c.target_id === e.id);
  const Icon = KIND_ICON[e.kind];
  const week = gestationalAge(dumDate, parseLocalDate(e.exam_date))?.weeks;
  const plan = e.plan_item ? PLAN_ITEMS.find(i => i.id === e.plan_item) : null;
  const images = e.files.filter(isImage);
  const [step, setStep] = useState<'preparando' | 'enviando' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Juntar arquivo a um exame é um passo só: escolheu, já envia.
  const add = async (files: File[]) => {
    setProblem(null);
    setStep('preparando');
    const { ready, problem } = await prepareAll(files);
    let error = problem;
    if (ready.length) {
      setStep('enviando');
      error = (await onSave(null, e.id, ready, () => undefined)) ?? problem;
      releasePreviews(ready);
    }
    setProblem(error);
    setStep(null);
  };

  return (
    <article id={`exame-${e.id}`} className="rounded-2xl bg-surface-2/60 p-4 space-y-3 transition-shadow">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-surface text-brand flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink break-words">{e.title}</p>
          <p className="text-sm text-ink-soft flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{formatBR(e.exam_date)}</span>
            {week !== undefined && week >= 1 && <span>· {week} semanas</span>}
            <AuthorBadge role={e.author_role} />
            {e.visibility === 'private' && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-mute">
                <Lock className="w-3 h-3" /> só você
              </span>
            )}
          </p>
          {plan && (
            <div className="mt-1.5">
              <Pill tone="ok">Jornada: {plan.short}</Pill>
            </div>
          )}
        </div>
        <button type="button" onClick={onDelete} aria-label={`Excluir exame ${e.title}`} className="p-2 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {e.notes && <p className="text-sm text-ink-soft whitespace-pre-line">{e.notes}</p>}

      {e.files.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {e.files.map(f =>
            isImage(f) ? (
              <li key={f.id}>
                <button type="button" onClick={() => onOpen(images.indexOf(f))} className="block w-full aspect-square rounded-xl overflow-hidden bg-surface focus:outline-none focus:ring-4 focus:ring-brand/20" aria-label={`Abrir foto de ${e.title}`}>
                  <img src={examFileUrl(f.id)} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              </li>
            ) : (
              <li key={f.id}>
                <a href={examFileUrl(f.id)} target="_blank" rel="noopener" className="w-full aspect-square rounded-xl bg-surface flex flex-col items-center justify-center gap-1 text-ink-soft hover:text-brand" aria-label={`Abrir PDF de ${e.title}`}>
                  <FileText className="w-7 h-7" />
                  <span className="text-xs font-semibold">PDF</span>
                  <span className="text-[10px] text-ink-mute">{formatSize(f.size)}</span>
                </a>
              </li>
            ),
          )}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FilePicker compact onAdd={add} disabled={busy || step !== null} />
        {step && (
          <span className="flex items-center gap-1.5 text-xs text-ink-mute">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {step === 'preparando' ? 'Preparando...' : 'Enviando...'}
          </span>
        )}
      </div>
      {problem && <p className="text-sm text-alert" role="alert">{problem}</p>}

      {social.available && (
        <div className="space-y-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <ReactionBar targetType="exam" targetId={e.id} reactions={social.reactions} kinds={e.kind === 'ultrassom' ? ['abraco', 'festa'] : ['abraco', 'forca']} onReact={social.onReact} />
            <button type="button" onClick={() => setTalking(v => !v)} aria-expanded={talking} className="inline-flex items-center gap-1.5 min-h-10 rounded-full px-3.5 text-sm font-bold text-ink-soft bg-surface hover:text-ink">
              Conversa{talk.length ? ` · ${talk.length}` : ''}
            </button>
          </div>
          {talking && <Thread comments={talk} busy={busy} onSend={body => social.onThread('exam', e.id, body)} onDelete={social.onDeleteThread} />}
        </div>
      )}
    </article>
  );
}
