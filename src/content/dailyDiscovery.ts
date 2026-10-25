// A descoberta do dia: uma frase curta e nova a cada dia da gestação, logo
// abaixo do bebê no Início, que termina num pequeno convite para registrar.
// Três descobertas por semana (de fontes de embriologia e da Caderneta da
// Gestante, em linguagem simples e com "costuma", porque cada bebê tem o
// próprio ritmo); nos outros dias, um convite de vínculo; na véspera da
// semana nova, o aviso de que tem novidade chegando.
// Sem pronome para o bebê: "o bebê" ou o nome escolhido ({bebe}/{Bebe}).

export type InviteKind = 'momento' | 'carta' | 'barriga' | 'voz';

export interface Discovery {
  /** "Dia 154". */
  kicker: string;
  text: string;
  invite: { kind: InviteKind; label: string };
}

const FACTS: Record<number, [string, string, string]> = {
  4: ['{Bebe} é menor que uma semente e já tem um lugar só seu: o útero começou a preparar o ninho.', 'A placenta começa a se formar agora. Vai ser a ponte entre vocês dois até o nascimento.', 'Nesta fase, cansaço e seios sensíveis já podem aparecer: é o corpo avisando que começou.'],
  5: ['Um tubinho que vai virar o coração já começa a pulsar, bem de leve.', 'O que será o cérebro e a coluna está se formando agora, num traço finíssimo.', '{Bebe} cresce cerca de 1 mm por dia nesta fase. Dá para imaginar?'],
  6: ['O coração já bate, quase duas vezes mais rápido que o de vocês.', 'Os brotinhos dos braços e das pernas aparecem esta semana.', 'Pequenas covinhas marcam onde vão ficar os olhos e as orelhas.'],
  7: ['O rostinho começa a se desenhar: narizinho e boca estão a caminho.', '{Bebe} já tem mãos, ainda em forma de remo. Os dedos vêm logo.', 'O cérebro de {bebe} cresce rápido: centenas de novas células por minuto.'],
  8: ['Os dedinhos começam a se separar, das mãos e dos pés.', '{Bebe} já se mexe, mas ainda é pequeno demais para você sentir.', 'As pálpebras se formam e vão ficar fechadas até perto da 27ª semana.'],
  9: ['O coração já tem as quatro câmaras, como o de vocês.', 'Os músculos começam a funcionar: {bebe} dá pequenos sobressaltos.', 'As orelhinhas vão tomando o formato que vocês vão beijar um dia.'],
  10: ['{Bebe} deixou de ser embrião: agora é feto, com todos os órgãos principais esboçados.', 'Já existem as unhas começando a crescer, bem pequenininhas.', 'Os dentinhos de leite já estão guardados dentro da gengiva.'],
  11: ['{Bebe} já abre e fecha as mãos.', 'A cabeça ainda é quase metade do corpo, e isso é exatamente o esperado.', 'Soluços já podem acontecer aí dentro, mesmo sem você sentir.'],
  12: ['{Bebe} já tem impressões digitais começando a se formar: únicas no mundo.', 'Os reflexos aparecem: se a barriga é tocada, {bebe} pode se mexer.', 'Para muitas mães, o enjoo começa a dar uma trégua por aqui.'],
  13: ['As cordas vocais estão se formando. O primeiro choro já tem onde nascer.', '{Bebe} já leva a mão à boca.', 'O primeiro trimestre está terminando: um capítulo inteiro já foi escrito.'],
  14: ['{Bebe} já faz caretas: franze a testa, aperta os olhos.', 'Uma penugem fininha começa a cobrir a pele para proteger e aquecer.', 'O fígado e o baço já trabalham ajudando a formar o sangue.'],
  15: ['{Bebe} já percebe a luz através da barriga, mesmo de olhos fechados.', 'Os ossos estão ficando mais firmes. Os ouvidos também.', 'Os movimentos aumentam: {bebe} chuta, gira e se espreguiça.'],
  16: ['{Bebe} já ensaia expressões de rosto. Algumas podem até parecer sorriso.', 'Os olhinhos já se movem devagar, ainda debaixo das pálpebras.', 'Em algumas gestações, os primeiros movimentos são sentidos a partir de agora, como bolhinhas.'],
  17: ['Uma gordurinha começa a se formar: é o primeiro cobertor de {bebe}.', 'O coração já bombeia vários litros de sangue por dia.', 'O cordão umbilical fica mais grosso e forte.'],
  18: ['{Bebe} já ouve: o seu coração, a sua barriga e, cada vez mais, as vozes de fora.', 'Os dedinhos já ganham as linhas das digitais.', 'Bocejar e soluçar viram parte do dia de {bebe}.'],
  19: ['Uma camada cremosa, o vérnix, começa a proteger a pele de {bebe}.', 'Os sentidos estão em festa: paladar, olfato, audição, tato e visão se conectam no cérebro.', 'Os cabelinhos começam a aparecer no couro cabeludo.'],
  20: ['Metade do caminho. {Bebe} já tem o tamanho de uma banana, da cabeça aos pés.', '{Bebe} engole líquido amniótico e já sente o gosto do que você come.', 'Os chutinhos ficam mais claros. Para quem está de fora, às vezes dá para sentir com a mão.'],
  21: ['As sobrancelhas já estão aparecendo.', '{Bebe} dorme e acorda em ciclos, e pode ser mais agitado quando você deita.', 'O sistema digestivo já faz pequenos treinos.'],
  22: ['Os lábios estão mais definidos e o tato está apurado: {bebe} explora o próprio rosto com as mãos.', 'Os olhos estão formados, só falta a cor da íris.', '{Bebe} já sente quando você se mexe, anda ou balança.'],
  23: ['{Bebe} já reconhece o ritmo da sua voz. Conversar com a barriga conta.', 'Os pulmões começam a ensaiar movimentos de respiração.', 'A pele ainda é fininha e rosada: a gordura vem chegando aos poucos.'],
  24: ['Barulhos fortes podem fazer {bebe} se assustar aí dentro.', 'O rostinho está praticamente pronto, só vai ganhando bochechas.', 'O ouvido interno já dá a {bebe} a noção de estar de cabeça para baixo ou para cima.'],
  25: ['As mãos já se fecham com firmeza. Um dia vão segurar o seu dedo.', '{Bebe} responde ao toque: uma mão na barriga pode receber um chutinho de volta.', 'O cabelo ganha cor e textura.'],
  26: ['Os olhos começam a se abrir.', '{Bebe} já tem um jeito próprio de se mexer. Vocês vão começar a reconhecer.', 'As ondas do cérebro já mostram padrões de sono parecidos com os de um recém-nascido.'],
  27: ['{Bebe} pode ter soluço e você já consegue sentir, como pulinhos ritmados.', 'Os olhos piscam, abrem e fecham.', 'O terceiro trimestre começa: a reta final do livro de vocês.'],
  28: ['{Bebe} já sonha, ou passa pela fase do sono em que os sonhos acontecem.', 'Os pulmões seguem amadurecendo, a cada dia um pouco mais.', 'Daqui para frente, o bebê ganha peso rápido: cerca de 200 g por semana.'],
  29: ['Os ossos estão fortes, mas ainda flexíveis, para a hora de nascer.', '{Bebe} já vira a cabeça em direção à luz.', 'O espaço fica menor: os movimentos viram empurrões e rolamentos.'],
  30: ['O cérebro está ganhando dobrinhas: é ali que cabe tudo o que {bebe} vai aprender.', '{Bebe} já distingue a sua voz das outras.', 'A penugem do corpo começa a cair: a gordurinha agora aquece sozinha.'],
  31: ['{Bebe} já acompanha luz com os olhos e se vira para os sons.', 'Os cinco sentidos estão funcionando.', 'As unhas já chegam na ponta dos dedos.'],
  32: ['{Bebe} treina respirar, sugar e engolir, tudo o que vai precisar no primeiro dia.', 'A pele está ficando lisinha e menos transparente.', 'A maioria dos bebês já está de cabeça para baixo ou vai virar nas próximas semanas.'],
  33: ['O sistema imunológico de {bebe} recebe anticorpos seus pela placenta.', 'Os ossos do crânio ficam soltinhos de propósito, para facilitar o nascimento.', '{Bebe} dorme a maior parte do dia, como vai fazer depois de nascer.'],
  34: ['Músicas que {bebe} ouve agora podem acalmar depois do nascimento.', 'Os pulmões estão quase prontos.', 'O vérnix fica mais grosso para proteger a pele nas últimas semanas.'],
  35: ['{Bebe} já tem quase todo o tamanho: agora é ganhar peso e dobrinhas.', 'Os rins estão desenvolvidos e o fígado já trabalha.', 'O espaço está apertado, mas você ainda deve sentir {bebe} se mexer todos os dias.'],
  36: ['{Bebe} pode descer um pouco na pelve: a respiração costuma aliviar, o xixi aumenta.', 'As bochechas ficam redondinhas: são os músculos de mamar, prontos.', 'A partir da 37ª semana, o bebê já é considerado a termo.'],
  37: ['{Bebe} está a termo: pronto para nascer a qualquer momento das próximas semanas.', 'O cérebro e os pulmões seguem amadurecendo até o último dia.', '{Bebe} treina abrir os olhos, sugar o dedo e agarrar.'],
  38: ['As unhas podem já estar compridinhas. Às vezes nasce precisando cortar.', 'O intestino guarda o mecônio, o primeiro cocô, que vem nos primeiros dias.', 'O cordão e a placenta seguem levando tudo o que {bebe} precisa.'],
  39: ['{Bebe} já tem reflexos de busca: vira o rosto procurando o peito.', 'A pele está pronta para o primeiro abraço, o pele a pele.', 'Os pulmões produzem a substância que ajuda a primeira respiração.'],
  40: ['Semana da data provável. Só cerca de 1 em cada 20 bebês nasce exatamente nela.', '{Bebe} está pronto para conhecer as vozes que ouviu esse tempo todo.', 'Cada dia a mais lá dentro também é crescimento. O tempo de {bebe} é o tempo certo.'],
};

const LATE: [string, string, string] = ['{Bebe} está chegando no próprio tempo. Combinem com a equipe os próximos passos.', 'Movimentos todos os dias seguem sendo um bom sinal. Na dúvida, procurem a maternidade.', 'Falta muito pouco para o primeiro abraço.'];

// Nos dias sem descoberta, um convite de vínculo (sempre com um registro no fim).
const BONDS: Discovery['invite'][] = [
  { kind: 'voz', label: 'Contar como foi o dia' },
  { kind: 'carta', label: 'Escrever uma carta' },
  { kind: 'momento', label: 'Guardar um momento' },
  { kind: 'barriga', label: 'Tirar a foto da barriga' },
];

const BOND_TEXT: Record<InviteKind, string> = {
  voz: '{Bebe} já pode ouvir a sua voz, ou vai poder em breve. Conte em voz alta como foi o dia, e guarde aqui também.',
  carta: 'Uma carta curta hoje vira um presente para {bebe} ler um dia. Duas linhas bastam.',
  momento: 'Os dias comuns são os que mais fazem falta depois. O que aconteceu de bom hoje?',
  barriga: 'A barriga muda um pouco a cada semana. Uma foto hoje e, no fim, vocês têm o filme inteiro.',
};

// O convite que fecha cada descoberta, girando pelos dias.
const FACT_INVITES: Discovery['invite'][] = [
  { kind: 'momento', label: 'Guardar este dia' },
  { kind: 'voz', label: 'Contar para o bebê' },
  { kind: 'carta', label: 'Escrever para o bebê' },
];

const fill = (text: string, name: string | null) => text.replaceAll('{Bebe}', name?.trim() || 'O bebê').replaceAll('{bebe}', name?.trim() || 'o bebê');

/**
 * A descoberta de um dia da gestação (1 = o dia da DUM). No dia em que a
 * semana se completa vem a primeira descoberta da semana; na véspera da
 * próxima, o aviso de novidade chegando.
 */
export function discoveryOf(dayOfPregnancy: number, babyName: string | null): Discovery {
  const day = Math.max(1, dayOfPregnancy);
  const week = Math.floor((day - 1) / 7);
  const d = (day - 1) % 7;
  const kicker = `Dia ${day}`;
  const facts = week < 4 ? FACTS[4] : FACTS[week] ?? LATE;
  const slot = [0, 1, -1, 2, -1, -1, 6][d];
  if (slot === 6 && week < 41) {
    return { kicker, text: fill(`Amanhã ${week + 1} semanas. Tem novidade de {bebe} chegando no Tumtum.`, babyName), invite: { kind: 'momento', label: 'Fechar a semana com um momento' } };
  }
  if (slot >= 0 && slot < 3) return { kicker, text: fill(facts[slot], babyName), invite: FACT_INVITES[(day + slot) % FACT_INVITES.length] };
  const bond = BONDS[(week + d) % BONDS.length];
  return { kicker, text: fill(BOND_TEXT[bond.kind], babyName), invite: bond };
}
