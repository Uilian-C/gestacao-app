// Cuidados numa página só: a próxima consulta (preparar com as dúvidas e o
// resumo), os registros, o pré-natal, os resultados e o que ter à mão. Cada
// parte abre numa página com "voltar"; o menu Cuidados sempre volta ao topo.
import { check, finish, launch, OUT, openCare, phone, quickAccount, openHandy } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p, { name: 'Ana' });
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json(), body);
const iso = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const dlg = p.getByRole('dialog');

// ---- Sem consulta marcada ----
await openCare(p);
const hero = p.getByRole('region', { name: 'Próxima consulta' });
check(await hero.getByText('Nenhuma consulta marcada').isVisible() && (await hero.getByRole('button', { name: 'Agendar consulta' }).isVisible()), 'sem consulta: convite para agendar');
check((await p.getByRole('button', { name: /^Saúde$|^Dúvidas|^Resumo$/ }).count()) === 0, 'sem sub-abas: Cuidados é uma página só');

// ---- Com consulta, sintoma e peso ----
const at = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 4); d.setHours(14, 0, 0, 0); return d.toISOString(); });
await post({ op: 'createConsultation', scheduledAt: at, specialty: 'obstetra', professional: 'Dra. Paula', location: null, kind: 'consulta' });
await post({ op: 'createSymptom', week: 22, date: await iso(-2), name: 'Azia', intensity: 3, category: 'Digestivo', notes: '', timeOfDay: 'noite' });
await post({ op: 'createMetric', week: 22, date: await iso(-1), weight: 66.2, systolic: 112, diastolic: 72 });
await p.reload();
await openCare(p);
check(await hero.getByText(/^Próxima consulta · em 4 dias$/).isVisible() && (await hero.getByText('Obstetra (pré-natal)').isVisible()), 'a próxima consulta em destaque, com quanto falta');
const registros = p.locator('section[aria-labelledby="registros-titulo"]');
check(await registros.getByRole('button', { name: /^Sintomas 1 registro/ }).isVisible() && (await registros.getByRole('button', { name: /^Peso e pressão 66,2 kg 112\/72/ }).isVisible()), 'os registros num relance: sintomas e peso e pressão');
await p.getByRole('button', { name: 'Registrar', exact: true }).click();
check((await dlg.getByRole('group', { name: 'Tipo de registro' }).getByRole('button').allTextContents()).join(',') === 'Sintoma,Peso e pressão,Resultado', '"Registrar" oferece sintoma, peso e pressão e resultado');
await p.keyboard.press('Escape');
await p.screenshot({ path: `${OUT}cuidados.png`, fullPage: true });

// ---- Preparar a consulta: dúvidas para levar e o resumo ----
await hero.getByRole('button', { name: 'Preparar a consulta' }).click();
await p.getByRole('heading', { level: 1, name: 'Obstetra (pré-natal)' }).waitFor();
const duvidas = p.locator('section[aria-labelledby="duvidas-titulo"]');
await duvidas.getByLabel('Dúvida').fill('Posso tomar café?');
await duvidas.getByRole('button', { name: 'Anotar' }).click();
await duvidas.getByText('Posso tomar café?').waitFor();
check(await p.locator('.print-area').getByText('Posso tomar café?').isVisible(), 'a dúvida anotada já entra no resumo');
check(await p.locator('.print-area').getByText('Azia').first().isVisible(), 'o resumo traz os sintomas do período');
check(await p.getByRole('button', { name: /Imprimir \/ PDF/ }).isVisible() && (await p.getByRole('button', { name: /Copiar texto/ }).isVisible()), 'imprimir e copiar à vista, logo acima do resumo');
await duvidas.getByRole('button', { name: 'Responder' }).click();
await duvidas.getByLabel(/Resposta para/).fill('Até 2 xícaras por dia.');
await duvidas.getByRole('button', { name: 'Salvar' }).click();
await duvidas.getByText('Respondidas (1)').waitFor();
check(true, 'depois da consulta, a resposta fica guardada');
await p.screenshot({ path: `${OUT}cuidados-preparar.png`, fullPage: true });
await p.getByRole('button', { name: 'Cuidados', exact: true }).first().click();
await hero.waitFor();
check(await hero.getByText('Anotem as dúvidas e levem o resumo dos registros.').isVisible(), 'voltar leva a Cuidados (sem dúvidas pendentes)');

// ---- As páginas que abrem de Cuidados ----
await openCare(p, 'Sintomas');
check(await p.getByRole('region', { name: 'Registros de sintomas' }).getByRole('button', { name: /^Azia/ }).isVisible(), 'Sintomas: os gráficos e os registros do período juntos');
await openCare(p, 'Peso e pressão');
check(await p.getByRole('region', { name: 'Registros de peso e pressão' }).getByText(/66,2 kg/).isVisible(), 'Peso e pressão: os gráficos e as medições juntos');
await p.getByRole('button', { name: /^Cuidados/ }).first().click();
check(await hero.isVisible(), 'o menu Cuidados sempre volta para a página única');
const folds = p.getByRole('list', { name: 'Mais de Cuidados' });
check((await folds.getByRole('button', { name: /^Pré-natal \d+ de \d+ feitos/ }).getAttribute('aria-expanded')) === 'false' && (await folds.getByRole('button', { name: /^Resultados/ }).isVisible()), 'pré-natal, resultados e o que ter à mão numa lista curta');
await folds.getByRole('button', { name: /^Pré-natal/ }).click();
check(await p.getByRole('button', { name: 'Ver a jornada completa ›' }).isVisible(), 'o pré-natal abre no lugar, com o que fazer agora');
await p.screenshot({ path: `${OUT}cuidados-lista.png` });

// ---- Para ter à mão (recolhido: abre no lugar) ----
check((await p.getByRole('button', { name: /^Resumo para emergência/ }).count()) === 0, '"Para ter à mão" começa recolhido');
await openHandy(p, 'Dados da gestação');
check(await dlg.getByRole('button', { name: /Editar dados/ }).isVisible(), 'os dados da gestação abrem numa folha, com editar');
await p.keyboard.press('Escape');
await p.getByRole('button', { name: /^Quando procurar a maternidade/ }).click();
check(await dlg.getByText('Sangramento vaginal').isVisible(), 'os sinais de alerta a um toque');
await p.keyboard.press('Escape');
await p.getByRole('button', { name: /^Resumo para emergência/ }).click();
await p.locator('.print-area').waitFor();
check((await p.locator('section[aria-labelledby="duvidas-titulo"]').count()) === 0 && (await p.getByText('Resumo para levar').isVisible()), 'o resumo para emergência vai direto ao resumo');

await b.close();
finish();
