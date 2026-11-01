// O ultrassom em vídeo: postar no diário (com a capa e o "play"), tocar no Mural
// aos trechos, e juntar o vídeo a um exame.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, finish, launch, openCare, OUT, phone, quickAccount } from './lib.mjs';

const b = await launch();
const p = await phone(b);
await quickAccount(p, { name: 'Ana' });

// Um WebM de verdade (o Chromium dos testes não toca H.264), com uns 6 MB: o vídeo vai em 3 pedaços.
async function makeVideo() {
  try {
    const file = join(mkdtempSync(join(tmpdir(), 'video-')), 'ultrassom.webm');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30,noise=alls=40:allf=t', '-t', '4', '-c:v', 'libvpx', '-b:v', '12M', '-minrate', '12M', '-maxrate', '12M', '-y', file]);
    return readFileSync(file);
  } catch {
    // Sem ffmpeg: grava um vídeo curto no próprio navegador.
    return Buffer.from(
      await p.evaluate(async () => {
        const c = Object.assign(document.createElement('canvas'), { width: 320, height: 240 });
        const g = c.getContext('2d');
        const rec = new MediaRecorder(c.captureStream(30), { mimeType: 'video/webm' });
        const parts = [];
        rec.ondataavailable = e => parts.push(e.data);
        rec.start();
        for (let i = 0; i < 45; i++) {
          g.fillStyle = `hsl(${i * 8}, 70%, 70%)`;
          g.fillRect(0, 0, 320, 240);
          await new Promise(r => setTimeout(r, 33));
        }
        rec.stop();
        await new Promise(r => (rec.onstop = r));
        return [...new Uint8Array(await new Blob(parts).arrayBuffer())];
      }),
    );
  }
}
const video = await makeVideo();

// ---- No diário ----
await p.getByRole('button', { name: /^Diário/ }).first().click();
await p.getByRole('button', { name: 'Registrar', exact: true }).click();
const novo = p.getByRole('dialog');
await novo.getByLabel('O que aconteceu?').fill('Nosso primeiro ultrassom, em vídeo');
await novo.getByLabel(/Escolher fotos ou vídeos/).setInputFiles({ name: 'ultrassom.webm', mimeType: 'video/webm', buffer: video });
await novo.getByRole('button', { name: 'Tirar este vídeo' }).waitFor({ timeout: 15000 });
check(true, 'o vídeo entra no registro, com a capa e o "play"');
await p.screenshot({ path: `${OUT}video-form.png` });
await novo.getByRole('button', { name: /^Guardar/ }).click();
await novo.waitFor({ state: 'hidden', timeout: 60000 });
const data = await p.evaluate(async () => (await fetch('/api/data')).json());
const saved = data.journal.find(e => e.body.includes('ultrassom'));
check(saved?.photos.length === 1 && saved.photos[0].video === true, `o vídeo foi enviado em pedaços (${(video.length / 1024 / 1024).toFixed(1)} MB) e guardado`);

// No Mural, o vídeo toca ali mesmo, passando de um pedaço para o outro.
await p.keyboard.press('Escape');
const player = p.getByLabel(/^Vídeo 1 de 1/).first();
await player.waitFor({ timeout: 15000 });
await player.scrollIntoViewIfNeeded();
await p.screenshot({ path: `${OUT}video-mural.png` });
const played = await player.evaluate(async v => {
  v.muted = true;
  await v.play();
  // Pula para o fim: o navegador pede o trecho no último pedaço.
  await new Promise(r => setTimeout(r, 500));
  v.currentTime = Math.max(0, v.duration - 0.5);
  await new Promise(r => v.addEventListener('seeked', r, { once: true }));
  return { duration: v.duration, time: v.currentTime, error: v.error?.code ?? null };
});
check(played.error === null && played.duration > 0 && played.time > played.duration / 2, `o vídeo toca e pula para o fim (${played.duration.toFixed(1)} s)`);

// ---- No exame ----
await openCare(p, 'Resultados');
await p.getByRole('button', { name: 'Morfológico 2º tri' }).click();
await p.getByLabel(/Escolher fotos, vídeos ou PDF/).setInputFiles({ name: 'morfologico.webm', mimeType: 'video/webm', buffer: video });
await p.getByRole('button', { name: 'Guardar com 1 arquivo' }).waitFor({ timeout: 15000 });
await p.screenshot({ path: `${OUT}video-exame-form.png` });
await p.getByRole('button', { name: 'Guardar com 1 arquivo' }).click();
const row = p.getByRole('button', { name: /^Ultrassom morfológico do 2º trimestre: abrir resultado/ });
await row.waitFor({ timeout: 60000 });
check((await row.textContent()).includes('1 vídeo'), 'o exame mostra "1 vídeo" na linha');
await row.click();
const tile = p.getByRole('button', { name: /^Ver vídeo de Ultrassom morfológico/ });
await tile.waitFor();
await p.screenshot({ path: `${OUT}video-exame.png` });
await tile.click();
const full = p.getByLabel(/^Vídeo de Ultrassom morfológico/);
await full.waitFor();
const ok = await full.evaluate(v => new Promise(r => (v.readyState >= 1 ? r(v.duration) : v.addEventListener('loadedmetadata', () => r(v.duration), { once: true }))));
check(ok > 0, 'o vídeo do exame abre em tela cheia e toca');
await p.screenshot({ path: `${OUT}video-exame-tela-cheia.png` });

await p.emulateMedia({ colorScheme: 'dark' });
await p.keyboard.press('Escape');
await p.screenshot({ path: `${OUT}video-exame-escuro.png` });

await b.close();
finish();
