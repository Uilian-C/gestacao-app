-- Kit do parto: contagem de movimentos do bebê, cronômetro de contrações e
-- plano de parto. Pode ser executado mais de uma vez sem problema.

-- Cada sessão de contagem de movimentos.
CREATE TABLE IF NOT EXISTS kick_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ NOT NULL,
  kicks       INTEGER NOT NULL,
  target      INTEGER NOT NULL DEFAULT 10,
  created_by  VARCHAR(10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cada contração cronometrada (início e fim).
CREATE TABLE IF NOT EXISTS contractions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ NOT NULL,
  created_by  VARCHAR(10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plano de parto do casal (uma linha, conteúdo em JSON).
CREATE TABLE IF NOT EXISTS birth_plan (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by  VARCHAR(10),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
