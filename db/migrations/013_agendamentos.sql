-- 013: agendamentos de consulta, exame, ultrassom e vacina.
--
-- consultations passa a guardar qualquer agendamento:
--   kind = consulta (padrão, como antes), exame, ultrassom ou vacina;
--   title = nome do exame ou da vacina (nas consultas, vale a especialidade);
--   plan_item = item da jornada do pré-natal, quando houver.
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS kind varchar(10) NOT NULL DEFAULT 'consulta';
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS plan_item varchar(40);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_kind_check') THEN
    ALTER TABLE consultations ADD CONSTRAINT consultations_kind_check
      CHECK (kind IN ('consulta', 'exame', 'ultrassom', 'vacina'));
  END IF;
END $$;

-- exams.appointment_id: o agendamento de onde veio o resultado (opcional).
-- Se o agendamento for apagado, o resultado continua guardado.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES consultations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS exams_appointment_idx ON exams (appointment_id);

SELECT 'ok' AS agendamentos;
