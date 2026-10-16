// Convite recebido por link (/?convite=CODIGO). Fica guardado até a pessoa
// entrar ou criar a conta, inclusive se ela sair do app para entrar com o Google.

const KEY = 'nossa-gestacao:convite';

export function captureInviteFromUrl() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('convite');
  if (!code) return;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    // Sem armazenamento: a pessoa digita o código na tela de convite.
  }
  url.searchParams.delete('convite');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

export function pendingInvite(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada a fazer
  }
}

export const inviteLink = (code: string) => `${window.location.origin}/?convite=${code}`;

/** ABCDE-FGHIJ: mais fácil de ler em voz alta ou digitar. */
export const formatInviteCode = (code: string) => (code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code);
