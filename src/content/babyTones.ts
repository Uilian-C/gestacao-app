// Os tons do bebê desenhado em "Como o bebê cresce".

export type BabyTone = 'tumtum' | 'tom1' | 'tom2' | 'tom3' | 'tom4' | 'tom5';

/**
 * Os tons do bebê. "tumtum" (o padrão) é uma luz suave, que não sugere cor de
 * pele: todo casal se vê nele. Os outros cinco seguem a escala de tons de pele
 * dos emojis, para quem quiser escolher.
 */
export const TONES: Record<BabyTone, { light: string; mid: string; deep: string; feature: string; blush: string }> = {
  tumtum: { light: '#f8f2ff', mid: '#e8dcf8', deep: '#d2c0ee', feature: '#5f4a86', blush: '#f2a9c6' },
  tom1: { light: '#ffeadf', mid: '#fcd7c6', deep: '#f1bca6', feature: '#8f5545', blush: '#f39a9a' },
  tom2: { light: '#f9dcc4', mid: '#efc29f', deep: '#dfa880', feature: '#76452f', blush: '#ee8f86' },
  tom3: { light: '#e9bf98', mid: '#d6a176', deep: '#bf8659', feature: '#583322', blush: '#e07f72' },
  tom4: { light: '#c9966f', mid: '#b07b55', deep: '#956242', feature: '#3a2016', blush: '#d4726a' },
  tom5: { light: '#9a6a4c', mid: '#82553a', deep: '#6a432d', feature: '#24120b', blush: '#c46a62' },
};
