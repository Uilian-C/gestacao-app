// O "tum-tum": a assinatura do Tumtum nos momentos de carinho (abraçar,
// guardar uma lembrança, contar como está, fechar o dia). Uma vibração dupla
// e curta e, junto, um som baixinho de duas batidas de coração, feito na hora
// (sem arquivo). Raro de propósito, para não perder o valor; o som pode ser
// desligado em "Nosso espaço".

const SOUND_KEY = 'tumtum:som';
let audio: AudioContext | null = null;

// O navegador só libera som depois de um toque: o primeiro toque no app prepara o som.
if (typeof window !== 'undefined') {
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

export function tumtum() {
  try {
    navigator.vibrate?.([14, 90, 22]);
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
