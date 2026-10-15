import type { Assignee } from '../types';

const STYLES: Record<Assignee, { label: string; className: string }> = {
  mae: { label: 'Mãe', className: 'bg-mae-soft text-mae' },
  pai: { label: 'Pai', className: 'bg-pai-soft text-pai' },
  casal: { label: 'Casal', className: 'bg-casal-soft text-casal' },
};

export default function AuthorBadge({ role, prefix }: { role: Assignee; prefix?: string }) {
  const style = STYLES[role] ?? STYLES.casal;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${style.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
      {prefix && <span className="font-semibold opacity-80">{prefix}</span>}
      {style.label}
    </span>
  );
}
