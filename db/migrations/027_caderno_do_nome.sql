-- 027: o caderno do nome do bebê.
--
-- Cada ideia de nome ganha uma anotação (o porquê, o significado, uma
-- homenagem) e uma conversa (o casal e a família comentam). A data em que o
-- casal escolhe o nome fica guardada, para o livro ganhar a página "o dia do nome".
ALTER TABLE families ADD COLUMN IF NOT EXISTS baby_name_at timestamptz;
ALTER TABLE baby_name_ideas ADD COLUMN IF NOT EXISTS note varchar(300);

CREATE TABLE IF NOT EXISTS baby_name_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id      uuid NOT NULL REFERENCES baby_name_ideas(id) ON DELETE CASCADE,
  user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  author_role  varchar(10) NOT NULL,
  body         varchar(500) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS baby_name_comments_idea_idx ON baby_name_comments (idea_id);

SELECT 'ok' AS caderno_do_nome;
