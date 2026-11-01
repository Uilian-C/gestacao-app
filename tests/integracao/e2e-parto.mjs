// Parto por fases: a fase de vocês em destaque (Preparar, Reta final, Chegou a
// hora), as ferramentas de cada uma abrindo como página com "voltar", e o menu
// Parto sempre de volta às fases.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const dum = weeks => {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7 - 2);
  return d.toLocaleDateString('en-CA');
};

// ---- Semana 22: Preparar ----
const p = await phone(b);
await quickAccount(p, { name: 'Ana', dum: dum(22) });
await p.getByRole('button', { name: /^Parto/ }).first().click();
const fase = p.getByRole('region', { name: 'A fase de vocês' });
await fase.waitFor();
check(await fase.getByRole('heading', { name: 'Preparar' }).isVisible() && (await fase.getByText(/faltam 18 semanas/).isVisible()), 'na semana 22, a fase é Preparar, com quanto falta');
check((await fase.locator('[aria-current="step"]').textContent()).includes('Preparar'), 'a linha das fases marca a de agora');
check((await p.getByRole('button', { name: 'Marcar contrações' }).count()) === 0, 'antes da hora, sem o atalho das contrações');
check((await p.locator('section[aria-labelledby="fase-preparar"]').getByText('agora').isVisible()) && (await p.getByRole('button', { name: /^Plano de parto Ainda em branco/ }).isVisible()) && (await p.getByRole('button', { name: /^Mala da maternidade \d+ de \d+ itens/ }).isVisible()), 'Preparar: o plano e a mala, com o andamento');
await p.screenshot({ path: `${OUT}parto-fases.png`, fullPage: true });
await p.getByRole('button', { name: /^Mala da maternidade/ }).click();
await p.getByRole('heading', { level: 1, name: 'Mala da maternidade' }).waitFor();
check(await p.getByRole('button', { name: /^Parto$/ }).first().isVisible(), 'a ferramenta abre como página, com "voltar"');
await p.getByRole('button', { name: /^Parto/ }).last().click();
await fase.waitFor();
check(true, 'o menu Parto volta para as fases');
await p.getByRole('button', { name: /^Quando procurar a maternidade/ }).click();
check(await p.getByRole('dialog').getByText('Sangramento vaginal').isVisible(), 'os sinais de quando ir, a um toque');
await p.keyboard.press('Escape');

// ---- Semana 38: Chegou a hora ----
const q = await phone(b, { colorScheme: 'dark' });
await quickAccount(q, { name: 'Bia', dum: dum(38) });
await q.getByRole('button', { name: /^Parto/ }).first().click();
const fase2 = q.getByRole('region', { name: 'A fase de vocês' });
await fase2.waitFor();
check(await fase2.getByRole('heading', { name: 'Chegou a hora' }).isVisible(), 'na semana 38, a fase é Chegou a hora');
await q.screenshot({ path: `${OUT}parto-hora-escuro.png`, fullPage: true });
await q.getByRole('button', { name: 'Marcar contrações' }).click();
check(await q.getByRole('button', { name: 'Começou' }).isVisible(), 'o atalho leva direto ao marcador de contrações');

await b.close();
finish();
