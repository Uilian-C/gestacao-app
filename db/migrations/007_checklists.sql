-- 007: listas de "feito" do espaço (LGPD: apagadas junto com o espaço).
-- list = 'prenatal' (exames, vacinas e consultas da jornada) ou 'mala' (mala da maternidade).
CREATE TABLE IF NOT EXISTS checklist (
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  list        varchar(20) NOT NULL,
  item_id     varchar(40) NOT NULL,
  done_at     date NOT NULL DEFAULT CURRENT_DATE,
  updated_by  varchar(10),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, list, item_id)
);

SELECT 'ok' AS checklist;
