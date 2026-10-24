// Desenhos leves das Tarefas: traço fino, cantos redondos, as cores do Tumtum.
// Só enfeitam (aria-hidden): o texto ao lado diz tudo.

/** O andamento como um anel, com o coração no meio (cheio quando acaba). */
export function ProgressHeart({ value, className = 'w-12 h-12' }: { value: number; className?: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const done = Math.max(0, Math.min(1, value));
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-2" />
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done)} transform="rotate(-90 24 24)" className="text-azul transition-all duration-700" />
      <path
        d="M24 32s-8-4.9-8-10.2a4.4 4.4 0 0 1 8-2.6 4.4 4.4 0 0 1 8 2.6C32 27.1 24 32 24 32z"
        className={done >= 1 ? 'fill-rosa text-rosa' : 'fill-none text-rosa'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tudo feito: uma lua dormindo com um coraçãozinho e estrelas. */
export function RestDoodle({ className = 'w-28 h-24' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M70 18a30 30 0 1 0 22 46 26 26 0 0 1-22-46z" className="text-lilas" />
      <path d="M60 52c2 2 6 2 8 0" className="text-lilas" />
      <path d="M86 26l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" className="text-azul" />
      <path d="M24 30l1.5 3 3 1.5-3 1.5L24 39l-1.5-3-3-1.5 3-1.5z" className="text-azul" />
      <path d="M96 70c-1.6 0-3 1.3-3 3 0 2.7 3 4.4 3 4.4s3-1.7 3-4.4c0-1.7-1.4-3-3-3z" className="text-rosa fill-rosa/30" />
      <path d="M14 82h92" className="text-line" />
    </svg>
  );
}
