-- 038: o livro impresso em pré-venda. Nada é cobrado: a reserva guarda o
-- modelo, o que entra, a capa e a dedicatória, para medir qual formato e qual
-- preço as famílias querem antes de contratar a gráfica. E a família pode
-- avisar que quer presentear o livro.
CREATE TABLE IF NOT EXISTS book_orders (
  family_id   uuid PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
  user_id     text REFERENCES "user"(id) ON DELETE SET NULL,
  model       varchar(10) NOT NULL CHECK (model IN ('livreto', 'classico', 'caixa')),
  period      varchar(12) NOT NULL DEFAULT 'tudo' CHECK (period IN ('tudo', 'trimestre1', 'trimestre2', 'trimestre3')),
  include     jsonb NOT NULL DEFAULT '{}'::jsonb,
  cover_title varchar(60) NOT NULL,
  cover_tone  varchar(10),
  cover_photo uuid,
  dedication  varchar(400),
  pages       smallint NOT NULL CHECK (pages BETWEEN 1 AND 400),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  status      varchar(12) NOT NULL DEFAULT 'reservado' CHECK (status IN ('reservado', 'cancelado')),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_gifts (
  family_id  uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, user_id)
);

SELECT 'ok' AS livro_impresso;
