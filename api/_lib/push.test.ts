import { describe, expect, it } from 'vitest';
import { inBestTime, isPushEndpoint, localClock, quietHour } from './push.js';

describe('isPushEndpoint', () => {
  it('aceita os serviços de push dos navegadores', () => {
    expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isPushEndpoint('https://web.push.apple.com/QGx')).toBe(true);
    expect(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(isPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=x')).toBe(true);
  });
  it('recusa qualquer outro endereço (o servidor nunca envia para um site qualquer)', () => {
    expect(isPushEndpoint('http://fcm.googleapis.com/fcm/send/abc')).toBe(false);
    expect(isPushEndpoint('https://localhost/push')).toBe(false);
    expect(isPushEndpoint('https://169.254.169.254/latest')).toBe(false);
    expect(isPushEndpoint('https://fcm.googleapis.com.evil.com/x')).toBe(false);
    expect(isPushEndpoint('https://evilpush.apple.com.br/x')).toBe(false);
    expect(isPushEndpoint('não é url')).toBe(false);
  });
});

describe('o orçamento dos avisos', () => {
  it('a novidade sai no horário escolhido (sem escolha, de manhã)', () => {
    expect(inBestTime(null, 8)).toBe(true);
    expect(inBestTime(null, 13)).toBe(false);
    expect(inBestTime('noite', 19)).toBe(true);
    expect(inBestTime('noite', 9)).toBe(false);
    expect(inBestTime('tarde', 12)).toBe(true);
    expect(inBestTime('tarde', 18)).toBe(false);
  });
  it('madrugada: das 22h às 7h, nada da outra pessoa', () => {
    expect([22, 23, 0, 3, 6].every(quietHour)).toBe(true);
    expect([7, 12, 21].some(quietHour)).toBe(false);
  });
  it('a hora e o dia são os de São Paulo', () => {
    expect(localClock(new Date('2026-10-17T01:30:00Z'))).toEqual({ hour: 22, day: '2026-10-16' });
  });
});
