-- 012: o diário vira um fichário, com pastas e fotos.
--
-- folder: em que pasta do fichário o registro fica.
--   momento = momentos especiais, dia = dia a dia, ideia = ideias e planos,
--   carta = cartas para o bebê, barriga = fotos da barriga semana a semana.
-- Os registros que já existem ficam em "momento".
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS folder varchar(10) NOT NULL DEFAULT 'momento';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_folder_check') THEN
    ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_folder_check
      CHECK (folder IN ('momento', 'dia', 'ideia', 'carta', 'barriga'));
  END IF;
END $$;

-- journal_files: fotos de um registro do diário (até 4). Ficam no mesmo
-- armazenamento privado dos exames; thumb_path é a miniatura usada nas listas.
-- Quem vê a foto é quem vê o registro (particular: só quem escreveu).
CREATE TABLE IF NOT EXISTS journal_files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  path         text NOT NULL,
  thumb_path   text,
  content_type varchar(40) NOT NULL,
  size_bytes   integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS journal_files_entry_idx ON journal_files (entry_id);
CREATE INDEX IF NOT EXISTS journal_files_family_idx ON journal_files (family_id);

SELECT 'ok' AS fichario;
