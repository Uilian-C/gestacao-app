import BrandMark from './BrandMark';

/** A tela de abertura: o coração batendo enquanto o espaço carrega (ou o aviso, quando algo falha). */
export function Splash({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        {children ?? (
          <div className="space-y-3" role="status">
            <BrandMark animated className="w-20 h-20 mx-auto" />
            <p className="text-ink-soft font-medium">Abrindo o espaço de vocês...</p>
          </div>
        )}
      </div>
    </div>
  );
}
