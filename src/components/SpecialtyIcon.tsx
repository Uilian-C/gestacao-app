import { Brain, ClipboardList, HeartPulse, Microscope, PersonStanding, Salad, ScanLine, Sparkle, Stethoscope } from 'lucide-react';
import type { ReactNode } from 'react';

const ICONS: Record<string, ReactNode> = {
  obstetra: <Stethoscope />,
  nutricionista: <Salad />,
  psicologia: <Brain />,
  fisioterapia: <PersonStanding />,
  endocrino: <Microscope />,
  cardiologia: <HeartPulse />,
  ultrassom: <ScanLine />,
  odontologia: <Sparkle />,
  outra: <ClipboardList />,
};

export default function SpecialtyIcon({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-8 h-8 [&_svg]:w-4 [&_svg]:h-4' : 'w-11 h-11 [&_svg]:w-5 [&_svg]:h-5';
  return (
    <span className={`${box} rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0`} aria-hidden>
      {ICONS[id] ?? ICONS.outra}
    </span>
  );
}
