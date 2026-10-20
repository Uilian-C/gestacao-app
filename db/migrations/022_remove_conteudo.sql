-- 022: tira o conteúdo editado à mão (mensagem do dia e leituras da semana).
--
-- A mensagem do dia e as leituras saíram do app; a tabela da 021 não é mais usada.
DROP TABLE IF EXISTS content_items;

SELECT 'ok' AS remove_conteudo;
