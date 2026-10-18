-- 015: foto de perfil de cada pessoa do espaço.
--
-- A foto fica no armazenamento privado (Vercel Blob), dentro da pasta do
-- espaço; aqui só o caminho e quando mudou (para o app buscar a nova).
-- Só quem é do mesmo espaço vê. Sair do espaço ou excluir a conta apaga a foto.
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS avatar_path text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;

SELECT 'ok' AS foto_perfil;
