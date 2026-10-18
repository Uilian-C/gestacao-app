/** Carinha do humor (traço fino, na cor do texto). */
export default function MoodFace({ path, className = 'w-7 h-7' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d={path} />
    </svg>
  );
}
