import { Heart } from 'lucide-react';
import type { Author } from '../types';
import type { GestationalAge } from '../lib/dates';
import { Segmented } from './ui';

interface Props {
  author: Author;
  onAuthorChange: (author: Author) => void;
  age: GestationalAge | null;
  greeting: string;
}

export default function Header({ author, onAuthorChange, age, greeting }: Props) {
  return (
    <header className="no-print bg-canvas">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-mae-soft text-mae flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-ink-mute">
              {greeting}, {author === 'mae' ? 'mamãe' : 'papai'}
            </p>
            <h1 className="text-xl font-extrabold text-ink leading-tight">
              Nossa Gestação
              {age && <span className="ml-2 text-base font-bold text-brand whitespace-nowrap">· {age.weeks} sem {age.days}d</span>}
            </h1>
          </div>
        </div>
        <Segmented
          label="Quem está usando este aparelho"
          size="sm"
          value={author}
          onChange={onAuthorChange}
          options={[
            { value: 'mae', label: <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-mae" />Sou a mãe</span> },
            { value: 'pai', label: <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pai" />Sou o pai</span> },
          ]}
        />
      </div>
    </header>
  );
}
