import type { ReactNode } from 'react';

// Linguagem visual: superfícies sem borda separadas por sombra leve e respiro,
// cantos generosos, títulos em serifa e controles em forma de pílula.

export function Card({ children, className = '', tone = 'surface' }: { children: ReactNode; className?: string; tone?: 'surface' | 'warm' | 'brand' | 'alert' }) {
  const tones = {
    surface: 'bg-surface shadow-soft',
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
 * Partes de uma aba, logo abaixo do cabeçalho: texto com um traço na cor da aba
 * embaixo da parte ativa. Bem diferente das abas de baixo (pílulas) e dos botões,
 * para não confundir os níveis. Todas cabem na largura da tela, sem cortar.
 */
/**
 * Partes de uma aba (ex.: Saúde · Resultados · Dúvidas · Jornada). Cada parte
 * ocupa o espaço do próprio nome (as curtas não ficam largas nem as longas
 * apertadas) e o sublinhado acompanha o nome. Em tela muito estreita, a
 * fileira desliza para o lado em vez de espremer os nomes.
 */
export function SubTabs<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string; badge?: number }>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="no-print -mx-4 px-1.5 md:mx-0 md:px-0 mb-4 border-b border-line overflow-x-auto no-scrollbar" role="group" aria-label={label}>
      <div className="flex min-w-max sm:min-w-0">
        {options.map(o => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={on}
              className={`flex-1 flex justify-center px-2 pt-2 pb-2.5 ${options.length > 3 ? 'text-[13.5px]' : 'text-[14px]'} leading-tight whitespace-nowrap transition ${on ? 'text-brand-strong font-extrabold' : 'text-ink-mute font-semibold hover:text-ink'}`}
            >
              <span className="relative inline-flex items-center">
                {o.label}
                {!!o.badge && <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-warm text-on-accent text-[10px] font-bold flex items-center justify-center tabular">{o.badge}</span>}
                <span className={`absolute -left-1 -right-1 -bottom-[11px] h-[3px] rounded-full transition ${on ? 'bg-brand' : 'bg-transparent'}`} aria-hidden />
              </span>
            </button>
          );
        })}
      </div>
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
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-mute disabled:shadow-none [&_svg]:w-4 [&_svg]:h-4 ${BUTTON_TONES[tone]} ${className}`}>
      {children}
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
