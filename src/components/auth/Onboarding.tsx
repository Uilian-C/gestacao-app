import { useEffect, useState, type FormEvent } from 'react';
import { HeartHandshake, Loader2, LogOut, Sparkles, Ticket } from 'lucide-react';
import { api, ApiError, type FamilyState } from '../../api';
import { clearPendingInvite, pendingInvite } from '../../lib/invite';
import type { Author } from '../../types';
import { inputClass } from '../styles';
import { Button, Field, Segmented } from '../ui';

const ROLE_OPTIONS: Array<{ value: Author; label: string }> = [
  { value: 'mae', label: 'Sou a mãe' },
  { value: 'pai', label: 'Sou o pai' },
];

interface InviteInfo {
  valid: boolean;
  inviter: string | null;
  inviterRole: Author | null;
}

interface Props {
  name: string;
  onReady: (family: FamilyState) => void;
  onSignOut: () => void;
}

/** Logado, mas ainda sem espaço: criar um novo ou entrar com um convite. */
export default function Onboarding({ name, onReady, onSignOut }: Props) {
  const [role, setRole] = useState<Author>('mae');
  const [code, setCode] = useState(() => pendingInvite() ?? '');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(() => !!pendingInvite());

  // Convite que veio pelo link: confere na hora para mostrar quem convidou.
  useEffect(() => {
    const fromLink = pendingInvite();
    if (!fromLink) return;
    api
      .family<InviteInfo>('checkInvite', { code: fromLink })
      .then(info => {
        setInvite(info);
        // Quem convidou já tem um papel: sugere o outro.
        if (info.inviterRole === 'mae') setRole('pai');
      })
      .catch(() => undefined);
  }, []);

  const act = async (op: 'create' | 'join') => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.family(op, op === 'join' ? { code, role } : { role });
      clearPendingInvite();
      if (res.family) onReady(res.family);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível continuar. Verifique a conexão.');
    } finally {
      setBusy(false);
    }
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    act('join');
  };

  const firstName = name.split(' ')[0];

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-[1.7rem] leading-tight">Olá, {firstName}</h1>
          <p className="text-ink-soft text-[15px] text-balance">
            {invite?.valid ? `${invite.inviter ?? 'Alguém'} convidou você para acompanhar a gestação juntos.` : 'Vamos preparar o espaço de vocês. Cada família tem o seu, e só quem vocês convidarem consegue ver.'}
          </p>
        </div>

        <section className="bg-surface shadow-soft rounded-[28px] p-6 space-y-5">
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium text-ink-soft">Quem é você nesta gestação?</p>
            <Segmented label="Seu papel" value={role} onChange={setRole} options={ROLE_OPTIONS} />
            <p className="text-xs text-ink-mute">Define a cor do app e aparece nos seus registros. Dá para mudar depois.</p>
          </div>

          {showCode ? (
            <form onSubmit={join} className="space-y-4">
              <Field label="Código do convite" htmlFor="codigo" hint="Está no link que você recebeu, depois de convite=.">
                <input
                  id="codigo"
                  required
                  autoCapitalize="characters"
                  autoComplete="off"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className={`${inputClass} tracking-[0.2em] uppercase`}
                  placeholder="ABCDE-FGHIJ"
                />
              </Field>
              {invite && !invite.valid && <p className="text-sm text-warn bg-warn-soft rounded-2xl px-4 py-2.5">Este convite já foi usado ou venceu. Peça um novo a quem convidou.</p>}
              {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-2.5">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="animate-spin" /> : <HeartHandshake />} Entrar no espaço
              </Button>
              <button type="button" onClick={() => setShowCode(false)} className="w-full text-sm text-ink-mute hover:text-ink underline underline-offset-4">
                Não tenho convite: criar um espaço novo
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-2.5">{error}</p>}
              <Button onClick={() => act('create')} disabled={busy} className="w-full">
                {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Criar o espaço da nossa gestação
              </Button>
              <Button tone="soft" onClick={() => setShowCode(true)} className="w-full">
                <Ticket /> Tenho um convite
              </Button>
              <p className="text-xs text-ink-mute text-center text-balance">Depois de criar, é só convidar a outra pessoa pelo WhatsApp.</p>
            </div>
          )}
        </section>

        <button type="button" onClick={onSignOut} className="mx-auto flex items-center gap-2 text-sm text-ink-mute hover:text-ink">
          <LogOut className="w-4 h-4" /> Sair da conta
        </button>
      </div>
    </div>
  );
}
