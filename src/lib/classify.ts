import type { Folder } from '../hooks/useGestationData';

// A pasta de um registro, adivinhada pelo que a pessoa escreve: quem posta no
// Mural só escreve; o Tumtum sugere onde guardar (e a pessoa pode trocar).
// Na dúvida, vai para o Dia a dia, que é onde cabe quase tudo.

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Uma carta começa falando com o bebê. */
const LETTER = /^\s*(querid[oa]s?|meu (amor|bebe|filh[oa]|pequen[oa])|minha (filha|pequena|vida)|filh[oa]|bebe,|para (voce|o bebe|a bebe)|oi,? (bebe|filh[oa]|amor))\b/;

/** As primeiras vezes e as grandes notícias. */
const MOMENT = [
  /primeir[oa]s? (vez|chute|ultra|foto|roupa|sapat|consulta|mexid)/,
  /pela primeira vez/,
  /\b(ouvimos|ouvi|escutamos) (o )?(coracao|coracaozinho|batimento)/,
  /\b(chutou|mexeu|chutinho)/,
  /\b(descobrimos|revelacao|cha revelacao|e (um )?menin[oa])\b/,
  /\b(contamos|contei|anunciamos)\b.{0,24}\b(para|pra|aos?)\b/,
  /\b(positivo|deu positivo)\b/,
  /\b(escolhemos o nome|o nome (dele|dela|vai ser))/,
  /\b(cha de bebe|cha de fralda|ensaio|book)\b.*\b(foi|aconteceu|hoje|ontem)\b/,
  /\b(ultrassom|morfologic[oa]|ultra)\b.*\b(vimos|apareceu|mostrou|deu)\b/,
];

/** Planos e listas: o que ainda vai acontecer. */
const IDEA = [
  /^\s*(ideia|ideias|lista|plano|planos|lembrar de|nao esquecer|precisamos|temos que|comprar)\b/,
  /\b(nomes? que (gostamos|gosto|pensamos))\b/,
  /\b(enxoval|lista de|para comprar|pra comprar|orcamento|decoracao do quarto|ideia para|ideia de|planejar|planejando)\b/,
];

/** Registro sem pasta escolhida: pela foto e pelas palavras. */
export function guessFolder(body: string, hasPhoto = false): Folder {
  const t = norm(body);
  if (LETTER.test(t)) return 'carta';
  if (IDEA.some(r => r.test(t))) return 'ideia';
  if (MOMENT.some(r => r.test(t))) return 'momento';
  if (hasPhoto && /\b(barriga|barriguinha|barrigao)\b/.test(t)) return 'barriga';
  return 'dia';
}
