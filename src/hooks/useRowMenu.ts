import { useState } from 'react';

/** O "⋯" de uma linha e o que ele abre logo abaixo dela. */
export function useRowMenu() {
  const [open, setOpen] = useState<string | null>(null);
  return { open, toggle: (id: string) => setOpen(o => (o === id ? null : id)), close: () => setOpen(null) };
}
