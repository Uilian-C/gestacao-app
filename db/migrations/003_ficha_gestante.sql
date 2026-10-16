-- Ficha da gestante: o cabeçalho "de prontuário" que responde às perguntas
-- básicas de qualquer especialista. Pode ser executado mais de uma vez.

ALTER TABLE families ADD COLUMN IF NOT EXISTS mother_name VARCHAR(120);
ALTER TABLE families ADD COLUMN IF NOT EXISTS mother_birth_date DATE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS blood_type VARCHAR(5);          -- ex.: O+, A-, AB+
ALTER TABLE families ADD COLUMN IF NOT EXISTS gestations INTEGER;            -- G: gestações, incluindo a atual
ALTER TABLE families ADD COLUMN IF NOT EXISTS births INTEGER;                -- P: partos anteriores
ALTER TABLE families ADD COLUMN IF NOT EXISTS abortions INTEGER;            -- A: abortos/perdas anteriores
ALTER TABLE families ADD COLUMN IF NOT EXISTS cesareans INTEGER;            -- cesáreas anteriores (dentro de P)
ALTER TABLE families ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS medications TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS conditions TEXT;               -- condições prévias (hipertensão, diabetes...)
