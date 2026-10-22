-- 024: o tom do bebê desenhado em "Como o bebê cresce".
--
-- Por padrão (NULL ou 'tumtum') o bebê é uma luz suave, sem cor de pele, em
-- que todo casal se vê. Se quiser, o casal escolhe um dos cinco tons de pele
-- (a mesma escala dos emojis); a família vê o mesmo bebê.
ALTER TABLE families ADD COLUMN IF NOT EXISTS baby_tone varchar(10);
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_baby_tone_check;
ALTER TABLE families ADD CONSTRAINT families_baby_tone_check CHECK (baby_tone IN ('tumtum', 'tom1', 'tom2', 'tom3', 'tom4', 'tom5'));

SELECT 'ok' AS tom_do_bebe;
