import { describe, expect, it } from 'vitest';
import { fitWithin, formatSize } from './examFiles';

describe('fitWithin', () => {
  it('reduz pelo lado maior e mantém a proporção', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1500, height: 2000 });
  });
  it('não aumenta foto pequena', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('formatSize', () => {
  it('mostra em KB ou MB, com vírgula', () => {
    expect(formatSize(300)).toBe('1 KB');
    expect(formatSize(512 * 1024)).toBe('512 KB');
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2,5 MB');
  });
});
