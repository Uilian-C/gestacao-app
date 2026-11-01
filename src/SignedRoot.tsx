import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { CloudRain } from 'lucide-react';
import { ApiError, isCoupleFamily, type FamilyState, type Me } from './api';
import { Splash } from './components/Splash';
import { authClient } from './lib/authClient';
import { loadMe } from './lib/boot';
import { clearPendingInvite } from './lib/invite';
import { markHere } from './lib/returning';

// Cada porta carrega só o que usa: o login, os termos, o começo do espaço, o
// app do casal ou o da família.
const App = lazy(() => import('./App'));
const AuthScreen = lazy(() => import('./components/auth/AuthScreen'));
const ConsentScreen = lazy(() => import('./components/auth/ConsentScreen'));
const Onboarding = lazy(() => import('./components/auth/Onboarding'));
const FamilyApp = lazy(() => import('./components/family/FamilyApp'));


/** Porta de entrada: login, depois o espaço da família, depois o app. */
export default function SignedRoot() {
  const session = authClient.useSession();
  const userId = session.data?.user.id ?? null;
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    markHere();
    let cancelled = false;
    loadMe(userId)
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

  const { refetch } = session;
  const setFamily = useCallback((family: FamilyState | null) => setMe(prev => (prev ? { ...prev, family } : prev)), []);
  const reload = useCallback(() => {
    refetch();
    setAttempt(a => a + 1);
  }, [refetch]);
  const signOut = useCallback(async () => {
    // Depois de excluir a conta a sessão já não existe; sair mesmo assim limpa o navegador.
    await authClient.signOut().catch(() => undefined);
    setMe(null);
    refetch();
  }, [refetch]);

  if (session.isPending) return <Splash />;
  return <Suspense fallback={<Splash />}>{door()}</Suspense>;

  function door() {
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
  if (!current.consent.accepted) {
    return (
      <ConsentScreen
        version={current.consent.version}
        updated={current.consent.previous}
        onAccepted={() => setMe(prev => (prev ? { ...prev, consent: { ...prev.consent, accepted: true } } : prev))}
        onSignOut={signOut}
      />
    );
  }
  if (!current.family) return <Onboarding name={current.user.name} onReady={setFamily} onSignOut={signOut} />;

  // Quem é da família (migração 023) usa um Tumtum próprio, só com o que o casal mostra.
  if (!isCoupleFamily(current.family)) return <FamilyApp me={current} family={current.family} onFamilyChange={setFamily} onAccessLost={reload} onSignOut={signOut} />;
  return <App me={current} family={current.family} onFamilyChange={setFamily} onAccessLost={reload} onSignOut={signOut} />;
  }
}

