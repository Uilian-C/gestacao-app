-- 026: a escolha do nome do bebê, como parte da jornada.
--
-- Enquanto o casal não decide, cada um (e a família) sugere nomes e curte os
-- que gosta. Quando o casal escolhe, o nome vai para families.baby_name
-- (migração 025) e as ideias ficam guardadas como parte da história.
CREATE TABLE IF NOT EXISTS baby_name_ideas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name         varchar(40) NOT NULL,
  user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  author_role  varchar(10) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS baby_name_ideas_unico ON baby_name_ideas (family_id, lower(name));

CREATE TABLE IF NOT EXISTS baby_name_likes (
  idea_id      uuid NOT NULL REFERENCES baby_name_ideas(id) ON DELETE CASCADE,
  user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  author_role  varchar(10) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (idea_id, user_id)
);

SELECT 'ok' AS nomes_do_bebe;
