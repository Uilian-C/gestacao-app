// Utilidades dos testes de integração: verificação, cliente da API com cookies
// (como o navegador) e o Chromium do Playwright.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

export const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5173';
export const PUSH = process.env.FAKE_PUSH_URL ?? 'https://localhost:4443';
export const OUT = new URL('./.saida/prints/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

export const errs = [];
let failures = 0;
export function check(cond, label) {
  console.log(`${cond ? 'ok    ' : 'FALHOU'} ${label}`);
  if (!cond) failures++;
}

/** Fecha o teste: lista erros de página e sai com código 1 se algo falhou. */
export function finish() {
  if (errs.length) {
    console.log('erros de página:', errs);
    failures += errs.length;
  }
  console.log(failures ? `\n${failures} falha(s)` : '\nTudo certo');
  process.exit(failures ? 1 : 0);
}

export const wait = ms => new Promise(r => setTimeout(r, ms));

/** Cliente da API que guarda cookies como um navegador (cada cookie novo substitui só o de mesmo nome). */
export function client() {
  const jar = new Map();
  const call = async (path, body, extra = {}) => {
    const res = await fetch(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), origin: BASE, cookie: [...jar.values()].join('; '), ...extra },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const name = pair.slice(0, pair.indexOf('='));
      if (/max-age=0/i.test(c) || pair.endsWith('=')) jar.delete(name);
      else jar.set(name, pair);
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      // resposta sem JSON
    }
    return { status: res.status, data };
  };
  return { call };
}

/** Chromium do Playwright. CHROMIUM_PATH aponta para um navegador já instalado; HTTPS_PROXY, se houver, é respeitado. */
export function launch() {
  const proxy = process.env.HTTPS_PROXY;
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: proxy ? [`--proxy-server=${proxy}`, '--proxy-bypass-list=<-loopback>;127.0.0.1;localhost'] : [],
  });
}

/** Página de celular que registra erros de JavaScript. */
export async function phone(browser, options = {}) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, ...options })).newPage();
  page.on('pageerror', e => errs.push(e.message));
  return page;
}

/** Cria conta, aceita os termos, cria o espaço e define a DUM, pela API de dentro da página. */
export async function quickAccount(page, { name = 'Ana', role = 'mae', dum = '2026-05-15' } = {}) {
  await page.goto(BASE);
  const call = (path, body) =>
    page.evaluate(
      async ([path, body]) => (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).status,
      [path, body],
    );
  await call('/api/auth/sign-up/email', { name, email: `${name.toLowerCase()}${Date.now()}@ex.com`, password: 'senha-forte-1' });
  await call('/api/family', { op: 'consent', version: '2026-10-16' });
  await call('/api/family', { op: 'create', role });
  await call('/api/data', { op: 'saveDum', date: dum });
  await page.reload();
}
