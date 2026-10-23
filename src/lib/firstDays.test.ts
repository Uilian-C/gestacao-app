import { describe, expect, it } from 'vitest';
import { firstDays, MISSIONS, type MissionId } from './firstDays';
import { HELP_TOPICS, searchHelp } from '../content/help';

describe('primeiros 7 dias', () => {
  it('conta o dia a partir do começo e sugere a missão do dia', () => {
    const s = firstDays(new Set(), '2026-10-20', '2026-10-22');
    expect(s.today).toBe(3);
    expect(s.next?.id).toBe('consulta');
    expect(s.complete).toBe(false);
  });
  it('quando a do dia já foi feita, sugere a primeira que falta', () => {
    const s = firstDays(new Set<MissionId>(['consulta', 'convidar']), '2026-10-20', '2026-10-22');
    expect(s.next?.id).toBe('checkin');
  });
  it('depois do sétimo dia, continua no 7 e termina quando tudo foi feito', () => {
    expect(firstDays(new Set(), '2026-10-01', '2026-10-22').today).toBe(7);
    expect(firstDays(new Set(MISSIONS.map(m => m.id)), '2026-10-01', '2026-10-22')).toMatchObject({ complete: true, next: null });
  });
});

describe('central de ajuda', () => {
  it('busca sem ligar para acentos e por todas as palavras', () => {
    expect(searchHelp('').length).toBe(HELP_TOPICS.length);
    const r = searchHelp('cha de bebe');
    expect(r.flatMap(t => t.items).some(i => i.q.includes('chá de bebê'))).toBe(true);
    expect(searchHelp('xyzzy')).toEqual([]);
  });
});
