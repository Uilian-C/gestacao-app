import { useCallback, useEffect, useState } from 'react';
import { CloudRain, Loader2 } from 'lucide-react';
import App from './App';
import { api, ApiError, type FamilyState, type Me } from './api';
import AuthScreen from './components/auth/AuthScreen';
import Onboarding from './components/auth/Onboarding';
import { authClient } from './lib/authClient';
import { clearPendingInvite } from './lib/invite';

const AUTHOR_KEY = 'nossa-gestacao:autor';

/** A cor do app segue o papel de quem está logado (mãe rosé, pai azul; sem login, neutro). */
function applyAuthorColor(role: string | undefined) {
  const root = document.documentElement;
  if (role) root.dataset.author = role;
  else delete root.dataset.author;
  try {
    if (role) localStorage.setItem(AUTHOR_KEY, role);
    else localStorage.removeItem(AUTHOR_KEY);
  } catch {
    // Armazenamento bloqueado: a cor só não fica guardada para a próxima abertura.
  }
}

/** Porta de entrada: login, depois o espaço da família, depois o app. */
export default function Root() {
  const session = authClient.useSession();
  const userId = session.data?.user.id ?? null;
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api
      .me()
      .then(result => {
        if (cancelled) return;
        setMe(result);
        setFailed(false);
        // Quem já tem espaço não usa convite pendente.
        if (result.family) clearPendingInvite();
      })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) session.refetch();
        else setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session.refetch é estável; recarregar só quando muda o usuário
  }, [userId, attempt]);

  const current = me && me.user.id === userId ? me : null;
  useEffect(() => applyAuthorColor(current?.family?.role), [current?.family?.role]);

  const setFamily = useCallback((family: FamilyState | null) => setMe(prev => (prev ? { ...prev, family } : prev)), []);
  const { refetch } = session;
  const reload = useCallback(() => {
    refetch();
    setAttempt(a => a + 1);
  }, [refetch]);
  const signOut = useCallback(async () => {
    await authClient.signOut();
    setMe(null);
  }, []);

  if (session.isPending) return <Splash />;
  if (!userId) return <AuthScreen />;
  if (!current) {
    return failed ? (
      <Splash>
        <CloudRain className="w-8 h-8 mx-auto text-ink-mute" />
        <p className="text-ink-soft">Não foi possível conectar. Verifique a internet.</p>
        <button onClick={reload} className="bg-brand text-on-accent font-semibold px-5 py-2.5 rounded-full text-sm">Tentar de novo</button>
      </Splash>
    ) : (
      <Splash />
    );
  }
  if (!current.family) return <Onboarding name={current.user.name} onReady={setFamily} onSignOut={signOut} />;

  return <App me={current} family={current.family} onFamilyChange={setFamily} onAccessLost={reload} onSignOut={signOut} />;
}

function Splash({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        {children ?? (
          <p className="flex items-center gap-2 text-brand font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Abrindo o espaço de vocês...
          </p>
        )}
      </div>
    </div>
  );
}
