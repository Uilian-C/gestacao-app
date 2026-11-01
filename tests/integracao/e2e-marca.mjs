// Marca Tumtum: nome na tela de login, no título da aba e no app instalado; cabeçalho no modo escuro.
import { check, finish, launch, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await p.goto(process.env.APP_URL ?? 'http://127.0.0.1:5173');
await p.getByRole('heading', { name: 'Tumtum' }).waitFor();
check(await p.getByText('Desde o primeiro tumtum.').isVisible(), 'login mostra o nome e a frase da marca');
check((await p.title()) === 'Tumtum', 'título da aba é Tumtum');
const manifest = await p.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
check(manifest.name === 'Tumtum' && manifest.short_name === 'Tumtum', 'nome do app instalado é Tumtum');
check(await p.evaluate(async () => (await fetch('/icons/icon-512.png')).ok), 'ícone do app disponível');
await p.screenshot({ path: `${OUT}marca-login.png` });
await quickAccount(p);
await p.getByRole('heading', { name: /^Boa (madrugada|manhã|tarde|noite), / }).waitFor();
check(true, 'o cabeçalho do Início é a saudação, com o coração do Tumtum ao lado');
await p.emulateMedia({ colorScheme: 'dark' });
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}marca-inicio-escuro.png` });
await b.close();
finish();
