// Edge no Android: o app não oferece ativar o que não funciona e orienta abrir no Chrome.
import { check, finish, launch, OUT, phone, PUSH, quickAccount } from './lib.mjs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // o push falso usa certificado próprio
const id = `ui${Date.now()}`;
const sub = await (await fetch(`${PUSH}/new?id=${id}`)).json();
const b = await launch();
const p = await phone(b, { userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 EdgA/129.0.2792.84' });
// O Chromium de teste não tem o serviço de push do Google: a inscrição aponta para o push falso.
await p.context().addInitScript(sub => {
  let current = null;
  const fake = { endpoint: sub.endpoint, options: { applicationServerKey: null }, toJSON: () => sub, unsubscribe: async () => { current = null; return true; } };
  PushManager.prototype.subscribe = async function () { current = fake; return fake; };
  PushManager.prototype.getSubscription = async function () { return current; };
  Object.defineProperty(Notification, 'permission', { get: () => window.__perm ?? 'default' });
  Notification.requestPermission = async () => (window.__perm = 'granted');
}, sub);
await quickAccount(p);
const sw = await p.evaluate(async () => !!(await navigator.serviceWorker.ready));
check(sw, 'service worker registrado');
check(await p.evaluate(async () => (await fetch('/manifest.webmanifest')).ok), 'manifest disponível');
await p.getByText('Lembretes no celular').waitFor();
check(await p.getByText(/Você está usando o Edge/).isVisible(), 'Edge no Android: cartão orienta abrir no Chrome');
check(await p.getByRole('link', { name: 'Abrir no Chrome' }).getAttribute('href').then(h => h.startsWith('intent://127.0.0.1:5173/')), 'botão Abrir no Chrome usa o link do Android');
check(!(await p.getByRole('button', { name: 'Ativar lembretes' }).isVisible()), 'não oferece ativar onde não funciona');
await p.screenshot({ path: OUT + 'edge-inicio.png' });
await p.locator('header button').last().click();
await p.getByText('Notificações no celular').scrollIntoViewIfNeeded();
check(await p.getByRole('dialog').getByText(/Você está usando o Edge/).isVisible(), 'Nosso espaço também orienta');
await p.screenshot({ path: OUT + 'edge-espaco.png' });
await b.close();
finish();
