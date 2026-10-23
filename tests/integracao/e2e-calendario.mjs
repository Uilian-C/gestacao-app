// O calendário fluido: o Mês rolando, o Ano com a gestação, a folha do dia, os filtros e o atalho do Início.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
const day = n => {
  const d = new Date(Date.now() + n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
await quickAccount(p, { name: 'Ana', dum: day(-24 * 7 - 1) });
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).status, body);
await post({ op: 'createConsultation', scheduledAt: `${day(2)}T13:30:00Z`, specialty: 'obstetra', professional: 'Dra. Marina', location: null });
await post({ op: 'createTask', week: 24, title: 'Montar o berço', assignee: 'pai', priority: 'Média', dueDate: day(2), notes: null });
await post({ op: 'createEntry', date: day(0), body: 'Sentimos o bebê mexer', visibility: 'shared', remindOn: null });
await post({ op: 'createSymptom', week: 24, date: day(0), name: 'Azia', intensity: 2, category: 'Digestivo', notes: null, timeOfDay: 'noite' });
await post({ op: 'checkin', day: day(0), mood: 'otima' });
await p.reload();

// ---- Início: a semana em sete bolinhas, que leva ao calendário ----
const strip = p.getByRole('region', { name: 'Esta semana no calendário' });
await strip.waitFor();
check((await strip.getByRole('button', { name: /abrir no calendário$/ }).count()) === 7, 'o Início mostra a semana em sete dias');
await p.screenshot({ path: `${OUT}calendario-inicio.png` });
const label2 = await p.evaluate(n => { const d = new Date(Date.now() + n * 86_400_000); return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); }, 2);
const inWeek = await p.evaluate(() => new Date(Date.now() + 2 * 86_400_000).getDay() > new Date().getDay());
// "Calendário" abre o calendário, sem abrir nenhum dia.
await strip.getByRole('button', { name: 'Calendário', exact: true }).click();
await p.getByRole('group', { name: 'Filtrar o calendário' }).waitFor();
check((await p.getByRole('dialog').count()) === 0, '"Calendário" abre o calendário, sem abrir um dia');
check(await p.getByRole('button', { name: /^Próximos/ }).isVisible() && (await p.getByRole('button', { name: /^Jornada/ }).isVisible()), 'as abas da Agenda continuam à vista');
// O menu Agenda volta para "Próximos".
await p.getByRole('button', { name: /^Início/ }).first().click();
await p.getByRole('button', { name: /^Agenda/ }).first().click();
check((await p.getByRole('button', { name: /^Próximos/ }).getAttribute('aria-pressed')) === 'true' || (await p.getByRole('button', { name: /^Próximos/ }).getAttribute('aria-selected')) === 'true' || (await p.getByRole('group', { name: 'Filtrar o calendário' }).count()) === 0, 'o menu Agenda abre em Próximos');
// Tocar num dia do Início abre a folha daquele dia.
await p.getByRole('button', { name: /^Início/ }).first().click();
const alvo = inWeek ? strip.getByRole('button', { name: new RegExp(`^${label2}`) }) : strip.getByRole('button', { name: /, hoje: abrir no calendário$/ });
await alvo.click();
const folha = p.getByRole('dialog');
await folha.waitFor();
check(await p.getByRole('button', { name: 'Calendário', exact: true }).first().isVisible(), 'tocar no dia abre a Agenda → Calendário');
check(await folha.getByRole('region', { name: 'A gestação neste dia' }).isVisible(), 'a folha do dia mostra como estava a gestação');
check(await folha.getByText(/dias para o nascimento/).isVisible(), 'e quantos dias faltam para o nascimento');
if (inWeek) check(await folha.getByRole('button', { name: /Obstetra/ }).isVisible() && (await folha.getByText('Montar o berço').isVisible()), 'com a consulta e a tarefa do dia');
await p.screenshot({ path: `${OUT}calendario-folha.png` });
await folha.getByRole('button', { name: 'Fechar' }).click();
await folha.waitFor({ state: 'detached' });

// ---- Mês: rolando, já no mês de hoje, com a faixa da gestação ----
await p.getByRole('button', { name: 'Mês', exact: true }).click();
const hojeLabel = await p.evaluate(() => new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }));
const hoje = p.getByRole('gridcell', { name: new RegExp(`^${hojeLabel}, hoje, 24 semanas e 1 dia`) });
await hoje.waitFor();
const box = await hoje.boundingBox();
check(box && box.y > 0 && box.y < 844, `o Mês abre no mês de hoje, já à vista (${Math.round(box?.y ?? -1)})`);
check(await hoje.getAttribute('aria-label').then(l => /humor: Ana ótima/.test(l) && /registro de saúde/.test(l)), 'o dia de hoje traz o humor e a saúde');
const meses = await p.getByRole('grid').count();
check(meses >= 10, `o Mês mostra a gestação inteira, mês a mês (${meses} meses)`);
check(await p.getByRole('gridcell', { name: /data provável do parto/ }).count() === 1, 'a data provável do parto tem o seu coração');
await p.screenshot({ path: `${OUT}calendario-mes.png` });

// Os meses rolam dentro do próprio espaço: a página não se move e as abas ficam.
await p.getByLabel('Meses da gestação').hover();
await p.mouse.wheel(0, 1800);
await p.waitForTimeout(400);
check(await p.getByRole('group', { name: 'Filtrar o calendário' }).isVisible() && (await p.getByRole('button', { name: /^Próximos/ }).isVisible()), 'ao rolar os meses, a barra e as abas da Agenda continuam à vista');
check((await p.evaluate(() => window.scrollY)) < 5, 'e a página não se move');
await p.screenshot({ path: `${OUT}calendario-mes-rolando.png` });

// ---- Filtros: um de cada vez ----
await p.getByRole('button', { name: 'Hoje', exact: true }).click();
await p.waitForTimeout(500);
await p.getByRole('group', { name: 'Filtrar o calendário' }).getByRole('button', { name: 'Consultas e exames' }).click();
check(!/eventos?/.test((await hoje.getAttribute('aria-label')) ?? '') && !/humor/.test((await hoje.getAttribute('aria-label')) ?? ''), 'no filtro de consultas, o momento e o humor de hoje saem de cena');
await p.screenshot({ path: `${OUT}calendario-filtro.png` });
await p.getByRole('group', { name: 'Filtrar o calendário' }).getByRole('button', { name: 'Tudo' }).click();

// ---- Ano: a gestação inteira de relance ----
await p.getByRole('button', { name: 'Ano', exact: true }).click();
const ano = p.getByRole('region', { name: /^Ano de / }).first();
await ano.waitFor();
check(await p.getByRole('button', { name: /data provável do parto/ }).count() === 1, 'o Ano marca a data provável do parto');
check(await p.getByLabel('Legenda').getByText('2º trimestre').isVisible(), 'com a legenda dos trimestres');
await p.screenshot({ path: `${OUT}calendario-ano.png` });
// Tocar no nome do mês leva ao Mês.
const nomeMes = await p.evaluate(() => new Date().toLocaleDateString('pt-BR', { month: 'long' }));
await p.getByRole('button', { name: new RegExp(`^${nomeMes}$`, 'i') }).first().click();
await hoje.waitFor();
check((await p.getByRole('button', { name: 'Mês', exact: true }).getAttribute('aria-pressed')) === 'true', 'tocar no mês do Ano abre o Mês');

// ---- Semana da gestação continua ----
await p.getByRole('button', { name: 'Semana', exact: true }).click();
await p.getByRole('heading', { name: 'Semana 24 da gestação' }).waitFor();
check(true, 'a visão por semana da gestação continua lá');

// ---- Modo escuro ----
const escuro = await phone(b, { colorScheme: 'dark' });
await escuro.context().addCookies(await p.context().cookies());
await escuro.goto(p.url());
await escuro.getByRole('button', { name: /^Agenda/ }).first().click();
await escuro.getByRole('button', { name: 'Calendário', exact: true }).click();
await escuro.getByRole('button', { name: 'Mês', exact: true }).click();
await escuro.getByRole('gridcell', { name: new RegExp(`^${hojeLabel}, hoje`) }).waitFor();
await escuro.waitForTimeout(400);
await escuro.screenshot({ path: `${OUT}calendario-mes-escuro.png` });
await escuro.getByRole('button', { name: 'Ano', exact: true }).click();
await escuro.waitForTimeout(400);
await escuro.screenshot({ path: `${OUT}calendario-ano-escuro.png` });

// ---- Celular pequeno (360px): nada passa da largura ----
await p.setViewportSize({ width: 360, height: 740 });
for (const v of ['Mês', 'Ano']) {
  await p.getByRole('button', { name: v, exact: true }).click();
  await p.waitForTimeout(400);
  const [sw, cw] = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  check(sw <= cw, `360px, ${v}: nada passa da largura (${sw} ≤ ${cw})`);
  await p.screenshot({ path: `${OUT}calendario-360-${v === 'Mês' ? 'mes' : 'ano'}.png` });
}

await b.close();
finish();
