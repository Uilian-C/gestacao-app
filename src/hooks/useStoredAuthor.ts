import { useEffect, useState } from 'react';
import type { Author } from '../types';

// A mesma chave é lida por um script em index.html, que aplica a cor antes do
// React carregar (sem piscar na cor da outra pessoa).
const STORAGE_KEY = 'nossa-gestacao:autor';

function readStored(): Author {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'pai' ? 'pai' : 'mae';
  } catch {
    return 'mae';
  }
}

/**
 * Quem está usando este aparelho. Fica salvo para o celular do pai não
 * registrar tudo como da mãe, e define a cor principal do app.
 */
export function useStoredAuthor(): [Author, (author: Author) => void] {
  const [author, setAuthorState] = useState<Author>(readStored);

  useEffect(() => {
    document.documentElement.dataset.author = author;
  }, [author]);

  const setAuthor = (next: Author) => {
    setAuthorState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Armazenamento bloqueado (aba anônima): vale só até fechar a página.
    }
  };

  return [author, setAuthor];
}
