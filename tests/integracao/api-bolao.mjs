// O bolão aberto e o envelope do chá (migração 036): quem não tem conta vota
// pelo link (um palpite por aparelho), vê o placar e, depois, se acertou; o
// envelope fecha uma vez só e ninguém do espaço vê o resultado até abrir.
import { check, client, finish } from './lib.mjs';

const stamp = Date.now();
const ana = client(), caio = client();
async function account(c, name) {
  await c.call('/api/auth/sign-up/email', { name: `${name} Souza`, email: `${name.toLowerCase()}${stamp}@ex.com`, password: 'senha-forte-123' });
  await c.call('/api/family', { op: 'consent', version: '2026-10-16' });
}
await account(ana, 'Ana');
await ana.call('/api/family', { op: 'create', role: 'mae' });
await ana.call('/api/data', { op: 'saveDum', date: '2026-07-01' });
await account(caio, 'Caio');
await caio.call('/api/family', { op: 'join', code: (await ana.call('/api/family', { op: 'invite' })).data.code, role: 'pai' });
await ana.call('/api/data', { op: 'guessSex', guess: 'menina' });

// ---- O link do bolão ----
const r1 = await ana.call('/api/data', { op: 'bolaoLink' });
const token = r1.data.data.espera.bolaoToken;
check(typeof token === 'string' && token.length >= 12, 'o casal cria o link do bolão');
check((await caio.call('/api/data', { op: 'bolaoLink' })).data.data.espera.bolaoToken === token, 'o link é um só, para os dois');

const bia = client(), leo = client(), estranho = client();
let v = (await bia.call(`/api/palpite?t=${token}`)).data;
check(v.couple === 'Ana e Caio' && v.tally.menina === 1 && v.revealed === null, 'quem abre o link vê o casal (só o primeiro nome) e o placar');
check(!JSON.stringify(v).includes('Souza') && !JSON.stringify(v).includes('@'), 'a página não mostra sobrenome nem e-mail');
check((await estranho.call('/api/palpite?t=naoexiste123')).status === 404, 'link errado não abre nada');

check((await bia.call('/api/palpite', { op: 'vote', t: token, name: ' ', guess: 'menina' })).status === 400, 'sem nome, o voto não entra');
v = (await bia.call('/api/palpite', { op: 'vote', t: token, name: 'Tia Bia', guess: 'menina' })).data;
check(v.mine?.guess === 'menina' && v.tally.menina === 2, 'Bia vota sem conta: menina');
v = (await bia.call('/api/palpite', { op: 'vote', t: token, name: 'Tia Bia', guess: 'menino' })).data;
check(v.tally.menina === 1 && v.tally.menino === 1, 'no mesmo aparelho, votar de novo troca o palpite (não duplica)');
await leo.call('/api/palpite', { op: 'vote', t: token, name: 'Léo', guess: 'menina' });
// Sair do bolão: o palpite some do placar (e dá para voltar depois).
const sai = client();
await sai.call('/api/palpite', { op: 'vote', t: token, name: 'Visita', guess: 'menino' });
v = (await sai.call('/api/palpite', { op: 'unvote', t: token })).data;
check(v.mine === null && !v.teams.menino.includes('Visita'), 'quem quiser sai do bolão, e o nome sai do placar');
check((await estranho.call('/api/palpite', { op: 'unvote', t: token })).status === 200, 'sair sem ter votado não quebra nada');
let espera = (await caio.call('/api/data')).data.espera;
check(espera.publicVotes.length === 2 && espera.publicVotes.some(p => p.name === 'Léo' && p.guess === 'menina'), 'o casal vê os palpites de quem votou pelo link');

// ---- O envelope do chá ----
const env = (await ana.call('/api/data', { op: 'envelopeLink' })).data.data.espera.envelopeToken;
const madrinha = client();
check((await madrinha.call(`/api/palpite?envelope=${env}`)).data.couple === 'Ana e Caio', 'quem guarda o segredo abre o envelope e vê para quem é');
check((await madrinha.call('/api/palpite', { op: 'seal', envelope: env, sex: 'menina' })).status === 200, 'e fecha: é menina');
check((await madrinha.call('/api/palpite', { op: 'seal', envelope: env, sex: 'menino' })).status === 404, 'o envelope fecha uma vez só');
espera = (await ana.call('/api/data')).data.espera;
check(espera.secret && espera.sealed && espera.sex === null, 'nem a Ana vê o resultado: está no envelope');
check((await caio.call('/api/data')).data.espera.sex === null, 'nem o Caio');
check((await bia.call(`/api/palpite?t=${token}`)).data.revealed === null, 'e o bolão continua aberto, sem revelar');
check((await caio.call('/api/data', { op: 'openSex' })).status === 200, 'no chá, o Caio abre o envelope');
espera = (await ana.call('/api/data')).data.espera;
check(espera.sex === 'menina' && !espera.secret, 'agora os dois sabem: é menina');

// ---- Depois da revelação ----
v = (await leo.call(`/api/palpite?t=${token}`)).data;
check(v.revealed === 'menina' && v.mine.guess === 'menina', 'o Léo abre o link de novo e vê que acertou');
check((await bia.call('/api/palpite', { op: 'vote', t: token, name: 'Tia Bia', guess: 'menina' })).status === 409, 'com o resultado, o bolão fecha');

// ---- Modo cuidado: os links param ----
check((await ana.call('/api/data', { op: 'setCareMode', on: true })).status === 200, 'o casal liga o modo cuidado');
check((await leo.call(`/api/palpite?t=${token}`)).status === 404, 'no modo cuidado, o link do bolão para de funcionar');

finish();
