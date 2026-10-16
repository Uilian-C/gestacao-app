import { useSyncExternalStore } from 'react';
import { Bell, BellOff, Download, Loader2, Share, SquarePlus } from 'lucide-react';
import { usePush } from '../hooks/usePush';
import type { NotifyKind } from '../lib/notifications';
import { canInstall, isStandalone, onInstallChange, promptInstall } from '../lib/pwa';
import { Button } from './ui';

const KINDS: Array<{ id: NotifyKind; label: string; hint: string }> = [
  { id: 'consultas', label: 'Consultas', hint: 'Na véspera e na manhã do dia, com horário e endereço.' },
  { id: 'momentos', label: 'Lembretes dos momentos', hint: 'No dia que vocês escolheram.' },
  { id: 'jornada', label: 'Semana nova e jornada', hint: 'Quando completa a semana e abre a janela de um exame ou vacina.' },
  { id: 'parceiro', label: 'Registros da outra pessoa', hint: 'Sintoma, consulta, dúvida, tarefa ou momento novo.' },
];

/** Passo a passo do iPhone: o Safari só entrega notificações para apps na Tela de Início. */
export function IosInstallSteps() {
  return (
    <ol className="space-y-2 text-sm text-ink-soft">
      <li className="flex gap-2">
        <span className="font-semibold text-ink">1.</span>
        <span>
          Abra este site no <strong>Safari</strong> e toque em <Share className="inline w-4 h-4 -mt-0.5" aria-label="Compartilhar" /> <strong>Compartilhar</strong>.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="font-semibold text-ink">2.</span>
        <span>
          Escolha <SquarePlus className="inline w-4 h-4 -mt-0.5" aria-hidden /> <strong>Adicionar à Tela de Início</strong> e depois <strong>Adicionar</strong>.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="font-semibold text-ink">3.</span>
        <span>
          Abra o app pelo ícone novo e volte aqui em <strong>Nosso espaço</strong> para ativar.
        </span>
      </li>
    </ol>
  );
}

export function InstallButton({ className = '' }: { className?: string }) {
  const available = useSyncExternalStore(onInstallChange, canInstall, () => false);
  if (!available || isStandalone()) return null;
  return (
    <Button tone="soft" onClick={() => promptInstall()} className={className}>
      <Download /> Instalar o app
    </Button>
  );
}

/** Seção "Notificações" do Nosso espaço. */
export default function NotificationSettings() {
  const { state, busy, error, notice, enable, disable, test, setPref } = usePush();

  return (
    <section className="bg-surface shadow-soft rounded-[24px] p-5 space-y-4" aria-labelledby="notif-title">
      <div>
        <h3 id="notif-title" className="text-base">Notificações no celular</h3>
        <p className="text-sm text-ink-mute">Lembretes que chegam mesmo com o app fechado. Cada pessoa escolhe os seus.</p>
      </div>

      {state.phase === 'carregando' && (
        <p className="flex items-center gap-2 text-sm text-ink-mute">
          <Loader2 className="w-4 h-4 animate-spin" /> Verificando este aparelho...
        </p>
      )}

      {state.phase === 'ios-instalar' && (
        <div className="space-y-3">
          <p className="text-sm text-ink">No iPhone, as notificações funcionam com o app na Tela de Início:</p>
          <IosInstallSteps />
          <p className="text-xs text-ink-mute">Precisa do iOS 16.4 ou mais novo.</p>
        </div>
      )}

      {state.phase === 'sem-suporte' && <p className="text-sm text-ink-soft">Este navegador não recebe notificações. No celular, use o Chrome (Android) ou o Safari (iPhone).</p>}

      {state.phase === 'servidor-pendente' && <p className="text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">{state.message}</p>}

      {state.phase === 'bloqueado' && (
        <p className="text-sm text-ink-soft bg-surface-2 rounded-2xl px-4 py-3">
          As notificações deste site estão bloqueadas no aparelho. Para liberar: nas configurações do navegador (ou do app, se instalado), procure <strong>Notificações</strong> e permita o Nossa Gestação.
        </p>
      )}

      {state.phase === 'desligado' && (
        <Button onClick={enable} disabled={busy} className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : <Bell />} Ativar neste aparelho
        </Button>
      )}

      {state.phase === 'ligado' && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-ok flex items-center gap-1.5 mr-auto">
            <Bell className="w-4 h-4" /> Ativas neste aparelho
          </p>
          <Button tone="soft" onClick={test} disabled={busy} className="!px-4 !py-2">
            Enviar teste
          </Button>
          <Button tone="ghost" onClick={disable} disabled={busy} className="!px-3 !py-2">
            <BellOff /> Desativar
          </Button>
        </div>
      )}

      {'prefs' in state && (
        <fieldset className="space-y-1" disabled={busy}>
          <legend className="text-sm font-medium text-ink-soft mb-1">O que você quer receber</legend>
          {KINDS.map(k => (
            <label key={k.id} className="flex items-start gap-3 py-2 cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-5 h-5 accent-[var(--c-brand)] shrink-0" checked={state.prefs[k.id]} onChange={e => setPref(k.id, e.target.checked)} />
              <span>
                <span className="block text-sm text-ink">{k.label}</span>
                <span className="block text-xs text-ink-mute">{k.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {notice && <p className="text-sm text-ok" role="status">{notice}</p>}
      {error && <p className="text-sm text-alert" role="alert">{error}</p>}

      <InstallButton className="w-full" />
    </section>
  );
}
