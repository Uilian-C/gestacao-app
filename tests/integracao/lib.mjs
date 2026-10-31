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
// No GitHub Actions, cada falha também vira uma anotação: dá para ler o que falhou sem abrir o log.
const ANNOTATE = !!process.env.GITHUB_ACTIONS;
const annotate = text => ANNOTATE && console.log(`::error title=${process.argv[1].split('/').pop()}::${String(text).split('\n')[0].slice(0, 300)}`);
process.on('uncaughtException', err => {
  annotate(err?.message ?? err);
  console.error(err);
  process.exit(1);
});

export function check(cond, label) {
  console.log(`${cond ? 'ok    ' : 'FALHOU'} ${label}`);
  if (!cond) {
    failures++;
    annotate(label);
  }
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
  /** GET sem ler como JSON: para arquivos. */
  const raw = async (path, extra = {}) => {
    const res = await fetch(BASE + path, { headers: { cookie: [...jar.values()].join('; '), ...extra } });
    return { status: res.status, headers: res.headers, bytes: Buffer.from(await res.arrayBuffer()) };
  };
  return { call, raw };
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
/** A DUM padrão dos testes: sempre 22 semanas e 3 dias atrás (os testes contam com a semana 22, seja qual for o dia em que rodam). */
export const DUM_22 = (() => {
  const d = new Date();
  d.setDate(d.getDate() - (22 * 7 + 3));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

export async function quickAccount(page, { name = 'Ana', role = 'mae', dum = DUM_22 } = {}) {
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

/** Cuidados: a página única, ou uma das partes que abrem dela ("Sintomas", "Peso e pressão", "Jornada", "Resultados"). */
export async function openCare(page, part) {
  await page.getByRole('button', { name: /^Cuidados/ }).first().click();
  await page.locator('section[aria-labelledby="registros-titulo"]').waitFor();
  if (!part) return;
  if (part === 'Jornada') {
    const fold = page.getByRole('button', { name: /^Pré-natal/ });
    if ((await fold.getAttribute('aria-expanded')) !== 'true') await fold.click();
    await page.getByRole('button', { name: 'Ver a jornada completa ›' }).click();
  } else await page.getByRole('button', { name: { Sintomas: /^Sintomas/, 'Peso e pressão': /^Peso e pressão/, Resultados: /^Resultados/ }[part] }).first().click();
  await page.getByRole('heading', { level: 1, name: part === 'Jornada' ? 'Jornada do pré-natal' : part }).waitFor();
}

/** Cuidados → atalhos de um toque logo abaixo da consulta (Dados da gestação, Relatório). */
export async function openHandy(page, name) {
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
}
