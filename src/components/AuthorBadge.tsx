import type { Assignee } from '../types';

const STYLES: Record<Assignee, { label: string; dot: string }> = {
  mae: { label: 'Mãe', dot: 'bg-mae' },
  pai: { label: 'Pai', dot: 'bg-pai' },
  casal: { label: 'Casal', dot: 'bg-casal' },
};

/** Autoria discreta: um ponto na cor da pessoa e o nome em texto. */
export default function AuthorBadge({ role, prefix }: { role: Assignee; prefix?: string }) {
  const style = STYLES[role] ?? STYLES.casal;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-mute whitespace-nowrap">
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
      {prefix && <span>{prefix}</span>}
      <span className="text-ink-soft font-medium">{style.label}</span>
    </span>
  );
}
