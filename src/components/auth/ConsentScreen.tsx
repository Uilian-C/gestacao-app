import { useState } from 'react';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../../api';
import { Button } from '../ui';

interface Props {
  version: string;
  /** Já aceitou uma versão anterior (os termos mudaram). */
  updated: boolean;
  onAccepted: () => void;
  onSignOut: () => void;
}

/**
 * Consentimento específico e destacado para dados de saúde (LGPD, art. 11, I).
 * Aparece uma vez por versão dos termos, para quem entra com e-mail ou com o Google.
 */
export default function ConsentScreen({ version, updated, onAccepted, onSignOut }: Props) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.family('consent', { version });
      onAccepted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Verifique a conexão.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-brand-soft text-brand flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-[1.6rem] leading-tight">{updated ? 'Atualizamos nossos termos' : 'Antes de começar'}</h1>
          <p className="text-ink-soft text-[15px] text-balance">O app guarda informações de saúde da gestação. Por isso, a lei pede o seu consentimento específico.</p>
        </div>

        <section className="bg-surface shadow-soft rounded-[28px] p-6 space-y-5">
          <ul className="space-y-3 text-sm text-ink-soft">
            <li className="flex gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              <span>Os registros ficam no <strong className="text-ink font-semibold">espaço de vocês</strong>, visíveis só para quem vocês convidarem.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              <span>Usamos os dados só para o acompanhamento da gestação. <strong className="text-ink font-semibold">Nada de venda ou publicidade.</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              <span>Você pode <strong className="text-ink font-semibold">baixar ou excluir tudo</strong> quando quiser, em "Nosso espaço".</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              <span>O app é um diário e <strong className="text-ink font-semibold">não substitui o pré-natal</strong> nem atendimento de emergência.</span>
            </li>
          </ul>

          <label className="flex items-start gap-3 rounded-2xl bg-surface-2 px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1 w-5 h-5 accent-[var(--c-brand)] shrink-0" />
            <span className="text-sm text-ink">
              Li e concordo com os{' '}
              <a href="/termos.html" target="_blank" rel="noopener" className="text-brand underline underline-offset-2">Termos de Uso</a> e a{' '}
              <a href="/privacidade.html" target="_blank" rel="noopener" className="text-brand underline underline-offset-2">Política de Privacidade</a>, e autorizo o tratamento dos meus dados de saúde da gestação para as finalidades do app.
            </span>
          </label>

          {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-2xl px-4 py-2.5">{error}</p>}

          <Button onClick={accept} disabled={!checked || busy} className="w-full">
            {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Concordo e quero continuar
          </Button>
        </section>

        <button type="button" onClick={onSignOut} className="mx-auto flex items-center gap-2 text-sm text-ink-mute hover:text-ink">
          <LogOut className="w-4 h-4" /> Não concordo, sair
        </button>
      </div>
    </div>
  );
}
