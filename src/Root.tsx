import { useCallback, useEffect, useState } from 'react';
import { CloudRain } from 'lucide-react';
import App from './App';
import BrandMark from './components/BrandMark';
import { api, ApiError, isCoupleFamily, type FamilyState, type Me } from './api';
import AuthScreen from './components/auth/AuthScreen';
import ConsentScreen from './components/auth/ConsentScreen';
import Onboarding from './components/auth/Onboarding';
import FamilyApp from './components/family/FamilyApp';
import { BolaoPage, EnvelopePage } from './components/public/PublicPages';
import { authClient } from './lib/authClient';
import { clearPendingInvite } from './lib/invite';
import { markHere } from './lib/returning';


// Ao abrir, o espaço e os dados já começam a vir junto com a checagem do login,
// em vez de esperar uma pela outra. Só serve se for da mesma pessoa que está logada.
let boot: Promise<Me | null> | null = api.me().catch(() => null);

async function loadMe(userId: string) {
  const early = boot;
  boot = null;
  const result = early ? await early : null;
  return result && result.user.id === userId ? result : api.me();
}

/** As páginas abertas (sem login): o bolão e o envelope do chá. */
function publicPage() {
  // Os links saem como /?palpite=… (funcionam em qualquer hospedagem); /palpite/… também abre.
  const q = new URLSearchParams(window.location.search);
  for (const kind of ['palpite', 'envelope'] as const) {
    const t = q.get(kind);
    if (t && /^[A-Za-z0-9_-]{8,32}$/.test(t)) return { kind, token: t };
  }
  const m = window.location.pathname.match(/^\/(palpite|envelope)\/([A-Za-z0-9_-]{8,32})\/?$/);
  return m ? { kind: m[1] as 'palpite' | 'envelope', token: m[2] } : null;
}

export default function Root() {
  const page = publicPage();
  if (page) return page.kind === 'palpite' ? <BolaoPage token={page.token} /> : <EnvelopePage token={page.token} />;
  return <SignedRoot />;
}

/** Porta de entrada: login, depois o espaço da família, depois o app. */
function SignedRoot() {
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

function Splash({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        {children ?? (
          <div className="space-y-3" role="status">
            <BrandMark animated className="w-20 h-20 mx-auto" />
            <p className="text-ink-soft font-medium">Abrindo o espaço de vocês...</p>
          </div>
        )}
      </div>
    </div>
  );
}
