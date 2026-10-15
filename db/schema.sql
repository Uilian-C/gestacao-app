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
