-- Tabelas originais do app (criadas à mão no Neon antes das migrações), com uma família de exemplo.
-- Os testes partem daqui e aplicam todas as migrações por cima, como aconteceu em produção.
CREATE TABLE families (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), dum_date DATE, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE symptoms_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), week_number INT, log_date DATE, symptom_name VARCHAR(100), intensity INT, created_by VARCHAR(10), category VARCHAR(30), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE partner_comments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), symptom_id UUID REFERENCES symptoms_log(id), author_role VARCHAR(10), comment_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE medical_appointments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), week_number INT, appointment_date TIMESTAMPTZ, questions_to_ask TEXT, doctor_answer TEXT, created_by VARCHAR(10), category VARCHAR(30), status VARCHAR(20), answered_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE partner_tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), week_number INT, task_title TEXT, assigned_to VARCHAR(10), is_completed BOOLEAN DEFAULT FALSE, due_date DATE, priority VARCHAR(10), notes TEXT, created_by VARCHAR(10), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE health_metrics_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), week_number INT, recorded_at DATE, weight_kg NUMERIC(5,2) NOT NULL, systolic_bp INT NOT NULL, diastolic_bp INT NOT NULL, created_by VARCHAR(10), created_at TIMESTAMPTZ DEFAULT NOW());
-- Dados da família que já existe
INSERT INTO families (dum_date) VALUES ('2026-05-15');
INSERT INTO symptoms_log (week_number, log_date, symptom_name, intensity, created_by, category) VALUES (22, '2026-10-15', 'Azia', 4, 'mae', 'Digestivo');
INSERT INTO partner_comments (symptom_id, author_role, comment_text) SELECT id, 'pai', 'Dei o antiácido' FROM symptoms_log;
INSERT INTO partner_tasks (week_number, task_title, assigned_to, created_by) VALUES (22, 'Montar o berço', 'pai', 'mae');
