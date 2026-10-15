export interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

export default function Toast({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  if (!toast) return null;
  const tone = toast.tone === 'error' ? 'bg-rose-700' : 'bg-slate-800';
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none" role="status" aria-live="polite">
      <div className={`${tone} text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-center gap-4 max-w-md w-full pointer-events-auto`}>
        <span className="flex-1">{toast.text}</span>
        {toast.actionLabel && toast.onAction && (
          <button onClick={toast.onAction} className="font-bold underline underline-offset-2 whitespace-nowrap">
            {toast.actionLabel}
          </button>
        )}
        <button onClick={onClose} aria-label="Fechar aviso" className="text-white/70 hover:text-white text-lg leading-none">×</button>
      </div>
    </div>
  );
}
