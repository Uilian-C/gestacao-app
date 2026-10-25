import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api';
import { currentEndpoint, disablePush, enablePush, permission, pushStatus, pushSupport, saveBestTime, savePrefs, sendTest, type BestTime, type NotifyPrefs } from '../lib/notifications';

export type PushState =
  | { phase: 'carregando' }
  | { phase: 'ios-instalar' | 'outro-navegador' | 'sem-suporte' }
  | { phase: 'servidor-pendente'; message: string }
  | { phase: 'bloqueado' | 'desligado' | 'ligado'; prefs: NotifyPrefs; publicKey: string; bestTime: BestTime };

/** Estado das notificações neste aparelho e as ações para mudar. */
export function usePush() {
  const [state, setState] = useState<PushState>({ phase: 'carregando' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const support = pushSupport();
    if (support !== 'ok') return setState({ phase: support });
    try {
      const [status, endpoint] = await Promise.all([pushStatus(), currentEndpoint()]);
      const on = !!endpoint && status.endpoints.includes(endpoint) && permission() === 'granted';
      setState({ phase: permission() === 'denied' ? 'bloqueado' : on ? 'ligado' : 'desligado', prefs: status.prefs, publicKey: status.publicKey, bestTime: status.bestTime ?? 'manha' });
    } catch (err) {
      setState({ phase: 'servidor-pendente', message: err instanceof ApiError ? err.message : 'Não foi possível verificar as notificações.' });
    }
  }, []);

  useEffect(() => {
    // Carrega uma vez ao abrir; as mudanças de estado vêm das ações abaixo.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca externa, sem estado derivado
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir. Verifique a conexão.');
    } finally {
      setBusy(false);
    }
  };

  const enable = () =>
    run(async () => {
      if (state.phase !== 'desligado' && state.phase !== 'bloqueado') return;
      const ok = await enablePush(state.publicKey);
      if (!ok) setError('O aparelho não permitiu. Para liberar, abra as configurações do navegador e permita notificações deste site.');
      await load();
    });

  const disable = () =>
    run(async () => {
      await disablePush();
      await load();
    });

  const test = () =>
    run(async () => {
      await sendTest();
      setNotice('Enviado. Deve chegar em alguns segundos.');
    });

  const setPref = (kind: keyof NotifyPrefs, value: boolean) =>
    run(async () => {
      if (!('prefs' in state)) return;
      const next = { ...state.prefs, [kind]: value };
      setState({ ...state, prefs: next });
      const saved = await savePrefs(next);
      setState(s => ('prefs' in s ? { ...s, prefs: saved.prefs } : s));
    });

  const setBestTime = (value: BestTime) =>
    run(async () => {
      if (!('prefs' in state)) return;
      setState({ ...state, bestTime: value });
      await saveBestTime(value);
    });

  return { state, busy, error, notice, enable, disable, test, setPref, setBestTime };
}
