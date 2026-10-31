import { Play } from 'lucide-react';

/** O "play" no canto de uma miniatura: avisa que ali tem um vídeo. */
export function VideoBadge({ small = false }: { small?: boolean }) {
  return (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span className={`rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-[2px] ${small ? 'w-5 h-5' : 'w-8 h-8'}`}>
        <Play className={`fill-current ${small ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} translate-x-[1px]`} />
      </span>
    </span>
  );
}
