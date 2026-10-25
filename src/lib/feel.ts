// O "tum-tum" no toque: uma vibração dupla e curta, como uma batida de
// coração, nos momentos de carinho (abraçar, guardar uma lembrança, contar
// como está). Só nos celulares que permitem; rara de propósito, para não
// perder o valor.

export function tumtum() {
  try {
    navigator.vibrate?.([14, 90, 22]);
  } catch {
    /* sem vibração: só não vibra */
  }
}
