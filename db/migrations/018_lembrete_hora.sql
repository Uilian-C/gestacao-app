-- 018: lembretes com hora.
--
-- Diário e tarefas: além do dia, a hora do aviso (remind_at). Sem hora
-- (registros antigos), o aviso continua saindo às 8h do dia.
-- Agenda: um aviso a mais antes do horário (30 min, 1 h, 2 h ou 1 dia),
-- além dos de sempre (véspera e manhã do dia).
-- Os avisos com hora saem pelo /api/lembretes chamado a cada 15 minutos.
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS remind_at timestamptz;
ALTER TABLE partner_tasks ADD COLUMN IF NOT EXISTS remind_at timestamptz;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS remind_before integer;
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_remind_before_check;
ALTER TABLE consultations ADD CONSTRAINT consultations_remind_before_check CHECK (remind_before IN (30, 60, 120, 1440));
CREATE INDEX IF NOT EXISTS journal_entries_remind_at_idx ON journal_entries (remind_at) WHERE remind_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS partner_tasks_remind_at_idx ON partner_tasks (remind_at) WHERE remind_at IS NOT NULL;

SELECT 'ok' AS lembrete_hora;
