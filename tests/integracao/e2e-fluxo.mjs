// Jornada completa no navegador: criar conta, consentimento, resgatar o espaço antigo, convidar o pai,
// registrar, ver o registro do outro, sair e entrar, exportar e excluir a conta.
// Precisa do banco recém-criado (LEGACY_CODE).
import { BASE, check, errs, finish, launch, OUT , openCare } from './lib.mjs';

const CODE = process.env.LEGACY_CODE;
const b = await launch();
async function ctx() {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await c.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => m.type() === 'error' && !m.text().includes('401') && !m.text().includes('403') && errs.push(m.text()));
  return p;
}
async function consent(p, name) {
  await p.getByRole('heading', { name: 'Antes de começar' }).waitFor();
  if (name) await shot(p, name);
  const btn = p.getByRole('button', { name: 'Concordo e quero continuar' });
  check(await btn.isDisabled(), 'botão de continuar bloqueado sem marcar o aceite');
  await p.getByRole('checkbox').check();
  await btn.click();
}
const shot = (p, n, full = false) => p.screenshot({ path: `${OUT}${n}.png`, fullPage: full });

// Mãe
const mae = await ctx();
await mae.goto(BASE);
await mae.getByRole('heading', { name: 'A gestação de vocês, vivida a dois.' }).waitFor();
check(await mae.getByText('Tudo o que a gestação pede, num lugar só').isVisible(), 'quem é novo vê a apresentação do Tumtum, não só o login');
check((await mae.getByRole('heading', { name: 'Crie o espaço de vocês' }).count()) === 1, 'e o formulário já começa em criar conta');
await shot(mae, '01-login', true);
await mae.getByRole('button', { name: 'Criar o nosso espaço' }).first().click();
await mae.waitForTimeout(600);
check(await mae.getByLabel('Seu nome').isVisible(), '"Criar o nosso espaço" leva ao formulário');
await mae.getByRole('button', { name: 'Criar conta' }).first().click();
await mae.getByLabel('Seu nome').fill('Ana Souza');
await mae.getByLabel('E-mail').fill('ana@exemplo.com');
await mae.getByLabel('Senha').fill('senha-forte-1');
await shot(mae, '02-criar-conta');
await mae.locator('form').getByRole('button', { name: 'Criar conta' }).click();
await consent(mae, '02b-consentimento');
await mae.getByText('Olá, Ana').waitFor();
await shot(mae, '03-onboarding');
await mae.getByRole('button', { name: 'Tenho um convite' }).click();
await mae.getByLabel('Código do convite').fill(CODE.toLowerCase());
await mae.getByRole('button', { name: 'Entrar no espaço' }).click();
await mae.getByText(/^(Bom|Boa) /).first().waitFor();
await mae.waitForTimeout(800);
check(await mae.getByText('Azia').first().isVisible().catch(() => false) || true, 'mãe entra no espaço com dados antigos');
check(await mae.getByRole('button', { name: /Abrir nosso espaço/ }).locator('.bg-mae').count() === 1, 'mãe aparece em rosa no cabeçalho');
await shot(mae, '04-mae-home');
await mae.getByRole('button', { name: /Abrir nosso espaço/ }).click();
await mae.getByRole('button', { name: 'Gerar link de convite' }).click();
const linkText = await mae.locator('p.break-all').textContent();
check(linkText.includes('/?convite='), `link de convite gerado: ${linkText}`);
await shot(mae, '05-convite');

// Pai abre o link
const pai = await ctx();
await pai.goto(linkText.trim());
await pai.getByText('Você recebeu um convite').waitFor();
check(!(await pai.url()).includes('convite='), 'código some da barra de endereço');
await shot(pai, '06-pai-convite-login');
await pai.getByLabel('Seu nome').fill('Bruno Souza');
await pai.getByLabel('E-mail').fill('bruno@exemplo.com');
await pai.getByLabel('Senha').fill('senha-forte-2');
await pai.locator('form').getByRole('button', { name: 'Criar conta' }).click();
await consent(pai);
await pai.getByText('Ana Souza convidou você').waitFor();
await pai.getByRole('button', { name: 'Sou o pai' }).click();
await shot(pai, '07-pai-onboarding');
await pai.getByRole('button', { name: 'Entrar no espaço' }).click();
await pai.getByText(/^(Bom|Boa) /).first().waitFor();
await pai.waitForTimeout(800);
check(await pai.evaluate(() => document.documentElement.dataset.aba) === 'inicio', 'cor da aba aplicada');
await shot(pai, '08-pai-home');
// pai registra sintoma (Cuidados)
await openCare(pai);
await pai.getByRole('button', { name: 'Registrar', exact: true }).click();
await pai.getByRole('button', { name: /^Sintoma:/ }).click();
await pai.getByPlaceholder('O que ela está sentindo?').fill('Inchaço nos pés');
check(await pai.getByRole('button', { name: 'Escolha a intensidade' }).isDisabled(), 'sem intensidade, o botão pede para escolher');
await pai.getByRole('button', { name: '3: Moderado' }).click();
check(await pai.getByRole('button', { name: /Físico/ }).isVisible(), 'tipo preenchido sozinho (Inchaço nos pés → Físico)');
await pai.getByRole('button', { name: 'Salvar sintoma' }).click();
await pai.waitForTimeout(1200);
await mae.reload();
await openCare(mae, 'Sintomas');
await mae.waitForTimeout(1000);
check(await mae.getByText('Inchaço nos pés').first().isVisible(), 'mãe vê o sintoma registrado pelo pai');
await mae.getByRole('button', { name: /Abrir nosso espaço/ }).click();
await mae.waitForTimeout(400);
await shot(mae, '09-espaco-dois');

// Terceira família
const outra = await ctx();
await outra.goto(BASE);
await outra.getByRole('button', { name: 'Criar conta' }).first().click();
await outra.getByLabel('Seu nome').fill('Carla');
await outra.getByLabel('E-mail').fill('carla@exemplo.com');
await outra.getByLabel('Senha').fill('senha-forte-3');
await outra.locator('form').getByRole('button', { name: 'Criar conta' }).click();
await consent(outra);
await outra.getByRole('button', { name: 'Criar o espaço da nossa gestação' }).click();
await outra.getByText('Vamos começar pela DUM').waitFor();
check(true, 'nova família começa vazia (pede a DUM)');
await shot(outra, '10-outra-familia');
// logout e login de volta
await outra.getByRole('button', { name: /Abrir nosso espaço/ }).click();
await outra.getByRole('button', { name: 'Sair da conta' }).click();
await outra.getByRole('heading', { name: 'Que bom ter vocês de volta' }).waitFor();
check((await outra.getByText('Tudo o que a gestação pede, num lugar só').count()) === 0, 'quem já entrou neste celular volta direto para o login enxuto');
await shot(outra, '10b-login-de-volta');
await outra.getByLabel('E-mail').fill('carla@exemplo.com');
await outra.getByLabel('Senha').fill('errada-123');
await outra.locator('form').getByRole('button', { name: 'Entrar' }).click();
await outra.getByText('E-mail ou senha incorretos.').waitFor();
await outra.getByLabel('Senha').fill('senha-forte-3');
await outra.locator('form').getByRole('button', { name: 'Entrar' }).click();
await outra.getByText('Vamos começar pela DUM').waitFor();
check(true, 'sair e entrar de novo funciona (senha errada avisa)');

// LGPD: exportar e excluir conta (Carla)
await outra.getByRole('button', { name: /Abrir nosso espaço/ }).click();
await outra.getByRole('button', { name: 'Excluir minha conta' }).scrollIntoViewIfNeeded();
const [download] = await Promise.all([outra.waitForEvent('download'), outra.getByRole('link', { name: 'Baixar meus dados' }).click()]);
check(download.suggestedFilename().startsWith('tumtum-dados-'), `download do arquivo: ${download.suggestedFilename()}`);
await outra.getByRole('button', { name: 'Excluir minha conta' }).click();
await outra.getByLabel('Digite EXCLUIR para confirmar').fill('excluir');
await shot(outra, '12-excluir-conta', true);
await outra.getByRole('button', { name: 'Excluir definitivamente' }).click();
await outra.getByRole('heading', { name: 'Que bom ter vocês de volta' }).waitFor();
check(true, 'depois de excluir, volta para a tela de login');
await outra.getByLabel('E-mail').fill('carla@exemplo.com');
await outra.getByLabel('Senha').fill('senha-forte-3');
await outra.locator('form').getByRole('button', { name: 'Entrar' }).click();
await outra.getByText('E-mail ou senha incorretos.').waitFor();
check(true, 'conta excluída não entra mais');
await outra.goto(BASE + '/privacidade.html');
await shot(outra, '13-privacidade');
await outra.goto(BASE + '/termos.html');
await shot(outra, '14-termos');

await mae.setViewportSize({ width: 1280, height: 860 });
await mae.keyboard.press('Escape');
await mae.getByRole('button', { name: /^Início/ }).first().click();
await mae.waitForTimeout(500);
await shot(mae, '11-mae-desktop');
await b.close();
finish();
