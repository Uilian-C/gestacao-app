import { useEffect, useRef, useState } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useSheetDrag } from '../../hooks/useSheetDrag';
import { Camera, Check, Copy, Download, HeartHandshake, ImagePlus, Link2, Loader2, LogOut, MessageCircle, Pencil, Trash2, UserMinus, X } from 'lucide-react';
import { api, ApiError, type CoupleFamilyState, type FamilyState, type Me } from '../../api';
import { FileProblem, prepareAvatar } from '../../lib/examFiles';
import { formatInviteCode, inviteLink } from '../../lib/invite';
import { formatBR } from '../../lib/dates';
import { MAX_RELATION, RELATIONS, slotsText } from '../../lib/relatives';
import type { Author } from '../../types';
import { inputClass } from '../styles';
import { Button, Segmented } from '../ui';
import { LegalLinks } from './AuthScreen';
import Avatar from '../Avatar';
import NotificationSettings from '../NotificationSettings';

interface Props {
  me: Me;
  family: CoupleFamilyState;
  onClose: () => void;
  onFamilyChange: (family: FamilyState | null) => void;
  onSignOut: () => void;
  onAccountDeleted: () => void;
  /** Modo cuidado (migração 029): o dia em que foi ligado (null desligado) e como ligar ou desligar. */
  careSince?: string | null;
  onCareMode?: (on: boolean) => Promise<boolean>;
}

const ROLE_LABEL: Record<Author, string> = { mae: 'Mãe', pai: 'Pai' };

/** "Nosso espaço": quem participa, convite para o(a) parceiro(a), a família e a conta. */
export default function SpaceSheet({ me, family, onClose, onFamilyChange, onSignOut, onAccountDeleted, careSince, onCareMode }: Props) {
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [danger, setDanger] = useState<'account' | 'space' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  useScrollLock();
  const { handle, panelStyle, full } = useSheetDrag(onClose);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir. Verifique a conexão.');
    } finally {
      setBusy(false);
    }
  };

  const createInvite = () => act(async () => setInvite(await api.family<{ code: string; expiresAt: string }>('invite')));
  const link = invite ? inviteLink(invite.code) : '';
  const message = `Vem acompanhar a gestação comigo no Tumtum: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  };

  const changeRole = (role: Author) =>
    act(async () => {
      const res = await api.family('setRole', { role });
      onFamilyChange(res.family);
    });

  const remove = (userId: string) =>
    act(async () => {
      const res = await api.family('removeMember', { userId });
      setConfirmRemove(null);
      onFamilyChange(res.family);
      if (!res.family) onClose();
    });

  const others = family.members.filter(m => !m.me);
  const self = family.members.find(m => m.me);
  const photoPicker = useRef<HTMLInputElement>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(self?.name ?? me.user.name);
  const saveName = () =>
    act(async () => {
      const res = await api.family('rename', { name: name.trim() });
      onFamilyChange(res.family);
      setNaming(false);
    });
  const selfie = useRef<HTMLInputElement>(null);

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (file) void setPhoto(file);
  };
  const setPhoto = (file: File | null) =>
    act(async () => {
      try {
        const res = await api.avatar(file ? (await prepareAvatar(file)).data : null);
        onFamilyChange(res.family);
      } catch (err) {
        if (err instanceof FileProblem) throw new ApiError(400, err.message);
        throw err;
      }
    });

  const openDanger = (kind: 'account' | 'space') => {
    setDanger(kind);
    setConfirmText('');
  };

  const destroy = () =>
    act(async () => {
      if (danger === 'account') {
        await api.account('deleteAccount', 'EXCLUIR');
        onAccountDeleted();
      } else {
        await api.account('deleteSpace', 'EXCLUIR');
        onClose();
        onFamilyChange(null);
      }
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="space-title">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] touch-none" onClick={onClose} />
      <div
        style={panelStyle}
        className={`relative w-full sm:max-w-lg overflow-y-auto overscroll-contain bg-canvas shadow-lift p-5 pt-3 sm:p-7 space-y-5 pb-[calc(env(safe-area-inset-bottom)+20px)] ${full ? 'h-[100dvh] max-h-[100dvh] rounded-none sm:rounded-[28px] sm:h-auto sm:max-h-[92dvh]' : 'max-h-[92dvh] rounded-t-[28px] sm:rounded-[28px]'}`}
      >
        {/* Alça e título: puxar para baixo fecha; para cima, tela cheia. */}
        <div {...handle} className="sticky -top-3 sm:-top-7 z-20 -mx-5 sm:-mx-7 -mt-3 sm:-mt-7 px-5 sm:px-7 pt-3 sm:pt-7 pb-3 bg-canvas cursor-grab active:cursor-grabbing select-none space-y-3">
        <div className="sm:hidden" aria-hidden>
          <div className="w-11 h-1.5 rounded-full bg-line mx-auto" />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="space-title" className="text-[1.35rem]">Nosso espaço</h2>
            <p className="text-sm text-ink-mute">Vocês dois veem e editam tudo. A família vê só o que vocês mostrarem.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full bg-surface-2 text-ink-soft flex items-center justify-center hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
        </div>

        <section className="bg-surface shadow-soft rounded-[24px] p-5 space-y-3">
          <h3 className="text-base">Quem participa</h3>
          <ul className="divide-y divide-line">
            {family.members.map(m => (
              <li key={m.userId} className="py-3 flex items-center gap-3">
                <Avatar member={m} role={m.role} className="w-10 h-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">
                    {m.name} {m.me && <span className="text-ink-mute font-normal">(você)</span>}
                  </p>
                  <p className="text-xs text-ink-mute truncate">
                    {ROLE_LABEL[m.role]} · {m.email}
                  </p>
                </div>
                {!m.me && others.length > 0 && (
                  confirmRemove === m.userId ? (
                    <div className="flex gap-1">
                      <Button tone="ghost" onClick={() => setConfirmRemove(null)} className="px-3 py-1.5">Não</Button>
                      <Button tone="warm" disabled={busy} onClick={() => remove(m.userId)} className="px-3 py-1.5">Remover</Button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmRemove(m.userId)} aria-label={`Remover ${m.name}`} className="w-9 h-9 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft flex items-center justify-center">
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
          {confirmRemove && confirmRemove !== me.user.id && <p className="text-xs text-ink-mute">A pessoa perde o acesso na hora. Os registros dela continuam no espaço.</p>}
        </section>

        {others.length === 0 && <section className="bg-surface shadow-soft rounded-[24px] p-5 space-y-4">
          <div>
            <h3 className="text-base">Convidar o(a) parceiro(a)</h3>
            <p className="text-sm text-ink-mute">O convite vale 7 dias e pode ser usado uma vez.</p>
          </div>
          {invite ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-surface-2 px-4 py-3">
                <p className="text-xs text-ink-mute">Código</p>
                <p className="font-display text-xl tracking-[0.15em] text-ink">{formatInviteCode(invite.code)}</p>
                <p className="text-xs text-ink-mute mt-1 break-all">{link}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold bg-brand text-on-accent hover:bg-brand-strong shadow-soft [&_svg]:w-4 [&_svg]:h-4"
                >
                  <MessageCircle /> WhatsApp
                </a>
                <Button tone="soft" onClick={copy}>
                  {copied ? <Check /> : <Copy />} {copied ? 'Copiado' : 'Copiar link'}
                </Button>
              </div>
              <p className="text-xs text-ink-mute">Vence em {formatBR(invite.expiresAt.slice(0, 10))}.</p>
            </div>
          ) : (
            <Button onClick={createInvite} disabled={busy} className="w-full">
              {busy ? <Loader2 className="animate-spin" /> : <Link2 />} Gerar link de convite
            </Button>
          )}
        </section>}

        <FamilySection family={family} onFamilyChange={onFamilyChange} />

        <NotificationSettings />

        <section className="bg-surface shadow-soft rounded-[24px] p-5 space-y-4">
          <h3 className="text-base">Você</h3>
          <div className="flex items-center gap-4">
            <Avatar member={self} role={family.role} className="w-16 h-16 text-xl" />
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-semibold text-ink">{self?.photo ? 'Sua foto de perfil' : 'Pôr foto de perfil'}</p>
              <div className="flex flex-wrap gap-2">
                <Button tone="soft" disabled={busy} onClick={() => selfie.current?.click()} className="px-3.5 py-2">
                  {busy ? <Loader2 className="animate-spin" /> : <Camera />} Câmera
                </Button>
                <Button tone="soft" disabled={busy} onClick={() => photoPicker.current?.click()} className="px-3.5 py-2">
                  <ImagePlus /> Galeria
                </Button>
                {self?.photo && (
                  <Button tone="ghost" disabled={busy} onClick={() => setPhoto(null)} className="px-3.5 py-2">
                    Remover
                  </Button>
                )}
              </div>
            </div>
            <input ref={photoPicker} type="file" accept="image/*" hidden aria-label="Escolher foto de perfil" onChange={pickPhoto} />
            <input ref={selfie} type="file" accept="image/*" capture="user" hidden aria-label="Tirar foto de perfil" onChange={pickPhoto} />
          </div>
          <p className="text-xs text-ink-mute -mt-2">Aparece no Mural do diário e nos comentários. Só quem é do espaço vê.</p>
          {naming ? (
            <form
              className="flex gap-2"
              onSubmit={e => {
                e.preventDefault();
                if (name.trim()) void saveName();
              }}
            >
              <input aria-label="Seu nome" autoFocus className={`${inputClass} !py-2`} value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Como vocês se chamam no app" />
              <Button type="submit" disabled={busy || !name.trim()} className="px-4">
                Salvar
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-soft min-w-0">
                Seu nome: <strong className="text-ink">{self?.name ?? me.user.name}</strong>
              </p>
              <button type="button" onClick={() => setNaming(true)} className="shrink-0 inline-flex items-center gap-1 text-sm font-bold text-brand-strong">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">Seu papel nos registros</p>
            <Segmented label="Seu papel" size="sm" value={family.role} onChange={changeRole} options={[{ value: 'mae', label: 'Mãe' }, { value: 'pai', label: 'Pai' }]} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button tone="ghost" onClick={onSignOut}>
              <LogOut /> Sair da conta
            </Button>
            {others.length > 0 && (
              <Button tone="ghost" onClick={() => setConfirmRemove(me.user.id)}>
                <UserMinus /> Sair do espaço
              </Button>
            )}
          </div>
          {confirmRemove === me.user.id && (
            <div className="rounded-2xl bg-alert-soft px-4 py-3 space-y-2">
              <p className="text-sm text-ink">Sair do espaço? Você deixa de ver os registros e precisa de um novo convite para voltar.</p>
              <div className="flex gap-2">
                <Button tone="ghost" onClick={() => setConfirmRemove(null)}>Cancelar</Button>
                <Button tone="warm" disabled={busy} onClick={() => remove(me.user.id)}>Sair do espaço</Button>
              </div>
            </div>
          )}
        </section>

        {onCareMode && <CareModeSection since={careSince ?? null} onChange={onCareMode} />}

        <section className="bg-surface shadow-soft rounded-[24px] p-5 space-y-4">
          <div>
            <h3 className="text-base">Seus dados</h3>
            <p className="text-sm text-ink-mute">Pela LGPD, você pode baixar ou apagar tudo a qualquer momento.</p>
          </div>
          <a
            href="/api/account"
            download
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold bg-brand-soft text-brand-strong hover:brightness-[0.97] [&_svg]:w-4 [&_svg]:h-4"
          >
            <Download /> Baixar meus dados
          </a>
          <div className="flex flex-wrap gap-2">
            <Button tone="ghost" onClick={() => openDanger('account')}>
              <Trash2 /> Excluir minha conta
            </Button>
            <Button tone="ghost" onClick={() => openDanger('space')}>
              <Trash2 /> Excluir o espaço
            </Button>
          </div>
          {danger && (
            <div className="rounded-2xl bg-alert-soft px-4 py-4 space-y-3">
              <p className="text-sm text-ink">
                {danger === 'space'
                  ? `Todos os registros da gestação serão apagados para ${family.members.length > 1 ? `as ${family.members.length} pessoas do espaço` : 'você'}. As contas continuam, mas sem espaço. Não dá para desfazer.`
                  : others.length
                    ? `Sua conta e seu acesso serão apagados. Os registros do espaço continuam disponíveis para ${others.map(o => o.name.split(' ')[0]).join(' e ')}. Não dá para desfazer.`
                    : 'Sua conta, o espaço e todos os registros da gestação serão apagados. Não dá para desfazer.'}
              </p>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Digite EXCLUIR para confirmar"
                autoCapitalize="characters"
                aria-label="Digite EXCLUIR para confirmar"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                <Button tone="ghost" onClick={() => setDanger(null)}>Cancelar</Button>
                <Button tone="warm" disabled={busy || confirmText.trim().toUpperCase() !== 'EXCLUIR'} onClick={destroy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Trash2 />} Excluir definitivamente
                </Button>
              </div>
            </div>
          )}
          <LegalLinks />
        </section>

        {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-2.5">{error}</p>}
      </div>
    </div>
  );
}

/**
 * A família no espaço (migração 023): avós, tios, padrinhos... Até as vagas do
 * espaço, cada um com o parentesco. Veem a semana do bebê e os posts para a
 * família; abraçam e comentam. Saúde, exames e agenda ficam só com o casal.
 */
function FamilySection({ family, onFamilyChange }: { family: CoupleFamilyState; onFamilyChange: (family: FamilyState | null) => void }) {
  const relatives = family.relatives ?? [];
  const slots = family.slots ?? 0;
  const full = relatives.length >= slots;
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ userId: string; relation: string } | null>(null);
  const link = invite ? inviteLink(invite.code) : '';
  const message = `Quero que você acompanhe a gestação do nosso bebê de pertinho, no Tumtum: ${link}`;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir. Verifique a conexão.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  };

  return (
    <section className="bg-surface shadow-soft rounded-[24px] p-5 space-y-4" aria-labelledby="familia-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="familia-title" className="text-base flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-lilas" /> Família
          </h3>
          <p className="text-sm text-ink-mute">Avós, tios e padrinhos acompanham a semana do bebê e os posts que vocês marcarem como <strong className="text-ink-soft">Família</strong>. Saúde, exames e agenda ficam só com vocês.</p>
        </div>
        <span className="shrink-0 rounded-full bg-lilas-soft px-2.5 py-1 text-xs font-extrabold text-lilas-strong tabular">{slotsText(relatives.length, slots)}</span>
      </div>

      {relatives.length > 0 && (
        <ul className="divide-y divide-line" aria-label="Familiares">
          {relatives.map(r => (
            <li key={r.userId} className="py-3 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar member={r} role="familia" className="w-10 h-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{r.name}</p>
                  <p className="text-xs text-ink-mute truncate">{r.relation ?? 'Família'}</p>
                </div>
                <button type="button" onClick={() => setEditing({ userId: r.userId, relation: r.relation ?? '' })} aria-label={`Mudar o parentesco de ${r.name}`} className="w-9 h-9 rounded-full text-ink-mute hover:text-ink hover:bg-surface-2 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmRemove === r.userId ? (
                  <div className="flex gap-1">
                    <Button tone="ghost" onClick={() => setConfirmRemove(null)} className="px-3 py-1.5">Não</Button>
                    <Button
                      tone="warm"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          onFamilyChange((await api.family('removeMember', { userId: r.userId })).family);
                          setConfirmRemove(null);
                        })
                      }
                      className="px-3 py-1.5"
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmRemove(r.userId)} aria-label={`Remover ${r.name}`} className="w-9 h-9 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft flex items-center justify-center">
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editing?.userId === r.userId && (
                <form
                  className="flex gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    const relation = editing.relation.trim();
                    if (relation) {
                      void act(async () => {
                        onFamilyChange((await api.family('setRelation', { userId: r.userId, relation })).family);
                        setEditing(null);
                      });
                    }
                  }}
                >
                  <input aria-label="Parentesco" autoFocus list="parentescos-casal" className={`${inputClass} !py-2`} value={editing.relation} maxLength={MAX_RELATION} onChange={e => setEditing({ ...editing, relation: e.target.value })} />
                  <Button type="submit" disabled={busy || !editing.relation.trim()} className="px-4">Salvar</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <datalist id="parentescos-casal">
        {RELATIONS.map(r => (
          <option key={r} value={r} />
        ))}
      </datalist>
      {confirmRemove && <p className="text-xs text-ink-mute">A pessoa perde o acesso na hora, e os comentários e abraços dela saem junto.</p>}

      {invite ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-surface-2 px-4 py-3">
            <p className="text-xs text-ink-mute">Convite para a família</p>
            <p className="font-display text-xl tracking-[0.15em] text-ink">{formatInviteCode(invite.code)}</p>
            <p className="text-xs text-ink-mute mt-1 break-all">{link}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold bg-brand text-on-accent hover:bg-brand-strong shadow-soft [&_svg]:w-4 [&_svg]:h-4"
            >
              <MessageCircle /> WhatsApp
            </a>
            <Button tone="soft" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? 'Copiado' : 'Copiar link'}
            </Button>
          </div>
          <p className="text-xs text-ink-mute">Um convite por pessoa. Vence em {formatBR(invite.expiresAt.slice(0, 10))}.</p>
          {!full && (
            <button type="button" onClick={() => setInvite(null)} className="text-sm font-bold text-brand-strong">
              Convidar mais alguém
            </button>
          )}
        </div>
      ) : (
        <Button tone="soft" onClick={() => act(async () => setInvite(await api.family<{ code: string; expiresAt: string }>('invite', { kind: 'familia' })))} disabled={busy || full} className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : <Link2 />} {full ? 'Todas as vagas estão ocupadas' : 'Convidar alguém da família'}
        </Button>
      )}
      {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-2.5">{error}</p>}
    </section>
  );
}

/**
 * O modo cuidado (migração 029), para quando a gestação é interrompida: pausa
 * para os dois e para a família os avisos de semana, as contagens e as
 * celebrações. Pede confirmação para ligar; desligar é um toque.
 */
function CareModeSection({ since, onChange }: { since: string | null; onChange: (on: boolean) => Promise<boolean> }) {
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const change = async (on: boolean) => {
    setSaving(true);
    if (await onChange(on)) setAsking(false);
    setSaving(false);
  };
  return (
    <section className="bg-surface shadow-soft rounded-[24px] p-5 space-y-3" aria-labelledby="cuidado-title">
      <h3 id="cuidado-title" className="text-base flex items-center gap-2">
        <HeartHandshake className="w-4 h-4 text-lilas-strong" /> Modo cuidado
      </h3>
      {since ? (
        <>
          <p className="text-sm text-ink-soft">Ligado desde {formatBR(since)}. Os avisos de semana, as contagens e as celebrações estão pausados para vocês dois e para a família.</p>
          <Button tone="soft" disabled={saving} onClick={() => change(false)}>
            Desligar o modo cuidado
          </Button>
        </>
      ) : asking ? (
        <div className="rounded-2xl bg-lilas-soft p-4 space-y-3">
          <p className="text-sm text-ink">Sentimos muito. O modo cuidado vale para vocês dois e para a família, e nada do que vocês guardaram se perde. Dá para desligar quando quiserem.</p>
          <div className="flex gap-2">
            <Button disabled={saving} onClick={() => change(true)}>
              Ligar o modo cuidado
            </Button>
            <Button tone="ghost" disabled={saving} onClick={() => setAsking(false)}>
              Agora não
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-soft">Se a gestação foi interrompida, o Tumtum pausa os avisos de semana, as contagens e as celebrações, e o Início vira um lugar de acolhimento. Tudo o que vocês viveram continua guardado.</p>
          <button type="button" onClick={() => setAsking(true)} className="text-sm font-bold text-lilas-strong hover:underline">
            Passamos por uma perda
          </button>
        </>
      )}
    </section>
  );
}
