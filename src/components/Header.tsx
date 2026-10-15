import { Heart, Users } from 'lucide-react';
import type { Author } from '../types';
import type { GestationalAge } from '../lib/dates';

interface Props {
  author: Author;
  onAuthorChange: (author: Author) => void;
  age: GestationalAge | null;
}

export default function Header({ author, onAuthorChange, age }: Props) {
  return (
    <header className="bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 text-white p-6 shadow-md">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="fill-white w-6 h-6" /> Nossa Gestação
          </h1>
          <p className="text-white/90 text-xs mt-1 flex items-center gap-1.5">
            <Users className="w-4 h-4 inline" /> Espaço colaborativo do casal
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-white/10 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 border border-white/20" role="group" aria-label="Quem está usando este aparelho">
            <span className="text-[11px] uppercase font-bold text-white/80 px-2">Sou:</span>
            <button
              onClick={() => onAuthorChange('mae')}
              aria-pressed={author === 'mae'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${author === 'mae' ? 'bg-white text-rose-600 shadow' : 'text-white/80 hover:text-white'}`}
            >
              💖 Mãe
            </button>
            <button
              onClick={() => onAuthorChange('pai')}
              aria-pressed={author === 'pai'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${author === 'pai' ? 'bg-white text-indigo-700 shadow' : 'text-white/80 hover:text-white'}`}
            >
              💙 Pai
            </button>
          </div>
          {age && (
            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-right border border-white/20">
              <span className="text-[11px] uppercase tracking-wider block font-semibold text-white/85">Idade gestacional</span>
              <span className="text-lg font-extrabold whitespace-nowrap">
                {age.weeks}ª sem + {age.days}d
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
