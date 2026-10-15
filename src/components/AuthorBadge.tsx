import type { Assignee } from '../types';

const STYLES: Record<Assignee, { label: string; className: string }> = {
  mae: { label: '💖 Mãe', className: 'bg-rose-100 text-rose-700' },
  pai: { label: '💙 Pai', className: 'bg-indigo-100 text-indigo-700' },
  casal: { label: '🤝 Casal', className: 'bg-emerald-100 text-emerald-800' },
};

export default function AuthorBadge({ role, prefix }: { role: Assignee; prefix?: string }) {
  const style = STYLES[role] ?? STYLES.casal;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${style.className}`}>
      {prefix && <span className="font-medium opacity-80">{prefix}</span>}
      {style.label}
    </span>
  );
}
