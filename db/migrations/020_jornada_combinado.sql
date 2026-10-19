-- 020: o combinado com a equipe em cada item da jornada.
--
-- plan_weeks passa a guardar também uma anotação ("a Dra. Ana pediu repetir
-- com 30 semanas"). A anotação pode existir sem mudar as semanas: aí
-- week_from e week_to ficam vazios e vale a janela de referência.
ALTER TABLE plan_weeks ALTER COLUMN week_from DROP NOT NULL;
ALTER TABLE plan_weeks ALTER COLUMN week_to DROP NOT NULL;
ALTER TABLE plan_weeks ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE plan_weeks DROP CONSTRAINT IF EXISTS plan_weeks_note_check;
ALTER TABLE plan_weeks ADD CONSTRAINT plan_weeks_note_check CHECK (note IS NULL OR char_length(note) <= 500);

SELECT 'ok' AS jornada_combinado;
