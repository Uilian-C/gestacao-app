import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '../hooks/useGestationData';
import { canShareEntry, entryShare, type EntryShareContext } from './shareEntry';

const e = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: '2026-11-01', body: 'Ele mexeu muito depois do jantar', visibility: 'shared', remind_on: null, author_role: 'mae', mine: true, created_at: '2026-11-01T20:00:00Z', folder: 'momento', photos: [], ...over });
const ctx: EntryShareContext = { author: 'Ana', week: 22, date: '1 nov', photo: p => `/foto/${p.id}`, firstBelly: { week: 14, photo: '/foto/b1' }, babyName: 'Helena' };
const foto = (id: string, video = false) => ({ id, thumb: true, video });

describe('o cartão de cada lembrança', () => {
  it('a lembrança leva a frase, quem escreveu e a foto', () => {
    const r = entryShare(e({ photos: [foto('p1')] }), ctx);
    expect(r.kind).toBe('cartao_momento');
    expect(r.card.quote).toBe('Ele mexeu muito depois do jantar');
    expect(r.card.sign).toBe('Ana · 1 nov');
    expect(r.card.photos).toEqual([{ url: '/foto/p1' }]);
  });
  it('a primeira vez vira o marco', () => {
    const r = entryShare(e({ first_time: 'chute' }), ctx);
    expect(r.kind).toBe('cartao_primeira_vez');
    expect(r.card.kicker).toBe('Primeira vez');
    expect(r.card.title).toBe('Sentir o primeiro chute');
  });
  it('a barriga vem ao lado da primeira foto', () => {
    const r = entryShare(e({ folder: 'barriga', body: '', photos: [foto('b9')] }), ctx);
    expect(r.kind).toBe('cartao_barriga');
    expect(r.card.photos?.map(p => p.label)).toEqual(['Semana 14', 'Semana 22']);
    expect(r.card.title).toBe('8 semanas crescendo');
  });
  it('a carta sai assinada, para o bebê pelo nome', () => {
    const r = entryShare(e({ folder: 'carta', author_role: 'pai', body: 'Filha, já te amo.' }), ctx);
    expect(r.kind).toBe('cartao_carta');
    expect(r.card.kicker).toBe('Para Helena');
    expect(r.card.sign).toBe('— pai, na semana 22');
  });
  it('vídeo sem capa e sem frase não vira cartão', () => {
    expect(canShareEntry(e({ body: '', photos: [{ id: 'v', thumb: false, video: true }] }))).toBe(false);
    expect(canShareEntry(e({ body: '', photos: [foto('p')] }))).toBe(true);
  });
});
