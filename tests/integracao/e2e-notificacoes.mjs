// Notificações na interface: convite no Início, ativar, teste que chega, preferência salva, desativar e link ?aba=.
import { BASE, check, finish, launch, OUT, phone, PUSH, quickAccount } from './lib.mjs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // o push falso usa certificado próprio
const id = `ui${Date.now()}`;
const sub = await (await fetch(`${PUSH}/new?id=${id}`)).json();
const b = await launch();
const p = await phone(b);
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
const convite = p.locator('section[aria-labelledby="hoje-titulo"]').getByRole('button', { name: /Lembretes no celular/ });
await convite.waitFor();
check(true, 'convite para ligar os lembretes aparece no "Para hoje"');
await convite.click();
await p.screenshot({ path: `${OUT}push-inicio.png` });
await p.getByRole('button', { name: 'Ativar lembretes' }).click();
await p.waitForTimeout(800);
check(!(await p.getByText('Lembretes no celular').isVisible()), 'depois de ativar, o convite some');
await p.locator('header button').last().click();
await p.getByText('Notificações no celular').waitFor();
check(await p.getByText('Ativas neste aparelho').isVisible(), 'Nosso espaço mostra "Ativas neste aparelho"');
await p.getByRole('button', { name: 'Enviar teste' }).click();
await p.waitForTimeout(800);
const inbox = await (await fetch(`${PUSH}/inbox`)).json();
check(inbox.some(m => m.device === id && m.payload.title.startsWith('Notificações do Tumtum')), 'teste chegou no aparelho (push falso)');
await p.getByLabel(/Registros da outra pessoa/).uncheck();
await p.waitForTimeout(600);
await p.getByText('Notificações no celular').scrollIntoViewIfNeeded();
await p.screenshot({ path: `${OUT}push-espaco.png` });
const prefs = await p.evaluate(async () => (await (await fetch('/api/push')).json()).prefs);
check(prefs.parceiro === false && prefs.consultas === true, 'preferência salva no servidor');
await p.getByRole('button', { name: 'Desativar' }).click();
await p.waitForTimeout(600);
check(await p.getByRole('button', { name: 'Ativar neste aparelho' }).isVisible(), 'desativar volta para "Ativar neste aparelho"');
// Link de notificação abre a aba certa.
await p.goto(`${BASE}/?aba=consultas`);
await p.waitForTimeout(1200);
check(await p.evaluate(() => location.search === ''), 'link da notificação some da barra de endereço');
check(await p.getByRole('button', { name: /^Agenda(\s|$)/ }).first().evaluate(el => el.getAttribute('aria-current') === 'page'), 'link antigo ?aba=consultas abre a Agenda');
check((await p.getByRole('button', { name: /^Próximos/ }).getAttribute('aria-pressed')) === 'true', 'na parte Próximos');
await p.screenshot({ path: `${OUT}push-link.png` });
await b.close();
finish();
