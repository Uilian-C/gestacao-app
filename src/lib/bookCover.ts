// Os tons da capa do livro impresso (cores da gráfica, iguais no claro e no escuro).
export type CoverTone = 'rosa' | 'lilas' | 'azul' | 'areia';

export const COVER_TONES: Record<CoverTone, { label: string; from: string; to: string }> = {
  rosa: { label: 'Rosa', from: '#f6b3c6', to: '#c93a64' },
  lilas: { label: 'Lilás', from: '#cdb7f3', to: '#7a52c7' },
  azul: { label: 'Azul', from: '#a9cbf3', to: '#2f6fc0' },
  areia: { label: 'Areia', from: '#efdcc4', to: '#a8784a' },
};

export const isCoverTone = (t: string | null | undefined): t is CoverTone => !!t && t in COVER_TONES;
