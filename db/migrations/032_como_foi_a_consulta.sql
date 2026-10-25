-- 032: "Como foi a consulta?".
--
-- Algumas horas depois de uma consulta ou ultrassom, o app pergunta como foi:
-- "tudo bem", "ficou uma dúvida" ou "teve novidade". A resposta fica aqui, e
-- quem respondeu não é perguntado de novo (nem a outra pessoa).
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS after_status varchar(10);
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_after_status_check;
ALTER TABLE consultations ADD CONSTRAINT consultations_after_status_check CHECK (after_status IN ('bem', 'duvida', 'novidade'));

SELECT 'ok' AS como_foi_a_consulta;
