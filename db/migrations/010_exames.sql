-- 010: exames e ultrassons com foto ou PDF.
-- exams: cada exame (título, data, tipo e, se quiser, o item da jornada do pré-natal).
-- exam_files: as fotos e PDFs de cada exame. O arquivo em si fica no armazenamento
-- de arquivos (Vercel Blob, privado); aqui fica só o caminho e o tipo.
-- visibility = 'private': só quem enviou vê (ex.: um resultado que ainda não quer dividir).
CREATE TABLE IF NOT EXISTS exams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id      text REFERENCES "user"(id) ON DELETE SET NULL,
  author_role  varchar(10),
  kind         varchar(12) NOT NULL CHECK (kind IN ('ultrassom', 'exame', 'outro')),
  title        text NOT NULL,
  exam_date    date NOT NULL,
  plan_item    varchar(40),
  notes        text,
  visibility   varchar(10) NOT NULL DEFAULT 'shared' CHECK (visibility IN ('private', 'shared')),
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exams_family_idx ON exams (family_id);

CREATE TABLE IF NOT EXISTS exam_files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id      uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  path         text NOT NULL UNIQUE,
  content_type varchar(40) NOT NULL,
  size_bytes   integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exam_files_exam_idx ON exam_files (exam_id);
CREATE INDEX IF NOT EXISTS exam_files_family_idx ON exam_files (family_id);

SELECT 'ok' AS exames;
