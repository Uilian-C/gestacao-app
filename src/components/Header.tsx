import { Heart } from 'lucide-react';
import type { Author } from '../types';

interface Props {
  author: Author;
  onAuthorChange: (author: Author) => void;
  greeting: string;
}

const OPTIONS: Array<{ value: Author; label: string }> = [
  { value: 'mae', label: 'Sou a mãe' },
  { value: 'pai', label: 'Sou o pai' },
];

export default function Header({ author, onAuthorChange, greeting }: Props) {
  return (
    <header className="no-print bg-canvas transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-brand-soft text-brand flex items-center justify-center shrink-0 transition-colors duration-300">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-ink-mute">
              {greeting}, {author === 'mae' ? 'mamãe' : 'papai'}
            </p>
            <h1 className="text-xl font-extrabold text-ink leading-tight">Nossa Gestação</h1>
          </div>
        </div>

        {/* A pessoa escolhida fica preenchida com a cor dela, a mesma que tinge o app. */}
        <div className="inline-flex bg-surface-2 p-1 rounded-2xl gap-1" role="group" aria-label="Quem está usando este aparelho">
          {OPTIONS.map(o => {
            const active = author === o.value;
            const dot = o.value === 'mae' ? 'bg-mae' : 'bg-pai';
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onAuthorChange(o.value)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${active ? 'bg-brand text-on-accent shadow-sm' : 'text-ink-mute hover:text-ink'}`}
              >
                <span className={`w-2 h-2 rounded-full ${active ? 'bg-current' : dot}`} />
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
