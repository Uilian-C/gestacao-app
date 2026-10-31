import { describe, expect, it } from 'vitest';
import { sniffVideo } from './files.js';
import { parseRange } from './videos.js';

describe('parseRange', () => {
  it('lê o trecho pedido pelo navegador', () => {
    expect(parseRange('bytes=0-', 1000)).toEqual({ start: 0, end: 999 });
    expect(parseRange('bytes=0-1', 1000)).toEqual({ start: 0, end: 1 });
    expect(parseRange('bytes=500-2000', 1000)).toEqual({ start: 500, end: 999 });
    expect(parseRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
  });
  it('sem trecho (ou trecho estranho), o vídeo inteiro', () => {
    expect(parseRange(null, 1000)).toBeNull();
    expect(parseRange('bytes=0-1,5-6', 1000)).toBeNull();
  });
  it('recusa trecho fora do vídeo', () => {
    expect(() => parseRange('bytes=1000-', 1000)).toThrow();
  });
});

describe('sniffVideo', () => {
  const ftyp = (brand: string) => Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from(`ftyp${brand}`, 'latin1'), Buffer.alloc(8)]);
  it('reconhece MP4, MOV e WebM pelo começo do arquivo', () => {
    expect(sniffVideo(ftyp('isom'))).toBe('video/mp4');
    expect(sniffVideo(ftyp('qt  '))).toBe('video/quicktime');
    expect(sniffVideo(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0]))).toBe('video/webm');
  });
  it('recusa o que não é vídeo', () => {
    expect(sniffVideo(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});
