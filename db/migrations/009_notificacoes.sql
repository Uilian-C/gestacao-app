-- 009: notificações no celular (Web Push).
-- push_subscriptions: cada aparelho onde a pessoa ativou as notificações.
-- notification_prefs: o que cada pessoa quer receber (tudo ligado por padrão).
-- notification_log: o que já foi enviado, para nunca mandar o mesmo aviso duas vezes.
-- app_secrets: chaves do app geradas pelo próprio servidor (ex.: chaves do Web Push).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint     text PRIMARY KEY,
  user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id      text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  consultas    boolean NOT NULL DEFAULT true,
  momentos     boolean NOT NULL DEFAULT true,
  jornada      boolean NOT NULL DEFAULT true,
  parceiro     boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_log (
  user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  key          text NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS app_secrets (
  name         text PRIMARY KEY,
  value        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);

SELECT 'ok' AS notificacoes;
