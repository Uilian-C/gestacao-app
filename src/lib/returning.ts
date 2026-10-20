// Quem já entrou neste aparelho volta direto para o login enxuto; quem nunca
// entrou vê a apresentação do Tumtum. Fica só no aparelho (localStorage).

const KEY = 'tumtum:ja-entrou';

export function wasHere(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markHere() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Sem armazenamento (aba anônima): mostra a apresentação de novo, sem problema.
  }
}
