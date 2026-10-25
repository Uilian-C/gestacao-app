// Agenda → Tarefas: adicionar rápido (nome, quando e quem), a lista separada por
// quando (atrasadas, hoje, amanhã...), a prioridade na bolinha e o concluir.
// Várias tarefas no mesmo dia viram uma linha só em Próximos e no Início.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p, { name: 'Ana' });
const iso = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json(), body);
await post({ op: 'createTask', week: 22, title: 'Marcar a fisioterapia', assignee: 'mae', priority: 'Média', dueDate: await iso(-2), notes: null });
await post({ op: 'createTask', week: 22, title: 'Montar o berço', assignee: 'casal', priority: 'Média', dueDate: await iso(1), notes: null });
await post({ op: 'createTask', week: 22, title: 'Trocar o pneu do carro', assignee: 'pai', priority: 'Média', dueDate: await iso(0), notes: null });
await p.reload();
await p.getByRole('button', { name: /^Agenda/ }).first().click();
await p.getByRole('button', { name: /^Tarefas/ }).first().click();

const grupo = name => p.getByRole('region', { name });
await grupo('Atrasadas').waitFor();
check(await grupo('Atrasadas').getByText('Marcar a fisioterapia').isVisible() && (await grupo('Amanhã').getByText('Montar o berço').isVisible()), 'a lista separa por quando: atrasadas e amanhã');
check((await p.getByText('0 de 3 feitas').isVisible()) && (await p.getByText('1 passou do prazo').isVisible()), 'o andamento numa linha, com o que passou do prazo');

// Adicionar rápido: hoje e importante
await p.getByRole('button', { name: 'Adicionar tarefa' }).click();
const form = p.getByRole('form', { name: 'Nova tarefa' });
await form.getByLabel('Tarefa').fill('Lavar as roupinhas');
await form.getByRole('group', { name: 'Prazo' }).getByRole('button', { name: 'Hoje' }).click();
await form.getByRole('button', { name: 'Importante' }).click();
await form.getByRole('button', { name: 'Adicionar' }).click();
await grupo('Hoje').getByText('Lavar as roupinhas').waitFor({ timeout: 1500 });
check((await form.count()) === 0 && (await p.getByRole('button', { name: 'Adicionar tarefa' }).isVisible()), 'adiciona na hora e o mini-formulário recolhe sozinho');
let t;
for (let i = 0; i < 20 && !t; i++) {
  t = (await p.evaluate(async () => (await (await fetch('/api/data')).json()).tasks)).find(t => t.task_title === 'Lavar as roupinhas');
  if (!t) await p.waitForTimeout(250);
}
check(t.priority === 'Alta' && t.due_date.slice(0, 10) === (await iso(0)), 'a tarefa nova fica para hoje, como importante');
await p.screenshot({ path: `${OUT}tarefas.png`, fullPage: true });

// Concluir: a tarefa sai da lista e vai para "Concluídas"
await p.getByRole('button', { name: 'Concluir "Montar o berço"' }).click();
await grupo('Amanhã').waitFor({ state: 'detached', timeout: 10000 });
await p.getByRole('button', { name: /^Concluídas \(1\)/ }).click();
check(await p.getByRole('list', { name: 'Tarefas concluídas' }).getByText('Montar o berço').isVisible(), 'concluída sai da lista e fica em "Concluídas"');

// Filtro por pessoa: as dela e as dos dois (sem a opção "Os dois", que repetia "Todos")
check((await p.getByRole('group', { name: 'Responsável' }).getByRole('button').count()) === 3, 'filtro com Todos e uma opção para cada um');
await p.getByRole('button', { name: 'Ana', exact: true }).first().click();
check((await grupo('Hoje').getByText('Trocar o pneu do carro').count()) === 0 && (await grupo('Hoje').getByText('Lavar as roupinhas').isVisible()) && (await grupo('Atrasadas').getByText('Marcar a fisioterapia').isVisible()), 'filtrar por pessoa mostra as dela e as dos dois');

// Próximos: duas tarefas no mesmo dia viram uma linha que abre no lugar
await p.getByRole('button', { name: /^Próximos/ }).first().click();
const pacote = p.getByRole('button', { name: /^Tarefas · 1 atrasada 3 tarefas/ });
await pacote.waitFor();
check((await pacote.getAttribute('aria-expanded')) === 'false' && (await p.getByRole('button', { name: /Trocar o pneu do carro: ver detalhes/ }).count()) === 0, 'Próximos: as tarefas do dia (e a atrasada) juntas numa linha');
await pacote.click();
check(await p.getByRole('button', { name: /Trocar o pneu do carro: ver detalhes/ }).isVisible(), 'a linha abre e mostra cada tarefa');
await p.screenshot({ path: `${OUT}proximos-tarefas.png`, fullPage: true });

// Início: "Para hoje" junta as tarefas do dia numa linha
await p.getByRole('button', { name: /^Início/ }).first().click();
const hoje = p.locator('section[aria-labelledby="hoje-titulo"]');
await hoje.waitFor();
check(await hoje.getByRole('button', { name: /2 tarefas para hoje/ }).isVisible(), 'Início: as tarefas de hoje numa linha só');

await b.close();
finish();
