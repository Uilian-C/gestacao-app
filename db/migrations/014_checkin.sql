-- 014: check-in do dia ("Como você está hoje?").
--
-- Um toque por pessoa por dia: ótima, bem, cansada, enjoada ou ansiosa.
-- A outra pessoa do espaço vê; com o tempo, aparecem os padrões.
-- Tocar de novo no mesmo dia troca a resposta.
CREATE TABLE IF NOT EXISTS checkins (
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  author_role  varchar(10),
  day          date NOT NULL,
  mood         varchar(10) NOT NULL CHECK (mood IN ('otima', 'bem', 'cansada', 'enjoada', 'ansiosa')),
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS checkins_family_idx ON checkins (family_id, day);

SELECT 'ok' AS checkin;
