// A Central de Ajuda: perguntas de verdade, respondidas em poucas linhas e no
// tom do app. Cada resposta pode levar direto à tela certa ("Ir para lá").

export type HelpTarget = 'agenda' | 'calendario' | 'tarefas' | 'jornada' | 'mural' | 'livro' | 'barriga' | 'celebracoes' | 'saude' | 'exames' | 'nomes' | 'espaco' | 'parto';

export interface HelpItem {
  q: string;
  a: string;
  go?: { target: HelpTarget; label: string };
}

export interface HelpTopic {
  id: string;
  title: string;
  items: HelpItem[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'comecando',
    title: 'Começando',
    items: [
      { q: 'Como o app sabe a semana da gestação?', a: 'Pela data da última menstruação (DUM). A partir dela o Tumtum conta as semanas, os trimestres e a data provável do parto (40 semanas depois).' },
      { q: 'Errei a DUM. Como corrijo?', a: 'No Início, no cartão do bebê, toque no lápis ao lado de "faltam X dias" e escolha a data certa. Tudo se ajusta sozinho: semanas, jornada, calendário e livro.' },
      { q: 'Como convido meu parceiro ou minha parceira?', a: 'Toque nas fotinhas no alto da tela (Nosso espaço) e em "Convidar". O convite vale 7 dias e pode ser usado uma vez. Vocês dois veem e editam tudo.', go: { target: 'espaco', label: 'Abrir Nosso espaço' } },
      { q: 'Dá para instalar no celular, como um app?', a: 'Sim. No iPhone, abra no Safari, toque em Compartilhar e em "Adicionar à Tela de Início". No Android, o Chrome oferece "Instalar app" (ou use o menu ⋮ → "Adicionar à tela inicial").' },
      { q: 'O que é o botão "Registrar"?', a: 'É o atalho para guardar algo rápido de onde você estiver: um momento, um sintoma, uma medida, uma foto. Ele muda conforme a aba.' },
    ],
  },
  {
    id: 'agenda',
    title: 'Agenda e calendário',
    items: [
      { q: 'Como agendo uma consulta, exame ou ultrassom?', a: 'Em Agenda → Próximos, toque em "Agendar". Também dá para tocar num dia do calendário e escolher "Agendar". Vocês recebem um lembrete na véspera.', go: { target: 'agenda', label: 'Abrir a Agenda' } },
      { q: 'Como funciona o calendário?', a: 'Em Agenda → Calendário, os meses rolam um embaixo do outro. Os dias da gestação têm a cor do trimestre, e o coração marca a data provável do parto. Tocar num dia abre a folha dele: a semana da gestação, o bebê e tudo o que estava marcado.', go: { target: 'calendario', label: 'Abrir o calendário' } },
      { q: 'Para que servem os filtros do calendário?', a: 'Para ver uma coisa de cada vez: só consultas e exames, só tarefas, só o diário, as celebrações, os marcos ou a saúde e o humor. "Tudo" volta a mostrar tudo.' },
      { q: 'E a visão Ano?', a: 'Mostra a gestação inteira de relance, em tela cheia. Tocar em qualquer mês abre ele no Mês. Para sair, use a seta ou puxe para baixo.' },
      { q: 'Consigo levar as consultas para a agenda do celular?', a: 'Sim. No fim do calendário, toque em "Levar para a agenda do celular". O arquivo abre no Google Agenda ou no calendário do iPhone. Em cada consulta também há "Adicionar ao Google Agenda".', go: { target: 'calendario', label: 'Abrir o calendário' } },
      { q: 'Como divido tarefas com o parceiro?', a: 'Em Agenda → Tarefas, crie a tarefa e escolha quem cuida: você, o parceiro ou os dois. Quem recebe é avisado.', go: { target: 'tarefas', label: 'Abrir as Tarefas' } },
    ],
  },
  {
    id: 'diario',
    title: 'Diário e livro',
    items: [
      { q: 'Qual a diferença entre Mural e Fichário?', a: 'O Mural é o dia a dia de vocês, como uma conversa. O Fichário guarda tudo organizado por pastas (momentos, cartas, barriguinha, humor e as celebrações) e por mês, semana ou trimestre. No Mural, os atalhos embaixo do campo abrem o formulário já na pasta certa.', go: { target: 'mural', label: 'Abrir o Mural' } },
      { q: 'Quem vê o que eu escrevo?', a: 'Você escolhe em cada registro: "Só eu", "Nós dois" ou "Família". O que é "Só eu" fica só com você, inclusive no livro.' },
      { q: 'Como funciona a barriguinha?', a: 'Uma foto por semana, sempre do mesmo jeito. O app monta a evolução da barriga para vocês verem (e guardarem) depois.', go: { target: 'barriga', label: 'Abrir a Barriguinha' } },
      { q: 'O que é o livro de vocês?', a: 'Cada mês da gestação vira um capítulo, contado como uma história, com o bebê daquela fase e as lembranças de vocês. Dá para ler como um e-book e baixar em PDF para imprimir.', go: { target: 'livro', label: 'Abrir o livro' } },
      { q: 'Posso imprimir só algumas páginas?', a: 'Sim. No livro, toque em imprimir e escolha os capítulos. O app lembra o que já foi impresso e avisa quando há páginas novas.' },
    ],
  },
  {
    id: 'celebracoes',
    title: 'Celebrações e nome do bebê',
    items: [
      { q: 'Como organizo o chá de bebê?', a: 'Em Diário → Fichário → Celebrações, toque em "Nova celebração". Ela já vem com um roteiro de tarefas com prazos contados a partir da data, além de fornecedores, convidados (com o tamanho de fralda de cada um) e ideias.', go: { target: 'celebracoes', label: 'Abrir as Celebrações' } },
      { q: 'Como acompanho o orçamento da festa?', a: 'Ao marcar um orçamento previsto, a régua mostra quanto já está combinado e pago e avisa quando está perto do limite ou passou dele.' },
      { q: 'Como funciona o caderno de nomes?', a: 'Cada ideia de nome ganha uma página com o porquê, quem curtiu e a conversa sobre ele. A família pode dar palpite, mas quem escolhe são vocês.', go: { target: 'nomes', label: 'Abrir o caderno de nomes' } },
    ],
  },
  {
    id: 'saude',
    title: 'Saúde',
    items: [
      { q: 'Onde registro sintomas, peso e pressão?', a: 'Em Cuidados, pelo botão "Registrar". Tocando em Sintomas ou em Peso e pressão, vocês veem a evolução, o que os registros mostram e cada registro.', go: { target: 'saude', label: 'Abrir Cuidados' } },
      { q: 'Como preparo a consulta?', a: 'Em Cuidados, no cartão da próxima consulta, toque em "Preparar a consulta". Ali vocês anotam as dúvidas para levar e têm o resumo pronto (sintomas, peso, pressão e os dados da gestação) para imprimir, salvar em PDF ou mandar para o profissional. Depois, anotem as respostas.', go: { target: 'saude', label: 'Abrir Cuidados' } },
      { q: 'Como escolho o que levar no relatório?', a: 'Em Cuidados, toque em "Relatório" (logo abaixo da consulta). Escolham o período (desde a última consulta, 30 dias, o trimestre, a gestação toda ou outra data) e as partes que entram: dados da gestação, pontos de atenção, sintomas, peso, pressão e dúvidas. Depois é só imprimir, salvar em PDF ou copiar o texto.', go: { target: 'saude', label: 'Abrir Cuidados' } },
      { q: 'Onde acho os dados da gestação durante a consulta?', a: 'Em Cuidados, logo abaixo da próxima consulta, no atalho "Dados da gestação": um toque e aparecem tipo sanguíneo, DPP, alergias e o resto, para responder na hora.', go: { target: 'saude', label: 'Abrir Cuidados' } },
      { q: 'O que é a Jornada?', a: 'É o roteiro do pré-natal, semana a semana: consultas, exames e vacinas recomendados. Fica em Cuidados, no cartão Pré-natal. Quando vocês agendam ou guardam um resultado, ela se marca sozinha.', go: { target: 'jornada', label: 'Abrir a Jornada' } },
      { q: 'O app avisa sobre sinais de alerta?', a: 'Sim. Alguns sintomas (como sangramento, dor forte, pressão alta ou o bebê mexendo menos) aparecem em destaque no Início, com a orientação de procurar atendimento. Em Cuidados, "Quando procurar a maternidade" lista todos os sinais. O app não substitui a equipe de saúde: na dúvida, ligue para o seu médico ou vá à maternidade.' },
      { q: 'Onde guardo os resultados de exames?', a: 'Em Cuidados, em Resultados, com foto ou PDF. Se o exame veio de um agendamento, ele já se liga à consulta e à jornada.', go: { target: 'exames', label: 'Abrir os Resultados' } },
      { q: 'O que tem na aba Parto?', a: 'A mala da maternidade, o plano de parto e dois contadores para a reta final: o das contrações (com o intervalo entre elas) e o dos movimentos do bebê.', go: { target: 'parto', label: 'Abrir o Parto' } },
    ],
  },
  {
    id: 'familia',
    title: 'Família',
    items: [
      { q: 'O que a família vê?', a: 'Só o que vocês marcarem como "Família" no diário, o nome do bebê e as novidades que vocês quiserem dividir. Saúde, exames e agenda ficam só com vocês dois.' },
      { q: 'Como convido ou removo alguém da família?', a: 'Em Nosso espaço (as fotinhas no alto), na parte Família. Quem é removido perde o acesso na hora.', go: { target: 'espaco', label: 'Abrir Nosso espaço' } },
    ],
  },
  {
    id: 'avisos',
    title: 'Avisos no celular',
    items: [
      { q: 'Como ligo os avisos?', a: 'Em Nosso espaço, na parte de avisos, toque para ativar e aceite no celular. Dá para escolher o que receber: consultas, tarefas, lembretes e novidades do parceiro.', go: { target: 'espaco', label: 'Abrir Nosso espaço' } },
      { q: 'Não estou recebendo os avisos. E agora?', a: 'Confira se as notificações do navegador ou do app instalado estão permitidas nas configurações do celular. No iPhone, os avisos só funcionam com o app adicionado à Tela de Início.' },
    ],
  },
  {
    id: 'privacidade',
    title: 'Privacidade e dados',
    items: [
      { q: 'Meus dados ficam seguros?', a: 'Sim. Só quem está no espaço de vocês vê os registros, e a família só vê o que vocês liberarem. O app segue a LGPD.' },
      { q: 'Como baixo ou apago meus dados?', a: 'Em Nosso espaço → Seus dados. Você pode baixar tudo num arquivo ou apagar a conta a qualquer momento.', go: { target: 'espaco', label: 'Abrir Nosso espaço' } },
    ],
  },
];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** A busca: todas as palavras precisam aparecer na pergunta ou na resposta (sem ligar para acentos). */
export function searchHelp(query: string, topics: HelpTopic[] = HELP_TOPICS): HelpTopic[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return topics;
  return topics
    .map(t => ({ ...t, items: t.items.filter(i => words.every(w => fold(`${i.q} ${i.a} ${t.title}`).includes(w))) }))
    .filter(t => t.items.length > 0);
}
