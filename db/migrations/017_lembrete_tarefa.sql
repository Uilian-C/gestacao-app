-- 017: lembrete nas tarefas.
--
-- O dia em que o celular avisa (às 8h, como os lembretes do diário) quem
-- cuida da tarefa: a mãe, o pai ou os dois. Tarefa concluída não avisa.
ALTER TABLE partner_tasks ADD COLUMN IF NOT EXISTS remind_on date;

SELECT 'ok' AS lembrete_tarefa;
