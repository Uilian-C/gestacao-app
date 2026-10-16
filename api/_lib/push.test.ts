import { describe, expect, it } from 'vitest';
import { isPushEndpoint } from './push.js';

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
