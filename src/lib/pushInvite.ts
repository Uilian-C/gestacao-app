// O convite para ligar os lembretes: some de vez neste aparelho ao fechar.

const KEY = 'nossa-gestacao:convite-notificacoes';

export function pushDismissed() {
  try {
    return localStorage.getItem(KEY) === 'fechado';
  } catch {
    return false;
  }
}

/** Não oferecer de novo os lembretes neste aparelho. */
export function dismissPush() {
  try {
    localStorage.setItem(KEY, 'fechado');
  } catch {
    // Sem armazenamento: volta a aparecer na próxima abertura.
  }
}

/** Os aparelhos em que vale convidar: dá para ativar, ou dá depois de instalar ou trocar de navegador. */
export const offersPush = (phase: string) => phase === 'desligado' || phase === 'ios-instalar' || phase === 'outro-navegador';
