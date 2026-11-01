-- Gêmeos: quantos bebês (1 ou 2), o nome do segundo bebê, e o resultado e os
-- palpites com as três possibilidades de gêmeos (duas meninas, dois meninos,
-- um casal), além de menina e menino.
ALTER TABLE families ADD COLUMN IF NOT EXISTS babies smallint NOT NULL DEFAULT 1 CHECK (babies IN (1, 2));
ALTER TABLE families ADD COLUMN IF NOT EXISTS baby2_name varchar(40);

ALTER TABLE families DROP CONSTRAINT IF EXISTS families_baby_sex_check;
ALTER TABLE families ALTER COLUMN baby_sex TYPE varchar(8);
ALTER TABLE families ADD CONSTRAINT families_baby_sex_check CHECK (baby_sex IN ('menina', 'menino', 'meninas', 'meninos', 'casal'));

ALTER TABLE sex_guesses DROP CONSTRAINT IF EXISTS sex_guesses_guess_check;
ALTER TABLE sex_guesses ALTER COLUMN guess TYPE varchar(8);
ALTER TABLE sex_guesses ADD CONSTRAINT sex_guesses_guess_check CHECK (guess IN ('menina', 'menino', 'meninas', 'meninos', 'casal'));

ALTER TABLE bolao_votes DROP CONSTRAINT IF EXISTS bolao_votes_guess_check;
ALTER TABLE bolao_votes ALTER COLUMN guess TYPE varchar(8);
ALTER TABLE bolao_votes ADD CONSTRAINT bolao_votes_guess_check CHECK (guess IN ('menina', 'menino', 'meninas', 'meninos', 'casal'));
SELECT 'ok' AS gemeos;
