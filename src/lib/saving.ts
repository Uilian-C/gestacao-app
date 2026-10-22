import { createContext } from 'react';

/**
 * Gravação em andamento no app: enquanto o servidor não confirma, os botões de
 * enviar dos formulários mostram "Salvando..." (ou o passo, como "Enviando foto
 * 1 de 3") e ficam travados, para ninguém tocar duas vezes.
 */
export const SavingContext = createContext<{ busy: boolean; label: string | null }>({ busy: false, label: null });
