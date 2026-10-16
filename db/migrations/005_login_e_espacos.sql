-- 005: login e espaços por família.
-- Cada gestação vira um "espaço" (uma linha de families). Quem faz login só
-- enxerga os dados do próprio espaço. Os dados que já existem são movidos para
-- o espaço atual, e o último comando mostra o código para resgatá-lo no app.
-- Pode ser rodado mais de uma vez sem duplicar nada.

-- 1. Tabelas do login (Better Auth)
CREATE TABLE IF NOT EXISTS "user" ("id" text NOT NULL PRIMARY KEY, "name" text NOT NULL, "email" text NOT NULL UNIQUE, "emailVerified" boolean NOT NULL, "image" text, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS "session" ("id" text NOT NULL PRIMARY KEY, "expiresAt" timestamptz NOT NULL, "token" text NOT NULL UNIQUE, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamptz NOT NULL, "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS "account" ("id" text NOT NULL PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS "verification" ("id" text NOT NULL PRIMARY KEY, "identifier" text NOT NULL, "value" text NOT NULL, "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS "rateLimit" ("id" text NOT NULL PRIMARY KEY, "key" text NOT NULL UNIQUE, "count" integer NOT NULL, "lastRequest" bigint NOT NULL);
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- 2. Um espaço novo nasce sem dados: libera as colunas obrigatórias sem valor padrão.
DO $$
DECLARE col text;
BEGIN
  FOR col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'families' AND is_nullable = 'NO'
      AND column_name <> 'id' AND column_default IS NULL
  LOOP
    EXECUTE format('ALTER TABLE families ALTER COLUMN %I DROP NOT NULL', col);
  END LOOP;
END $$;

-- 3. Membros e convites. O tipo de family_id acompanha o de families.id.
DO $$
DECLARE
  id_type text;
  tbl text;
  legacy text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO id_type
  FROM pg_attribute a WHERE a.attrelid = 'families'::regclass AND a.attname = 'id';

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS family_members (
      family_id  %s NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      user_id    text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
      role       varchar(10) NOT NULL CHECK (role IN ('mae', 'pai')),
      joined_at  timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (family_id, user_id)
    )$f$, id_type);

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS family_invites (
      code        text PRIMARY KEY,
      family_id   %s NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      created_by  text REFERENCES "user"(id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT NOW(),
      expires_at  timestamptz NOT NULL,
      used_by     text REFERENCES "user"(id) ON DELETE SET NULL,
      used_at     timestamptz
    )$f$, id_type);

  -- O espaço que o app usa hoje (o mesmo critério da versão antiga).
  SELECT id::text INTO legacy FROM families WHERE dum_date IS NOT NULL LIMIT 1;

  -- 4. Cada tabela de dados ganha family_id, preenchido com o espaço atual.
  FOREACH tbl IN ARRAY ARRAY['symptoms_log', 'partner_comments', 'medical_appointments', 'partner_tasks',
                             'health_metrics_log', 'consultations', 'kick_sessions', 'contractions', 'birth_plan']
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS family_id %s REFERENCES families(id) ON DELETE CASCADE', tbl, id_type);
    IF legacy IS NOT NULL THEN
      EXECUTE format('UPDATE %I SET family_id = $1::%s WHERE family_id IS NULL', tbl, id_type) USING legacy;
    END IF;
    EXECUTE format('DELETE FROM %I WHERE family_id IS NULL', tbl);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN family_id SET NOT NULL', tbl);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (family_id)', tbl || '_family_idx', tbl);
  END LOOP;

  -- 5. Código de uso único para vocês resgatarem o espaço atual (vale 30 dias).
  IF legacy IS NOT NULL AND NOT EXISTS (SELECT 1 FROM family_members) AND NOT EXISTS (SELECT 1 FROM family_invites WHERE created_by IS NULL) THEN
    EXECUTE format('INSERT INTO family_invites (code, family_id, expires_at) VALUES ($1, $2::%s, NOW() + INTERVAL ''30 days'')', id_type)
      USING upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10)), legacy;
  END IF;
END $$;

-- Guardem este código: é com ele que vocês entram no espaço com os dados atuais.
SELECT code AS codigo_do_espaco_atual, expires_at::date AS valido_ate
FROM family_invites WHERE created_by IS NULL AND used_at IS NULL;
