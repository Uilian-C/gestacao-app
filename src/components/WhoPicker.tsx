import { useContext } from 'react';
import { PeopleContext, firstName, memberWithRole } from '../lib/people';
import type { Assignee, Author } from '../types';
import Avatar from './Avatar';
import { Segmented } from './ui';

// "Quem cuida" (tarefas) e "Quem vai" (agenda): marcar a mãe, o pai ou os
// dois, com o nome e a foto de cada um. Quem é marcado recebe um aviso.

/** As fotos de quem foi marcado, uma por cima da outra. */
export function WhoAvatars({ who, className = 'w-6 h-6 text-[10px]' }: { who: Assignee; className?: string }) {
  const members = useContext(PeopleContext);
  const roles: Author[] = who === 'casal' ? ['mae', 'pai'] : [who];
  return (
    <span className="inline-flex -space-x-1.5 shrink-0" aria-hidden>
      {roles.map(r => (
        <Avatar key={r} member={memberWithRole(members, r)} role={r} className={`${className} ring-2 ring-surface`} />
      ))}
    </span>
  );
}

export default function WhoPicker({ label, value, onChange }: { label: string; value: Assignee; onChange: (v: Assignee) => void }) {
  const members = useContext(PeopleContext);
  const name = (role: Author) => {
    const m = memberWithRole(members, role);
    return m ? firstName(m.name) : role === 'mae' ? 'Mãe' : 'Pai';
  };
  const option = (who: Assignee, text: string) => ({
    value: who,
    label: (
      <span className="flex items-center gap-1.5">
        <WhoAvatars who={who} className="w-5 h-5 text-[9px]" /> {text}
      </span>
    ),
  });
  return <Segmented label={label} size="sm" value={value} onChange={onChange} options={[option('mae', name('mae')), option('pai', name('pai')), option('casal', 'Os dois')]} />;
}
