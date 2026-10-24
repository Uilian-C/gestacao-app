import { createContext } from 'react';
import type { Consultation } from '../types';
import type { JourneyItem } from './journeyPlan';

/**
 * O que o formulário de agendamento precisa para encaixar o agendamento na
 * jornada (Cuidados → Jornada). Sem DUM, fica null e o formulário não sugere.
 */
export const JourneyContext = createContext<{ items: JourneyItem[]; done: Set<string>; consultations: Consultation[]; dumDate: string } | null>(null);
