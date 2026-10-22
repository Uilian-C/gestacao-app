-- 028: Celebrações (chá de bebê, chá de fraldas, chá revelação, ensaio...).
--
-- Cada celebração tem data, local, tema, cores e orçamento; dentro dela, as
-- fichas: tarefas (com prazo fixo ou "X dias antes"), fornecedores (contato,
-- valor e situação), convidados (confirmação e quantas pessoas) e ideias.
-- Por enquanto só o casal organiza.
CREATE TABLE IF NOT EXISTS celebrations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  kind         varchar(20) NOT NULL CHECK (kind IN ('cha_bebe', 'cha_fraldas', 'cha_revelacao', 'ensaio', 'outra')),
  title        varchar(80) NOT NULL,
  event_at     timestamptz,
  location     varchar(300),
  theme        varchar(120),
  colors       jsonb NOT NULL DEFAULT '[]',
  budget       numeric(10, 2),
  notes        varchar(2000),
  created_by   text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS celebrations_family_idx ON celebrations (family_id);

CREATE TABLE IF NOT EXISTS celebration_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id uuid NOT NULL REFERENCES celebrations(id) ON DELETE CASCADE,
  family_id      uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  kind           varchar(12) NOT NULL CHECK (kind IN ('tarefa', 'fornecedor', 'convidado', 'ideia')),
  title          varchar(120) NOT NULL,
  -- Tarefa: prazo fixo ou "X dias antes" da celebração; quem cuida; feita.
  due_date       date,
  due_offset     integer,
  assigned_to    varchar(10) CHECK (assigned_to IN ('mae', 'pai', 'casal')),
  done           boolean NOT NULL DEFAULT false,
  -- Fornecedor: contato, valor e situação. Convidado: situação e quantas pessoas.
  contact        varchar(120),
  amount         numeric(10, 2),
  status         varchar(12),
  people         integer,
  notes          varchar(1000),
  created_by     text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS celebration_items_celebration_idx ON celebration_items (celebration_id);

SELECT 'ok' AS celebracoes;
