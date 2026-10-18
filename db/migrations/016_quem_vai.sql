-- 016: quem vai a cada agendamento (consulta, exame, ultrassom, vacina).
--
-- Mãe, pai ou os dois. Quem é chamado recebe um aviso no celular.
-- Vazio nos agendamentos antigos: o app só mostra quando foi escolhido.
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS attendees varchar(10);
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_attendees_check;
ALTER TABLE consultations ADD CONSTRAINT consultations_attendees_check CHECK (attendees IN ('mae', 'pai', 'casal'));

SELECT 'ok' AS quem_vai;
