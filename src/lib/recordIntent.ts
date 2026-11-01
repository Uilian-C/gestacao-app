import type { QuickMode } from '../components/QuickRecord';
import { canonSymptom, normalizeSymptomName } from './symptomCanon';

// O "Registrar" começa pelo que a pessoa quer contar, do jeito dela: o Tumtum
// lê a frase e sugere onde guardar ("enjoo forte" é sintoma, "marquei o
// morfológico dia 12" vai para a agenda, "ouvimos o coração" é um momento).
// A sugestão nunca decide sozinha: é o primeiro botão, e os outros continuam ali.

// A frase chega sem acento e sem pontuação ("62,5 kg" vira "62 5 kg").
const has = (text: string, re: RegExp) => re.test(` ${text} `);

// Palavras de lembrança: com elas, mesmo um "chorei" é momento antes de sintoma.
const MOMENT = / (ouvimos|ouvi|vimos|vi o|vi a|primeir[ao]|chute|chutou|mexeu|mexendo|emocao|emocion|amor|feliz|felicidade|contamos|contei|ganhamos|ganhei|carta|querido bebe|querida|barriga|foto|sonhei|nome|enxoval|cha de|quartinho|coracao|batimento|surpresa|alegria|gratid)/;
const SCHEDULE = / (marquei|marcamos|marcar|agendei|agendamos|agendar|consulta (dia|amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|as|na|no)|retorno|dia \d{1,2}|amanha as|as \d{1,2}(h| horas|:))/;
const RESULT = / (resultado|laudo|hemograma|glicemia|tsh|urina tipo|exame de sangue|exame chegou|exame saiu|saiu o exame|chegou o exame)/;
const TASK = /^ ?(comprar|montar|lavar|organizar|levar|ligar|pagar|pesquisar|separar|arrumar|fazer|lembrar|preciso|precisamos|temos que|tenho que|nao esquecer)\b/;
const METRIC = / (\d{2,3}( \d+)? ?kg|peso|pesei|pesando|pressao|\d{2,3} ?(x|por|\/) ?\d{1,3})( |$)/;

/**
 * Onde guardar o que foi escrito, do mais provável ao menos, só entre os
 * tipos que esta tela oferece. Sem pista nenhuma, o momento vem primeiro (o
 * diário é o lugar de tudo).
 */
export function guessRecord(text: string, allowed: QuickMode[]): QuickMode[] {
  const t = normalizeSymptomName(text);
  if (!t) return [];
  const order: QuickMode[] = [];
  const add = (m: QuickMode) => !order.includes(m) && order.push(m);
  const symptom = canonSymptom(text).category !== null;
  if (has(t, METRIC)) add('medicao');
  if (has(t, RESULT)) add('exame');
  if (has(t, SCHEDULE)) add('consulta');
  if (has(t, TASK)) add('tarefa');
  if (has(t, MOMENT)) add('momento');
  if (symptom) add('sintoma');
  add('momento');
  return order.filter(m => allowed.includes(m));
}

/** O sintoma que a frase cita, para o botão dizer "Sintoma · Enjoo". */
export const symptomOf = (text: string) => {
  const c = canonSymptom(text);
  return c.category ? c.name : null;
};
