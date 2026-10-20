-- 023: familiares no espaço (avós, tios, padrinhos...).
--
-- Além da mãe e do pai, o espaço pode ter familiares (papel 'familia'), até o
-- número de vagas do espaço (families.family_slots, 5 por padrão). Familiar vê
-- só o que o casal posta para a família (journal_entries.visibility = 'family'),
-- a semana do bebê, e pode mandar abraço e comentar. Saúde, exames, agenda,
-- tarefas e o resto continuam só do casal (a regra fica no servidor).

-- Papel 'familia' e o parentesco ("avó", "tio", "madrinha"...).
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_role_check;
ALTER TABLE family_members ADD CONSTRAINT family_members_role_check CHECK (role IN ('mae', 'pai', 'familia'));
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS relation varchar(30);

-- Convite para o casal (a outra pessoa) ou para um familiar.
ALTER TABLE family_invites ADD COLUMN IF NOT EXISTS kind varchar(10) NOT NULL DEFAULT 'casal';
ALTER TABLE family_invites DROP CONSTRAINT IF EXISTS family_invites_kind_check;
ALTER TABLE family_invites ADD CONSTRAINT family_invites_kind_check CHECK (kind IN ('casal', 'familia'));

-- Quantos familiares o espaço pode ter.
ALTER TABLE families ADD COLUMN IF NOT EXISTS family_slots smallint NOT NULL DEFAULT 5;
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_family_slots_check;
ALTER TABLE families ADD CONSTRAINT families_family_slots_check CHECK (family_slots BETWEEN 0 AND 5);

-- Post do Mural que a família também vê.
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_visibility_check;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_visibility_check CHECK (visibility IN ('private', 'shared', 'family'));

-- Limite de comentários por pessoa (conta os da última hora).
CREATE INDEX IF NOT EXISTS comments_user_recent_idx ON comments (user_id, created_at);

SELECT 'ok' AS familiares;
