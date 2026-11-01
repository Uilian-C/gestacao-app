import { useState, useSyncExternalStore } from 'react';
import { Bell, BellOff, Check, Copy, Download, ExternalLink, Loader2, Share, SquarePlus } from 'lucide-react';
import { usePush } from '../hooks/usePush';
import type { NotifyKind } from '../lib/notifications';
import { canInstall, chromeIntentUrl, iosTooOld, isAndroid, isIOS, isStandalone, limitedBrowser, onInstallChange, promptInstall } from '../lib/pwa';
import { Button, Segmented } from './ui';

const KINDS: Array<{ id: NotifyKind; label: string; hint: string }> = [
  { id: 'consultas', label: 'Consultas', hint: 'Na véspera, à noite, e na manhã do dia, com horário e endereço.' },
  { id: 'momentos', label: 'Lembretes do diário e das tarefas', hint: 'No dia que vocês escolheram e, às 21h, o convite para fechar o dia (o Tumtum de hoje).' },
  { id: 'jornada', label: 'Semana nova e jornada', hint: 'Quando completa a semana e abre a janela de um exame ou vacina.' },
  { id: 'parceiro', label: 'Registros da outra pessoa', hint: 'Sintoma, consulta, dúvida, tarefa ou momento novo.' },
];

/** Para quem é da família (migração 023): só o que chega até ela. */
const RELATIVE_KINDS: Array<{ id: NotifyKind; label: string; hint: string }> = [
  { id: 'momentos', label: 'Posts novos e respostas', hint: 'Quando o casal posta para a família ou responde a você.' },
  { id: 'jornada', label: 'Semana nova do bebê', hint: 'No dia em que o bebê completa mais uma semana.' },
];

/**
 * Passo a passo do iPhone: o Tumtum não vem da App Store; ele é instalado pelo
 * Safari, e o Safari só entrega notificações para apps na Tela de Início.
 */
export function IosInstallSteps() {
  const old = iosTooOld();
  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-mute">No iPhone, o Tumtum não se baixa pela App Store: ele é instalado pelo próprio Safari, em poucos segundos.</p>
      <ol className="space-y-2 text-sm text-ink-soft">
      <li className="flex gap-2">
        <span className="font-semibold text-ink">1.</span>
        <span>
          Abra <strong>meutumtum.com.br</strong> no <strong>Safari</strong> e toque em <Share className="inline w-4 h-4 -mt-0.5" aria-label="Compartilhar" /> <strong>Compartilhar</strong> (o quadrado com a seta; nas versões mais novas do iOS, ele fica no menu <strong>•••</strong>).
        </span>
      </li>
      <li className="flex gap-2">
        <span className="font-semibold text-ink">2.</span>
        <span>
          Role a lista, toque em <SquarePlus className="inline w-4 h-4 -mt-0.5" aria-hidden /> <strong>Adicionar à Tela de Início</strong>, deixe <strong>Abrir como App Web</strong> ligado (se aparecer) e toque em <strong>Adicionar</strong>.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="font-semibold text-ink">3.</span>
        <span>
          Abra o app pelo ícone novo e volte aqui em <strong>Nosso espaço</strong> para ativar.
        </span>
      </li>
      </ol>
      {old && <p className="text-xs text-warn bg-warn-soft rounded-xl px-3 py-2">Este iPhone está numa versão do iOS anterior à 16.4, que não recebe notificações de sites. Atualize em Ajustes → Geral → Atualização de Software.</p>}
    </div>
  );
}

/** Edge no Android e navegadores de redes sociais: abrir no Chrome para receber avisos e instalar. */
export function OpenInChrome() {
  const [copied, setCopied] = useState(false);
  const browser = limitedBrowser() ?? 'este navegador';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem área de transferência: a pessoa digita o endereço.
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">
        Você está usando {browser}, que abre o app mas <strong>não entrega notificações</strong> nem permite instalar. Abra no <strong>{isAndroid() ? 'Chrome' : 'Safari'}</strong> e entre com a mesma conta.
      </p>
      <div className="flex flex-wrap gap-2">
        {isAndroid() && (
          <a href={chromeIntentUrl()} className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold bg-brand text-on-accent hover:bg-brand-strong shadow-soft [&_svg]:w-4 [&_svg]:h-4">
            <ExternalLink /> Abrir no Chrome
          </a>
        )}
        <Button tone="soft" onClick={copy}>
          {copied ? <Check /> : <Copy />} {copied ? 'Link copiado' : 'Copiar link'}
        </Button>
      </div>
    </div>
  );
}

export function InstallButton({ className = '' }: { className?: string }) {
  const available = useSyncExternalStore(onInstallChange, canInstall, () => false);
  const [steps, setSteps] = useState(false);
  if (isStandalone()) return null;
  // iPhone: não existe botão de instalar; mostra o passo a passo do Safari.
  if (isIOS()) {
    return steps ? (
      <IosInstallSteps />
    ) : (
      <Button tone="soft" onClick={() => setSteps(true)} className={className}>
        <Download /> Instalar no iPhone
      </Button>
    );
  }
  if (!available) return null;
  return (
    <Button tone="soft" onClick={() => promptInstall()} className={className}>
      <Download /> Instalar o app
    </Button>
  );
}

/** Seção "Notificações" do Nosso espaço. */
export default function NotificationSettings({ relative = false }: { relative?: boolean }) {
  const { state, busy, error, notice, enable, disable, test, setPref, setBestTime } = usePush();

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
        </div>
      )}

      {state.phase === 'outro-navegador' && <OpenInChrome />}

      {state.phase === 'sem-suporte' && <p className="text-sm text-ink-soft">Este navegador não recebe notificações. No celular, use o Chrome (Android) ou o Safari (iPhone).</p>}

      {state.phase === 'servidor-pendente' && <p className="text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">{state.message}</p>}

      {state.phase === 'bloqueado' && (
        <p className="text-sm text-ink-soft bg-surface-2 rounded-2xl px-4 py-3">
          As notificações deste site estão bloqueadas no aparelho. Para liberar: nas configurações do navegador (ou do app, se instalado), procure <strong>Notificações</strong> e permita o Tumtum.
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
          {(relative ? RELATIVE_KINDS : KINDS).map(k => (
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

      {'prefs' in state && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-ink-soft">Melhor horário para as novidades</p>
          <Segmented label="Melhor horário para as novidades" value={state.bestTime} onChange={setBestTime} full options={[{ value: 'manha', label: 'Manhã' }, { value: 'tarde', label: 'Tarde' }, { value: 'noite', label: 'Noite' }]} />
          <p className="text-xs text-ink-mute">Semana nova e novidades chegam nesse horário, no máximo uma por dia. De madrugada, nada da outra pessoa: fica esperando no app. Consultas e lembretes chegam sempre na hora.</p>
        </div>
      )}

      {notice && <p className="text-sm text-ok" role="status">{notice}</p>}
      {error && <p className="text-sm text-alert" role="alert">{error}</p>}

      <InstallButton className="w-full" />
    </section>
  );
}
