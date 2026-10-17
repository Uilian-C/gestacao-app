import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Trash2, X } from 'lucide-react';

export interface ViewerPhoto {
  id: string;
  src: string;
}

/** Foto em tela cheia, com as outras do mesmo registro ao lado (exames e diário). */
export default function PhotoViewer({ title, subtitle, photos, index, onIndex, onClose, onDelete }: {
  title: string;
  subtitle: string;
  photos: ViewerPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Só aparece para quem pode apagar a foto. */
  onDelete?: (photo: ViewerPhoto) => void;
}) {
  const photo = photos[index];
  const go = (step: number) => onIndex((index + step + photos.length) % photos.length);

  useEffect(() => {
    // Na fase de captura e sem propagar: o Esc fecha só a foto, não a janela que está por baixo.
    const onKey = (ev: KeyboardEvent) => {
      if (['Escape', 'ArrowRight', 'ArrowLeft'].includes(ev.key)) ev.stopPropagation();
      if (ev.key === 'Escape') onClose();
      if (ev.key === 'ArrowRight' && photos.length > 1) onIndex((index + 1) % photos.length);
      if (ev.key === 'ArrowLeft' && photos.length > 1) onIndex((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
    };
  }, [index, photos.length, onClose, onIndex]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label={`Foto de ${title}`}>
      <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{title}</p>
          <p className="text-xs text-white/70">
            {subtitle}
            {photos.length > 1 && ` · ${index + 1} de ${photos.length}`}
          </p>
        </div>
        <a href={photo.src} target="_blank" rel="noopener" aria-label="Abrir original" className="p-2 rounded-full hover:bg-white/10">
          <ExternalLink className="w-5 h-5" />
        </a>
        {onDelete && (
          <button type="button" onClick={() => onDelete(photo)} aria-label="Excluir esta foto" className="p-2 rounded-full hover:bg-white/10">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded-full hover:bg-white/10">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-2" onClick={ev => ev.target === ev.currentTarget && onClose()}>
        <img key={photo.id} src={photo.src} alt={`Foto de ${title}`} className="max-w-full max-h-full object-contain select-none" />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Foto anterior" className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Próxima foto" className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
