import { describe, expect, it } from 'vitest';
import { chromeIntentUrl, limitedBrowser } from './pwa';

const UA = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  edgeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 EdgA/129.0.2792.84',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  edgeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.2792.79',
  instagramIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0]',
  webviewAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36',
};

describe('limitedBrowser', () => {
  it('libera os navegadores que entregam notificações', () => {
    for (const ua of [UA.chromeAndroid, UA.samsung, UA.firefoxAndroid, UA.safariIphone, UA.edgeDesktop]) expect(limitedBrowser(ua)).toBeNull();
  });
  it('reconhece o Edge no Android e os navegadores de redes sociais', () => {
    expect(limitedBrowser(UA.edgeAndroid)).toBe('o Edge');
    expect(limitedBrowser(UA.instagramIphone)).toBe('o navegador do Instagram');
    expect(limitedBrowser(UA.facebookAndroid)).toBe('o navegador do Facebook');
    expect(limitedBrowser(UA.webviewAndroid)).toBe('o navegador interno deste app');
  });
});

describe('chromeIntentUrl', () => {
  it('abre a mesma página no Chrome', () => {
    expect(chromeIntentUrl('https://gestacao-app.vercel.app/?aba=consultas')).toBe('intent://gestacao-app.vercel.app/?aba=consultas#Intent;scheme=https;package=com.android.chrome;end');
  });
});
