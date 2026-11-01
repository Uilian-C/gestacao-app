// Cartões para compartilhar (Instagram, WhatsApp, status): a semana do bebê e
// a contagem para um marco, num retrato 1080x1350 com a marca do Tumtum
// embaixo. É assim que a marca viaja: no momento bonito que o casal quer
// mostrar, não num título no topo do app. Nada sai sem o toque da pessoa.

export interface CardContent {
  /** A linha pequena de cima ("SEMANA 24"). */
  kicker: string;
  /** O número grande, quando há ("12"). */
  big?: string;
  /** Embaixo do número ("dias"). */
  bigUnit?: string;
  /** A frase principal. */
  title: string;
  sub?: string;
  /** O nome do bebê, quando já escolhido. */
  name?: string | null;
  tone: 'rosa' | 'lilas';
}

export const CARD_W = 1080;
export const CARD_H = 1350;
export const SITE = 'meutumtum.com.br';

export function weekCard(o: { week: number; days: number; fruit: string; stage: string; daysToDpp: number; babyName: string | null }): CardContent {
  return {
    kicker: o.days ? `${o.week} semanas e ${o.days} ${o.days === 1 ? 'dia' : 'dias'}` : `${o.week} semanas`,
    title: `Do tamanho de ${o.fruit}`,
    sub: o.daysToDpp > 0 ? `${o.stage} · faltam ${o.daysToDpp} ${o.daysToDpp === 1 ? 'dia' : 'dias'}` : o.stage,
    name: o.babyName,
    tone: 'rosa',
  };
}

export function countdownCard(o: { days: number; what: string; why: string; babyName: string | null }): CardContent {
  return {
    kicker: 'Contagem',
    big: String(o.days),
    bigUnit: o.days === 1 ? 'dia' : 'dias',
    title: `para ${o.what}`,
    sub: o.why,
    name: o.babyName,
    tone: 'lilas',
  };
}

/** Quebra o texto em linhas que cabem na largura (no máximo `max` linhas, com reticências). */
export function wrapLines(measure: (s: string) => number, text: string, width: number, max = 3): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (measure(next) <= width || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last.length > 1 && measure(`${last}…`) > width) last = last.slice(0, -1).trimEnd();
  kept[max - 1] = `${last}…`;
  return kept;
}

const TONES = {
  rosa: { from: '#ffe3ea', to: '#efe4ff', accent: '#d43f6c' },
  lilas: { from: '#efe4ff', to: '#ffe3ea', accent: '#7a52c7' },
};
const INK = '#3a2a33';
const SOFT = '#6f5a66';
const DISPLAY = '"Quicksand", "Nunito", system-ui, sans-serif';
const SANS = '"Nunito", system-ui, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** O símbolo do Tumtum: com o fundo de ícone (a assinatura) e solto (o coração grande do meio). */
async function loadMarks(): Promise<{ icon: HTMLImageElement | null; heart: HTMLImageElement | null }> {
  const icon = await loadImage('/favicon.svg');
  const svg = await fetch('/favicon.svg')
    .then(r => (r.ok ? r.text() : ''))
    .catch(() => '');
  const bare = svg.replace(/<rect[^>]*\/>/, '');
  const heart = bare ? await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(bare)}`) : null;
  return { icon, heart };
}

/** Desenha o cartão e devolve a imagem PNG. */
export async function drawCard(c: CardContent): Promise<Blob> {
  await document.fonts?.ready.catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const t = TONES[c.tone];

  // O fundo: um degradê suave com dois halos, como o Início.
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, t.from);
  bg.addColorStop(1, t.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  for (const [x, y, r, a] of [
    [CARD_W * 0.82, CARD_H * 0.16, 420, 0.55],
    [CARD_W * 0.12, CARD_H * 0.78, 380, 0.45],
  ] as const) {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r);
    halo.addColorStop(0, `rgba(255,255,255,${a})`);
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  const left = 110;
  const width = CARD_W - left * 2;
  let y = 250;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  ctx.fillStyle = t.accent;
  ctx.font = `800 40px ${SANS}`;
  ctx.fillText(c.kicker.toUpperCase(), left, y);
  y += 40;

  if (c.name) {
    y += 70;
    ctx.font = `700 76px ${DISPLAY}`;
    ctx.fillText(c.name, left, y);
  }

  if (c.big) {
    y += 260;
    ctx.fillStyle = INK;
    ctx.font = `700 280px ${DISPLAY}`;
    ctx.fillText(c.big, left - 10, y);
    const bw = ctx.measureText(c.big).width;
    ctx.fillStyle = SOFT;
    ctx.font = `600 64px ${DISPLAY}`;
    ctx.fillText(c.bigUnit ?? '', left + bw + 20, y);
  }

  ctx.fillStyle = INK;
  ctx.font = `700 96px ${DISPLAY}`;
  y += c.big ? 140 : 150;
  for (const line of wrapLines(s => ctx.measureText(s).width, c.title, width, 3)) {
    ctx.fillText(line, left, y);
    y += 112;
  }

  if (c.sub) {
    ctx.fillStyle = SOFT;
    ctx.font = `600 46px ${SANS}`;
    y += 10;
    for (const line of wrapLines(s => ctx.measureText(s).width, c.sub, width, 3)) {
      ctx.fillText(line, left, y);
      y += 62;
    }
  }

  // O coração da marca, grande e suave, no espaço que sobra.
  const foot = CARD_H - 130;
  const { icon, heart } = await loadMarks();
  const room = foot - 120 - y;
  if (heart && room > 240) {
    const size = Math.min(room, 460);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(heart, (CARD_W - size) / 2, y + (room - size) / 2, size, size);
    ctx.globalAlpha = 1;
  }
  // A assinatura: o símbolo, "tumtum" e o endereço, sempre no mesmo lugar.
  if (icon) ctx.drawImage(icon, left, foot - 70, 96, 96);
  ctx.fillStyle = INK;
  ctx.font = `700 60px ${DISPLAY}`;
  ctx.fillText('tumtum', left + 120, foot);
  ctx.fillStyle = SOFT;
  ctx.font = `600 34px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(SITE, CARD_W - left, foot);

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Não deu para gerar a imagem.'))), 'image/png'));
}

/** Compartilha pelo celular (Instagram, WhatsApp…) ou, sem essa opção, baixa a imagem. */
export async function shareCard(c: CardContent, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await drawCard(c);
  const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
  const data = { files: [file], text: `Nosso Tumtum · ${SITE}` };
  if (navigator.canShare?.(data)) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
