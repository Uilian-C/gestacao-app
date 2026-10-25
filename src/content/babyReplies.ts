import type { Mood } from '../hooks/useGestationData';
import type { Author } from '../types';

// Depois de contar como está, o bebê "responde": uma frase curta, carinhosa e
// verdadeira, que muda a cada dia (três por humor, para a mãe e para o pai;
// os humores têm o mesmo id para os dois, só o rótulo muda).
// {bebe} vira o nome escolhido ou "o bebê"; {Bebe}, o mesmo no começo da frase.

type Replies = Record<Mood, [string, string, string]>;

const MAE: Replies = {
  otima: [
    '{Bebe} sente o seu coração tranquilo: é a música preferida de quem mora aí dentro.',
    'Dia bom de verdade. Que tal guardar uma foto de hoje no diário?',
    'Quando você está bem, {bebe} sente o lugar mais aconchegante do mundo.',
  ],
  bem: [
    'Dia de calmaria também é bonito. {Bebe} segue crescendo no seu ritmo.',
    '"Bem" já é muito. Um copo d\'água e um carinho na barriga fecham o dia.',
    '{Bebe} já pode ouvir a sua voz. Conte em voz alta como foi o seu dia.',
  ],
  cansada: [
    'Seu corpo está construindo uma pessoa inteira. Descansar hoje é cuidar dos dois.',
    'Cansaço tem motivo: {bebe} está crescendo a toda. Que tal deitar um pouco de lado?',
    'Hoje vale pedir ajuda sem culpa. {Bebe} agradece cada pausa.',
  ],
  enjoada: [
    'Enjoo passa, e {bebe} está bem guardado aí. Pequenos lanches e água aos golinhos ajudam.',
    'Que dia difícil. Respire devagar: você está fazendo um trabalho enorme.',
    'Enjoo de hoje, abraço de amanhã. Se não parar nada no estômago, conte na consulta.',
  ],
  ansiosa: [
    'Respire fundo junto com {bebe}: quatro segundos entrando, quatro saindo.',
    'Ansiedade é parte do caminho. Anote o que está pesando e leve para a consulta.',
    'Você não está sozinha nisso. Que tal contar para quem está com você?',
  ],
};

const PAI: Replies = {
  otima: [
    '{Bebe} já reconhece vozes. Que tal falar bem pertinho da barriga hoje?',
    'Dia bom! Guarde este momento no diário para {bebe} ler um dia.',
    'Pai feliz, casa leve. É nesse clima que {bebe} vai chegar.',
  ],
  bem: [
    'Dia tranquilo. Um carinho na barriga e um "boa noite" para {bebe} fecham bem o dia.',
    '{Bebe} cresce um pouco mais a cada dia. Que tal ver o que mudou nesta semana?',
    'Bem já é muito. Que tal perguntar como ela está hoje?',
  ],
  cansada: [
    'Cansaço de quem está se preparando para chegar junto. Descanse também.',
    'Uma pausa hoje faz bem aos três. {Bebe} vai precisar de você inteiro.',
    'Dividir o cansaço ajuda: conversem sobre o que pode ficar para amanhã.',
  ],
  enjoada: [
    'Dia ruim? Um chá e um pouco de descanso. Cuidar de você também é cuidar dela.',
    'Mesmo em dia difícil, a presença conta. Que tal uma mensagem carinhosa para ela?',
    'Melhoras! E se o mal-estar continuar, vale procurar um médico.',
  ],
  ansiosa: [
    'Preocupação de pai é amor em excesso. Conte para ela o que está pesando.',
    'Respire fundo: um passo de cada vez. A jornada mostra o que vem pela frente.',
    'Anote as dúvidas e vão juntos à próxima consulta. Saber acalma.',
  ],
};

/** A resposta do bebê de hoje para um humor (muda a cada dia, mas fica a mesma no mesmo dia). */
export function babyReply(mood: Mood, role: Author, babyName: string | null, day: Date = new Date()): string {
  const list = (role === 'pai' ? PAI : MAE)[mood];
  const dayOfYear = Math.floor((day.getTime() - new Date(day.getFullYear(), 0, 0).getTime()) / 86_400_000);
  const name = babyName?.trim();
  return list[dayOfYear % list.length].replaceAll('{Bebe}', name || 'O bebê').replaceAll('{bebe}', name || 'o bebê');
}
