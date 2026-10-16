// Atalhos de registro do Painel: a janela abre, salva, fecha e o dado aparece na seção certa.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p);
await p.getByRole('button', { name: /^Diário/ }).first().click();
await p.getByRole('button', { name: 'Momento' }).click();
await p.reload();
await p.getByRole('button', { name: /^Painel/ }).first().click();
await p.waitForTimeout(500);
const dlg = p.getByRole('dialog');
// Geral: sintoma pelo atalho
await p.getByRole('button', { name: /^Registrar$/ }).click();
await p.screenshot({ path: `${OUT}rapido-geral.png` });
await dlg.getByLabel('O que ela está sentindo?').fill('Enjoo');
await dlg.getByRole('button', { name: '3: Moderado' }).click();
await dlg.getByRole('button', { name: /Salvar · semana/ }).click();
await p.waitForTimeout(1200);
check(!(await dlg.isVisible()), 'janela fecha após salvar sintoma');
await p.getByRole('button', { name: 'Sintomas', exact: true }).click();
await p.waitForTimeout(500);
check(await p.getByText('Enjoo').first().isVisible(), 'sintoma aparece no painel de sintomas');
// Corpo: peso
await p.getByRole('button', { name: 'Corpo', exact: true }).click();
await p.getByRole('button', { name: /Registrar peso ou pressão/ }).click();
await dlg.getByLabel('Peso (kg)').fill('64,5');
await p.screenshot({ path: `${OUT}rapido-corpo.png` });
await dlg.getByRole('button', { name: /Registrar como/ }).click();
await p.waitForTimeout(1200);
check(!(await dlg.isVisible()), 'janela fecha após salvar peso');
await p.screenshot({ path: `${OUT}rapido-corpo-depois.png`, fullPage: true }); check(await p.getByText(/64[,.]5/).count() > 0, 'peso aparece no painel corpo');
// Jornada: consulta
await p.getByRole('button', { name: 'Jornada', exact: true }).click();
await p.getByRole('button', { name: /Agendar consulta/ }).first().click();
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}rapido-jornada.png` });
check(await dlg.isVisible(), 'formulário de consulta abre na jornada');
await p.keyboard.press('Escape');
check(!(await dlg.isVisible()), 'Esc fecha');
await b.close();
finish();
