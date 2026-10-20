// Início no celular: saúde rápida (peso e pressão com um toque) e o resumo da
// semana do casal, que aparece no domingo.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
// Um domingo, às 10h: o dia em que o resumo da semana aparece.
const sunday = new Date();
sunday.setDate(sunday.getDate() - sunday.getDay()); // o domingo mais recente (o servidor não aceita medição no futuro)
sunday.setHours(10, 0, 0, 0);
await p.clock.setFixedTime(sunday);
const dum = new Date(sunday);
dum.setDate(dum.getDate() - 23 * 7);
await quickAccount(p, { dum: dum.toLocaleDateString('en-CA') });
const iso = n => { const d = new Date(sunday); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).status, body);
const api = path => p.evaluate(async path => (await fetch(path)).json(), path);

// A semana: humor em 3 dias e um post no Mural.
for (const [n, mood] of [[-5, 'bem'], [-3, 'cansada'], [-1, 'cansada']]) await post({ op: 'checkin', day: iso(n), mood });
await post({ op: 'createEntry', date: iso(-2), body: 'Compramos o berço!', visibility: 'shared', remindOn: null, folder: 'momento' });
await p.reload();

// ---- Resumo da semana ----
const summary = p.getByRole('region', { name: 'Resumo da semana' });
await summary.waitFor();
check((await summary.textContent()).includes('marcou 3 de 7 dias') && (await summary.textContent()).includes('mais cansada'), 'resumo conta o humor da semana e o mais frequente');
check((await summary.textContent()).includes('1post no Mural'), 'e os posts no Mural');
await p.screenshot({ path: `${OUT}inicio-resumo-semana.png`, fullPage: true });
await summary.getByRole('button', { name: 'Fechar o resumo da semana' }).click();
check((await summary.count()) === 0, 'o resumo fecha no X');
await p.reload();
await p.getByRole('region', { name: 'Saúde rápida' }).waitFor();
check((await p.getByRole('region', { name: 'Resumo da semana' }).count()) === 0, 'e continua fechado até a semana seguinte');

// ---- Saúde rápida ----
const health = p.getByRole('region', { name: 'Saúde rápida' });
await health.getByRole('button', { name: 'Registrar peso' }).click();
await health.getByLabel('Peso em kg').fill('64,5');
await health.getByRole('button', { name: 'Salvar' }).click();
await health.getByText('Peso registrado.').waitFor();
check((await health.getByRole('button', { name: 'Registrar peso' }).textContent()).includes('64,5 kg'), 'peso registrado com um toque aparece no cartão');
await health.getByRole('button', { name: 'Registrar pressão' }).click();
await health.getByLabel('Pressão máxima').fill('145');
await health.getByLabel('Pressão mínima').fill('95');
await health.getByRole('button', { name: 'Salvar' }).click();
await health.getByText('Pressão registrada.').waitFor();
check((await health.getByRole('button', { name: 'Registrar pressão' }).textContent()).includes('140/90 ou mais: avisem a equipe'), 'pressão alta aparece em destaque, com o aviso');
const metrics = (await api('/api/data')).metrics;
check(metrics.some(m => Number(m.weight_kg) === 64.5) && metrics.some(m => m.systolic_bp === 145 && m.diastolic_bp === 95), 'peso e pressão gravados');
await health.getByRole('button', { name: 'Registrar pressão' }).click();
await health.getByLabel('Pressão máxima').fill('120');
await health.getByRole('button', { name: 'Salvar' }).click();
check(await health.getByText('Informe a pressão completa: máxima e mínima.').isVisible(), 'pressão incompleta avisa, sem gravar');
await p.screenshot({ path: `${OUT}inicio-saude-rapida.png` });
await health.getByRole('button', { name: /Ver evolução/ }).click();
await p.getByText('Pressão arterial').first().waitFor();
check(true, '"Ver evolução" leva aos gráficos de peso e pressão');

await b.close();
finish();
