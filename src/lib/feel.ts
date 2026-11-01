// O "tum-tum": a assinatura do Tumtum nos momentos de carinho (guardar uma
// lembrança, abraçar, fechar o dia, revelar, abrir a semana nova). Três camadas,
// para todo mundo sentir: um coração que bate duas vezes onde a pessoa tocou
// (com um halo), a vibração dupla (Android) ou o toque tátil (iPhone) e um som
// baixinho de duas batidas, feito na hora (sem arquivo). Raro de propósito,
// para não perder o valor; o som pode ser desligado em "Nosso espaço".

const SOUND_KEY = 'tumtum:som';
let audio: AudioContext | null = null;

/** Onde foi o último toque: o coração do tum-tum nasce ali. */
let lastTap: { x: number; y: number } | null = null;

/** O evento que a tela ouve para desenhar o tum-tum (ver TumtumPulse). */
export const TUMTUM_EVENT = 'tumtum';

// O navegador só libera som depois de um toque: o primeiro toque no app prepara o som.
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    e => {
      lastTap = { x: e.clientX, y: e.clientY };
    },
    { capture: true, passive: true },
  );
  window.addEventListener(
    'pointerdown',
    () => {
      try {
        audio ??= new AudioContext();
        void audio.resume();
      } catch {
        /* sem áudio: só não toca */
      }
    },
    { once: true, capture: true },
  );
}

export function soundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* sem armazenamento: vale só agora */
  }
}

/** Uma batida: um tom grave que cai e some rápido. */
function beat(ctx: AudioContext, at: number, from: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(from * 0.55, at + 0.14);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.2);
}

/**
 * O toque tátil no iPhone: o Safari não tem vibração, mas o interruptor nativo
 * (input switch, iOS 18) dá um toque leve quando muda. Um interruptor escondido,
 * mudado duas vezes, faz as duas batidas.
 */
let iosSwitch: HTMLLabelElement | null = null;
function iosTap() {
  try {
    if (!iosSwitch) {
      iosSwitch = document.createElement('label');
      iosSwitch.setAttribute('aria-hidden', 'true');
      iosSwitch.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      iosSwitch.appendChild(input);
      document.body.appendChild(iosSwitch);
    }
    iosSwitch.click();
    setTimeout(() => iosSwitch?.click(), 120);
  } catch {
    /* sem toque tátil: só não toca */
  }
}

export function tumtum() {
  // 1. O coração na tela (todo mundo vê, com som ou sem).
  try {
    window.dispatchEvent(new CustomEvent(TUMTUM_EVENT, { detail: lastTap }));
  } catch {
    /* sem tela: segue */
  }
  // 2. A vibração (Android) ou o toque tátil (iPhone).
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate([14, 90, 22]);
    else iosTap();
  } catch {
    /* sem vibração: só não vibra */
  }
  if (!soundOn() || !audio || audio.state !== 'running') return;
  try {
    const t = audio.currentTime + 0.01;
    beat(audio, t, 95, 0.22);
    beat(audio, t + 0.24, 80, 0.16);
  } catch {
    /* sem áudio: só não toca */
  }
}
