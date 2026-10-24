// Nada pode passar da largura da tela no celular (o navegador diminuiria o zoom de tudo),
// nem com os dados da gestação completos, que deixa o resumo do cabeçalho longo.
import { check, errs, finish, launch, OUT, quickAccount } from './lib.mjs';

const b = await launch();
for (const width of [300, 360, 412]) {
  const ctx = await b.newContext({ viewport: { width, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await quickAccount(p, { name: 'Anabela' });
  await p.evaluate(() =>
    fetch('/api/data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ op: 'saveFicha', motherName: 'Anabela Cristina de Souza', motherBirthDate: '1992-03-10', bloodType: 'O+', gestations: 2, births: 1, abortions: 0, cesareans: 0, preWeightKg: 60, heightCm: 165, allergies: null, medications: null, conditions: null }),
    }),
  );
  await p.reload();
  // Os dados da gestação moram em Cuidados (o Início não repete as semanas e a DPP).
  await p.getByRole('button', { name: /^Cuidados/ }).first().click();
  await p.locator('button[aria-expanded]', { hasText: 'Dados' }).first().waitFor();

  const overlap = await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button[aria-expanded]')].find(x => x.textContent.includes('Dados'));
    const [summary, label] = [btn.children[1], btn.children[2]].map(x => x.getBoundingClientRect());
    return summary.right > label.left + 1;
  });
  check(!overlap, `${width}px: resumo dos dados não passa por cima do "Dados da gestação"`);

  for (const tab of ['Início', 'Diário', 'Agenda', 'Cuidados', 'Parto']) {
    await p.getByRole('button', { name: new RegExp(`^${tab}`) }).first().click();
    await p.waitForTimeout(500);
    const [sw, cw] = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    check(sw <= cw, `${width}px, ${tab}: nada passa da largura (${sw} ≤ ${cw})`);
  }
  // Cuidados → Saúde (quatro partes) e as pastas do diário também cabem.
  await p.getByRole('button', { name: /^Cuidados/ }).first().click();
  await p.getByRole('button', { name: 'Saúde', exact: true }).click();
  await p.waitForTimeout(400);
  let [sw, cw] = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  check(sw <= cw, `${width}px, Cuidados → Saúde: nada passa da largura (${sw} ≤ ${cw})`);
  await p.getByRole('button', { name: /^Diário/ }).first().click();
  await p.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Fichário/ }).click();
  await p.getByRole('navigation', { name: 'Pastas do diário' }).getByRole('button', { name: /^Barriguinha/ }).click();
  await p.waitForTimeout(400);
  [sw, cw] = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  check(sw <= cw, `${width}px, pasta Barriguinha: nada passa da largura (${sw} ≤ ${cw})`);
  if (width === 360) {
    await p.getByRole('button', { name: /^Início/ }).first().click();
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}largura-360.png` });
  }
  await ctx.close();
}
await b.close();
finish();
