-- A espera: menino ou menina? O plano do casal (descobrir ou surpresa até o
-- parto), o dia do exame, o resultado (que pode ficar guardado como surpresa
-- para a outra pessoa abrir), o bolão de palpites (casal e família) e os nomes
-- por sexo, com a lista final.
ALTER TABLE families ADD COLUMN IF NOT EXISTS sex_plan varchar(10) CHECK (sex_plan IN ('descobrir', 'surpresa'));
ALTER TABLE families ADD COLUMN IF NOT EXISTS sex_test_date date;
ALTER TABLE families ADD COLUMN IF NOT EXISTS baby_sex varchar(6) CHECK (baby_sex IN ('menina', 'menino'));
ALTER TABLE families ADD COLUMN IF NOT EXISTS sex_known_at timestamptz;
-- Quem guardou o resultado como surpresa: só essa pessoa vê até a outra abrir.
ALTER TABLE families ADD COLUMN IF NOT EXISTS sex_secret_by text REFERENCES "user"(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS sex_guesses (
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  author_role varchar(10) NOT NULL,
  guess       varchar(6) NOT NULL CHECK (guess IN ('menina', 'menino')),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, user_id));

ALTER TABLE baby_name_ideas ADD COLUMN IF NOT EXISTS for_sex varchar(6) NOT NULL DEFAULT 'ambos' CHECK (for_sex IN ('menina', 'menino', 'ambos'));
ALTER TABLE baby_name_ideas ADD COLUMN IF NOT EXISTS finalist boolean NOT NULL DEFAULT false;

-- Os cartões novos entram na contagem (sem conteúdo).
ALTER TABLE product_events DROP CONSTRAINT IF EXISTS product_events_kind_check;
ALTER TABLE product_events ADD CONSTRAINT product_events_kind_check
  CHECK (kind IN ('ritual', 'cartao_semana', 'cartao_contagem', 'cartao_momento', 'cartao_primeira_vez', 'cartao_barriga', 'cartao_carta', 'cartao_nome', 'cartao_espera', 'cartao_revelacao', 'cartao_finalistas', 'livro_impresso'));
SELECT 'ok' AS espera;
