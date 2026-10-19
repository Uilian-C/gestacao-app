import { useEffect } from 'react';

/**
 * Trava a tela de fundo enquanto uma janela (pop-up) está aberta. No iPhone o
 * overflow: hidden do body não basta: o body fica fixo na posição em que
 * estava e volta para ela ao fechar. Com janelas empilhadas, só a primeira trava.
 */
export function useScrollLock() {
  useEffect(() => {
    const body = document.body;
    if (body.dataset.sheetLock) {
      body.dataset.sheetLock = String(Number(body.dataset.sheetLock) + 1);
      return () => {
        body.dataset.sheetLock = String(Number(body.dataset.sheetLock) - 1);
      };
    }
    const y = window.scrollY;
    const saved = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.dataset.sheetLock = '1';
    Object.assign(body.style, { position: 'fixed', top: `-${y}px`, width: '100%', overflow: 'hidden' });
    return () => {
      const left = Number(body.dataset.sheetLock) - 1;
      if (left > 0) {
        body.dataset.sheetLock = String(left);
        return;
      }
      delete body.dataset.sheetLock;
      Object.assign(body.style, saved);
      window.scrollTo(0, y);
    };
  }, []);
}
