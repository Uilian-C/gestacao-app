// Momentos: guia de direitos ao falar do trabalho, momento particular com lembrete e o lembrete no Início.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p);
await p.getByRole('button', { name: /^Diário/ }).first().click();
await p.getByRole('button', { name: 'Registrar', exact: true }).click();
await p.getByLabel('O que aconteceu?').fill('Contamos hoje para a empresa. Vamos contar para a família em 15 dias.');
check(await p.getByText('Seus direitos no trabalho').isVisible(), 'guia de direitos aparece ao falar da empresa');
await p.getByRole('button', { name: 'Só eu' }).click();
await p.getByRole('button', { name: 'Lembrar', exact: true }).click();
await p.screenshot({ path: `${OUT}momento-form.png`, fullPage: true });
await p.getByRole('button', { name: /Guardar momento/ }).click();
await p.waitForTimeout(1200);
check(await p.getByText('só você').first().isVisible(), 'momento particular na linha do tempo');
await p.screenshot({ path: `${OUT}momento-linha.png`, fullPage: false });
await p.getByRole('button', { name: /^Início/ }).first().click();
await p.waitForTimeout(600);
await p.getByRole('button', { name: /^Agenda(\s|$)/ }).first().click();
await p.waitForTimeout(600);
check(await p.getByRole('region', { name: 'Depois' }).getByText(/Contamos hoje para a empresa/).isVisible(), 'lembrete aparece na Agenda → Próximos, no dia marcado');
await p.screenshot({ path: `${OUT}momento-inicio.png`, fullPage: false });
await b.close();
finish();
