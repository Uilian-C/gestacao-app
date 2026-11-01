-- 033: o que mostra se o Tumtum está fazendo diferença para o casal.
-- product_events: contagens simples de uso, sem conteúdo nenhum (só o tipo e quando):
--   ritual          = alguém fechou o dia ("o Tumtum de hoje")
--   cartao_semana   = compartilhou o cartão da semana
--   cartao_contagem = compartilhou o cartão da contagem
--   livro_impresso  = tocou em "Quero o livro impresso"
CREATE TABLE IF NOT EXISTS product_events (
  id         bigserial PRIMARY KEY,
  family_id  uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id    text REFERENCES "user"(id) ON DELETE SET NULL,
  kind       varchar(20) NOT NULL CHECK (kind IN ('ritual', 'cartao_semana', 'cartao_contagem', 'livro_impresso')),
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS product_events_kind_idx ON product_events (kind, created_at);
CREATE INDEX IF NOT EXISTS product_events_family_idx ON product_events (family_id);

SELECT 'ok' AS valor;
