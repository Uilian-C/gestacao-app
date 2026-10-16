-- Schema do Nossa Gestação (PostgreSQL / Neon).
--
-- Reconstruído a partir do código e da documentação do projeto, porque as
-- tabelas foram criadas direto no console do Neon. Antes de usar para recriar
-- o banco, confira com o schema real:
--   SELECT table_name, column_name, data_type, is_nullable
--   FROM information_schema.columns WHERE table_schema = 'public'
--   ORDER BY table_name, ordinal_position;
--
-- Alterações posteriores ficam em db/migrations/, numeradas em ordem.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS families (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dum_date   DATE,
  pre_pregnancy_weight_kg NUMERIC(5, 2),  -- migração 002
  height_cm  NUMERIC(5, 1),               -- migração 002
  mother_name VARCHAR(120),               -- migração 003 (ficha da gestante)
  mother_birth_date DATE,
  blood_type VARCHAR(5),
  gestations INTEGER,
  births     INTEGER,
  abortions  INTEGER,
  cesareans  INTEGER,
  allergies  TEXT,
  medications TEXT,
  conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS symptoms_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number  INTEGER NOT NULL,
  log_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  symptom_name VARCHAR(255) NOT NULL,
  category     VARCHAR(50),            -- Físico, Digestivo, Emocional, Sono
  intensity    INTEGER CHECK (intensity BETWEEN 1 AND 5),
  created_by   VARCHAR(10),            -- mae, pai
  notes        TEXT,
  time_of_day  VARCHAR(12),            -- manha, tarde, noite, madrugada (migração 002)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_id   UUID NOT NULL REFERENCES symptoms_log(id) ON DELETE CASCADE,
  author_role  VARCHAR(10),            -- mae, pai
  comment_text TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number      INTEGER,
  appointment_date TIMESTAMPTZ,
  questions_to_ask TEXT,
  category         VARCHAR(50),        -- Alimentação, Medicação, Exames, Parto, Geral
  created_by       VARCHAR(10),
  doctor_answer    TEXT,
  answered_at      TIMESTAMPTZ,
  status           VARCHAR(20) DEFAULT 'pendente',  -- pendente, concluida
  specialty        VARCHAR(30),        -- NULL = obstetra (migração 002)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_metrics_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number  INTEGER NOT NULL,
  recorded_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg    NUMERIC(5, 2),          -- opcional desde a migração 001
  systolic_bp  INTEGER,                -- opcional desde a migração 001
  diastolic_bp INTEGER,                -- opcional desde a migração 001
  created_by   VARCHAR(10),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number  INTEGER NOT NULL,
  task_title   VARCHAR(255) NOT NULL,
  assigned_to  VARCHAR(10),            -- mae, pai, casal
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  due_date     DATE,
  priority     VARCHAR(10),            -- Baixa, Média, Alta
  notes        TEXT,
  created_by   VARCHAR(10),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  specialty         VARCHAR(30) NOT NULL,  -- obstetra, nutricionista, psicologia...
  professional_name VARCHAR(120),
  location          VARCHAR(200),
  notes             TEXT,
  created_by        VARCHAR(10),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração 004: kit do parto
CREATE TABLE IF NOT EXISTS kick_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ NOT NULL,
  kicks       INTEGER NOT NULL,
  target      INTEGER NOT NULL DEFAULT 10,
  created_by  VARCHAR(10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contractions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ NOT NULL,
  created_by  VARCHAR(10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS birth_plan (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by  VARCHAR(10),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Migração 005: login (tabelas do Better Auth) e espaços por família.
-- As tabelas "user", "session", "account", "verification" e "rateLimit" estão
-- em db/migrations/005_login_e_espacos.sql. Todas as tabelas de dados acima
-- ganham family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE.

CREATE TABLE IF NOT EXISTS family_members (
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,  -- uma pessoa, um espaço
  role       VARCHAR(10) NOT NULL CHECK (role IN ('mae', 'pai')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS family_invites (
  code        TEXT PRIMARY KEY,           -- 10 caracteres, uso único
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_by     TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ
);
