import { useId } from 'react';
import { TONES, type BabyTone } from '../content/babyTones';

// O bebê do Tumtum. Desenhado para dar vontade de cuidar: segue o "esquema do
// bebê" (Lorenz) que desperta o carinho de quem olha — cabeça grande e
// redonda, testa alta, bochechas coradas, olhinhos fechados e serenos, formas
// macias e sem contorno duro. Por padrão é uma luz lilás, sem cor de pele, em
// que todo casal se vê; o casal pode escolher um tom de pele. Fica dentro de
// uma bolha em forma de coração, abraçado pelo eco do símbolo do Tumtum: a
// assinatura do app.
//
// Ele muda com a gestação: uma sementinha luminosa (até a 7ª
// semana), um feijãozinho de carinha grande (8ª a 11ª) e, a partir da 12ª, o
// bebê encolhido que vai ganhando bochecha, dobrinha e um cachinho de cabelo.

/**
 * A bolha em forma de coração: gordinho, de pontas macias, como um balão. As
 * metades começam no meio de cima e terminam no meio de baixo (para o eco).
 */
const HEART_LEFT = 'M60 34 C53 20 40 13 28 17 C12 22 6 42 12 60 C18 80 42 100 60 104';
const HEART_RIGHT = 'M60 34 C67 20 80 13 92 17 C108 22 114 42 108 60 C102 80 78 100 60 104';
/** Inclinação do coração (graus): leve, só para acompanhar o bebê. */
const TILT = -8;

const HEART = `${HEART_LEFT} C78 100 102 80 108 60 C114 42 108 22 92 17 C80 13 67 20 60 34 Z`;

/**
 * O eco do Tumtum: as ondas do símbolo (rosa de um lado, azul do outro, do
 * claro embaixo ao intenso em cima) abraçando o bebê, como os dois que esperam
 * por ele. Na semana de hoje, pulsam no ritmo tum-tum.
 */
function Echo({ id, beat }: { id: string; beat: boolean }) {
  return (
    <g fill="none" strokeLinecap="round">
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd0dc" />
          <stop offset="1" stopColor="#e64d78" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#cfe8ff" />
          <stop offset="1" stopColor="#2f84d6" />
        </linearGradient>
      </defs>
      {/* As ondas seguem o contorno do coração, abertas em cima e embaixo, como no símbolo */}
      <g className={beat ? 'tt-bebe-eco' : undefined} opacity={0.34} strokeWidth={3}>
        <g transform="translate(60 62) scale(1.12) translate(-60 -62)">
          <path d={HEART_LEFT} stroke={`url(#${id}r)`} pathLength={100} strokeDasharray="84 100" strokeDashoffset={-8} />
          <path d={HEART_RIGHT} stroke={`url(#${id}b)`} pathLength={100} strokeDasharray="84 100" strokeDashoffset={-8} />
        </g>
      </g>
      <g className={beat ? 'tt-bebe-batida' : undefined} opacity={0.6} strokeWidth={3.4}>
        <path d={HEART_LEFT} stroke={`url(#${id}r)`} pathLength={100} strokeDasharray="88 100" strokeDashoffset={-6} />
        <path d={HEART_RIGHT} stroke={`url(#${id}b)`} pathLength={100} strokeDasharray="88 100" strokeDashoffset={-6} />
      </g>
    </g>
  );
}

/** Olhos fechados, bochechas e um sorrisinho: rosto de quem dorme em paz. */
function Face({ x, y, s = 1, feature, blush }: { x: number; y: number; s?: number; feature: string; blush: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={feature} strokeWidth={2.2} strokeLinecap="round">
      <path d="M-11 -1 q4 3.6 8 0" />
      <path d="M4 -1 q4 3.6 8 0" />
      <ellipse cx={-10.5} cy={6} rx={4.6} ry={2.8} fill={blush} opacity={0.5} stroke="none" />
      <ellipse cx={11.5} cy={6} rx={4.6} ry={2.8} fill={blush} opacity={0.5} stroke="none" />
      <path d="M-2.2 7.5 q2.7 2.4 5.4 0" strokeWidth={1.9} />
    </g>
  );
}

export default function BabyArt({ week, beat = false, tone = 'tumtum', className = '' }: { week: number; beat?: boolean; tone?: BabyTone; className?: string }) {
  const SKIN = TONES[tone];
  const id = useId().replace(/:/g, '');
  const skin = `pele-${id}`;
  const shade = `sombra-${id}`;
  const bubble = `bolha-${id}`;
  const glow = `brilho-${id}`;

  return (
    <svg viewBox="-8 -6 136 132" className={className} aria-hidden>
      <defs>
        <radialGradient id={skin} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={SKIN.light} />
          <stop offset="70%" stopColor={SKIN.mid} />
          <stop offset="100%" stopColor={SKIN.deep} />
        </radialGradient>
        <radialGradient id={shade} cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor={SKIN.mid} />
          <stop offset="100%" stopColor={SKIN.deep} />
        </radialGradient>
        <radialGradient id={bubble} cx="42%" cy="38%" r="70%">
          <stop offset="0%" style={{ stopColor: 'var(--c-surface)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--c-surface-2)' }} />
        </radialGradient>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6ef" />
          <stop offset="55%" stopColor={SKIN.mid} />
          <stop offset="100%" stopColor={SKIN.deep} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* A bolha: a barriga, aconchegante */}
      {/* A bolha: um coração macio, com o brilho de uma bolha de sabão */}
      {/* Levemente inclinado, acompanhando o corpinho encolhido */}
      <g transform={`rotate(${TILT} 60 62)`}>
        <path d={HEART} fill={`url(#${bubble})`} />
        <Echo id={`eco-${id}`} beat={beat} />
        <ellipse cx={30} cy={30} rx={9} ry={5} transform="rotate(-35 30 30)" fill="#fff" opacity={0.55} />
        <circle cx={41} cy={22.5} r={2.2} fill="#fff" opacity={0.5} />
      </g>

      {/* O bebê, um pouco menor, para caber no coração */}
      <g transform="translate(60 61) scale(0.74) translate(-60 -60)">
      {week < 8 ? (
        // Sementinha: uma luz quente com o coração já batendo.
        <g>
          <circle cx={60} cy={60} r={26} fill={`url(#${glow})`} />
          <circle cx={60} cy={60} r={11} fill={`url(#${skin})`} />
          <circle cx={60} cy={60} r={4} fill="#fff" opacity={0.85} className={beat ? 'tt-bebe-batida' : undefined} />
        </g>
      ) : week < 12 ? (
        // Feijãozinho: carinha grande e o corpinho curvado como um feijão.
        <g>
          <path d="M50 62 C64 56 84 66 84 82 C84 96 70 102 60 97 C50 92 46 76 50 62 Z" fill={`url(#${shade})`} />
          <ellipse cx={71} cy={93} rx={8} ry={5.5} transform="rotate(-25 71 93)" fill={SKIN.mid} />
          <circle cx={53} cy={47} r={24} fill={`url(#${skin})`} />
          <ellipse cx={45} cy={69} rx={4.4} ry={3.8} fill={SKIN.light} />
          <Face x={52} y={49} s={0.82} feature={SKIN.feature} blush={SKIN.blush} />
        </g>
      ) : (
        // O bebê encolhido, de lado, com a carinha virada para quem olha.
        <g>
          {/* Costas e bumbum: uma curva só, encaixada embaixo da cabeça */}
          <path d="M44 70 C52 56 80 54 93 67 C104 79 101 99 87 105 C73 111 56 106 50 94 C46 86 42 78 44 70 Z" fill={`url(#${shade})`} />
          {/* Perninha dobrada, joelho perto da mão, e o pezinho */}
          <ellipse cx={70} cy={92} rx={17} ry={11.5} transform="rotate(-28 70 92)" fill={SKIN.mid} />
          <ellipse cx={82} cy={104} rx={8} ry={5.4} transform="rotate(-8 82 104)" fill={SKIN.light} />
          {week >= 28 && <path d="M63 99 q4 2.2 8.5 0.4" fill="none" stroke={SKIN.deep} strokeWidth={1.6} strokeLinecap="round" />}
          {/* Cabeça grande e redonda */}
          <circle cx={47} cy={46} r={30} fill={`url(#${skin})`} />
          {/* Cachinho de cabelo, do 7º mês em diante */}
          {week >= 28 && <path d="M47 17 c-1.5 -6.5 7.5 -9 9 -3.5 c1 3.8 -4.2 4.6 -4.3 1.6" fill="none" stroke={SKIN.feature} strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />}
          {/* Orelhinha */}
          {week >= 16 && <path d="M70.5 46 c4.5 -1 6 6.5 1 8" fill={SKIN.mid} stroke={SKIN.deep} strokeWidth={1.4} strokeLinecap="round" />}
          <Face x={46} y={49} s={week >= 32 ? 1.05 : 1} feature={SKIN.feature} blush={SKIN.blush} />
          {/* Mãozinha encostada na bochecha */}
          <ellipse cx={36} cy={72} rx={7} ry={6.2} fill={SKIN.light} />
          <path d="M32.5 70 q1.6 -1.1 3.2 0 M36.4 69.6 q1.6 -1.1 3.2 0" fill="none" stroke={SKIN.deep} strokeWidth={1.1} strokeLinecap="round" />
          {/* Dobrinha no pulso, de quem já está gordinho */}
          {week >= 32 && <path d="M40 77.5 q2.5 1.2 5 -0.4" fill="none" stroke={SKIN.deep} strokeWidth={1.2} strokeLinecap="round" />}
        </g>
      )}
      </g>
    </svg>
  );
}
