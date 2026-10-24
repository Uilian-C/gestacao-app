import { CircleHelp, Plus } from 'lucide-react';
import Avatar from './Avatar';
import BrandMark from './BrandMark';
import type { FamilyMember } from '../api';

interface Props {
  firstName: string;
  members: FamilyMember[];
  greeting: string;
  onOpenSpace: () => void;
  /** Abre a Central de Ajuda. */
  onHelp?: () => void;
  /** Nas abas que não são o Início: cabeçalho fino, com o nome da aba e a semana. */
  title?: string;
  week?: number | null;
}

export default function Header({ firstName, members, greeting, onOpenSpace, onHelp, title, week }: Props) {
  return (
    <header className="no-print bg-canvas transition-colors duration-300">
      <div className={`max-w-5xl mx-auto px-4 md:px-6 flex items-center justify-between gap-3 ${title ? 'pt-4 pb-2' : 'pt-5 pb-3'}`}>
        {title ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark animated className="w-8 h-8 shrink-0" />
            <h1 className="text-[1.5rem] max-[359px]:text-[1.3rem] text-ink leading-tight truncate">{title}</h1>
            {/* O nome da aba tem prioridade: a semana fica curta ("22 sem"). */}
            {week != null && (
              <span aria-label={`${week} semanas`} className="shrink-0 rounded-full bg-brand-soft text-brand-strong text-xs font-extrabold px-2.5 py-1 tabular whitespace-nowrap">
                {week} sem
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-surface shadow-soft flex items-center justify-center shrink-0">
              <BrandMark animated className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-ink-mute truncate">
                {greeting}, {firstName}
              </p>
              <h1 className="text-[1.45rem] text-ink leading-tight whitespace-nowrap">Tumtum</h1>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
        {onHelp && (
          <button type="button" onClick={onHelp} aria-label="Ajuda" className="w-10 h-10 rounded-full flex items-center justify-center text-ink-mute hover:text-ink hover:bg-surface transition">
            <CircleHelp className="w-[22px] h-[22px]" strokeWidth={1.75} />
          </button>
        )}
        {/* Quem participa do espaço; abre convites, papel e saída da conta. */}
        <button
          type="button"
          onClick={onOpenSpace}
          className="flex items-center gap-2 rounded-full bg-surface shadow-soft p-1.5 sm:pr-3.5 shrink-0 text-xs font-semibold text-ink-soft hover:text-ink transition"
          aria-label="Abrir nosso espaço: participantes, convite e conta"
        >
          <span className="flex -space-x-2">
            {members.slice(0, 3).map(m => (
              <Avatar key={m.userId} member={m} role={m.role} className="w-7 h-7 ring-2 ring-surface text-[11px]" />
            ))}
            {members.length < 2 && (
              <span className="w-7 h-7 rounded-full ring-2 ring-surface bg-surface-2 text-ink-mute flex items-center justify-center">
                <Plus className="w-3.5 h-3.5" />
              </span>
            )}
          </span>
          <span className="hidden sm:inline">{members.length < 2 ? 'Convidar' : 'Nosso espaço'}</span>
        </button>
        </div>
      </div>
    </header>
  );
}
