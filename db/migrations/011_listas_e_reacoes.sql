-- 011: listas editáveis (mala e jornada) e reações e comentários.
--
-- checklist_items: itens criados pelo casal na mala ou na jornada do pré-natal.
-- O "feito" continua na tabela checklist, com o id do item.
CREATE TABLE IF NOT EXISTS checklist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  list         varchar(10) NOT NULL CHECK (list IN ('prenatal', 'mala')),
  title        text NOT NULL,
  -- Mala: grupo (mae, bebe, acompanhante). Jornada: semana sugerida (opcional).
  bag_group    varchar(20),
  week         smallint,
  created_by   varchar(10),
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS checklist_items_family_idx ON checklist_items (family_id);

-- checklist_hidden: itens da lista padrão que não se aplicam a este casal.
CREATE TABLE IF NOT EXISTS checklist_hidden (
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  list         varchar(10) NOT NULL CHECK (list IN ('prenatal', 'mala')),
  item_id      varchar(40) NOT NULL,
  PRIMARY KEY (family_id, list, item_id)
);

-- reactions: um abraço, força, "estou aqui" ou festa em um momento, exame,
-- sintoma ou tarefa concluída. Cada pessoa pode deixar cada reação uma vez.
CREATE TABLE IF NOT EXISTS reactions (
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  target_type  varchar(10) NOT NULL CHECK (target_type IN ('entry', 'exam', 'symptom', 'task')),
  target_id    uuid NOT NULL,
  user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  author_role  varchar(10),
  kind         varchar(10) NOT NULL CHECK (kind IN ('abraco', 'forca', 'aqui', 'festa')),
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (target_type, target_id, user_id, kind)
);
CREATE INDEX IF NOT EXISTS reactions_family_idx ON reactions (family_id);

-- comments: conversa do casal num momento ou exame (os sintomas já têm o "Cuidar").
CREATE TABLE IF NOT EXISTS comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  target_type  varchar(10) NOT NULL CHECK (target_type IN ('entry', 'exam')),
  target_id    uuid NOT NULL,
  user_id      text REFERENCES "user"(id) ON DELETE SET NULL,
  author_role  varchar(10),
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comments_target_idx ON comments (target_type, target_id);
CREATE INDEX IF NOT EXISTS comments_family_idx ON comments (family_id);

SELECT 'ok' AS listas_e_reacoes;
