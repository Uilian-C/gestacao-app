import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

/**
 * Janela que sobe de baixo no celular (e aparece no meio no computador): usada
 * pelo registro rápido e pelos detalhes de cada registro. Fecha no X, no Esc ou
 * tocando fora.
 */
export default function Sheet({ title, subtitle, icon, onClose, children }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // O fechar mais recente, sem refazer o efeito a cada renderização (senão o
  // foco pulava para o X e a tela travada se soltava no meio do uso).
  const closeFn = useRef(onClose);
  useEffect(() => {
    closeFn.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeFn.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useScrollLock();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] touch-none" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain bg-surface rounded-t-[28px] sm:rounded-[28px] shadow-lift px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:p-7">
        <div className="sm:hidden w-11 h-1.5 rounded-full bg-line mx-auto mb-3" aria-hidden />
        <div className="flex items-start gap-3 mb-4">
          {icon && <span className="w-10 h-10 rounded-full bg-brand-soft text-brand-strong flex items-center justify-center shrink-0 [&_svg]:w-5 [&_svg]:h-5">{icon}</span>}
          <div className="flex-1 min-w-0">
            <h2 id={titleId} className="text-[1.3rem] leading-snug text-ink break-words">{title}</h2>
            {subtitle && <div className="text-sm text-ink-mute mt-0.5">{subtitle}</div>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar" className="w-10 h-10 rounded-full bg-surface-2 text-ink-soft flex items-center justify-center hover:text-ink shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
