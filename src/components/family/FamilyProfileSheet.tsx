import { useRef, useState } from 'react';
import { Camera, Download, ImagePlus, Loader2, LogOut, Trash2, UserMinus } from 'lucide-react';
import { api, ApiError, type FamilyState, type Me } from '../../api';
import { FileProblem, prepareAvatar } from '../../lib/examFiles';
import { MAX_RELATION, RELATIONS } from '../../lib/relatives';
import Avatar from '../Avatar';
import { LegalLinks } from '../auth/AuthScreen';
import NotificationSettings from '../NotificationSettings';
import Sheet from '../Sheet';
import { inputClass } from '../styles';
import { Button } from '../ui';

// O perfil de quem é da família: nome, foto, parentesco, avisos e conta.

interface Props {
  me: Me;
  family: FamilyState;
  onClose: () => void;
  onFamilyChange: (family: FamilyState | null) => void;
  onSignOut: () => void;
}

export default function FamilyProfileSheet({ me, family, onClose, onFamilyChange, onSignOut }: Props) {
  const self = family.relatives?.find(r => r.me);
  const [name, setName] = useState(self?.name ?? me.user.name);
  const [relation, setRelation] = useState(self?.relation ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<'sair' | 'excluir' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const gallery = useRef<HTMLInputElement>(null);
  const selfie = useRef<HTMLInputElement>(null);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof FileProblem ? err.message : 'Não foi possível concluir. Verifique a conexão.');
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    act(async () => {
      if (name.trim() && name.trim() !== self?.name) onFamilyChange((await api.family('rename', { name: name.trim() })).family);
      if (relation.trim() && relation.trim() !== self?.relation) onFamilyChange((await api.family('setRelation', { userId: me.user.id, relation: relation.trim() })).family);
      setSaved(true);
    });

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void act(async () => onFamilyChange((await api.avatar((await prepareAvatar(file)).data)).family));
  };

  const leave = () =>
    act(async () => {
      const res = await api.family('removeMember', { userId: me.user.id });
      onFamilyChange(res.family);
    });

  const destroy = () =>
    act(async () => {
      await api.account('deleteAccount', 'EXCLUIR');
      onSignOut();
    });

  return (
    <Sheet title="Seu perfil" subtitle="Como você aparece para o casal e para a família." onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar member={self} role="familia" className="w-16 h-16 text-xl" />
          <div className="flex flex-wrap gap-2">
            <Button tone="soft" disabled={busy} onClick={() => selfie.current?.click()} className="px-3.5 py-2">
              <Camera /> Câmera
            </Button>
            <Button tone="soft" disabled={busy} onClick={() => gallery.current?.click()} className="px-3.5 py-2">
              <ImagePlus /> Galeria
            </Button>
          </div>
          <input ref={gallery} type="file" accept="image/*" hidden aria-label="Escolher foto de perfil" onChange={pick} />
          <input ref={selfie} type="file" accept="image/*" capture="user" hidden aria-label="Tirar foto de perfil" onChange={pick} />
        </div>

        <form
          className="space-y-3"
          onSubmit={e => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink-soft">Seu nome</span>
            <input className={inputClass} value={name} onChange={e => setName(e.target.value)} maxLength={60} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink-soft">Você é</span>
            <input className={inputClass} list="parentescos" value={relation} onChange={e => setRelation(e.target.value)} maxLength={MAX_RELATION} placeholder="Avó, tio, madrinha..." />
            <datalist id="parentescos">
              {RELATIONS.map(r => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy || !name.trim() || !relation.trim()}>
              {busy && <Loader2 className="animate-spin" />} Salvar
            </Button>
            {saved && <span role="status" className="text-sm text-ok">Salvo</span>}
          </div>
        </form>

        <NotificationSettings relative />

        <section className="space-y-3">
          <h3 className="text-base">Sua conta</h3>
          <p className="text-sm text-ink-mute">Você vê só o que o casal posta para a família. Pela LGPD, pode baixar ou apagar seus dados quando quiser.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/account" download className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold bg-brand-soft text-brand-strong [&_svg]:w-4 [&_svg]:h-4">
              <Download /> Baixar meus dados
            </a>
            <Button tone="ghost" onClick={onSignOut}>
              <LogOut /> Sair da conta
            </Button>
            <Button tone="ghost" onClick={() => setConfirm('sair')}>
              <UserMinus /> Sair do espaço
            </Button>
            <Button tone="ghost" onClick={() => setConfirm('excluir')}>
              <Trash2 /> Excluir minha conta
            </Button>
          </div>
          {confirm === 'sair' && (
            <div className="rounded-2xl bg-alert-soft px-4 py-3 space-y-2">
              <p className="text-sm text-ink">Sair do espaço? Seus comentários e abraços saem junto, e para voltar é preciso um novo convite.</p>
              <div className="flex gap-2">
                <Button tone="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
                <Button tone="warm" disabled={busy} onClick={leave}>Sair do espaço</Button>
              </div>
            </div>
          )}
          {confirm === 'excluir' && (
            <div className="rounded-2xl bg-alert-soft px-4 py-3 space-y-3">
              <p className="text-sm text-ink">Sua conta, seus comentários e abraços serão apagados. Não dá para desfazer.</p>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Digite EXCLUIR para confirmar" aria-label="Digite EXCLUIR para confirmar" autoCapitalize="characters" className={inputClass} />
              <div className="flex gap-2">
                <Button tone="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
                <Button tone="warm" disabled={busy || confirmText.trim().toUpperCase() !== 'EXCLUIR'} onClick={destroy}>
                  <Trash2 /> Excluir definitivamente
                </Button>
              </div>
            </div>
          )}
          <LegalLinks />
        </section>

        {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-2.5">{error}</p>}
      </div>
    </Sheet>
  );
}
