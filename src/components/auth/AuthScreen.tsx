import { useEffect, useState, type FormEvent } from 'react';
import { Heart, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { api } from '../../api';
import { authClient } from '../../lib/authClient';
import { pendingInvite } from '../../lib/invite';
import { inputClass } from '../styles';
import { Button, Field, Segmented } from '../ui';

type Mode = 'entrar' | 'criar' | 'esqueci' | 'redefinir';

const ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail. Use "Entrar".',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com este e-mail. Use "Entrar".',
  PASSWORD_TOO_SHORT: 'A senha precisa ter pelo menos 8 caracteres.',
  INVALID_EMAIL: 'Confira o e-mail digitado.',
  INVALID_TOKEN: 'Este link de redefinição venceu. Peça um novo.',
};

function errorText(error: { code?: string; status?: number; message?: string } | null) {
  if (!error) return null;
  if (error.status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  return (error.code && ERRORS[error.code]) || 'Não foi possível continuar. Verifique a conexão e tente de novo.';
}

function resetToken() {
  return new URLSearchParams(window.location.search).get('token');
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>(() => (resetToken() ? 'redefinir' : pendingInvite() ? 'criar' : 'entrar'));
  const [config, setConfig] = useState<{ google: boolean; passwordReset: boolean }>({ google: false, passwordReset: false });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const invited = !!pendingInvite();

  useEffect(() => {
    api.config().then(setConfig).catch(() => undefined);
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'entrar') {
        const { error: err } = await authClient.signIn.email({ email, password });
        setError(errorText(err));
      } else if (mode === 'criar') {
        const { error: err } = await authClient.signUp.email({ name: name.trim(), email, password });
        setError(errorText(err));
      } else if (mode === 'esqueci') {
        const { error: err } = await authClient.requestPasswordReset({ email, redirectTo: '/' });
        if (err) setError(errorText(err));
        else setNotice('Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha.');
      } else {
        const { error: err } = await authClient.resetPassword({ newPassword: password, token: resetToken() ?? '' });
        if (err) setError(errorText(err));
        else {
          window.history.replaceState(null, '', '/');
          setPassword('');
          setMode('entrar');
          setNotice('Senha alterada. Agora é só entrar.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const { error: err } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
    if (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const titles: Record<Mode, string> = {
    entrar: 'Que bom ter vocês de volta',
    criar: invited ? 'Crie sua conta para aceitar o convite' : 'Crie sua conta',
    esqueci: 'Recuperar o acesso',
    redefinir: 'Crie uma nova senha',
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-brand-soft text-brand flex items-center justify-center">
            <Heart className="w-6 h-6" />
          </div>
          <h1 className="text-[1.7rem] leading-tight">Nossa Gestação</h1>
          <p className="text-ink-soft text-[15px] text-balance">O diário do casal para acompanhar a gestação e levar tudo organizado às consultas.</p>
        </div>

        <section className="bg-surface shadow-soft rounded-[28px] p-6 space-y-5">
          {invited && (mode === 'entrar' || mode === 'criar') && (
            <p className="text-sm bg-brand-soft text-brand-strong rounded-2xl px-4 py-3">
              Você recebeu um convite para um espaço da gestação. Entre ou crie sua conta para aceitar.
            </p>
          )}

          {(mode === 'entrar' || mode === 'criar') && (
            <div className="flex justify-center">
              <Segmented
                label="Entrar ou criar conta"
                value={mode}
                onChange={switchMode}
                options={[
                  { value: 'entrar', label: 'Entrar' },
                  { value: 'criar', label: 'Criar conta' },
                ]}
              />
            </div>
          )}

          <h2 className="text-[1.25rem] text-center">{titles[mode]}</h2>

          {config.google && (mode === 'entrar' || mode === 'criar') && (
            <>
              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-3 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2 transition disabled:opacity-50"
              >
                <GoogleMark /> Continuar com o Google
              </button>
              <div className="flex items-center gap-3 text-xs text-ink-mute">
                <span className="h-px flex-1 bg-line" /> ou com e-mail <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'criar' && (
              <Field label="Seu nome" htmlFor="nome">
                <input id="nome" required maxLength={80} autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Como vocês se chamam no dia a dia" />
              </Field>
            )}
            {mode !== 'redefinir' && (
              <Field label="E-mail" htmlFor="email">
                <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
              </Field>
            )}
            {mode !== 'esqueci' && (
              <Field label={mode === 'redefinir' ? 'Nova senha' : 'Senha'} hint={mode === 'entrar' ? undefined : 'Pelo menos 8 caracteres.'} htmlFor="senha">
                <input
                  id="senha"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}

            {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-2.5">{error}</p>}
            {notice && <p role="status" className="text-sm text-ok bg-ok-soft rounded-2xl px-4 py-2.5">{notice}</p>}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="animate-spin" /> : mode === 'esqueci' ? <Mail /> : <LockKeyhole />}
              {{ entrar: 'Entrar', criar: 'Criar conta', esqueci: 'Enviar link', redefinir: 'Salvar nova senha' }[mode]}
            </Button>
          </form>

          <div className="text-center text-sm">
            {mode === 'entrar' && config.passwordReset && (
              <button type="button" onClick={() => switchMode('esqueci')} className="text-ink-mute hover:text-ink underline underline-offset-4">
                Esqueci minha senha
              </button>
            )}
            {mode === 'entrar' && !config.passwordReset && <p className="text-ink-mute text-xs">Esqueceu a senha? Peça para quem divide o espaço com você convidar sua nova conta.</p>}
            {(mode === 'esqueci' || mode === 'redefinir') && (
              <button type="button" onClick={() => switchMode('entrar')} className="text-ink-mute hover:text-ink underline underline-offset-4">
                Voltar para entrar
              </button>
            )}
          </div>
        </section>

        <p className="text-xs text-ink-mute text-center text-balance">
          Cada família tem um espaço só seu. Só as pessoas que vocês convidarem conseguem ver os registros.
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-[18px] h-[18px]" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
