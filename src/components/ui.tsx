import type { ReactNode } from 'react';

export function Card({ children, className = '', tone = 'surface' }: { children: ReactNode; className?: string; tone?: 'surface' | 'warm' | 'brand' | 'alert' }) {
  const tones = {
    surface: 'bg-surface border-line',
    warm: 'bg-warm-soft border-transparent',
    brand: 'bg-brand-soft border-transparent',
    alert: 'bg-alert-soft border-alert/30',
  };
  return <section className={`rounded-3xl border p-5 md:p-6 ${tones[tone]} ${className}`}>{children}</section>;
}

export function SectionTitle({ icon, title, subtitle, action }: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2 text-balance">
          {icon && <span className="text-brand shrink-0">{icon}</span>}
          {title}
        </h2>
        {subtitle && <p className="text-sm text-ink-mute mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: { value: T; options: Array<{ value: T; label: ReactNode }>; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return (
    <div className="inline-flex flex-wrap bg-surface-2 p-1 rounded-2xl gap-1" role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`${pad} rounded-xl font-semibold transition ${value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-mute hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ children, active = false, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${active ? 'bg-brand text-white border-brand' : 'bg-surface text-ink-soft border-line hover:border-brand hover:text-brand'}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-8 px-4 space-y-2">
      <div className="text-4xl" aria-hidden>{emoji}</div>
      <p className="font-bold text-ink">{title}</p>
      {children && <div className="text-sm text-ink-mute max-w-sm mx-auto">{children}</div>}
    </div>
  );
}

const BUTTON_TONES = {
  primary: 'bg-brand text-white hover:bg-brand-strong',
  soft: 'bg-brand-soft text-brand-strong hover:bg-brand-soft/70',
  ghost: 'bg-transparent text-ink-soft border border-line hover:border-brand hover:text-brand',
  warm: 'bg-warm text-white hover:opacity-90',
};

export function Button({ children, tone = 'primary', type = 'button', onClick, disabled, className = '' }: { children: ReactNode; tone?: keyof typeof BUTTON_TONES; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_TONES[tone]} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-soft block">{label}</label>
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
  return <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${PILL_TONES[tone]}`}>{children}</span>;
}
