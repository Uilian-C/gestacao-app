import { useState } from 'react';
import { BookOpen, ChevronRight, Eye, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { api, ApiError, type ContentItem } from '../../api';
import { ReadingBody } from '../home/Readings';
import Sheet from '../Sheet';
import { inputClass } from '../styles';
import { Button, Field, Segmented } from '../ui';

// Administração do conteúdo (quem está em ADMIN_EMAILS): revisar, editar,
// publicar ou despublicar a mensagem do dia e as leituras da semana. Só o que
// está publicado aparece para os casais.

type Filter = 'rascunho' | 'publicado' | 'todos';
type Draft = Omit<ContentItem, 'id' | 'updatedAt'> & { id?: string };

const AUDIENCE_LABEL: Record<ContentItem['audience'], string> = { casal: 'Casal', mae: 'Mãe', pai: 'Pai' };
const WEEKS = Array.from({ length: 42 }, (_, i) => i + 1);
const blank = (kind: ContentItem['kind']): Draft => ({ kind, title: kind === 'leitura' ? '' : null, body: '', weekFrom: 4, weekTo: 42, audience: 'casal', source: 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', minutes: kind === 'leitura' ? 3 : null, status: 'rascunho' });

export default function ContentAdmin({ items, available, onClose, onChanged }: { items: ContentItem[]; available: boolean; onClose: () => void; onChanged: () => void }) {
  const [filter, setFilter] = useState<Filter>('rascunho');
  const [editing, setEditing] = useState<Draft | null>(null);
  const shown = items.filter(i => filter === 'todos' || i.status === filter);
  const count = (s: ContentItem['status']) => items.filter(i => i.status === s).length;

  if (editing) return <ContentForm draft={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />;

  return (
    <Sheet icon={<BookOpen />} title="Conteúdo do app" subtitle="Mensagem do dia e leituras da semana" onClose={onClose}>
      {!available ? (
        <p className="text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">Para editar o conteúdo, rode a migração db/migrations/021_conteudo.sql no Neon.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">Os casais só veem o que está <strong>publicado</strong>. Revise cada rascunho, ajuste o texto se quiser e publique.</p>
          <Segmented
            label="Filtrar textos"
            full
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'rascunho', label: `Rascunhos (${count('rascunho')})` },
              { value: 'publicado', label: `Publicados (${count('publicado')})` },
              { value: 'todos', label: 'Todos' },
            ]}
          />
          <ul className="space-y-2">
            {shown.length === 0 && <li className="text-sm text-ink-mute py-2">Nada aqui.</li>}
            {shown.map(i => (
              <li key={i.id}>
                <button type="button" onClick={() => setEditing(i)} aria-label={`Editar: ${i.title ?? i.body.slice(0, 40)}`} className="w-full flex items-start gap-3 rounded-2xl bg-surface-2/70 px-3.5 py-3 text-left">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${i.kind === 'leitura' ? 'bg-verde-soft text-verde-strong' : 'bg-brand-soft text-brand-strong'}`}>
                    {i.kind === 'leitura' ? <BookOpen className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-ink line-clamp-2">{i.title ?? `“${i.body}”`}</span>
                    <span className="block text-xs text-ink-mute">
                      {i.kind === 'leitura' ? 'Leitura' : 'Mensagem'} · sem. {i.weekFrom}–{i.weekTo} · {AUDIENCE_LABEL[i.audience]}
                    </span>
                  </span>
                  <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${i.status === 'publicado' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>{i.status}</span>
                  <ChevronRight className="w-4 h-4 text-ink-mute shrink-0 mt-1" />
                </button>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button tone="soft" onClick={() => setEditing(blank('mensagem'))}>
              <Plus /> Mensagem
            </Button>
            <Button tone="soft" onClick={() => setEditing(blank('leitura'))}>
              <Plus /> Leitura
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function ContentForm({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }));
  const reading = d.kind === 'leitura';

  const save = async (status: ContentItem['status']) => {
    setBusy(true);
    setError(null);
    try {
      const { id, ...rest } = { ...d, status };
      await api.saveContent(id ? 'update' : 'create', { ...(id ? { id } : {}), ...rest, title: reading ? rest.title : null, minutes: reading ? rest.minutes : null });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Verifique a conexão.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!d.id) return onClose();
    setBusy(true);
    try {
      await api.saveContent('delete', { id: d.id });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível apagar.');
      setBusy(false);
    }
  };

  return (
    <Sheet icon={<Pencil />} title={d.id ? 'Editar texto' : reading ? 'Nova leitura' : 'Nova mensagem'} subtitle={d.status === 'publicado' ? 'Publicado: os casais veem este texto' : 'Rascunho: só a administração vê'} onClose={onClose}>
      {preview ? (
        <div className="space-y-4">
          {reading ? (
            <>
              <h3 className="text-[1.25rem] text-ink">{d.title}</h3>
              <ReadingBody item={{ ...d, id: 'previa', updatedAt: '' }} />
            </>
          ) : (
            <p className="font-display text-[1.15rem] leading-snug text-ink">“{d.body}”</p>
          )}
          <Button tone="soft" onClick={() => setPreview(false)} className="w-full">
            <Pencil /> Voltar a editar
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={e => e.preventDefault()}>
          <Segmented
            label="Tipo de texto"
            full
            size="sm"
            value={d.kind}
            onChange={k => setD(prev => ({ ...prev, kind: k, title: k === 'leitura' ? (prev.title ?? '') : null, minutes: k === 'leitura' ? (prev.minutes ?? 3) : null }))}
            options={[
              { value: 'mensagem', label: 'Mensagem do dia' },
              { value: 'leitura', label: 'Leitura' },
            ]}
          />
          {reading && (
            <Field label="Título" htmlFor="c-titulo">
              <input id="c-titulo" className={inputClass} maxLength={120} value={d.title ?? ''} onChange={e => set('title', e.target.value)} />
            </Field>
          )}
          <Field label={reading ? 'Texto' : 'Mensagem'} htmlFor="c-texto" hint={reading ? 'Linha em branco separa parágrafos. Linhas que começam com "- " viram lista.' : 'Uma ou duas frases.'}>
            <textarea id="c-texto" className={`${inputClass} ${reading ? 'min-h-[220px]' : 'min-h-[90px]'}`} maxLength={6000} value={d.body} onChange={e => set('body', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Da semana" htmlFor="c-de">
              <select id="c-de" className={inputClass} value={d.weekFrom} onChange={e => set('weekFrom', Number(e.target.value))}>
                {WEEKS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Até a semana" htmlFor="c-ate">
              <select id="c-ate" className={inputClass} value={d.weekTo} onChange={e => set('weekTo', Number(e.target.value))}>
                {WEEKS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Para quem" htmlFor="c-quem">
              <select id="c-quem" className={inputClass} value={d.audience} onChange={e => set('audience', e.target.value as Draft['audience'])}>
                <option value="casal">Casal</option>
                <option value="mae">Mãe</option>
                <option value="pai">Pai</option>
              </select>
            </Field>
            {reading && (
              <Field label="Minutos de leitura" htmlFor="c-min">
                <input id="c-min" inputMode="numeric" className={inputClass} value={d.minutes ?? ''} onChange={e => set('minutes', Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || null)} />
              </Field>
            )}
          </div>
          <Field label="Fonte (opcional)" htmlFor="c-fonte">
            <input id="c-fonte" className={inputClass} maxLength={300} value={d.source ?? ''} onChange={e => set('source', e.target.value)} />
          </Field>
          {d.weekTo < d.weekFrom && <p className="text-xs font-semibold text-alert">A semana final precisa vir depois da inicial.</p>}
          {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-2.5">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button tone="soft" disabled={busy || !d.body.trim()} onClick={() => setPreview(true)}>
              <Eye /> Ver prévia
            </Button>
            <Button tone="soft" disabled={busy || !d.body.trim() || d.weekTo < d.weekFrom} onClick={() => save(d.status)}>
              Salvar {d.status === 'publicado' ? '' : 'rascunho'}
            </Button>
          </div>
          {d.status === 'publicado' ? (
            <Button tone="ghost" disabled={busy} onClick={() => save('rascunho')} className="w-full">
              Despublicar (voltar a rascunho)
            </Button>
          ) : (
            <Button disabled={busy || !d.body.trim() || d.weekTo < d.weekFrom || (reading && !d.title?.trim())} onClick={() => save('publicado')} className="w-full">
              Publicar
            </Button>
          )}
          {d.id &&
            (confirmDelete ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-alert-soft px-4 py-3">
                <span className="text-sm text-alert font-semibold">Apagar este texto de vez?</span>
                <span className="flex gap-2">
                  <Button tone="ghost" onClick={() => setConfirmDelete(false)} className="!px-3 !py-1.5">Não</Button>
                  <Button disabled={busy} onClick={remove} className="!px-3 !py-1.5 !bg-alert">Apagar</Button>
                </span>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-alert">
                <Trash2 className="w-3.5 h-3.5" /> Apagar este texto
              </button>
            ))}
        </form>
      )}
    </Sheet>
  );
}
