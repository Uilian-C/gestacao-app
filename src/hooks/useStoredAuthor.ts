import { useState } from 'react';
import type { Author } from '../types';

const STORAGE_KEY = 'nossa-gestacao:autor';

function readStored(): Author {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'pai' ? 'pai' : 'mae';
  } catch {
    return 'mae';
  }
}

/** Quem está usando este aparelho. Fica salvo para o celular do pai não registrar tudo como da mãe. */
export function useStoredAuthor(): [Author, (author: Author) => void] {
  const [author, setAuthorState] = useState<Author>(readStored);

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
