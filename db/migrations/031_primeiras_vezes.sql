-- 031: as primeiras vezes.
--
-- Um registro do diário pode ser a "primeira vez" de um marco (ouvir o
-- coração, o primeiro chute, a primeira roupinha...). O app mostra os marcos
-- como cartões de um álbum e cada um vira uma página especial do livro.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS first_time varchar(16);

SELECT 'ok' AS primeiras_vezes;
