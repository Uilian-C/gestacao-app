-- Onda 1: permitir registrar só o peso ou só a pressão.
-- Antes, o formulário preenchia 120/80 quando a pressão não era medida.
-- Pode ser executado mais de uma vez sem problema.

ALTER TABLE health_metrics_log ALTER COLUMN weight_kg DROP NOT NULL;
ALTER TABLE health_metrics_log ALTER COLUMN systolic_bp DROP NOT NULL;
ALTER TABLE health_metrics_log ALTER COLUMN diastolic_bp DROP NOT NULL;

-- Opcional: medições antigas gravadas com exatamente 120/80 podem ter vindo do
-- valor pré-preenchido. Confira antes de apagar; só vocês sabem quais foram medidas.
-- SELECT id, week_number, recorded_at, weight_kg FROM health_metrics_log
--  WHERE systolic_bp = 120 AND diastolic_bp = 80;
-- UPDATE health_metrics_log SET systolic_bp = NULL, diastolic_bp = NULL
--  WHERE id IN ('...');
