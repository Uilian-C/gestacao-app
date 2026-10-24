// Início no celular: o resumo da semana do casal, que aparece no domingo como
// um cartão do carrossel "Nesta semana" e abre por inteiro num toque.
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
const nesta = p.locator('section[aria-labelledby="nesta-semana"]');
const cardResumo = nesta.getByRole('button', { name: /^Resumo da semana/i });
await cardResumo.waitFor();
check((await nesta.getByRole('listitem').first().textContent()).match(/Resumo da semana/i), 'no domingo, o resumo é o primeiro cartão de "Nesta semana"');
await cardResumo.click();
const summary = p.getByRole('dialog').getByRole('region', { name: 'Resumo da semana' });
await summary.waitFor();
check((await summary.textContent()).includes('marcou 3 de 7 dias') && (await summary.textContent()).includes('mais cansada'), 'resumo conta o humor da semana e o mais frequente');
check((await summary.textContent()).includes('1post no Mural'), 'e os posts no Mural');
await p.screenshot({ path: `${OUT}inicio-resumo-semana.png` });
await summary.getByRole('button', { name: /Como vocês estiveram/ }).click();
await p.getByRole('region', { name: 'Linha do humor' }).waitFor({ timeout: 10000 });
check((await p.getByRole('dialog').count()) === 0, '"Como vocês estiveram" fecha o resumo e abre o Humor');
check((await p.getByRole('region', { name: 'Saúde rápida' }).count()) === 0, 'a saúde rápida não está mais no Início (o Registrar cobre)');

await b.close();
finish();
