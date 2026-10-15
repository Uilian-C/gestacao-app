-- Onda 2: consultas por especialidade, padrões de sintomas e faixa de ganho de peso.
-- Pode ser executado mais de uma vez sem problema.

-- Período do dia em que o sintoma aconteceu (manha, tarde, noite, madrugada).
ALTER TABLE symptoms_log ADD COLUMN IF NOT EXISTS time_of_day VARCHAR(12);

-- Para qual especialidade é a dúvida. NULL = obstetra.
ALTER TABLE medical_appointments ADD COLUMN IF NOT EXISTS specialty VARCHAR(30);

-- Peso antes da gravidez e altura: base do IMC pré-gestacional e da faixa de ganho de peso.
ALTER TABLE families ADD COLUMN IF NOT EXISTS pre_pregnancy_weight_kg NUMERIC(5, 2);
ALTER TABLE families ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 1);

-- Consultas agendadas (obstetra, nutricionista, psicologia, fisioterapia...).
CREATE TABLE IF NOT EXISTS consultations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  specialty         VARCHAR(30) NOT NULL,
  professional_name VARCHAR(120),
  location          VARCHAR(200),
  notes             TEXT,
  created_by        VARCHAR(10),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
