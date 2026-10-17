// Novo Início: o coração continua batendo, o check-in do dia (a outra pessoa vê),
// "Hoje" só com o que é de hoje, os próximos 7 dias, a semana e o diário do parceiro.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
await quickAccount(mae, { name: 'Ana' });
const post = (p, path, body) => p.evaluate(async ([path, body]) => (await (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), [path, body]);

// ---- Dia livre ----
await mae.getByText('Dia livre por aqui. Que tal guardar um momento?').waitFor({ timeout: 10000 });
check(true, 'sem compromisso hoje: convite carinhoso');
const ring = mae.locator('.tt-onda').first();
check((await ring.count()) === 1 && (await ring.evaluate(el => getComputedStyle(el).animationName)) !== 'none', 'o coração continua pulsando (ondas animadas)');
check(await mae.getByRole('img', { name: /Semana 22 de 40/ }).isVisible(), 'anel da semana no centro do Início');
check(await mae.getByText(/Dia \d+ de 280/).isVisible(), 'mostra o dia da gestação');

// ---- Parceiro ----
const code = (await post(mae, '/api/family', { op: 'invite' })).code;
const pai = await phone(b);
await pai.goto(BASE);
await post(pai, '/api/auth/sign-up/email', { name: 'Caio Souza', email: `caio${Date.now()}@ex.com`, password: 'senha-forte-1' });
await post(pai, '/api/family', { op: 'consent', version: '2026-10-16' });
await post(pai, '/api/family', { op: 'join', code, role: 'pai' });
const iso = n => mae.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const at = async (n, t) => mae.evaluate(([d, t]) => new Date(`${d}T${t}:00`).toISOString(), [await iso(n), t]);
await post(mae, '/api/data', { op: 'createConsultation', scheduledAt: await at(0, '23:30'), specialty: 'ultrassom', professional: 'Clínica Imagem', location: null, kind: 'ultrassom', title: 'Ultrassom morfológico', planItem: 'morfo-2' });
await post(mae, '/api/data', { op: 'createConsultation', scheduledAt: await at(3, '09:00'), specialty: 'outra', professional: null, location: null, kind: 'vacina', title: 'Vacina dTpa' });
await post(mae, '/api/data', { op: 'createConsultation', scheduledAt: await at(20, '09:00'), specialty: 'obstetra', professional: null, location: null });
await post(pai, '/api/data', { op: 'createEntry', date: await iso(-1), body: 'Senti você mexer pela primeira vez.', visibility: 'shared', remindOn: null, folder: 'momento' });
await mae.reload();
await mae.getByText('Ultrassom morfológico').first().waitFor();

const today = mae.getByRole('region', { name: 'Hoje' }).or(mae.locator('section[aria-labelledby="hoje-titulo"]'));
check(await today.getByRole('button', { name: /^Ultrassom: Ultrassom morfológico: ver detalhes/ }).isVisible(), '"Hoje" mostra o ultrassom de hoje');
check((await today.getByText('Vacina dTpa').count()) === 0, 'a vacina de daqui a 3 dias não entra em "Hoje"');
const week = mae.locator('section[aria-labelledby="semana-titulo"]');
check(await week.getByText('Vacina dTpa').isVisible() && (await week.getByText(/Obstetra/).count()) === 0, 'próximos 7 dias: a vacina, e não a consulta daqui a 20 dias');
check(await mae.getByText('Para o pai', { exact: true }).isVisible() && await mae.getByText('Seu corpo', { exact: true }).isVisible(), 'cartões da semana: corpo e dica para o pai');
check(await mae.getByText('Senti você mexer pela primeira vez.').isVisible(), 'último registro do pai no diário aparece no Início');

// ---- Check-in ----
await mae.getByRole('button', { name: 'Cansada' }).click();
await mae.waitForTimeout(800);
check((await mae.getByRole('button', { name: 'Cansada' }).getAttribute('aria-pressed')) === 'true', 'mãe marca como está hoje');
await mae.screenshot({ path: `${OUT}inicio-mae.png`, fullPage: true });
await pai.reload();
await pai.getByText(/Ana hoje: cansada/).waitFor({ timeout: 10000 });
check(true, 'pai vê "Ana hoje: cansada"');
check(await pai.getByRole('button', { name: 'Cansado' }).isVisible(), 'para o pai, as opções ficam no masculino');
await pai.getByRole('button', { name: 'Ótimo' }).click();
await pai.waitForTimeout(800);
await mae.reload();
await mae.getByText(/Caio hoje: ótimo/).waitFor({ timeout: 10000 });
check(await mae.getByText(/Caio já passou por aqui hoje/).isVisible(), 'mãe vê que o Caio passou por aqui hoje');
await pai.screenshot({ path: `${OUT}inicio-pai.png`, fullPage: true });
await b.close();
finish();
