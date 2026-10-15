export default function IntensityDots({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Intensidade ${value} de 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className="w-2 h-2 rounded-full" style={{ background: n <= value ? `var(--c-int-${value})` : 'var(--c-surface-2)' }} />
      ))}
    </span>
  );
}
