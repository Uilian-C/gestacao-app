import { FlaskConical, ScanHeart, Stethoscope, Syringe, type LucideIcon } from 'lucide-react';
import type { AppointmentKind } from '../types';

// Ícones dos tipos de agendamento, no mesmo traço dos demais ícones do app
// (no lugar dos emojis).
export const KIND_LUCIDE: Record<AppointmentKind, LucideIcon> = { consulta: Stethoscope, exame: FlaskConical, ultrassom: ScanHeart, vacina: Syringe };

export default function AppointmentIcon({ kind, className = 'w-4 h-4' }: { kind: AppointmentKind; className?: string }) {
  const Icon = KIND_LUCIDE[kind];
  return <Icon className={className} aria-hidden />;
}
