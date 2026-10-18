import { useState } from 'react';
import { avatarUrl, type FamilyMember } from '../api';
import type { Author } from '../types';

// Foto de perfil num círculo; sem foto (ou se não abrir), a inicial na cor da
// pessoa: rosa da mãe, azul do pai.

export default function Avatar({ member, role, className = 'w-10 h-10 text-sm' }: { member?: FamilyMember; role: Author; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  const src = member?.photo ? avatarUrl(member.userId, member.photo) : null;
  const initial = member?.name.trim().charAt(0).toUpperCase() || (role === 'mae' ? 'M' : 'P');
  return (
    <span className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-on-accent ${role === 'mae' ? 'bg-mae' : 'bg-pai'} ${className}`} aria-hidden>
      {src && broken !== src ? <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setBroken(src)} /> : initial}
    </span>
  );
}
