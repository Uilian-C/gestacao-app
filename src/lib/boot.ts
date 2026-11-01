import { api, type Me } from '../api';

// Ao abrir o app (não as páginas públicas), o espaço e os dados já começam a vir
// junto com a checagem do login, em vez de esperar uma pela outra. Só serve se
// for da mesma pessoa que está logada.
let boot: Promise<Me | null> | null = null;

export function startBoot() {
  boot ??= api.me().catch(() => null);
}

export async function loadMe(userId: string): Promise<Me> {
  const early = boot;
  boot = null;
  const result = early ? await early : null;
  return result && result.user.id === userId ? result : api.me();
}
