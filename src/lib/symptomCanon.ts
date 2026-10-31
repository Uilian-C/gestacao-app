import type { CommonSymptom } from '../content/symptomCatalog';
import type { TimeOfDay } from '../types';

// O mesmo sintoma escrito de jeitos diferentes ("Enjoo", "enjoada", "hoje senti
// enjoo", "estou muito enjoada nesta manhã") é um sintoma só: a contagem, o
// gráfico de recorrência, os padrões e o relatório juntam tudo. Cada sintoma
// conhecido tem os termos que o reconhecem (começos de palavra, já sem acento);
// quando a frase cita mais de um, vale o termo mais longo (o mais específico:
// "ânsia de vômito" é enjoo, não vômito) e, empatando, o que aparece primeiro.
// Sem termo conhecido, a frase perde as palavras de ligação ("hoje", "senti",
// "muito"...) das pontas, e o que sobra vira o nome.

export interface CanonSymptom {
  /** Chave do agrupamento: o nome sem acento e em minúsculas ("enjoo"). */
  key: string;
  /** Como aparece nas listas e gráficos ("Enjoo"). */
  name: string;
  category: CommonSymptom['category'] | null;
}

interface Known {
  name: string;
  category: CommonSymptom['category'];
  terms: string[];
}

const KNOWN: Known[] = [
  { name: 'Enjoo', category: 'Digestivo', terms: ['enjo', 'enjoa', 'nause', 'ansia', 'ansia de vomito', 'estomago embrulhado', 'embrulhad', 'vontade de vomitar'] },
  { name: 'Vômito', category: 'Digestivo', terms: ['vomit', 'vomei', 'vomitei'] },
  { name: 'Cansaço', category: 'Físico', terms: ['cansa', 'cansaco', 'exaust', 'fadiga', 'esgotad', 'sem energia', 'sem disposicao', 'moida'] },
  { name: 'Sonolência', category: 'Sono', terms: ['sonolen', 'muito sono', 'com sono', 'sono o dia todo', 'sono durante o dia', 'morrendo de sono'] },
  { name: 'Insônia', category: 'Sono', terms: ['insonia', 'nao consigo dormir', 'nao consegui dormir', 'sem conseguir dormir', 'dormi mal', 'sem dormir', 'acordei varias vezes', 'sono ruim', 'perdi o sono'] },
  { name: 'Seios doloridos', category: 'Físico', terms: ['seio', 'mamas', 'mamilo', 'peito dolorido', 'peitos doloridos', 'dor no peito'] },
  { name: 'Tontura', category: 'Físico', terms: ['tontur', 'tonta', 'tonto', 'vertigem', 'zonz', 'cabeca rodando'] },
  { name: 'Oscilação de humor', category: 'Emocional', terms: ['oscilacao de humor', 'humor', 'chorona', 'choro', 'chorei', 'chorando', 'irritad', 'sensivel', 'emotiva', 'emocional'] },
  { name: 'Ansiedade', category: 'Emocional', terms: ['ansied', 'ansios', 'preocupad', 'nervos', 'angust', 'aflit'] },
  { name: 'Azia', category: 'Digestivo', terms: ['azia', 'queimacao', 'refluxo', 'estomago queimando'] },
  { name: 'Dor lombar', category: 'Físico', terms: ['lombar', 'dor nas costas', 'dor na costa', 'costas doendo', 'costa doendo', 'dor na coluna', 'coluna doendo'] },
  { name: 'Câimbras', category: 'Físico', terms: ['caimbra', 'caibra', 'caimbras', 'caibras'] },
  { name: 'Intestino preso', category: 'Digestivo', terms: ['intestino preso', 'prisao de ventre', 'constipa', 'intestino travado'] },
  { name: 'Gases', category: 'Digestivo', terms: ['gases', 'flatul', 'barriga estufada', 'estufad'] },
  { name: 'Congestão nasal', category: 'Físico', terms: ['congest', 'nariz entupido', 'entupid', 'rinite', 'nariz trancado'] },
  { name: 'Sangramento no nariz', category: 'Físico', terms: ['sangramento no nariz', 'sangramento nasal', 'nariz sangr', 'sangue no nariz', 'sangrou o nariz', 'sangrando o nariz'] },
  { name: 'Gengiva sangrando', category: 'Físico', terms: ['gengiva'] },
  { name: 'Dor de cabeça', category: 'Físico', terms: ['dor de cabeca', 'cabeca doendo', 'cabeca doi', 'enxaqueca', 'cefaleia'] },
  { name: 'Inchaço', category: 'Físico', terms: ['inchac', 'inchad', 'inchou', 'edema', 'pes inchados'] },
  { name: 'Falta de ar', category: 'Físico', terms: ['falta de ar', 'sem ar', 'dificuldade para respirar', 'dificuldade de respirar', 'ofegant'] },
  { name: 'Contrações de treinamento', category: 'Físico', terms: ['contracoes de treinamento', 'contracao de treinamento', 'treinamento', 'braxton', 'barriga dura', 'barriga endurec'] },
  { name: 'Contrações regulares', category: 'Físico', terms: ['contracoes regulares', 'contracoes ritmadas', 'contracoes de 5 em 5', 'contracoes de 10 em 10'] },
  { name: 'Contrações', category: 'Físico', terms: ['contrac'] },
  { name: 'Dor pélvica', category: 'Físico', terms: ['pelvi', 'pube', 'virilha', 'pe da barriga'] },
  { name: 'Dor na barriga', category: 'Físico', terms: ['dor abdominal', 'dor na barriga', 'barriga doendo', 'colica'] },
  { name: 'Sangramento', category: 'Físico', terms: ['sangr', 'sangue'] },
  { name: 'Perda de líquido', category: 'Físico', terms: ['perda de liquido', 'vazamento de liquido', 'vazando liquido', 'bolsa rompeu', 'bolsa estourou'] },
  { name: 'Febre', category: 'Físico', terms: ['febre', 'febril'] },
  { name: 'Visão turva', category: 'Físico', terms: ['visao turva', 'visao embacada', 'vista embacada', 'vista turva', 'pontos brilhantes'] },
  { name: 'Bebê mexendo menos', category: 'Físico', terms: ['mexendo menos', 'mexe menos', 'mexeu menos', 'movimentos diminu', 'nao sinto o bebe', 'nao senti o bebe'] },
  { name: 'Corrimento', category: 'Físico', terms: ['corrimento'] },
  { name: 'Vontade frequente de urinar', category: 'Físico', terms: ['xixi', 'urinar', 'vontade de urinar', 'bexiga'] },
  { name: 'Hemorroidas', category: 'Digestivo', terms: ['hemorr'] },
  { name: 'Varizes', category: 'Físico', terms: ['variz'] },
  { name: 'Dor nas pernas', category: 'Físico', terms: ['dor nas pernas', 'dor na perna', 'pernas doendo', 'perna doendo', 'pernas pesadas'] },
  { name: 'Falta de apetite', category: 'Digestivo', terms: ['falta de apetite', 'sem apetite', 'sem fome', 'perdi a fome'] },
  { name: 'Salivação excessiva', category: 'Digestivo', terms: ['saliva'] },
];

/** "Azia ", "azia" e "AZIA" ficam iguais: sem acento, em minúsculas e com um espaço só. */
export function normalizeSymptomName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Palavras que contam a frase, não o sintoma: saem quando o sintoma não é conhecido.
const FILLER = new Set(
  'hoje ontem agora agorinha desde cedo tarde noite manha madrugada nesta nessa neste nesse esta essa este esse estou to tava estava estive fiquei ficou senti sinto sentindo sentiu tive tenho tendo acordei acordou com de da do das dos na no nas nos em pela pelo um uma uns umas muito muita muitos muitas bem bastante pouco pouca meio forte fortes leve leves fraco fraca demais mais menos que eu ela ele me minha meu e a o as os ao aos ja ainda dia todo toda vez de novo outra'.split(' '),
);

const index = KNOWN.flatMap(k => k.terms.map(term => ({ term, known: k }))).sort((a, b) => b.term.length - a.term.length);

const keyOf = (name: string) => normalizeSymptomName(name);

/** O sintoma por trás do que foi escrito: um nome só para cada sintoma, com a categoria quando é conhecido. */
export function canonSymptom(text: string): CanonSymptom {
  const norm = normalizeSymptomName(text);
  const padded = ` ${norm}`;
  let best: { known: Known; length: number; at: number } | null = null;
  for (const { term, known } of index) {
    // O termo vale no começo de uma palavra: "enjo" pega "enjoada" e "enjoei", "ansia" não pega "ansiedade".
    const at = padded.indexOf(` ${term}`);
    if (at < 0) continue;
    if (!best || term.length > best.length || (term.length === best.length && at < best.at)) best = { known, length: term.length, at };
  }
  if (best) return { key: keyOf(best.known.name), name: best.known.name, category: best.known.category };

  // Tira das pontas o que conta a frase ("hoje senti ... nesta manhã"), mantendo o meio e os acentos.
  const words = text.trim().split(/\s+/);
  const filler = (w: string) => {
    const n = normalizeSymptomName(w);
    return n === '' || n.split(' ').every(part => FILLER.has(part));
  };
  let from = 0;
  let to = words.length;
  while (from < to && filler(words[from])) from++;
  while (to > from && filler(words[to - 1])) to--;
  const core = (from < to ? words.slice(from, to) : words).join(' ').replace(/[.!?,;:]+$/, '');
  return { key: keyOf(core), name: core.charAt(0).toUpperCase() + core.slice(1), category: null };
}

/** O período do dia citado na frase ("nesta manhã", "à noite"), para já vir marcado no registro. */
export function timeOfDayIn(text: string): TimeOfDay | null {
  const norm = ` ${normalizeSymptomName(text)} `;
  if (/ (de |pela |nesta |essa |esta |hoje de )?madrugada /.test(norm)) return 'madrugada';
  if (/ (de |pela |nesta |nessa |essa |esta |hoje de |hoje pela )manha /.test(norm) || / ao acordar /.test(norm)) return 'manha';
  if (/ (a |de |pela |nesta |nessa |essa |esta |hoje a )tarde /.test(norm)) return 'tarde';
  if (/ (a |de |pela |nesta |nessa |essa |esta |hoje a |ontem a )noite /.test(norm) || / antes de dormir /.test(norm)) return 'noite';
  return null;
}

/**
 * O que vai ser salvo: o nome do sintoma ("Enjoo"), para tudo se juntar no
 * mesmo gráfico, e a frase escrita na observação, quando ela conta mais
 * ("estou muito enjoada nesta manhã").
 */
export function symptomToSave(typed: string, notes: string) {
  const text = typed.trim().replace(/\s+/g, ' ');
  const { name } = canonSymptom(text);
  const phrase = text.split(' ').length >= 3 && normalizeSymptomName(text) !== normalizeSymptomName(name);
  const already = normalizeSymptomName(notes).includes(normalizeSymptomName(text));
  return { name, notes: phrase && !already ? [`"${text}"`, notes.trim()].filter(Boolean).join(' · ') : notes.trim() };
}

/**
 * Como um registro aparece nas listas: com o nome do sintoma e o tipo dele, e
 * a frase escrita embaixo quando ela foi guardada como nome (registros de antes).
 */
export function symptomShown(s: { symptom_name: string; category: string }) {
  const canon = canonSymptom(s.symptom_name);
  const raw = s.symptom_name.trim();
  return { name: canon.name, category: canon.category ?? s.category, phrase: normalizeSymptomName(raw) !== normalizeSymptomName(canon.name) ? raw : null };
}
