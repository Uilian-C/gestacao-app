import { useCallback, useEffect, useState } from 'react';
import { api, type ContentItem } from '../api';

/**
 * Conteúdo do app (mensagem do dia e leituras), carregado uma vez ao abrir.
 * Sem a migração 021 ou sem conexão, fica vazio e o Início segue sem ele.
 */
export function useContent() {
  const [state, setState] = useState<{ items: ContentItem[]; admin: boolean; available: boolean }>({ items: [], admin: false, available: false });
  const load = useCallback(() => {
    api.content().then(setState).catch(() => undefined);
  }, []);
  useEffect(load, [load]);
  return { ...state, reload: load };
}
