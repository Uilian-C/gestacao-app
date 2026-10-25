-- 030: as páginas a duas vozes e o melhor horário para os avisos.
--
-- Duas vozes: quando um dos dois guarda um momento, o outro pode completar com
-- o que sentiu. A segunda voz fica no próprio registro (uma por registro, de
-- quem não escreveu) e aparece no Mural, nos detalhes e no livro.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS voice_body text;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS voice_user_id text REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS voice_role varchar(4);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS voice_at timestamptz;

-- Melhor horário: as novidades (semana nova e afins) chegam na manhã, na tarde
-- ou na noite que cada pessoa escolher, no máximo uma por dia.
ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS best_time varchar(6);
ALTER TABLE notification_prefs DROP CONSTRAINT IF EXISTS notification_prefs_best_time_check;
ALTER TABLE notification_prefs ADD CONSTRAINT notification_prefs_best_time_check CHECK (best_time IN ('manha', 'tarde', 'noite'));

SELECT 'ok' AS duas_vozes_e_horario;
