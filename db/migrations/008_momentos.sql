-- 008: momentos (diário afetivo da gestação).
-- visibility = 'private': só quem escreveu vê (nem a outra pessoa do espaço).
-- visibility = 'shared': todos do espaço veem.
-- remind_on: data opcional para lembrar (ex.: "contar para a família").
CREATE TABLE IF NOT EXISTS journal_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id      text REFERENCES "user"(id) ON DELETE SET NULL,
  author_role  varchar(10),
  entry_date   date NOT NULL DEFAULT CURRENT_DATE,
  body         text NOT NULL,
  visibility   varchar(10) NOT NULL DEFAULT 'shared' CHECK (visibility IN ('private', 'shared')),
  remind_on    date,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS journal_entries_family_idx ON journal_entries (family_id);

SELECT 'ok' AS momentos;
