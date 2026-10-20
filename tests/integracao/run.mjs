// Testes de integração: sobem o banco (recriado do zero), a API, o app e um serviço
// de push falso, e rodam os testes de API e de navegador em sequência.
//
//   DATABASE_URL=postgres://postgres:dev@127.0.0.1:5432/tumtum_teste npm run test:integracao
//
// O banco é APAGADO a cada rodada: só aceita banco local.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resetDatabase } from './db.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const HERE = new URL('./', import.meta.url).pathname;
const SAIDA = `${HERE}.saida/`;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Defina DATABASE_URL apontando para um Postgres local de teste.');
  process.exit(1);
}

// Certificado próprio para o push falso (https é obrigatório no Web Push).
mkdirSync(SAIDA, { recursive: true });
const key = `${SAIDA}push-key.pem`;
const cert = `${SAIDA}push-cert.pem`;
if (!existsSync(cert)) {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' });
}

// Fotos e PDFs dos exames vão para uma pasta local, limpa a cada rodada.
const FILES_DIR = `${SAIDA}arquivos`;
rmSync(FILES_DIR, { recursive: true, force: true });

const serverEnv = {
  ...process.env,
  DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'segredo-so-para-testes-locais-0123456789',
  BETTER_AUTH_URL: 'http://127.0.0.1:5173',
  CRON_SECRET: 'segredo-de-teste',
  PUSH_ALLOW_ANY_HOST: '1',
  AUTH_RATE_LIMIT: 'off',
  NODE_EXTRA_CA_CERTS: cert,
  FILES_DIR,
  // Os avisos do dia saem a partir das 8h; nos testes, a qualquer hora.
  LEMBRETES_QUALQUER_HORA: '1',
  // Contas de teste que administram o conteúdo (/api/conteudo).
  ADMIN_EMAILS: 'admin@exemplo.com',
};
// O servidor local não lê o .env.local aqui: os testes nunca usam as credenciais de verdade.
for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'RESEND_API_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'BLOB_READ_WRITE_TOKEN', 'BLOB_STORE_ID']) delete serverEnv[k];

const children = [];
function start(name, cmd, args) {
  const child = spawn(cmd, args, { cwd: ROOT, env: serverEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', d => (log += d));
  child.stderr.on('data', d => (log += d));
  child.on('exit', code => code && !stopping && console.error(`\n[${name}] parou (código ${code}):\n${log}`));
  children.push(child);
  return () => log;
}
let stopping = false;
const stopAll = () => {
  stopping = true;
  for (const c of children) c.kill('SIGTERM');
};
process.on('SIGINT', () => (stopAll(), process.exit(130)));

async function waitFor(url, label, insecure = false) {
  for (let i = 0; i < 120; i++) {
    try {
      if (insecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      await fetch(url);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    } finally {
      if (insecure) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
  }
  throw new Error(`${label} não subiu (${url})`);
}

const tests = [
  // [arquivo, precisa de banco novo?]
  ['api-isolamento.mjs', true],
  ['api-notificacoes.mjs', false],
  ['api-exames.mjs', false],
  ['api-edicao.mjs', false],
  ['api-social.mjs', false],
  ['api-fichario.mjs', false],
  ['api-agendamentos.mjs', false],
  ['api-checkin.mjs', false],
  ['api-perfil.mjs', false],
  ['api-marcar.mjs', false],
  ['e2e-fluxo.mjs', true],
  ['e2e-momentos.mjs', false],
  ['e2e-registro-rapido.mjs', false],
  ['e2e-notificacoes.mjs', false],
  ['e2e-navegadores.mjs', false],
  ['e2e-marca.mjs', false],
  ['e2e-exames.mjs', false],
  ['e2e-detalhes.mjs', false],
  ['e2e-largura.mjs', false],
  ['e2e-social.mjs', false],
  ['e2e-fichario.mjs', false],
  ['e2e-agendamentos.mjs', false],
  ['e2e-arquivo.mjs', false],
  ['e2e-inicio.mjs', false],
  ['e2e-formularios.mjs', false],
  ['e2e-jornada.mjs', false],
  ['e2e-conteudo.mjs', false],
  ['e2e-barriga.mjs', false],
];
const only = process.argv.slice(2);

let failed = [];
try {
  let legacy = await resetDatabase(DATABASE_URL);
  start('push falso', process.execPath, [`${HERE}fake-push.mjs`, key, cert, '4443']);
  start('api', process.execPath, ['--import', 'tsx', 'scripts/dev-api.ts']);
  start('app', process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort']);
  await waitFor('https://localhost:4443/inbox', 'push falso', true);
  await waitFor('http://127.0.0.1:3001/api/config', 'API');
  await waitFor('http://127.0.0.1:5173/', 'app');

  let fresh = true;
  for (const [file, needsFresh] of tests) {
    if (only.length && !only.some(o => file.includes(o))) continue;
    if (needsFresh && !fresh) legacy = await resetDatabase(DATABASE_URL);
    fresh = false;
    console.log(`\n▶ ${file}`);
    const code = await new Promise(resolve => {
      const t = spawn(process.execPath, [`${HERE}${file}`], { cwd: ROOT, env: { ...process.env, LEGACY_CODE: legacy, FILES_DIR }, stdio: 'inherit' });
      t.on('exit', resolve);
    });
    if (code !== 0) failed.push(file);
  }
} catch (err) {
  console.error(err);
  failed.push('preparação');
} finally {
  stopAll();
}
console.log(failed.length ? `\nFalharam: ${failed.join(', ')}` : '\nTodos os testes de integração passaram.');
process.exit(failed.length ? 1 : 0);
