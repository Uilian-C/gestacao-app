-- 029: o modo cuidado, para quando a gestação é interrompida.
--
-- Guarda o dia em que o casal ligou o modo (NULL = desligado). Com ele ligado,
-- o Tumtum pausa para os dois e para a família os avisos de semana, as
-- contagens e as celebrações, e o Início vira um lugar de acolhimento. Tudo o
-- que foi registrado continua guardado. Qualquer um dos dois pode desligar.
ALTER TABLE families ADD COLUMN IF NOT EXISTS care_since date;

SELECT 'ok' AS modo_cuidado;
