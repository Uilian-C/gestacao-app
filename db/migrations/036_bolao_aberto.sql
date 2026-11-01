-- A espera, fase 2: o bolão por link aberto (quem não tem o app vota pelo
-- WhatsApp, sem conta) e o envelope do chá revelação (alguém de fora guarda o
-- resultado em segredo e o casal abre junto, na hora).
ALTER TABLE families ADD COLUMN IF NOT EXISTS bolao_token varchar(32) UNIQUE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS envelope_token varchar(32) UNIQUE;
-- O resultado foi guardado por alguém de fora: ninguém do espaço vê até abrir.
ALTER TABLE families ADD COLUMN IF NOT EXISTS sex_sealed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS bolao_votes (
  id         bigserial PRIMARY KEY,
  family_id  uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  -- Um palpite por aparelho (um código aleatório guardado num cookie).
  voter      varchar(64) NOT NULL,
  name       varchar(40) NOT NULL,
  guess      varchar(6) NOT NULL CHECK (guess IN ('menina', 'menino')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, voter));
CREATE INDEX IF NOT EXISTS bolao_votes_family_idx ON bolao_votes (family_id, created_at);

-- A contagem (sem conteúdo) ganha o funil do bolão aberto.
ALTER TABLE product_events DROP CONSTRAINT IF EXISTS product_events_kind_check;
ALTER TABLE product_events ADD CONSTRAINT product_events_kind_check
  CHECK (kind IN ('ritual', 'cartao_semana', 'cartao_contagem', 'cartao_momento', 'cartao_primeira_vez', 'cartao_barriga', 'cartao_carta', 'cartao_nome', 'cartao_espera', 'cartao_revelacao', 'cartao_finalistas', 'livro_impresso', 'bolao_visita', 'bolao_voto', 'bolao_conhecer'));
SELECT 'ok' AS bolao;
