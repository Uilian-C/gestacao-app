// Onda 2D: a contagem para o morfológico no Início, "Como foi a consulta?"
// depois da consulta (no Início e pelo link do aviso), e a barriguinha com o
// guia da pose e o crescendo.
import { BASE, check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const mae = await phone(b);
await quickAccount(mae, { name: 'Ana' });
const post = body => mae.evaluate(async body => (await (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()), body);
const dayAt = (n, h) => mae.evaluate(([n, h]) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d.toISOString(); }, [n, h]);
const hoursAgo = h => mae.evaluate(h => new Date(Date.now() - h * 3600000).toISOString(), h);

// ---- A contagem para o morfológico ----
await post({ op: 'createConsultation', scheduledAt: await dayAt(3, 9), specialty: 'ultrassom', professional: null, location: null, kind: 'ultrassom', title: 'Ultrassom morfológico' });
// ---- Uma consulta de 2 horas atrás e um ultrassom de 3 horas atrás ----
await post({ op: 'createConsultation', scheduledAt: await hoursAgo(2), specialty: 'obstetra', professional: 'Dra. Lia', location: null });
await post({ op: 'createConsultation', scheduledAt: await hoursAgo(3), specialty: 'ultrassom', professional: null, location: null, kind: 'ultrassom', title: 'Obstétrico' });
await mae.reload();
const semana = mae.locator('section[aria-labelledby="nesta-semana"]');
const contagem = semana.getByRole('button', { name: /Faltam 3 dias para o morfológico/ });
await contagem.waitFor();
check(await contagem.getByText('vocês vão ver o rostinho').isVisible(), 'a contagem para o morfológico, com o rostinho, em "Nesta semana"');
await contagem.scrollIntoViewIfNeeded();
await semana.screenshot({ path: `${OUT}marcos-contagem.png` });

// ---- "Como foi a consulta?" no Início ----
const hoje = mae.locator('section[aria-labelledby="hoje-titulo"]');
const comoFoi = hoje.getByRole('button', { name: /Como foi a consulta\?|Como foi o ultrassom\?/ });
await comoFoi.first().waitFor();
check(true, 'depois da consulta, o "Para hoje" pergunta como foi');
await comoFoi.first().click();
const dlg = mae.getByRole('dialog').last();
await dlg.getByRole('button', { name: /Teve novidade/ }).waitFor();
await mae.screenshot({ path: `${OUT}marcos-como-foi.png` });
const qual = (await dlg.getByRole('heading').first().textContent()).includes('ultrassom') ? 'ultrassom' : 'consulta';
await dlg.getByRole('button', { name: /Teve novidade/ }).click();
const texto = mae.getByRole('dialog').last().getByLabel('O que aconteceu?');
await texto.waitFor();
check((await texto.inputValue()).startsWith(qual === 'ultrassom' ? 'No ultrassom de hoje' : 'Na consulta de hoje'), '"Teve novidade" abre o diário já com o começo da frase');
await mae.keyboard.press('Escape');
const data = await mae.evaluate(async () => (await fetch('/api/data')).json());
check(data.consultations.some(c => c.after_status === 'novidade'), 'a resposta fica guardada (para os dois)');

// ---- Pelo link do aviso: a outra ----
const outra = data.consultations.find(c => !c.after_status && new Date(c.scheduled_at) < new Date());
await mae.goto(`${BASE}/?comofoi=${outra.id}`);
const sheet = mae.getByRole('dialog', { name: /Como foi/ });
await sheet.waitFor();
check(true, 'o link do aviso abre direto o "Como foi?"');
await sheet.getByRole('button', { name: /Tudo bem/ }).click();
await mae.getByText('Que bom! Fica guardado na jornada de vocês').waitFor();
check((await hoje.getByRole('button', { name: /Como foi a consulta|Como foi o ultrassom/ }).count()) === 0, 'respondidas, as perguntas saem do "Para hoje"');

// ---- A barriguinha: guia da pose e o crescendo ----
const foto = n => mae.evaluate(n => { const c = document.createElement('canvas'); c.width = 300; c.height = 400; const g = c.getContext('2d'); const grd = g.createLinearGradient(0, 0, 300, 400); grd.addColorStop(0, '#f8d7e3'); grd.addColorStop(1, '#d9ccf5'); g.fillStyle = grd; g.fillRect(0, 0, 300, 400); g.fillStyle = '#e9a7bd'; g.beginPath(); g.ellipse(170, 230, 40 + n * 12, 70 + n * 6, 0, 0, Math.PI * 2); g.fill(); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; }, n);
for (let i = 0; i < 4; i++) {
  const { id } = await post({ op: 'createEntry', date: await mae.evaluate(n => { const d = new Date(); d.setDate(d.getDate() - n * 7); return d.toLocaleDateString('en-CA'); }, 3 - i), body: '', visibility: 'shared', remindOn: null, folder: 'barriga' });
  await mae.evaluate(async ([entryId, data]) => fetch('/api/fotos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'add', entryId, data }) }), [id, await foto(i)]);
}
await mae.reload();
await mae.getByRole('button', { name: /^Diário/ }).first().click();
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Livro/ }).click();
await mae.getByRole('button', { name: 'Abrir a pasta Barriguinha' }).click();
await mae.getByRole('button', { name: /Ver o crescendo/ }).click();
const filme = mae.getByRole('dialog', { name: 'O crescendo' });
await filme.waitFor();
check(await filme.getByText(/^Semana \d+$/).isVisible(), 'com 4 semanas de foto, o crescendo passa como um filminho');
await mae.waitForTimeout(600);
await mae.screenshot({ path: `${OUT}marcos-crescendo.png` });
await mae.keyboard.press('Escape');
await mae.getByRole('button', { name: /^Foto$/ }).click();
const guia = mae.getByRole('dialog').last().getByText(/^Mesma pose da semana \d+$/);
await guia.waitFor();
check(true, 'a foto nova da barriga vem com o guia da pose da semana anterior');
await mae.screenshot({ path: `${OUT}marcos-guia.png` });

await mae.emulateMedia({ colorScheme: 'dark' });
await mae.keyboard.press('Escape');
await mae.getByRole('button', { name: /^Início/ }).first().click();
await contagem.scrollIntoViewIfNeeded();
await mae.waitForTimeout(300);
await semana.screenshot({ path: `${OUT}marcos-contagem-escuro.png` });
await mae.getByRole('button', { name: /^Diário/ }).first().click();
await mae.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Livro/ }).click();
await mae.getByRole('button', { name: 'Abrir a pasta Barriguinha' }).click();
await mae.getByRole('button', { name: /Ver o crescendo/ }).click();
await filme.waitFor();
await mae.waitForTimeout(600);
await mae.screenshot({ path: `${OUT}marcos-crescendo-escuro.png` });
await mae.keyboard.press('Escape');
await mae.getByRole('button', { name: /^Foto$/ }).click();
await guia.waitFor();
await mae.screenshot({ path: `${OUT}marcos-guia-escuro.png` });

await b.close();
finish();
