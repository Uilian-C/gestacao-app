import { describe, expect, it } from 'vitest';
import type { ExamItem } from '../hooks/useGestationData';
import { bySeries, byTrimester, searchExams, trimesterOf } from './examArchive';

const DUM = '2026-05-15';
const exam = (over: Partial<ExamItem>): ExamItem => ({ id: 'e', kind: 'exame', title: 'Hemograma', exam_date: '2026-10-13', plan_item: null, notes: null, visibility: 'shared', author_role: 'mae', mine: true, created_at: '', files: [], ...over });

describe('arquivo dos resultados', () => {
  it('trimestre pela data do exame', () => {
    expect(trimesterOf(DUM, '2026-05-01')).toBe(0);
    expect(trimesterOf(DUM, '2026-06-20')).toBe(1);
    expect(trimesterOf(DUM, '2026-10-13')).toBe(2);
    expect(trimesterOf(DUM, '2027-01-10')).toBe(3);
  });

  it('agrupa por trimestre (o mais recente primeiro) e por mês', () => {
    const groups = byTrimester(
      [exam({ id: 'a', exam_date: '2026-06-20' }), exam({ id: 'b', exam_date: '2026-10-13' }), exam({ id: 'c', exam_date: '2026-09-02' })],
      DUM,
    );
    expect(groups.map(g => g.trimester)).toEqual([2, 1]);
    expect(groups[0].items.map(e => e.id)).toEqual(['b', 'c']);
    expect(groups[0].months.map(m => m.label)).toEqual(['outubro de 2026', 'setembro de 2026']);
  });

  it('junta o mesmo exame ao longo do tempo (pelo nome, sem acento, ou pelo item da jornada)', () => {
    const series = bySeries([
      exam({ id: 'a', title: 'Hemograma', exam_date: '2026-06-20' }),
      exam({ id: 'b', title: 'hemograma ', exam_date: '2026-10-13' }),
      exam({ id: 'c', title: 'Morfológico', plan_item: 'morfo-2', kind: 'ultrassom' }),
      exam({ id: 'd', title: 'Morfo 1', plan_item: 'morfo-1', kind: 'ultrassom' }),
    ]);
    expect(series[0].items.map(e => e.id)).toEqual(['b', 'a']);
    expect(series[0].label).toBe('Hemograma');
    expect(series.find(s => s.items[0].id === 'c')!.label).toBe('Ultrassom morfológico do 2º trimestre');
    expect(series).toHaveLength(3);
  });

  it('busca no nome, nas observações e na jornada, sem acento', () => {
    const list = [exam({ id: 'a', title: 'Glicemia de jejum', notes: 'Repetir em 4 semanas' }), exam({ id: 'b', title: 'Ultrassom', plan_item: 'morfo-2', kind: 'ultrassom' })];
    expect(searchExams(list, 'glicemia').map(e => e.id)).toEqual(['a']);
    expect(searchExams(list, 'repetir semanas').map(e => e.id)).toEqual(['a']);
    expect(searchExams(list, 'morfologico').map(e => e.id)).toEqual(['b']);
    expect(searchExams(list, '')).toHaveLength(2);
  });
});
