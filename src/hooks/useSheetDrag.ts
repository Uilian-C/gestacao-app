import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';

// Janelas que sobem de baixo, como nos apps do celular: puxar a alça (ou o
// título) para baixo fecha; puxar para cima abre em tela cheia; de tela
// cheia, puxar para baixo volta ao tamanho normal. Botões e campos dentro da
// área de puxar continuam funcionando normalmente.

const CLOSE_PX = 110;
const FULL_PX = 60;
/** Velocidade (px/ms) de um "peteleco" para baixo que já fecha. */
const FLICK = 0.6;

export function useSheetDrag(onClose: () => void) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [full, setFull] = useState(false);
  const start = useRef<{ y: number; t: number } | null>(null);

  const end = (e: PointerEvent<HTMLElement>) => {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (!s) return;
    const dy = e.clientY - s.y;
    const speed = dy / Math.max(1, performance.now() - s.t);
    setOffset(0);
    if (dy < -FULL_PX) {
      setFull(true);
      return;
    }
    const down = dy > CLOSE_PX || (dy > 30 && speed > FLICK);
    if (!down) return;
    // De tela cheia, um puxão curto volta ao normal; um longo fecha de vez.
    if (full && dy < CLOSE_PX * 2.5) setFull(false);
    else onClose();
  };

  const handle = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) return;
      start.current = { y: e.clientY, t: performance.now() };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragging(true);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s) return;
      const dy = e.clientY - s.y;
      // Para cima, a janela resiste (é só um sinal de "abrir mais"); para baixo, acompanha o dedo.
      setOffset(dy < 0 ? Math.max(dy * 0.35, -40) : dy);
    },
    onPointerUp: end,
    onPointerCancel: end,
    style: { touchAction: 'none' } as CSSProperties,
  };

  const panelStyle: CSSProperties = {
    transform: offset ? `translateY(${offset}px)` : undefined,
    transition: dragging ? 'none' : 'transform 220ms ease, max-height 260ms ease, height 260ms ease, border-radius 260ms ease',
  };

  return { handle, panelStyle, full };
}
