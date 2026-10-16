// Conteúdo informativo (guia) x registros do casal.
//
// Tudo em src/content é referência: vale para qualquer gestação e não muda com
// o que o casal registra (semanas, fases, exames recomendados, sinais de alerta,
// mala da maternidade). Os registros do casal vêm do banco, pela API.
//
// Cada bloco de conteúdo declara a fonte. Quando entrarem recomendações online,
// elas usam o mesmo formato e aparecem com o mesmo visual de "Guia" no app.

export interface ContentSource {
  id: string;
  label: string;
  url?: string;
}

export const SOURCES = {
  caderneta: { id: 'caderneta', label: 'Caderneta da Gestante (Ministério da Saúde)' },
  febrasgo: { id: 'febrasgo', label: 'FEBRASGO' },
  referencia: { id: 'referencia', label: 'Referências de desenvolvimento fetal (valores aproximados)' },
  maternidades: { id: 'maternidades', label: 'Listas usuais de maternidades' },
} satisfies Record<string, ContentSource>;
