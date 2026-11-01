import BrandMark from './BrandMark';

/**
 * Enquanto os dados chegam: o desenho da tela (o bebê e alguns cartões)
 * respirando de leve, no lugar de uma tela vazia. O coração do Tumtum bate no meio.
 */
export default function Skeleton({ label = 'Carregando' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-4 py-4">
      <div className="flex flex-col items-center gap-3">
        <div className="tt-esqueleto relative w-40 h-40 rounded-full flex items-center justify-center">
          <BrandMark animated className="w-12 h-12" />
        </div>
        <div className="tt-esqueleto h-3 w-32 rounded-full" />
        <div className="tt-esqueleto h-6 w-56 rounded-full" />
      </div>
      <div className="tt-esqueleto h-28 rounded-[26px]" />
      <div className="tt-esqueleto h-24 rounded-[26px]" />
      <div className="tt-esqueleto h-20 rounded-[24px]" />
    </div>
  );
}
