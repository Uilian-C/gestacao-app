// Reações e conversa: quem pode reagir ou comentar em quê.

/**
 * O registro que recebe a reação ou o comentário existe no espaço e esta pessoa pode vê-lo
 * (momentos e exames "Só eu" ficam fora para a outra pessoa). $1 = espaço, $2 = pessoa, $3 = id.
 */
export const VISIBLE_TARGET: Record<'entry' | 'exam' | 'symptom' | 'task', string> = {
  entry: "SELECT 1 FROM journal_entries e WHERE e.id = $3 AND e.family_id = $1 AND (e.visibility <> 'private' OR e.user_id = $2)",
  exam: "SELECT 1 FROM exams x WHERE x.id = $3 AND x.family_id = $1 AND (x.visibility = 'shared' OR x.user_id = $2)",
  // Sintomas e tarefas são sempre do espaço todo ($2 só declarado, para os parâmetros serem os mesmos).
  symptom: 'SELECT 1 FROM symptoms_log s WHERE s.id = $3 AND s.family_id = $1 AND $2::text IS NOT NULL',
  task: 'SELECT 1 FROM partner_tasks t WHERE t.id = $3 AND t.family_id = $1 AND $2::text IS NOT NULL',
};

/**
 * O mesmo filtro para listas (reações e comentários de um espaço): só os de
 * registros que esta pessoa vê. Usa a tabela `alias` e os parâmetros $1 (espaço) e $2 (pessoa).
 */
export function visibleTargetSql(alias: string) {
  return `CASE ${alias}.target_type
    WHEN 'entry' THEN EXISTS (SELECT 1 FROM journal_entries e WHERE e.id = ${alias}.target_id AND e.family_id = $1 AND (e.visibility <> 'private' OR e.user_id = $2))
    WHEN 'exam' THEN EXISTS (SELECT 1 FROM exams x WHERE x.id = ${alias}.target_id AND x.family_id = $1 AND (x.visibility = 'shared' OR x.user_id = $2))
    WHEN 'symptom' THEN EXISTS (SELECT 1 FROM symptoms_log s WHERE s.id = ${alias}.target_id AND s.family_id = $1)
    WHEN 'task' THEN EXISTS (SELECT 1 FROM partner_tasks t WHERE t.id = ${alias}.target_id AND t.family_id = $1)
  END`;
}
