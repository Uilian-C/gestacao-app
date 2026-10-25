import { useContext, useState, type ReactNode } from 'react';
import { SavingContext } from '../lib/saving';
import { ChevronDown, Loader2 } from 'lucide-react';

// Linguagem visual: superfícies sem borda e sem sombra, separadas pelo tom e pelo respiro,
// cantos generosos, títulos em serifa e controles em forma de pílula.

/**
 * Um bloco que recolhe: o título e um resumo sempre à vista, o conteúdo a um
 * toque. Para o que é bom ter, mas não precisa ocupar a tela o tempo todo.
 */
export function Fold({ icon, title, summary, defaultOpen = false, children }: { icon?: ReactNode; title: string; summary?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section aria-label={title} className="rounded-[28px] bg-surface/80">
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full flex items-center gap-3 px-5 py-4 text-left">
        {icon && <span className="w-9 h-9 rounded-2xl bg-brand-soft text-brand-strong flex items-center justify-center shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px]">{icon}</span>}
        <span className="flex-1 min-w-0">
          <span className="block font-display text-[1.1rem] leading-tight text-ink">{title}</span>
          {summary && <span className="block text-[12.5px] text-ink-soft truncate mt-0.5">{summary}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-mute shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

export function Card({ children, className = '', tone = 'surface' }: { children: ReactNode; className?: string; tone?: 'surface' | 'warm' | 'brand' | 'alert' }) {
  const tones = {
    // Sem sombra: o tom basta para separar do fundo (menos peso na tela).
    surface: 'bg-surface/80',
    warm: 'bg-warm-soft',
    brand: 'bg-brand-soft',
    alert: 'bg-alert-soft',
  };
  return <section className={`rounded-[28px] p-5 md:p-7 ${tones[tone]} ${className}`}>{children}</section>;
}

export function SectionTitle({ icon, title, subtitle, action }: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <span className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px]">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[1.2rem] leading-tight text-ink text-balance">{title}</h2>
          {subtitle && <p className="text-sm text-ink-mute mt-1">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, size = 'md', full = false }: { value: T; options: Array<{ value: T; label: ReactNode }>; onChange: (v: T) => void; label: string; size?: 'sm' | 'md'; full?: boolean }) {
  const pad = `${full ? 'px-1' : size === 'sm' ? 'px-3.5' : 'px-4'} ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'}`;
  return (
    <div
      className={`bg-surface-2 p-1 rounded-full gap-0.5 ${full ? 'grid w-full' : 'inline-flex flex-wrap'}`}
      style={full ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
      role="group"
      aria-label={label}
    >
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`${pad} rounded-full font-medium whitespace-nowrap transition ${value === o.value ? 'bg-surface text-ink shadow-soft' : 'text-ink-mute hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Partes de uma aba (ex.: Próximos · Calendário · Tarefas): uma pílula macia
 * com um destaque na cor da aba que desliza até a parte escolhida. Sem linhas
 * nem sublinhado de "sistema"; as partes dividem a largura igualmente.
 */
export function SubTabs<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string; badge?: number }>; onChange: (v: T) => void; label: string }) {
  const at = Math.max(0, options.findIndex(o => o.value === value));
  return (
    <div className="no-print mb-4 relative flex rounded-full bg-surface/70 p-1" role="group" aria-label={label}>
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full bg-brand-soft transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${at * 100}%)` }}
      />
      {options.map(o => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`relative flex-1 min-w-0 inline-flex items-center justify-center gap-1 rounded-full px-1.5 py-2 ${options.length > 3 ? 'text-[13px]' : 'text-[14px]'} leading-tight whitespace-nowrap transition-colors ${on ? 'text-brand-strong font-extrabold' : 'text-ink-mute font-semibold hover:text-ink'}`}
          >
            <span className="truncate">{o.label}</span>
            {!!o.badge && <span className="min-w-[16px] h-4 px-1 rounded-full bg-warm text-on-accent text-[10px] font-bold flex items-center justify-center tabular">{o.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ children, active = false, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3.5 py-1.5 rounded-full text-sm transition ${active ? 'bg-brand text-on-accent' : 'bg-surface-2 text-ink-soft hover:text-ink hover:bg-brand-soft'}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4 space-y-2">
      {icon && <div className="mx-auto w-12 h-12 rounded-full bg-surface-2 text-ink-mute flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5">{icon}</div>}
      <p className="font-display text-lg text-ink">{title}</p>
      {children && <div className="text-sm text-ink-mute max-w-sm mx-auto">{children}</div>}
    </div>
  );
}

const BUTTON_TONES = {
  primary: 'bg-brand text-on-accent hover:bg-brand-strong shadow-soft',
  soft: 'bg-brand-soft text-brand-strong hover:brightness-[0.97]',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-2 hover:text-ink',
  warm: 'bg-warm text-on-accent hover:opacity-90',
};

export function Button({ children, tone = 'primary', type = 'button', onClick, disabled, className = '' }: { children: ReactNode; tone?: keyof typeof BUTTON_TONES; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean; className?: string }) {
  const saving = useContext(SavingContext);
  const working = type === 'submit' && saving.busy;
  return (
    <button type={type} onClick={onClick} disabled={disabled || working} aria-busy={working || undefined} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-mute disabled:shadow-none [&_svg]:w-4 [&_svg]:h-4 ${BUTTON_TONES[tone]} ${className}`}>
      {working ? (
        <>
          <Loader2 className="animate-spin" /> {saving.label ?? 'Salvando...'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Ação de navegação ("Ver tudo", "Ver diário"): texto na cor da aba, sem caixa. */
export function LinkButton({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 text-sm font-bold text-brand-strong hover:underline underline-offset-4 py-1.5 whitespace-nowrap [&_svg]:w-4 [&_svg]:h-4 ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-soft block">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

const PILL_TONES = {
  neutral: 'bg-surface-2 text-ink-soft',
  brand: 'bg-brand-soft text-brand-strong',
  warm: 'bg-warm-soft text-warm',
  alert: 'bg-alert-soft text-alert',
  warn: 'bg-warn-soft text-warn',
  ok: 'bg-ok-soft text-ok',
};

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof PILL_TONES }) {
  return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap [&_svg]:w-3 [&_svg]:h-3 ${PILL_TONES[tone]}`}>{children}</span>;
}
