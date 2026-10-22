export interface ToastMessage {
  id: number;
  text: string;
  /** success: a gravação deu certo (some sozinha, com o ✓). */
  tone: 'info' | 'error' | 'success';
  actionLabel?: string;
  onAction?: () => void;
}

import { useEffect } from 'react';
import { CircleCheck } from 'lucide-react';

// Quanto tempo o aviso fica na tela. Com "Desfazer", quem fecha é o prazo da exclusão.
const STAY_MS = { info: 4500, error: 7000, success: 2800 };

export default function Toast({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast || toast.actionLabel) return;
    const timer = window.setTimeout(onClose, STAY_MS[toast.tone]);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- um prazo por aviso (id), não a cada renderização
  }, [toast?.id]);

  if (!toast) return null;
  const tone = toast.tone === 'error' ? 'bg-alert text-white' : 'bg-ink text-canvas';
  return (
    <div className="no-print fixed inset-x-0 bottom-28 md:bottom-6 z-50 flex justify-center px-4 pointer-events-none" role="status" aria-live="polite">
      <div className={`${tone} text-sm rounded-2xl shadow-lg px-4 py-3 flex items-center gap-4 max-w-md w-full pointer-events-auto`}>
        {toast.tone === 'success' && <CircleCheck className="w-5 h-5 shrink-0 -mr-2" aria-hidden />}
        <span className="flex-1">{toast.text}</span>
        {toast.actionLabel && toast.onAction && (
          <button onClick={toast.onAction} className="font-semibold underline underline-offset-2 whitespace-nowrap">
            {toast.actionLabel}
          </button>
        )}
        <button onClick={onClose} aria-label="Fechar aviso" className="opacity-70 hover:opacity-100 text-lg leading-none">×</button>
      </div>
    </div>
  );
}
