-- 019: jornada do pré-natal com o planejado do casal.
--
-- plan_weeks: quando a equipe do pré-natal muda a janela de um item da jornada
-- (ex.: pediu a curva glicêmica com 22 semanas), o casal ajusta as semanas.
-- Sem linha aqui, vale a janela de referência do app. Apagar a linha volta ao padrão.
CREATE TABLE IF NOT EXISTS plan_weeks (
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  item_id      varchar(40) NOT NULL,
  week_from    smallint NOT NULL CHECK (week_from BETWEEN 1 AND 42),
  week_to      smallint NOT NULL CHECK (week_to BETWEEN 1 AND 42),
  updated_by   varchar(10),
  updated_at   timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, item_id),
  CHECK (week_to >= week_from)
);

SELECT 'ok' AS jornada_planejada;
