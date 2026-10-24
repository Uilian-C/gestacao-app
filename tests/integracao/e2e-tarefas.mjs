// Agenda → Tarefas: adicionar rápido (nome, quando e quem), a lista separada por
// quando (atrasadas, hoje, amanhã...), a prioridade na bolinha e o concluir.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p, { name: 'Ana' });
const iso = n => p.evaluate(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); }, n);
const post = body => p.evaluate(async body => (await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json(), body);
await post({ op: 'createTask', week: 22, title: 'Marcar a fisioterapia', assignee: 'mae', priority: 'Média', dueDate: await iso(-2), notes: null });
await post({ op: 'createTask', week: 22, title: 'Montar o berço', assignee: 'casal', priority: 'Média', dueDate: await iso(1), notes: null });
await p.reload();
await p.getByRole('button', { name: /^Agenda/ }).first().click();
await p.getByRole('button', { name: /^Tarefas/ }).first().click();

const grupo = name => p.getByRole('region', { name });
await grupo('Atrasadas').waitFor();
check(await grupo('Atrasadas').getByText('Marcar a fisioterapia').isVisible() && (await grupo('Amanhã').getByText('Montar o berço').isVisible()), 'a lista separa por quando: atrasadas e amanhã');
check((await p.getByText('0 de 2 feitas').isVisible()) && (await p.getByText('1 passou do prazo').isVisible()), 'o andamento numa linha, com o que passou do prazo');

// Adicionar rápido: hoje e importante
await p.getByRole('button', { name: 'Adicionar tarefa' }).click();
const form = p.getByRole('form', { name: 'Nova tarefa' });
await form.getByLabel('Tarefa').fill('Lavar as roupinhas');
await form.getByRole('group', { name: 'Prazo' }).getByRole('button', { name: 'Hoje' }).click();
await form.getByRole('button', { name: 'Importante' }).click();
await form.getByRole('button', { name: 'Adicionar' }).click();
await grupo('Hoje').getByText('Lavar as roupinhas').waitFor({ timeout: 10000 });
check((await form.getByLabel('Tarefa').inputValue()) === '' && (await form.isVisible()), 'adiciona e deixa o campo pronto para a próxima');
const t = (await p.evaluate(async () => (await (await fetch('/api/data')).json()).tasks)).find(t => t.task_title === 'Lavar as roupinhas');
check(t.priority === 'Alta' && t.due_date.slice(0, 10) === (await iso(0)), 'a tarefa nova fica para hoje, como importante');
await p.screenshot({ path: `${OUT}tarefas.png`, fullPage: true });

// Concluir: a tarefa sai da lista e vai para "Concluídas"
await p.getByRole('button', { name: 'Concluir "Montar o berço"' }).click();
await grupo('Amanhã').waitFor({ state: 'detached', timeout: 10000 });
await p.getByRole('button', { name: /^Concluídas \(1\)/ }).click();
check(await p.getByRole('list', { name: 'Tarefas concluídas' }).getByText('Montar o berço').isVisible(), 'concluída sai da lista e fica em "Concluídas"');

// Filtro por pessoa
await p.getByRole('button', { name: 'Ana', exact: true }).first().click();
check((await grupo('Hoje').count()) === 0 && (await grupo('Atrasadas').getByText('Marcar a fisioterapia').isVisible()), 'filtrar por pessoa mostra só as tarefas dela');

await b.close();
finish();
