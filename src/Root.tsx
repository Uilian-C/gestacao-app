import { Suspense, lazy } from 'react';
import { Splash } from './components/Splash';
import { startBoot } from './lib/boot';

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

// Quem abre o link do bolão ou do envelope não precisa do app inteiro (nem do login):
// cada porta é um pedaço separado, baixado só quando usado.
const SignedRoot = lazy(() => import('./SignedRoot'));
const BolaoPage = lazy(() => import('./components/public/PublicPages').then(m => ({ default: m.BolaoPage })));
const EnvelopePage = lazy(() => import('./components/public/PublicPages').then(m => ({ default: m.EnvelopePage })));

export default function Root() {
  const page = publicPage();
  if (!page) startBoot();
  return <Suspense fallback={<Splash />}>{page ? page.kind === 'palpite' ? <BolaoPage token={page.token} /> : <EnvelopePage token={page.token} /> : <SignedRoot />}</Suspense>;
}
