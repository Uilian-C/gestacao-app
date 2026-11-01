import { OPTION, percents, type Sex } from './espera';
// Cartões para compartilhar (stories do Instagram, status do WhatsApp, feed):
// a semana do bebê, a contagem para um marco, uma lembrança com a frase de
// quem viveu, uma primeira vez, a barriga crescendo, um trecho de carta e o
// nome escolhido. Cada um sai com a voz do casal e a marca do Tumtum embaixo.
// É assim que a marca viaja: no momento bonito que o casal quer mostrar. Nada
// sai sem o toque da pessoa, e a imagem só leva o que aparece nela.

export type ShareKind = 'cartao_semana' | 'cartao_contagem' | 'cartao_momento' | 'cartao_primeira_vez' | 'cartao_barriga' | 'cartao_carta' | 'cartao_nome' | 'cartao_espera' | 'cartao_revelacao' | 'cartao_finalistas';
export const SHARE_KINDS: ShareKind[] = ['cartao_semana', 'cartao_contagem', 'cartao_momento', 'cartao_primeira_vez', 'cartao_barriga', 'cartao_carta', 'cartao_nome', 'cartao_espera', 'cartao_revelacao', 'cartao_finalistas'];

/** Stories e status (9:16) ou post no feed (4:5). */
export type CardFormat = 'story' | 'post';
export const CARD_SIZE: Record<CardFormat, { w: number; h: number }> = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 } };

export interface CardPhoto {
  url: string;
  /** Um selo na foto ("Semana 12"). */
  label?: string;
}

export interface CardContent {
  /** A linha pequena de cima ("SEMANA 24", "PRIMEIRA VEZ"). */
  kicker: string;
  /** Fotos no alto (uma, ou duas lado a lado para o "antes e agora"). */
  photos?: CardPhoto[];
  /** O nome do bebê, quando já escolhido. */
  name?: string | null;
  /** O número grande, quando há ("12"). */
  big?: string;
  /** Ao lado do número ("dias"). */
  bigUnit?: string;
  /** A frase principal. */
  title?: string;
  /** O placar do bolão: a barra Time Menina × Time Menino, com os números. */
  bar?: { options: Sex[]; counts: Partial<Record<Sex, number>> };
  /** Uma lista grande, um item por linha (os nomes da lista final). */
  list?: string[];
  /** As palavras de quem viveu, entre aspas (o que dá personalidade ao cartão). */
  quote?: string;
  sub?: string;
  /** Quem e quando ("Ana · semana 22"). */
  sign?: string;
  tone: 'rosa' | 'lilas' | 'azul';
}

export const SITE = 'meutumtum.com.br';

const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/[\s,.;:!?]+\S*$/, '')}…`;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function weekCard(o: { week: number; days: number; fruit: string; stage: string; daysToDpp: number; babyName: string | null }): CardContent {
  return {
    kicker: o.days ? `${o.week} semanas e ${plural(o.days, 'dia', 'dias')}` : `${o.week} semanas`,
    title: `Do tamanho de ${o.fruit}`,
    sub: o.daysToDpp > 0 ? `${o.stage} · faltam ${plural(o.daysToDpp, 'dia', 'dias')}` : o.stage,
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

/** Uma lembrança (momento, dia a dia, primeira vez): a foto, se houver, e a frase de quem escreveu. */
export function memoryCard(o: { body: string; author: string; week: number; date: string; photo?: string | null; firstTime?: string | null; babyName: string | null }): CardContent {
  return {
    kicker: o.firstTime ? 'Primeira vez' : `Semana ${o.week}`,
    photos: o.photo ? [{ url: o.photo }] : undefined,
    title: o.firstTime ?? undefined,
    quote: o.body.trim() ? clip(o.body, o.photo ? 150 : 220) : undefined,
    sign: o.firstTime ? `${o.author} · semana ${o.week} · ${o.date}` : `${o.author} · ${o.date}`,
    name: o.firstTime ? null : o.babyName,
    tone: o.firstTime ? 'lilas' : 'rosa',
  };
}

/** A barriga desta semana, ao lado da primeira foto (quando há), para ver o quanto cresceu. */
export function bellyCard(o: { week: number; photo: string; first?: { week: number; photo: string } | null; caption?: string; babyName: string | null }): CardContent {
  const before = o.first && o.first.week < o.week ? o.first : null;
  return {
    kicker: 'A barriguinha',
    photos: before ? [{ url: before.photo, label: `Semana ${before.week}` }, { url: o.photo, label: `Semana ${o.week}` }] : [{ url: o.photo, label: `Semana ${o.week}` }],
    title: before ? `${plural(o.week - before.week, 'semana', 'semanas')} crescendo` : `Semana ${o.week}`,
    quote: o.caption?.trim() ? clip(o.caption, 120) : undefined,
    name: o.babyName,
    tone: 'rosa',
  };
}

/** Um trecho de carta para o bebê, assinado ("— mãe"). */
export function letterCard(o: { body: string; role: 'mae' | 'pai'; babyName: string | null; week: number }): CardContent {
  return {
    kicker: o.babyName ? `Para ${o.babyName}` : 'Carta para o bebê',
    quote: clip(o.body, 260),
    sign: `— ${o.role === 'mae' ? 'mãe' : 'pai'}, na semana ${o.week}`,
    tone: o.role === 'pai' ? 'azul' : 'rosa',
  };
}

export function nameCard(o: { name: string; date?: string | null; week: number }): CardContent {
  return {
    kicker: 'Escolhemos o nome',
    name: o.name,
    sub: o.date ? `Escolhido em ${o.date} · semana ${o.week}` : `Na semana ${o.week}`,
    tone: 'lilas',
  };
}

/** "Menino ou menina?": o suspense antes de descobrir (com o dia, se marcaram, e o placar do bolão). */
export function teaserCard(o: { testDate?: string | null; menina: number; menino: number }): CardContent {
  const total = o.menina + o.menino;
  return {
    kicker: 'A espera',
    name: 'Menino ou menina?',
    sub: o.testDate ? `A gente descobre em ${o.testDate}. Qual é o seu palpite?` : 'Qual é o seu palpite?',
    sign: total ? `Bolão: ${plural(o.menina, 'palpite', 'palpites')} menina · ${plural(o.menino, 'palpite', 'palpites')} menino` : undefined,
    tone: 'lilas',
  };
}

/** A revelação: grande, limpa, com a semana e o dia. */
export function revealCard(o: { sex: Sex; week: number; date: string; right?: number; winners?: string[]; share?: number }): CardContent {
  const team = OPTION[o.sex].team;
  const names = (o.winners ?? []).slice(0, 4);
  const more = (o.right ?? 0) - names.length;
  const twins = o.sex === 'meninas' || o.sex === 'meninos' || o.sex === 'casal';
  return {
    kicker: twins ? 'A revelação dos gêmeos' : 'A revelação',
    name: OPTION[o.sex].title,
    sub:
      o.share === undefined || !o.right
        ? `Descobrimos na semana ${o.week} · ${o.date}`
        : o.share > 50
          ? `O ${team} venceu com ${o.share}% · descobrimos na semana ${o.week}`
          : o.share === 50
            ? `Empate no bolão, e deu ${team}! · semana ${o.week}`
            : `Zebra! O ${team} venceu com só ${o.share}% dos palpites · semana ${o.week}`,
    sign: o.right ? `${plural(o.right, 'pessoa acertou', 'pessoas acertaram')}${names.length ? `: ${names.join(', ')}${more > 0 ? ` e mais ${more}` : ''}` : ''}` : undefined,
    tone: OPTION[o.sex].tone,
  };
}

/** O placar do bolão, para chamar mais gente: a barra, os times e onde votar. */
export function placarCard(o: { options: Sex[]; counts: Partial<Record<Sex, number>>; teams: Partial<Record<Sex, string[]>>; testDate?: string | null; surprise?: boolean }): CardContent {
  const few = (xs: string[]) => (xs.length > 3 ? `${xs.slice(0, 3).join(', ')} e mais ${xs.length - 3}` : xs.join(', '));
  const lines = o.options.filter(x => (o.teams[x] ?? []).length).map(x => `${OPTION[x].label}: ${few(o.teams[x]!)}`);
  const twins = o.options.length === 3;
  return {
    kicker: twins ? 'O bolão dos gêmeos' : 'O bolão',
    name: twins ? 'Meninas, meninos ou um casal?' : 'Menino ou menina?',
    bar: { options: o.options, counts: o.counts },
    sub: [o.surprise ? 'Vai ser surpresa até o parto.' : o.testDate ? `A gente descobre em ${o.testDate}.` : '', lines.join(' · ') || 'Seja o primeiro palpite!'].filter(Boolean).join(' '),
    sign: `Vote também: ${SITE}`,
    tone: 'lilas',
  };
}

/** O cartão de quem votou pelo link (sem app): "Eu sou do Time Menina!", o placar e o convite para votar. */
export function voterCard(o: { guess: Sex; couple: string; options: Sex[]; counts: Partial<Record<Sex, number>> }): CardContent {
  return {
    kicker: `O bolão de ${o.couple}`,
    name: `Eu sou do ${OPTION[o.guess].team}!`,
    bar: { options: o.options, counts: o.counts },
    sub: o.options.length === 3 ? 'Meninas, meninos ou um casal? E você, qual é o seu time?' : 'Menino ou menina? E você, qual é o seu time?',
    sign: `Vote também: ${SITE}`,
    tone: OPTION[o.guess].tone,
  };
}

/** Para quem escolheu esperar até o parto. */
export function surpriseCard(o: { daysToDpp: number }): CardContent {
  return {
    kicker: 'A espera',
    name: 'Vai ser surpresa',
    sub: o.daysToDpp > 0 ? `Escolhemos esperar até o parto. Faltam ${plural(o.daysToDpp, 'dia', 'dias')}.` : 'Escolhemos esperar até o parto.',
    tone: 'lilas',
  };
}

/** A lista final de nomes, como enquete para os stories. */
export function finalistsCard(o: { names: string[]; sex: Sex | null }): CardContent {
  return {
    kicker: 'Nossa lista final',
    list: o.names.slice(0, 4),
    sub: 'Qual você escolheria?',
    tone: o.sex ? OPTION[o.sex].tone : 'lilas',
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
  azul: { from: '#dfeeff', to: '#efe4ff', accent: '#2f78c4' },
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A foto cobrindo a moldura (corta as sobras, como object-fit: cover), com os cantos arredondados. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.save();
  roundRect(ctx, x, y, w, h, 44);
  ctx.clip();
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

/**
 * O texto do cartão (de cima para baixo), a partir de `y`. Com `draw` falso só
 * mede: devolve onde o texto termina, para a foto ocupar o resto.
 */
function layoutText(ctx: CanvasRenderingContext2D, c: CardContent, accent: string, left: number, width: number, story: boolean, photoCount: number, y: number, draw: boolean): number {
  ctx.fillStyle = accent;
  // O título pequeno nunca passa da largura: diminui até caber (e, no limite, corta com reticências).
  let kickerSize = 40;
  const kicker = c.kicker.toUpperCase();
  ctx.font = `800 ${kickerSize}px ${SANS}`;
  while (kickerSize > 28 && ctx.measureText(kicker).width > width) {
    kickerSize -= 2;
    ctx.font = `800 ${kickerSize}px ${SANS}`;
  }
  if (draw) ctx.fillText(wrapLines(t => ctx.measureText(t).width, kicker, width, 1)[0], left, y);

  if (c.name) {
    const big = !c.title && !c.quote && !c.big && !photoCount;
    // O título grande cabe inteiro: diminui até caber em duas linhas, sem cortar palavra.
    let size = big ? (story ? 200 : 170) : 76;
    const fits = (max: number) => {
      ctx.font = `700 ${size}px ${DISPLAY}`;
      const lines = wrapLines(t => ctx.measureText(t).width, c.name!, width, 99);
      return lines.length <= max && lines.every(l => ctx.measureText(l).width <= width);
    };
    // Primeiro tenta numa linha só (até 3/4 do tamanho); senão, em duas.
    const start = size;
    while (big && size > start * 0.75 && !fits(1)) size -= 10;
    if (big && !fits(1)) {
      size = start;
      while (size > 100 && !fits(2)) size -= 10;
    }
    ctx.font = `700 ${size}px ${DISPLAY}`;
    const lines = wrapLines(t => ctx.measureText(t).width, c.name, width, 2);
    for (const line of lines) {
      y += big ? size * 1.15 : 92;
      if (draw) ctx.fillText(line, left - (big ? 6 : 0), y);
    }
  }

  if (c.bar) {
    // A barra dos times (2, ou 3 para gêmeos), com os números grandes em cima de cada um.
    const opts = c.bar.options;
    const values = opts.map(o => c.bar!.counts[o] ?? 0);
    const total = values.reduce((a, b) => a + b, 0);
    const pct = percents(values);
    const color = (o: Sex) => (OPTION[o].tone === 'rosa' ? '#d43f6c' : OPTION[o].tone === 'azul' ? '#2f78c4' : '#7a52c7');
    const fill = (o: Sex) => (OPTION[o].tone === 'rosa' ? '#ff7fa0' : OPTION[o].tone === 'azul' ? '#5fb0f5' : '#b79cf0');
    const three = opts.length === 3;
    // Onde cada time fica: nas pontas (e no meio, para três).
    const anchor = (i: number): [number, CanvasTextAlign] => (i === 0 ? [left, 'left'] : i === opts.length - 1 ? [left + width, 'right'] : [left + width / 2, 'center']);
    y += 120;
    ctx.font = `800 ${three ? 32 : 40}px ${SANS}`;
    if (draw)
      opts.forEach((o, i) => {
        const [x, align] = anchor(i);
        ctx.textAlign = align;
        ctx.fillStyle = color(o);
        ctx.fillText(OPTION[o].team.toUpperCase(), x, y);
      });
    ctx.textAlign = 'left';
    y += 130;
    ctx.font = `700 120px ${DISPLAY}`;
    if (draw) {
      opts.forEach((o, i) => {
        const [x, align] = anchor(i);
        ctx.textAlign = align;
        ctx.fillStyle = color(o);
        ctx.fillText(String(values[i]), x, y);
      });
      if (!three) {
        ctx.font = `700 44px ${SANS}`;
        ctx.fillStyle = SOFT;
        ctx.textAlign = 'center';
        ctx.fillText('×', left + width / 2, y - 30);
      }
      ctx.textAlign = 'left';
    }
    y += 40;
    if (draw) {
      const h = 44;
      ctx.save();
      roundRect(ctx, left, y, width, h, h / 2);
      ctx.clip();
      let x = left;
      opts.forEach((o, i) => {
        const w = i === opts.length - 1 ? left + width - x : (width * pct[i]) / 100;
        ctx.fillStyle = fill(o);
        ctx.fillRect(x, y, w, h);
        // A divisão branca só entre dois times que têm palpites.
        if (i > 0 && pct[i] > 0 && pct[i - 1] > 0) {
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.fillRect(x - 3, y, 6, h);
        }
        x += w;
      });
      ctx.restore();
      if (total) {
        ctx.font = `800 34px ${SANS}`;
        ctx.fillStyle = SOFT;
        opts.forEach((_, i) => {
          const [x2, align] = anchor(i);
          ctx.textAlign = align;
          ctx.fillText(`${pct[i]}%`, x2, y + h + 50);
        });
        ctx.textAlign = 'left';
      }
    }
    y += 44 + (total ? 60 : 10);
  }

  if (c.list?.length) {
    ctx.fillStyle = INK;
    const size = story ? 120 : 100;
    ctx.font = `700 ${size}px ${DISPLAY}`;
    y += 40;
    for (const item of c.list) {
      y += size * 1.25;
      if (draw) ctx.fillText(wrapLines(t => ctx.measureText(t).width, item, width, 1)[0], left - 4, y);
    }
  }

  if (c.big) {
    y += 280;
    ctx.fillStyle = INK;
    ctx.font = `700 280px ${DISPLAY}`;
    if (draw) ctx.fillText(c.big, left - 10, y);
    const bw = ctx.measureText(c.big).width;
    ctx.fillStyle = SOFT;
    ctx.font = `600 64px ${DISPLAY}`;
    if (draw) ctx.fillText(c.bigUnit ?? '', left + bw + 20, y);
  }

  if (c.title) {
    ctx.fillStyle = INK;
    const size = c.quote || photoCount ? 76 : 96;
    ctx.font = `700 ${size}px ${DISPLAY}`;
    y += c.big ? 130 : size + 50;
    for (const line of wrapLines(s => ctx.measureText(s).width, c.title, width, 3)) {
      if (draw) ctx.fillText(line, left, y);
      y += size * 1.17;
    }
    y -= size * 1.17;
  }

  if (c.quote) {
    // As aspas grandes, na cor do cartão, e a frase de quem viveu.
    const long = c.quote.length > 120;
    const size = photoCount ? (long ? 50 : 58) : long ? 62 : 76;
    y += c.title || c.name ? 90 : 70;
    ctx.fillStyle = accent;
    if (draw) ctx.globalAlpha = 0.35;
    ctx.font = `700 200px ${DISPLAY}`;
    if (draw) ctx.fillText('“', left - 14, y + 90);
    ctx.globalAlpha = 1;
    y += size + 40;
    ctx.fillStyle = INK;
    ctx.font = `600 ${size}px ${DISPLAY}`;
    const max = story ? (photoCount ? 5 : 9) : photoCount ? 3 : 6;
    for (const line of wrapLines(s => ctx.measureText(s).width, c.quote, width, max)) {
      if (draw) ctx.fillText(line, left, y);
      y += size * 1.3;
    }
    y -= size * 1.3;
  }

  if (c.sub) {
    ctx.fillStyle = SOFT;
    ctx.font = `600 46px ${SANS}`;
    y += 80;
    for (const line of wrapLines(s => ctx.measureText(s).width, c.sub, width, 3)) {
      if (draw) ctx.fillText(line, left, y);
      y += 62;
    }
    y -= 62;
  }

  if (c.sign) {
    ctx.fillStyle = SOFT;
    ctx.font = `700 42px ${SANS}`;
    y += 80;
    if (draw) ctx.fillText(wrapLines(s => ctx.measureText(s).width, c.sign, width, 1)[0], left, y);
  }

  return y;
}

/** Desenha o cartão e devolve a imagem PNG. */
export async function drawCard(c: CardContent, format: CardFormat = 'story'): Promise<Blob> {
  await document.fonts?.ready.catch(() => undefined);
  const { w: W, h: H } = CARD_SIZE[format];
  const story = format === 'story';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const t = TONES[c.tone];

  // O fundo: um degradê suave com dois halos, como o Início.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, t.from);
  bg.addColorStop(1, t.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, a] of [
    [W * 0.82, H * 0.14, 460, 0.55],
    [W * 0.12, H * 0.8, 420, 0.45],
  ] as const) {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r);
    halo.addColorStop(0, `rgba(255,255,255,${a})`);
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);
  }

  const left = 100;
  const width = W - left * 2;
  // Nos stories, o alto e o pé ficam livres para os botões do Instagram e do WhatsApp.
  let y = story ? 250 : 170;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const foot = H - (story ? 230 : 130);
  const photos = (await Promise.all((c.photos ?? []).map(async p => ({ ...p, img: await loadImage(p.url) })))).filter(p => p.img);
  // A foto ocupa o que o texto deixa: primeiro mede o texto, depois desenha tudo.
  const textEnd = layoutText(ctx, c, t.accent, left, width, story, photos.length, 0, false);
  const fullPhoto = photos.length === 2 ? (story ? 760 : 520) : c.quote || c.title ? (story ? 820 : 560) : story ? 1000 : 700;
  const ph = photos.length ? Math.max(story ? 420 : 300, Math.min(fullPhoto, foot - 150 - y - 90 - textEnd)) : 0;
  if (photos.length) {
    const gap = 24;
    const pw = (width - gap * (photos.length - 1)) / photos.length;
    photos.forEach((p, i) => {
      const x = left + i * (pw + gap);
      drawCover(ctx, p.img!, x, y, pw, ph);
      if (p.label) {
        ctx.font = `800 34px ${SANS}`;
        const lw = ctx.measureText(p.label).width + 44;
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        roundRect(ctx, x + 22, y + ph - 82, lw, 60, 30);
        ctx.fill();
        ctx.fillStyle = t.accent;
        ctx.fillText(p.label, x + 44, y + ph - 40);
      }
    });
    y += ph + 90;
  } else {
    y += 60;
  }
  y = layoutText(ctx, c, t.accent, left, width, story, photos.length, y, true);

  // O coração da marca, grande e suave, no espaço que sobra.
  const { icon, heart } = await loadMarks();
  const room = foot - 140 - y;
  if (heart && room > 240) {
    const size = Math.min(room, 460);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(heart, (W - size) / 2, y + 40 + (room - size) / 2, size, size);
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
  ctx.fillText(SITE, W - left, foot);

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Não deu para gerar a imagem.'))), 'image/png'));
}

/** Compartilha pelo celular (Instagram, WhatsApp…) ou, sem essa opção, baixa a imagem. */
export async function shareImage(blob: Blob, fileName: string, download = false, text = `Nosso Tumtum · ${SITE}`): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
  const data = { files: [file], text };
  if (!download && navigator.canShare?.(data)) {
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
