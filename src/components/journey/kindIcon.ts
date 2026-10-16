import { ClipboardCheck, FlaskConical, Stethoscope, Syringe } from 'lucide-react';
import type { PlanKind } from '../../content/prenatalPlan';

export const KIND_ICON: Record<PlanKind, typeof Stethoscope> = { consulta: Stethoscope, exame: FlaskConical, vacina: Syringe, preparo: ClipboardCheck };
