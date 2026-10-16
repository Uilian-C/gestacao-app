import { useState } from 'react';
import { BellRing, Loader2, X } from 'lucide-react';
import { usePush } from '../hooks/usePush';
import { IosInstallSteps, OpenInChrome } from './NotificationSettings';
import { Button } from './ui';

const KEY = 'nossa-gestacao:convite-notificacoes';

function dismissed() {
  try {
    return localStorage.getItem(KEY) === 'fechado';
  } catch {
    return false;
  }
}

/** Convite no Início para ligar os lembretes neste aparelho. Some de vez ao ativar ou fechar. */
export default function PushPrompt() {
  const [hidden, setHidden] = useState(dismissed);
  const { state, busy, error, enable } = usePush();
  if (hidden || (state.phase !== 'desligado' && state.phase !== 'ios-instalar' && state.phase !== 'outro-navegador')) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, 'fechado');
    } catch {
      // Sem armazenamento: volta a aparecer na próxima abertura.
    }
    setHidden(true);
  };

  return (
    <div className="no-print mb-4 rounded-[24px] bg-brand-soft p-4 sm:p-5 space-y-3 relative">
      <button type="button" onClick={close} aria-label="Agora não" className="absolute top-3 right-3 w-8 h-8 rounded-full text-ink-mute hover:text-ink flex items-center justify-center">
        <X className="w-4 h-4" />
      </button>
      <div className="flex gap-3 pr-8">
        <span className="w-10 h-10 rounded-full bg-surface text-brand-strong flex items-center justify-center shrink-0">
          <BellRing className="w-5 h-5" />
        </span>
        <div>
          <p className="font-semibold text-ink">Lembretes no celular</p>
          <p className="text-sm text-ink-soft">Véspera das consultas, semana nova, exames chegando e os lembretes dos momentos, mesmo com o app fechado.</p>
        </div>
      </div>
      {state.phase === 'ios-instalar' ? (
        <IosInstallSteps />
      ) : state.phase === 'outro-navegador' ? (
        <OpenInChrome />
      ) : (
        <Button onClick={enable} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <BellRing />} Ativar lembretes
        </Button>
      )}
      {error && <p className="text-sm text-alert" role="alert">{error}</p>}
    </div>
  );
}
