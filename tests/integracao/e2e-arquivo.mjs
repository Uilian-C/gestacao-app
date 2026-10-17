// iPhone: o app se instala pelo Safari (sem App Store) e o aviso de iOS antigo só
// aparece quando é antigo mesmo. Resultados: arquivo por trimestre, por exame e busca.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
// O Safari fora da Tela de Início não tem PushManager.
const iphone = async ua => {
  const p = await phone(b, { userAgent: ua, isMobile: true, hasTouch: true });
  await p.context().addInitScript(() => {
    delete window.PushManager;
  });
  await quickAccount(p);
  await p.getByText('Lembretes no celular').waitFor();
  return p;
};

// ---- iPhone atualizado ----
let p = await iphone(IPHONE);
check(await p.getByText(/não se baixa pela App Store/).isVisible(), 'iPhone: explica que o app é instalado pelo Safari');
check(await p.getByText('Adicionar à Tela de Início').first().isVisible(), 'iPhone: passo a passo do Safari');
check((await p.getByText(/16\.4/).count()) === 0, 'iPhone atualizado: sem aviso de versão');
await p.screenshot({ path: `${OUT}iphone-inicio.png`, fullPage: true });
await p.locator('header button').last().click();
await p.getByText('Notificações no celular').scrollIntoViewIfNeeded();
check(await p.getByRole('button', { name: 'Instalar no iPhone' }).isVisible(), 'Nosso espaço: botão "Instalar no iPhone"');
await p.context().close();

// ---- iPhone antigo ----
p = await iphone(IPHONE.replace('18_5', '16_2'));
check(await p.getByText(/anterior à 16\.4/).first().isVisible(), 'iOS 16.2: avisa para atualizar');
await p.context().close();

// ---- Arquivo de resultados ----
p = await phone(b);
await quickAccount(p); // DUM 15/05/2026
const create = body => p.evaluate(body => fetch('/api/exames', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'create', visibility: 'shared', ...body }) }), body);
await create({ kind: 'exame', title: 'Hemograma', date: '2026-06-25', notes: 'Ferro um pouco baixo' });
await create({ kind: 'exame', title: 'hemograma', date: '2026-10-10' });
await create({ kind: 'exame', title: 'Glicemia de jejum', date: '2026-06-25' });
await create({ kind: 'ultrassom', title: 'Ultrassom morfológico do 1º trimestre', date: '2026-08-10', planItem: 'morfo-1' });
await create({ kind: 'ultrassom', title: 'Ultrassom morfológico do 2º trimestre', date: '2026-10-13', planItem: 'morfo-2' });
await p.reload();
await p.getByRole('button', { name: /^Cuidados/ }).first().click();
await p.getByRole('button', { name: /^Resultados/ }).click();
const second = p.locator('details', { hasText: '2º trimestre' }).first();
await second.waitFor();
check((await second.getAttribute('open')) !== null, 'trimestre mais recente aberto');
check((await p.locator('details', { hasText: '1º trimestre' }).first().getAttribute('open')) === null, 'trimestres anteriores fechados (arquivados)');
check((await second.getByRole('button', { name: /abrir resultado/ }).count()) === 2, '2º trimestre com os 2 resultados dele');
await p.screenshot({ path: `${OUT}arquivo-tempo.png`, fullPage: true });

await p.getByRole('button', { name: 'Por exame' }).click();
const hemo = p.locator('details', { hasText: 'Hemograma' }).first();
check((await hemo.textContent()).includes('2 resultados'), 'por exame: os 2 hemogramas juntos (evolução)');
await hemo.locator('summary').click();
check((await hemo.getByRole('button', { name: /abrir resultado/ }).count()) === 2, 'abre a série do hemograma');
await p.screenshot({ path: `${OUT}arquivo-exame.png`, fullPage: true });

await p.getByLabel('Buscar resultado').fill('ferro');
check((await p.getByRole('button', { name: /abrir resultado/ }).count()) === 1, 'busca acha pelas observações');
await p.getByLabel('Buscar resultado').fill('morfologico');
check((await p.getByRole('button', { name: /abrir resultado/ }).count()) === 2, 'busca sem acento acha os morfológicos');
await p.getByLabel('Buscar resultado').fill('');
await b.close();
finish();
