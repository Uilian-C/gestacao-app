import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, ExternalLink, FileText, FlaskConical, ImagePlus, Loader2, Lock, Paperclip, Plus, ScanHeart, Trash2, Users, X } from 'lucide-react';
import { examFileUrl } from '../../api';
import { PLAN_ITEMS, type PlanItem } from '../../content/prenatalPlan';
import type { ExamFile, ExamItem, ExamKind, Reaction, ThreadComment } from '../../hooks/useGestationData';
import { ReactionBar, Thread, type OnReact } from '../Social';
import { formatBR, gestationalAge, parseLocalDate, toISODate } from '../../lib/dates';
import { planExams } from '../../lib/journey';
import { FileProblem, formatSize, prepareFile, type PreparedFile } from '../../lib/examFiles';
import AuthorBadge from '../AuthorBadge';
import { inputClass } from '../styles';
import { Button, Card, Chip, EmptyState, Field, Pill, SectionTitle, Segmented } from '../ui';

export interface NewExam {
  kind: ExamKind;
  title: string;
  date: string;
  planItem: string | null;
  notes: string | null;
  visibility: 'private' | 'shared';
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
  const [formFor, setFormFor] = useState<PlanItem | 'novo' | null>(() => PLAN_ITEMS.find(i => i.id === props.initialPlanItem) ?? null);
  const [viewer, setViewer] = useState<{ exam: ExamItem; index: number } | null>(null);

  const plan = planExams(props.bloodType);
  const saved = new Set(props.exams.map(e => e.plan_item).filter(Boolean));
  // Exames da jornada com a janela aberta agora e ainda sem resultado guardado.
  const dueNow = plan.filter(i => !saved.has(i.id) && props.currentWeek >= i.from && props.currentWeek <= i.to + 2);
  const shown = props.exams.filter(e => filter === 'todos' || e.kind === filter);
  const kinds = (['ultrassom', 'exame', 'outro'] as ExamKind[]).filter(k => props.exams.some(e => e.kind === k));

  // Se o exame aberto no visualizador sumir (apagado), fecha.
  const viewing = viewer && props.exams.find(e => e.id === viewer.exam.id);
  const viewerImages = viewing ? viewing.files.filter(isImage) : [];

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          icon={<ScanHeart className="w-5 h-5" />}
          title="Exames e ultrassons"
          subtitle="Fotos dos resultados e PDFs num lugar só, para achar na hora da consulta."
        />

        {props.available && props.exams.length > 0 && !formFor && (
          <Button onClick={() => setFormFor('novo')} className="w-full mb-4">
            <Camera /> Guardar exame
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

        {kinds.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4" aria-label="Filtrar">
            <Chip active={filter === 'todos'} onClick={() => setFilter('todos')}>Todos</Chip>
            {kinds.map(k => (
              <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
                {KIND_LABEL[k]}s
              </Chip>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {shown.map(e => (
            <ExamCard key={e.id} exam={e} dumDate={props.dumDate} busy={props.busy} social={props.social} onSave={props.onSave} onOpen={index => setViewer({ exam: e, index })} onDelete={() => props.onDelete(e)} />
          ))}
        </div>
      </Card>

      {viewing && viewerImages.length > 0 && (
        <Viewer
          exam={viewing}
          images={viewerImages}
          index={Math.min(viewer!.index, viewerImages.length - 1)}
          onIndex={index => setViewer({ exam: viewing, index })}
          onClose={() => setViewer(null)}
          onDeleteFile={f => props.onDeleteFile(viewing, f)}
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
export function ExamForm({ plan, preset, busy, onSave, onDone, bare = false }: { plan: PlanItem[]; preset: PlanItem | null; busy: boolean; onSave: SaveExam; onDone: () => void; bare?: boolean }) {
  const today = toISODate(new Date());
  const [kind, setKind] = useState<ExamKind>(preset ? kindFor(preset) : 'ultrassom');
  const [planItem, setPlanItem] = useState<string>(preset?.id ?? '');
  const [title, setTitle] = useState(preset?.title ?? '');
  const [date, setDate] = useState(today);
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
    const error = await onSave({ kind, title: title.trim(), date, planItem: planItem || null, notes: notes.trim() || null, visibility }, null, picked.files, setSent);
    setSent(null);
    if (error) picked.setProblem(error);
    else onDone();
  };

  const sending = sent !== null;
  return (
    <form onSubmit={submit} className={bare ? 'space-y-4' : 'space-y-4 rounded-2xl bg-surface-2/50 p-4 mb-5'}>
      {!bare && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base text-ink">Guardar exame</h3>
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
    <article className="rounded-2xl bg-surface-2/60 p-4 space-y-3">
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

/** Foto em tela cheia, com as outras fotos do mesmo exame ao lado. */
function Viewer({ exam, images, index, onIndex, onClose, onDeleteFile }: { exam: ExamItem; images: ExamFile[]; index: number; onIndex: (i: number) => void; onClose: () => void; onDeleteFile: (f: ExamFile) => void }) {
  const file = images[index];
  const go = (step: number) => onIndex((index + step + images.length) % images.length);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
      if (ev.key === 'ArrowRight' && images.length > 1) onIndex((index + 1) % images.length);
      if (ev.key === 'ArrowLeft' && images.length > 1) onIndex((index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, images.length, onClose, onIndex]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" role="dialog" aria-modal="true" aria-label={`Foto de ${exam.title}`}>
      <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{exam.title}</p>
          <p className="text-xs text-white/70">
            {formatBR(exam.exam_date)}
            {images.length > 1 && ` · ${index + 1} de ${images.length}`}
          </p>
        </div>
        <a href={examFileUrl(file.id)} target="_blank" rel="noopener" aria-label="Abrir original" className="p-2 rounded-full hover:bg-white/10">
          <ExternalLink className="w-5 h-5" />
        </a>
        <button type="button" onClick={() => onDeleteFile(file)} aria-label="Excluir esta foto" className="p-2 rounded-full hover:bg-white/10">
          <Trash2 className="w-5 h-5" />
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded-full hover:bg-white/10">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-2" onClick={ev => ev.target === ev.currentTarget && onClose()}>
        <img key={file.id} src={examFileUrl(file.id)} alt={`Foto de ${exam.title}`} className="max-w-full max-h-full object-contain select-none" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Foto anterior" className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Próxima foto" className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
