-- 025: o nome do bebê.
--
-- Quando o casal escolhe o nome, ele vai para a capa do livro, para a jornada
-- do bebê e para o app todo (a família vê o mesmo nome). Vazio (NULL) até lá.
ALTER TABLE families ADD COLUMN IF NOT EXISTS baby_name varchar(40);

SELECT 'ok' AS nome_do_bebe;
