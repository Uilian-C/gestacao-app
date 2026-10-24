import { useState } from 'react';
import { BellRing, Loader2, X } from 'lucide-react';
import { usePush } from '../hooks/usePush';
import { IosInstallSteps, OpenInChrome } from './NotificationSettings';
import { Button } from './ui';
import { dismissPush, offersPush, pushDismissed } from '../lib/pushInvite';

/** O jeito de ativar neste aparelho: o botão, ou o passo a passo (iPhone, outro navegador). */
export function PushSteps({ push, relative = false }: { push: ReturnType<typeof usePush>; relative?: boolean }) {
  const { state, busy, error, enable } = push;
  return (
    <>
      {state.phase === 'ios-instalar' ? (
        <IosInstallSteps />
      ) : state.phase === 'outro-navegador' ? (
        <OpenInChrome />
      ) : (
        <Button onClick={enable} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <BellRing />} {relative ? 'Ativar avisos' : 'Ativar lembretes'}
        </Button>
      )}
      {error && <p className="text-sm text-alert" role="alert">{error}</p>}
    </>
  );
}

/** Convite (Início da família) para ligar os avisos neste aparelho. Some de vez ao ativar ou fechar. */
export default function PushPrompt({ relative = false }: { relative?: boolean }) {
  const [hidden, setHidden] = useState(pushDismissed);
  const push = usePush();
  if (hidden || !offersPush(push.state.phase)) return null;

  const close = () => {
    dismissPush();
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
          <p className="font-semibold text-ink">{relative ? 'Avisos no celular' : 'Lembretes no celular'}</p>
          <p className="text-sm text-ink-soft">
            {relative
              ? 'Saiba na hora quando o casal postar para a família, quando responderem você e a cada semana nova do bebê.'
              : 'Véspera das consultas, semana nova, exames chegando e os lembretes dos momentos, mesmo com o app fechado.'}
          </p>
        </div>
      </div>
      <PushSteps push={push} relative={relative} />
    </div>
  );
}
