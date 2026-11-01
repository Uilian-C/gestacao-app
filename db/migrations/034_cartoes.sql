-- Cartões para compartilhar: lembrança, primeira vez, barriga, carta e nome.
-- A contagem continua sem conteúdo (só o tipo, o espaço, a pessoa e a data).
ALTER TABLE product_events DROP CONSTRAINT IF EXISTS product_events_kind_check;
ALTER TABLE product_events ADD CONSTRAINT product_events_kind_check
  CHECK (kind IN ('ritual', 'cartao_semana', 'cartao_contagem', 'cartao_momento', 'cartao_primeira_vez', 'cartao_barriga', 'cartao_carta', 'cartao_nome', 'livro_impresso'));
SELECT 'ok' AS cartoes;
