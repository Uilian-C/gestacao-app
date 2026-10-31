// O mesmo sintoma escrito de jeitos diferentes vira um gráfico só: "Enjoo",
// "hoje senti enjoo" e "estou muito enjoada nesta manhã" contam juntos.
import { check, finish, launch, openCare, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p, { name: 'Ana' });
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json(), body);
const day = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA'); }, n);

// Registros antigos, de antes desta mudança, cada um escrito de um jeito.
await post({ op: 'createSymptom', week: 22, date: await day(3), name: 'Enjoo', intensity: 2, category: 'Digestivo', notes: null, timeOfDay: 'manha' });
await post({ op: 'createSymptom', week: 22, date: await day(2), name: 'hoje senti enjoo', intensity: 3, category: 'Físico', notes: null, timeOfDay: 'manha' });
await post({ op: 'createSymptom', week: 22, date: await day(2), name: 'Azia', intensity: 2, category: 'Digestivo', notes: null, timeOfDay: 'noite' });
await p.reload();

// Um novo, escrito como frase.
await p.getByRole('button', { name: 'Registrar', exact: true }).click();
const dlg = p.getByRole('dialog');
await dlg.getByRole('group', { name: 'Tipo de registro' }).getByRole('button', { name: 'Sintoma' }).click();
await dlg.getByLabel('O que ela está sentindo?').fill('estou muito enjoada nesta manhã');
check(await dlg.getByText('Vai entrar como', { exact: false }).isVisible() && (await dlg.getByText('Vai entrar como', { exact: false }).textContent()).includes('Enjoo'), 'o formulário avisa: "Vai entrar como Enjoo"');
check(await dlg.getByRole('button', { name: 'Enjoo', exact: true }).getAttribute('aria-pressed') === 'true', 'o atalho "Enjoo" acende junto');
check((await dlg.getByRole('button', { name: /^Manhã/ }).count()) === 1, '"nesta manhã" já marca o período Manhã');
check((await dlg.getByRole('button', { name: /^Digestivo/ }).count()) === 1, 'e o tipo Digestivo');
await dlg.getByRole('button', { name: '3: Moderado' }).click();
await p.screenshot({ path: `${OUT}sintoma-agrupado-form.png` });
await dlg.getByRole('button', { name: 'Salvar sintoma' }).click();
await dlg.waitFor({ state: 'hidden' });

const data = await p.evaluate(async () => (await fetch('/api/data')).json());
const saved = data.symptoms.find(s => (s.notes ?? '').includes('enjoada'));
check(saved?.symptom_name === 'Enjoo' && saved.notes === '"estou muito enjoada nesta manhã"', 'salva como Enjoo, com a frase na observação');

// Em Sintomas, um gráfico só para o enjoo (os 3 registros), e a azia à parte.
await openCare(p, 'Sintomas');
const fold = p.getByRole('button', { name: /^Frequência e tendência/ });
check((await fold.textContent()).includes('2 sintomas'), 'o resumo conta 2 sintomas (enjoo e azia), não 3');
await fold.click();
const rows = p.getByRole('button', { expanded: false }).filter({ hasText: /× · média/ });
await rows.first().waitFor();
const texts = await rows.allTextContents();
const enjoo = texts.filter(t => /enjo/i.test(t));
check(enjoo.length === 1 && enjoo[0].startsWith('Enjoo') && enjoo[0].includes('3×'), `um sintoma só: ${enjoo.join(' | ')}`);
check(texts.some(t => t.startsWith('Azia') && t.includes('1×')), 'a azia continua separada');
check((await p.getByRole('button', { name: 'Enjoo, moderado: ver detalhes' }).count()) === 2 && (await p.getByText('"hoje senti enjoo"').isVisible()), 'na lista, o registro antigo aparece como Enjoo, com a frase embaixo');
await p.getByText('Enjoo3×').waitFor().catch(() => undefined);
await p.screenshot({ path: `${OUT}sintoma-agrupado.png`, fullPage: true });
await p.emulateMedia({ colorScheme: 'dark' });
await p.screenshot({ path: `${OUT}sintoma-agrupado-escuro.png`, fullPage: true });

await b.close();
finish();
