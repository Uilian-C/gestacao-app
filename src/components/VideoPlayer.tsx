import { useEffect } from 'react';

// Um vídeo guardado (do diário ou de um exame): toca ali mesmo, com os
// controles do celular, e a capa aparece antes de carregar qualquer coisa.
export default function VideoPlayer({ src, poster, className = '', label = 'Vídeo', onSize }: {
  src: string;
  poster?: string;
  className?: string;
  label?: string;
  /** Avisa a proporção (largura/altura), tirada da capa, para a moldura já nascer no formato do vídeo. */
  onSize?: (ratio: number) => void;
}) {
  useEffect(() => {
    if (!poster || !onSize) return;
    const img = new Image();
    img.onload = () => img.naturalWidth && img.naturalHeight && onSize(img.naturalWidth / img.naturalHeight);
    img.src = poster;
    return () => {
      img.onload = null;
    };
  }, [poster, onSize]);

  return <video src={src} poster={poster} controls playsInline preload="none" aria-label={label} className={`bg-black ${className}`} />;
}
