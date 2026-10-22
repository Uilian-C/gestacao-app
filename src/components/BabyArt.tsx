import { useId } from 'react';

// O bebê do Tumtum. Desenhado para dar vontade de cuidar: segue o "esquema do
// bebê" (Lorenz) que desperta o carinho de quem olha — cabeça grande e
// redonda, testa alta, bochechas coradas, olhinhos fechados e serenos, formas
// macias e sem contorno duro — em tons quentes de pele, dentro de uma bolha
// clarinha (a barriga). No peito, o coraçãozinho do Tumtum.
//
// Ele muda com a gestação: uma sementinha luminosa com o coração (até a 7ª
// semana), um feijãozinho de carinha grande (8ª a 11ª) e, a partir da 12ª, o
// bebê encolhido que vai ganhando bochecha, dobrinha e um cachinho de cabelo.

const SKIN = { light: '#ffe7da', mid: '#fdd3c1', deep: '#f6b9a3' };
const FEATURE = '#9a5646';
const BLUSH = '#f39a9a';
const HEART = 'var(--c-rosa)';

/** Coração do Tumtum (centro em x, y; `s` é a escala). */
function Heart({ x, y, s = 1, beat = false }: { x: number; y: number; s?: number; beat?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 3.2 C-4.6 -0.4 -4.8 -4.6 -2.2 -5 C-1 -5.2 -0.2 -4.4 0 -3.4 C0.2 -4.4 1 -5.2 2.2 -5 C4.8 -4.6 4.6 -0.4 0 3.2 Z" style={{ fill: HEART }} className={beat ? 'tt-bebe-batida' : undefined} />
    </g>
  );
}

/** Olhos fechados, bochechas e um sorrisinho: rosto de quem dorme em paz. */
function Face({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={FEATURE} strokeWidth={2.2} strokeLinecap="round">
      <path d="M-11 -1 q4 3.6 8 0" />
      <path d="M4 -1 q4 3.6 8 0" />
      <ellipse cx={-10.5} cy={6} rx={4.6} ry={2.8} fill={BLUSH} opacity={0.5} stroke="none" />
      <ellipse cx={11.5} cy={6} rx={4.6} ry={2.8} fill={BLUSH} opacity={0.5} stroke="none" />
      <path d="M-2.2 7.5 q2.7 2.4 5.4 0" strokeWidth={1.9} />
    </g>
  );
}

export default function BabyArt({ week, beat = false, className = '' }: { week: number; beat?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '');
  const skin = `pele-${id}`;
  const shade = `sombra-${id}`;
  const bubble = `bolha-${id}`;
  const glow = `brilho-${id}`;

  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
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
        <radialGradient id={bubble} cx="50%" cy="45%" r="55%">
          <stop offset="0%" style={{ stopColor: 'var(--c-surface)' }} />
          <stop offset="78%" style={{ stopColor: 'var(--c-rosa-soft)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--c-rosa-soft)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6ef" />
          <stop offset="55%" stopColor={SKIN.mid} />
          <stop offset="100%" stopColor={SKIN.deep} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* A bolha: a barriga, aconchegante */}
      <circle cx={60} cy={60} r={58} fill={`url(#${bubble})`} />

      {week < 8 ? (
        // Sementinha: uma luz quente com o coração já batendo.
        <g>
          <circle cx={60} cy={60} r={26} fill={`url(#${glow})`} />
          <circle cx={60} cy={60} r={11} fill={`url(#${skin})`} />
          <Heart x={60} y={60.5} s={1.05} beat={beat} />
        </g>
      ) : week < 12 ? (
        // Feijãozinho: carinha grande e o corpinho curvado como um feijão.
        <g>
          <path d="M50 62 C64 56 84 66 84 82 C84 96 70 102 60 97 C50 92 46 76 50 62 Z" fill={`url(#${shade})`} />
          <ellipse cx={71} cy={93} rx={8} ry={5.5} transform="rotate(-25 71 93)" fill={SKIN.mid} />
          <circle cx={53} cy={47} r={24} fill={`url(#${skin})`} />
          <ellipse cx={45} cy={69} rx={4.4} ry={3.8} fill={SKIN.light} />
          <Face x={52} y={49} s={0.82} />
          <Heart x={72} y={80} s={0.85} beat={beat} />
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
          {week >= 28 && <path d="M47 17 c-1.5 -6.5 7.5 -9 9 -3.5 c1 3.8 -4.2 4.6 -4.3 1.6" fill="none" stroke={FEATURE} strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />}
          {/* Orelhinha */}
          {week >= 16 && <path d="M70.5 46 c4.5 -1 6 6.5 1 8" fill={SKIN.mid} stroke={SKIN.deep} strokeWidth={1.4} strokeLinecap="round" />}
          <Face x={46} y={49} s={week >= 32 ? 1.05 : 1} />
          {/* Mãozinha encostada na bochecha */}
          <ellipse cx={36} cy={72} rx={7} ry={6.2} fill={SKIN.light} />
          <path d="M32.5 70 q1.6 -1.1 3.2 0 M36.4 69.6 q1.6 -1.1 3.2 0" fill="none" stroke={SKIN.deep} strokeWidth={1.1} strokeLinecap="round" />
          {/* Dobrinha no pulso, de quem já está gordinho */}
          {week >= 32 && <path d="M40 77.5 q2.5 1.2 5 -0.4" fill="none" stroke={SKIN.deep} strokeWidth={1.2} strokeLinecap="round" />}
          {/* O coraçãozinho do Tumtum, no peito */}
          <Heart x={82} y={80} s={1.05} beat={beat} />
        </g>
      )}
    </svg>
  );
}
