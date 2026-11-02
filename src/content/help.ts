// A Central de Ajuda: perguntas de verdade, respondidas em poucas linhas e no
// tom do app. Cada resposta pode levar direto à tela certa ("Ir para lá").

export type HelpTarget = 'agenda' | 'calendario' | 'tarefas' | 'jornada' | 'bebe' | 'mural' | 'fichario' | 'livro' | 'barriga' | 'celebracoes' | 'saude' | 'exames' | 'nomes' | 'espaco' | 'parto';

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
      { q: 'O que é "O Tumtum de hoje"?', a: 'É o fechamento do dia, em um minuto: como foi o seu dia (o humor) e uma frase sobre ele. A frase vira a página do dia no livro de vocês, e a outra pessoa recebe um aviso ("fechou o dia. E o seu?"). A partir das 18h, o Início convida e, às 21h, chega um lembrete, só para quem ainda não contou como está nem fechou o dia (dá para desligar em Nosso espaço, em "Lembretes do diário e das tarefas").' },
      { q: 'O que dá para compartilhar?', a: 'A semana do bebê (no Início, embaixo do bebê), a contagem para um marco, qualquer lembrança do diário (abra e toque em "Compartilhar"): a frase de quem escreveu, com a foto; uma primeira vez; a barriguinha ao lado da primeira foto, para ver o quanto cresceu; um trecho de carta, assinado; e o nome escolhido (no caderno de nomes). Antes de sair, você vê a prévia e escolhe o formato: stories e status do WhatsApp, ou post. Nada sai sem o seu toque, e a imagem só leva o que aparece nela.' },
      { q: 'Dá para desligar o som do tum-tum?', a: 'Sim. Em Nosso espaço, em "Som do tum-tum". A vibração continua nos celulares que vibram.', go: { target: 'espaco', label: 'Abrir Nosso espaço' } },
      { q: 'O que é o botão "Registrar"?', a: 'É o botão do meio do menu, para guardar algo de onde você estiver. Ele começa perguntando "O que vocês querem guardar?": escreva do seu jeito ("estou enjoada", "ouvimos o coração", "marquei o ultrassom dia 12") e o Tumtum sugere onde guardar, ou toque num dos tipos, cada um explicado em uma linha. O que você escreveu já vai junto para o formulário, e "Trocar o tipo" volta para a pergunta. Em cada aba ele mostra os tipos daquela aba; no Diário, abre direto no registro.' },
    ],
  },
  {
    id: 'inicio',
    title: 'O Início e o bebê',
    items: [
      { q: 'O que é a Jornada do bebê?', a: 'Toque no bebê, no alto do Início: abre a linha do crescimento da 4ª à 40ª semana, com o tamanho e o peso de cada fase e as fotos da barriga de vocês. Ali também dá para escolher o tom do bebê desenhado.', go: { target: 'bebe', label: 'Abrir a Jornada do bebê' } },
      { q: 'O que é a "Descoberta de hoje"?', a: 'Uma frase nova a cada dia da gestação, logo abaixo do bebê, sobre o que está acontecendo com ele ou com vocês. Ela termina num convite para guardar o dia: contar para o bebê, escrever uma carta ou tirar a foto da barriga.' },
      { q: 'Por que a semana apareceu embrulhada?', a: 'No primeiro acesso da semana nova, ela chega como um presente. Um toque abre: o coração sobe e o bebê aparece com a novidade da semana. Na véspera, chega um aviso para vocês voltarem.' },
      { q: 'O que é o "Desde a última vez"?', a: 'Quando você volta depois de algumas horas, uma linha no topo conta o que aconteceu enquanto esteve fora: quanto o bebê cresceu, o que a outra pessoa guardou, os abraços e as reações ao que você postou. Some depois de vista.' },
      { q: 'Para que serve contar como estou?', a: 'Em "Como vocês estão hoje?", um toque guarda o humor do dia e a outra pessoa vê. Os dias seguidos em que os dois contam aparecem ali, e cada semana inteira assim ganha um coração no livro. Falhar um dia não apaga nada.' },
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
      { q: 'Qual a diferença entre o Livro e o Mural?', a: 'O Livro é a memória: a história de vocês, um capítulo por mês, com as pastas logo abaixo da capa (primeiras vezes, momentos, cartas, barriguinha, celebrações e o humor de vocês). O Mural é a conversa do dia a dia, com abraço e comentários, e é onde chegam as novidades do outro e da família.', go: { target: 'mural', label: 'Abrir o Mural' } },
      { q: 'O que são as "páginas a duas vozes"?', a: 'Quando um dos dois guarda um momento, o outro recebe o convite para completar com o que sentiu. A resposta fica no mesmo momento, embaixo da primeira, e aparece assim no Mural e no livro.', go: { target: 'mural', label: 'Abrir o Mural' } },
      { q: 'Dá para ter o livro impresso?', a: 'Sim, em pré-venda. No Livro, toquem em "Montar o livro": escolham o modelo (livreto, clássico de capa dura ou a caixa memória), o que entra (as cartas, a barriga, as primeiras vezes, o bolão, os recados da família), a capa e a dedicatória, e reservem sem compromisso. Nada é cobrado agora: quando a gráfica abrir, vocês recebem o preço e um aviso para confirmar. A família também pode avisar que quer presentear o livro.', go: { target: 'livro', label: 'Abrir o Livro' } },
      { q: 'O que são as "Primeiras vezes"?', a: 'Um álbum no Livro (nas pastas, abaixo da capa) com os marcos da gestação: contar para a família, ouvir o coração, o primeiro chute, a primeira roupinha e outros. Alguns já se marcam sozinhos, como o nome escolhido e a primeira foto da barriga. Cada um guardado vira uma página especial do livro.', go: { target: 'fichario', label: 'Abrir as pastas' } },
      { q: 'Quem vê o que eu escrevo?', a: 'Você escolhe em cada registro: "Só eu", "Nós dois" ou "Família". O que é "Só eu" fica só com você, inclusive no livro.' },
      { q: 'Posso guardar vídeos?', a: 'Sim. Ao guardar no diário, toque em "Galeria" e escolha o vídeo (o ultrassom, o primeiro chute...). Ele toca no Mural, e quem vê o registro vê o vídeo. Cada vídeo pode ter até 100 MB; se for maior, corte um trecho no celular antes. Também dá para juntar o vídeo do ultrassom ao resultado, em Cuidados.' },
      { q: 'Como funciona a barriguinha?', a: 'Uma foto por semana, sempre do mesmo jeito. O app monta a evolução da barriga para vocês verem (e guardarem) depois.', go: { target: 'barriga', label: 'Abrir a Barriguinha' } },
      { q: 'O que é o livro de vocês?', a: 'Cada mês da gestação vira um capítulo, contado como uma história, com o bebê daquela fase, as lembranças de vocês e o humor de cada semana. Toda lembrança nova "entra no livro" na hora. Dá para ler como um e-book, passando as páginas, e imprimir ou salvar em PDF.', go: { target: 'livro', label: 'Abrir o livro' } },
      { q: 'Posso imprimir só algumas páginas?', a: 'Sim. No livro, toque em imprimir e escolha os capítulos. O app lembra o que já foi impresso e avisa quando há páginas novas.' },
    ],
  },
  {
    id: 'celebracoes',
    title: 'Celebrações e nome do bebê',
    items: [
      { q: 'Como organizo o chá de bebê?', a: 'Em Diário → Livro → Celebrações (nas pastas), toque em "Nova celebração". Ela já vem com um roteiro de tarefas com prazos contados a partir da data, além de fornecedores, convidados (com o tamanho de fralda de cada um) e ideias.', go: { target: 'celebracoes', label: 'Abrir as Celebrações' } },
      { q: 'Como acompanho o orçamento da festa?', a: 'Ao marcar um orçamento previsto, a régua mostra quanto já está combinado e pago e avisa quando está perto do limite ou passou dele.' },
      { q: 'Menino ou menina? Como funciona "A espera"?', a: 'No Início, em "Vocês", fica a espera de vocês: contem se vão descobrir (e quando) ou se vai ser surpresa até o parto. Enquanto não sabem, rola o bolão: vocês dois e a família dão palpite. Quando descobrirem, toquem em "Já descobriram?". Dá para guardar o resultado num envelope, de surpresa para a outra pessoa abrir quando quiser, com direito a revelação. Depois, o caderno de nomes mostra só os nomes que valem, e as estrelas montam a lista final. Cada etapa tem um cartão para os stories.' },
      { q: 'Como a família e os amigos dão palpite sem ter o app?', a: 'Em "A espera", toque em "Chamar mais gente" e mande o cartão do placar com o link pelo WhatsApp. Quem recebe vota em um toque, sem conta e sem baixar nada, e vê o placar. Quando vocês descobrirem, cada um abre o mesmo link e vê se acertou.' },
      { q: 'São gêmeos! Como fica no app?', a: 'Em "A espera", marquem "Gêmeos 👶👶". O bolão vira três times: duas meninas, um casal ou dois meninos (no app e no link para a família), o Início mostra os dois bebês e a revelação conta o que vocês descobriram. No caderno de nomes, escolham o primeiro e depois o do segundo bebê: com os dois, o app passa a chamar os dois juntos, como "Helena e Theo". Depois de escolhido, o plano fica numa linha com "Mudar", e o placar vem primeiro. Se trocarem entre um bebê e gêmeos, o app pede confirmação: os palpites de antes ficam guardados e voltam se vocês desfizerem a mudança.' },
      { q: 'Vamos fazer chá revelação. Como guardar o segredo?', a: 'Em "A espera" → "Já descobriram?", toque em "Enviar o envelope do chá" e mande o link só para quem vai guardar o segredo (a médica, a confeiteira, uma amiga). Ela registra o resultado e ninguém do espaço vê. No chá, um de vocês toca no envelope e abre, junto com todo mundo.' },
      { q: 'Como funciona o caderno de nomes?', a: 'Cada ideia de nome ganha uma página com o porquê, quem curtiu e a conversa sobre ele. A família pode dar palpite, mas quem escolhe são vocês.', go: { target: 'nomes', label: 'Abrir o caderno de nomes' } },
    ],
  },
  {
    id: 'saude',
    title: 'Saúde',
    items: [
      { q: 'Onde registro sintomas, peso e pressão?', a: 'Em Cuidados, pelo botão "Registrar". Logo depois de guardar um sintoma, o app mostra o que costuma ajudar e se ele se repetiu na semana. Tocando em Sintomas ou em Peso e pressão, vocês veem a evolução e cada registro.', go: { target: 'saude', label: 'Abrir Cuidados' } },
      { q: 'Como preparo a consulta?', a: 'Em Cuidados, no cartão da próxima consulta, toque em "Preparar a consulta". Ali vocês anotam as dúvidas para levar e têm o resumo pronto (sintomas, peso, pressão e os dados da gestação) para imprimir, salvar em PDF ou mandar para o profissional. Depois, anotem as respostas.', go: { target: 'saude', label: 'Abrir Cuidados' } },
      { q: 'Como escolho o que levar no relatório?', a: 'Em Cuidados, toque em "Relatório" (logo abaixo da consulta). Escolham o período com as datas de início e fim (ou um atalho: desde a última consulta, últimos 30 dias, este trimestre, toda a gestação) e as partes que entram: dados da gestação, pontos de atenção, sintomas, peso, pressão e dúvidas. Depois é só imprimir, salvar em PDF ou copiar o texto.', go: { target: 'saude', label: 'Abrir Cuidados' } },
      { q: 'Onde acho os dados da gestação durante a consulta?', a: 'Em Cuidados, logo abaixo da próxima consulta, no atalho "Dados da gestação": um toque e aparecem tipo sanguíneo, DPP, alergias e o resto, para responder na hora.', go: { target: 'saude', label: 'Abrir Cuidados' } },
      { q: 'O que é a Jornada?', a: 'É o roteiro do pré-natal, semana a semana: consultas, exames e vacinas recomendados. Fica em Cuidados, no cartão Pré-natal. Quando vocês agendam ou guardam um resultado, ela se marca sozinha.', go: { target: 'jornada', label: 'Abrir a Jornada' } },
      { q: 'O app avisa sobre sinais de alerta?', a: 'Sim. Alguns sintomas (como sangramento, dor forte, pressão alta ou o bebê mexendo menos) aparecem em destaque no Início, com a orientação de procurar atendimento. Em Cuidados, "Quando procurar a maternidade" lista todos os sinais. O app não substitui a equipe de saúde: na dúvida, ligue para o seu médico ou vá à maternidade.' },
      { q: 'Onde guardo os resultados de exames?', a: 'Em Cuidados, em Resultados, com foto, vídeo ou PDF. Se o exame veio de um agendamento, ele já se liga à consulta e à jornada.', go: { target: 'exames', label: 'Abrir os Resultados' } },
      { q: 'O que tem na aba Parto?', a: 'Tudo organizado por fase: Preparar (o plano de parto e a mala), Reta final (a contagem dos movimentos do bebê) e Chegou a hora (o marcador de contrações e quando ir para a maternidade). A fase de vocês aparece em destaque.', go: { target: 'parto', label: 'Abrir o Parto' } },
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
      { q: 'Como ligo os avisos?', a: 'Em Nosso espaço, em "Notificações no celular", toque em "Ativar neste aparelho" e aceite. Dá para escolher o que receber: consultas, lembretes do diário e das tarefas, semana nova e os registros da outra pessoa.', go: { target: 'espaco', label: 'Abrir Nosso espaço' } },
      { q: 'Posso escolher a hora dos avisos?', a: 'Sim. Em Notificações, escolha o melhor horário para as novidades: manhã, tarde ou noite. A semana nova e as novidades chegam nesse horário, no máximo uma por dia, e nada da outra pessoa chega de madrugada. Consultas e lembretes chegam sempre na hora.', go: { target: 'espaco', label: 'Abrir Nosso espaço' } },
      { q: 'Não estou recebendo os avisos. E agora?', a: 'Confira se as notificações do navegador ou do app instalado estão permitidas nas configurações do celular. No iPhone, os avisos só funcionam com o app adicionado à Tela de Início.' },
    ],
  },
  {
    id: 'cuidado',
    title: 'Momentos difíceis',
    items: [
      { q: 'Perdemos o bebê. O que acontece com o app?', a: 'Sentimos muito. Em Nosso espaço, no fim, fica o modo cuidado. Ele pausa para vocês dois e para a família os avisos de semana, as contagens e as celebrações, e o Início vira um lugar de acolhimento, com apoio e cuidados com o corpo. Tudo o que vocês guardaram continua aqui, e qualquer um dos dois pode desligar quando quiser.', go: { target: 'espaco', label: 'Abrir Nosso espaço' } },
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
