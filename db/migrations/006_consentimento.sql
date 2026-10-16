-- 006: consentimento (LGPD).
-- Guarda quando cada pessoa aceitou os Termos e a Política de Privacidade, e
-- em qual versão. Dados de saúde exigem consentimento específico (art. 11, I).
CREATE TABLE IF NOT EXISTS user_consents (
  user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  version      text NOT NULL,
  accepted_at  timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, version)
);

SELECT 'ok' AS consentimento;
