// Exames no celular: guardar o ultrassom da janela atual com foto e PDF, ver a foto
// em tela cheia, conferir a jornada marcada e apagar com "desfazer".
import { check, finish, launch, OUT, phone, quickAccount, openCare } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p); // DUM 15/05/2026: 22 semanas, janela do morfológico do 2º trimestre
const api = path => p.evaluate(async path => (await fetch(path)).json(), path);

// Uma "foto de câmera" de verdade: 3000 x 4000, desenhada no navegador. O app reduz para 1500 x 2000 em JPG.
const photo = Buffer.from(
  await p.evaluate(() => {
    const c = Object.assign(document.createElement('canvas'), { width: 3000, height: 4000 });
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 3000, 4000);
    grad.addColorStop(0, '#222');
    grad.addColorStop(1, '#ddd');
    g.fillStyle = grad;
    g.fillRect(0, 0, 3000, 4000);
    g.fillStyle = '#fff';
    g.font = 'bold 220px sans-serif';
    for (let y = 400; y < 4000; y += 500) g.fillText('LAUDO 22 SEMANAS', 200, y);
    return c.toDataURL('image/png').split(',')[1];
  }),
  'base64',
);
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

await openCare(p, 'Resultados');
await p.getByText('Nenhum exame guardado ainda').waitFor({ timeout: 10000 }).catch(() => undefined);
check(await p.getByText('Nenhum exame guardado ainda').isVisible(), 'sem exames: convite para guardar o primeiro');
const chip = p.getByRole('button', { name: 'Morfológico 2º tri' });
check(await chip.isVisible(), 'morfológico do 2º tri aparece "na janela agora"');
await chip.click();
check((await p.getByLabel('Nome').inputValue()) === 'Ultrassom morfológico do 2º trimestre', 'nome vem da jornada');

await p.getByLabel('Escolher fotos ou PDF').setInputFiles([
  { name: 'ultrassom.png', mimeType: 'image/png', buffer: photo },
  { name: 'laudo.pdf', mimeType: 'application/pdf', buffer: pdf },
]);
await p.getByRole('button', { name: 'Guardar com 2 arquivos' }).waitFor({ timeout: 10000 });
check(await p.getByAltText('ultrassom.png').isVisible(), 'prévia da foto antes de enviar');
await p.getByLabel('Observações').fill('Bebê bem, tudo normal.');
await p.screenshot({ path: `${OUT}exames-form.png`, fullPage: true });
await p.getByRole('button', { name: 'Guardar com 2 arquivos' }).click();
const examRow = p.getByRole('button', { name: /^Ultrassom morfológico do 2º trimestre: abrir resultado/ });
await examRow.waitFor({ timeout: 15000 });
check((await examRow.textContent()).includes('2 fotos') === false && (await examRow.textContent()).includes('1 foto') && (await examRow.textContent()).includes('jornada'), 'resultado aparece no arquivo, numa linha enxuta (1 foto, 1 PDF, jornada)');
check(await p.getByText('2º trimestre', { exact: true }).isVisible(), 'arquivo organizado por trimestre');
await examRow.click();
const sheet = p.getByRole('dialog', { name: 'Ultrassom morfológico do 2º trimestre' });
await sheet.getByText('Jornada: Morfológico 2º tri').waitFor();
check(true, 'tocar na linha abre o resultado completo, ligado à jornada');

const thumb = p.getByRole('button', { name: /Abrir foto de Ultrassom morfológico/ });
await thumb.locator('img').evaluate(img => img.complete || new Promise(r => (img.onload = r)));
check(await thumb.locator('img').evaluate(img => img.naturalWidth > 0), 'miniatura carrega a foto pelo servidor');
check(await p.getByRole('link', { name: /Abrir PDF/ }).isVisible(), 'PDF aparece como arquivo');
check(await sheet.getByText('22 semanas').isVisible(), 'mostra a semana da gestação na data do exame');
await p.screenshot({ path: `${OUT}exames-lista.png`, fullPage: true });

const data = await api('/api/data');
const files = data.exams[0].files;
const jpg = files.find(f => f.content_type === 'image/jpeg');
check(jpg && jpg.size < 1.5 * 1024 * 1024 && jpg.size < photo.length, `foto foi reduzida antes de enviar (${photo.length} → ${jpg?.size} bytes)`);
check(data.checks.some(c => c.list === 'prenatal' && c.item_id === 'morfo-2'), 'item da jornada marcado como feito');

await thumb.click();
const viewer = p.getByRole('dialog', { name: /^Foto de/ });
await viewer.waitFor();
await viewer.locator('img').evaluate(img => img.complete || new Promise(r => (img.onload = r)));
const size = await viewer.locator('img').evaluate(img => [img.naturalWidth, img.naturalHeight]);
check(size[0] === 1500 && size[1] === 2000, `foto em tela cheia, reduzida para ${size.join(' x ')} (legível)`);
await p.screenshot({ path: `${OUT}exames-foto.png` });
await p.keyboard.press('Escape');
check(!(await viewer.isVisible()) && (await sheet.isVisible()), 'Esc fecha a foto e volta para o resultado');

// Juntar mais um arquivo a um exame que já existe.
await p.getByLabel('Escolher fotos ou PDF').last().setInputFiles({ name: 'pagina2.png', mimeType: 'image/png', buffer: photo });
await p.waitForFunction(() => document.querySelectorAll('[aria-label^="Abrir foto de"]').length === 2, null, { timeout: 15000 });
check(true, 'arquivo novo entra no mesmo exame');

await sheet.getByRole('button', { name: /Excluir exame/ }).click();
check(await p.getByText(/Excluído: exame/).isVisible(), 'excluir mostra "desfazer"');
await p.waitForTimeout(6500);
check((await api('/api/data')).exams.length === 0, 'exame excluído depois do prazo de desfazer');

await b.close();
finish();
