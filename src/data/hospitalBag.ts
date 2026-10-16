// Mala da maternidade: o essencial, em três grupos. Cada maternidade tem a
// própria lista; vale conferir com a de vocês.
export interface BagGroup {
  id: string;
  title: string;
  items: Array<{ id: string; label: string }>;
}

export const HOSPITAL_BAG: BagGroup[] = [
  {
    id: 'mae',
    title: 'Para a mãe',
    items: [
      { id: 'docs', label: 'Documento com foto, cartão do SUS ou do plano' },
      { id: 'caderneta', label: 'Caderneta da gestante e exames' },
      { id: 'plano', label: 'Plano de parto impresso' },
      { id: 'camisolas', label: '3 camisolas ou pijamas abertos na frente' },
      { id: 'sutia', label: 'Sutiãs de amamentação e absorventes para os seios' },
      { id: 'calcinhas', label: 'Calcinhas confortáveis (de cintura alta, se cesárea)' },
      { id: 'absorventes', label: 'Absorventes pós-parto' },
      { id: 'chinelo', label: 'Chinelo e roupão' },
      { id: 'higiene', label: 'Itens de higiene e escova de cabelo' },
      { id: 'saida-mae', label: 'Roupa confortável para a saída' },
    ],
  },
  {
    id: 'bebe',
    title: 'Para o bebê',
    items: [
      { id: 'bodies', label: '6 bodies ou macacões (RN e P)' },
      { id: 'meias', label: 'Meias, luvas e touca' },
      { id: 'mantas', label: '2 mantas ou cueiros' },
      { id: 'fraldas', label: 'Fraldas RN e lenços umedecidos' },
      { id: 'saida-bebe', label: 'Roupa de saída' },
      { id: 'cadeirinha', label: 'Bebê conforto instalado no carro' },
    ],
  },
  {
    id: 'acompanhante',
    title: 'Para o acompanhante',
    items: [
      { id: 'docs-acomp', label: 'Documento com foto' },
      { id: 'roupa-acomp', label: 'Muda de roupa e itens de higiene' },
      { id: 'carregador', label: 'Carregador de celular e lanche' },
    ],
  },
];

export const BAG_ITEM_COUNT = HOSPITAL_BAG.reduce((n, g) => n + g.items.length, 0);
