import { Plus } from 'lucide-react';
import BrandMark from './BrandMark';
import type { FamilyMember } from '../api';

interface Props {
  firstName: string;
  members: FamilyMember[];
  greeting: string;
  onOpenSpace: () => void;
}

export default function Header({ firstName, members, greeting, onOpenSpace }: Props) {
  return (
    <header className="no-print bg-canvas transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-5 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-surface shadow-soft flex items-center justify-center shrink-0">
            <BrandMark className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-ink-mute truncate">
              {greeting}, {firstName}
            </p>
            <h1 className="text-[1.45rem] text-ink leading-tight whitespace-nowrap">Tumtum</h1>
          </div>
        </div>

        {/* Quem participa do espaço; abre convites, papel e saída da conta. */}
        <button
          type="button"
          onClick={onOpenSpace}
          className="flex items-center gap-2 rounded-full bg-surface shadow-soft p-1.5 sm:pr-3.5 shrink-0 text-xs font-semibold text-ink-soft hover:text-ink transition"
          aria-label="Abrir nosso espaço: participantes, convite e conta"
        >
          <span className="flex -space-x-2">
            {members.slice(0, 3).map(m => (
              <span key={m.userId} className={`w-7 h-7 rounded-full ring-2 ring-surface flex items-center justify-center text-[11px] text-on-accent ${m.role === 'mae' ? 'bg-mae' : 'bg-pai'}`}>
                {m.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
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
    </header>
  );
}
