-- 021: conteúdo do app (mensagem do dia e leituras da semana).
--
-- content_items: textos escritos pela equipe do Tumtum, com a faixa de
-- semanas em que aparecem e para quem (casal, mãe ou pai). Só aparecem no
-- app depois de publicados na página de administração (status 'publicado').
-- Os textos iniciais entram como rascunho, para revisão antes de publicar.
CREATE TABLE IF NOT EXISTS content_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        varchar(10) NOT NULL CHECK (kind IN ('mensagem', 'leitura')),
  title       text,
  body        text NOT NULL,
  week_from   smallint NOT NULL DEFAULT 4 CHECK (week_from BETWEEN 1 AND 42),
  week_to     smallint NOT NULL DEFAULT 42 CHECK (week_to BETWEEN 1 AND 42),
  audience    varchar(10) NOT NULL DEFAULT 'casal' CHECK (audience IN ('casal', 'mae', 'pai')),
  source      text,
  minutes     smallint,
  status      varchar(10) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW(),
  CHECK (week_to >= week_from)
);
CREATE INDEX IF NOT EXISTS content_items_status_idx ON content_items (status, kind);

-- Textos iniciais (só na primeira vez, com a tabela vazia).
INSERT INTO content_items (kind, title, body, week_from, week_to, audience, source, minutes)
SELECT * FROM (VALUES
  ('mensagem', NULL, 'Cada consulta, cada exame e cada abraço contam. Vocês estão construindo essa história juntos, um dia de cada vez.', 4, 42, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', NULL),
  ('mensagem', NULL, 'No começo tudo é novo, e tudo bem não ter todas as respostas. Anotem as dúvidas e levem para a próxima consulta.', 4, 13, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', NULL),
  ('mensagem', NULL, 'O enjoo e o cansaço do início são reais. Uma refeição pronta, a louça lavada ou um cochilo garantido valem muito hoje.', 4, 13, 'pai', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', NULL),
  ('mensagem', NULL, 'O bebê já começa a ouvir sons de fora da barriga. Que tal conversar ou cantar para ele hoje, vocês dois?', 14, 27, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', NULL),
  ('mensagem', NULL, 'Seu corpo está fazendo um trabalho enorme. Descanse sem culpa quando precisar.', 14, 27, 'mae', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', NULL),
  ('mensagem', NULL, 'A reta final pede calma: mala por perto, caminho da maternidade conhecido e muito carinho entre vocês.', 28, 42, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', NULL),
  ('mensagem', NULL, 'Pergunte hoje como ela está se sentindo, de verdade, e escute sem pressa.', 28, 42, 'pai', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', NULL),
  ('mensagem', NULL, 'Sentir medo também faz parte. Conversar sobre isso aproxima vocês e deixa o caminho mais leve.', 4, 42, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', NULL),
  ('leitura', 'Primeiros passos do pré-natal', 'Quanto antes o pré-natal começar, melhor: o ideal é ter a primeira consulta até 12 semanas. Ela pode ser com o obstetra ou na unidade de saúde (SUS).

Na primeira consulta:
- Vocês recebem a Caderneta da Gestante, que acompanha toda a gestação.
- A equipe pede os exames iniciais de sangue e urina.
- É a hora de contar sobre doenças, remédios em uso e gestações anteriores.

Levem um documento com foto, o cartão do SUS ou do plano, a data da última menstruação e exames que já tiverem.

O ácido fólico costuma ser indicado até 12 semanas. Não comecem nem parem nenhum remédio sem falar com a equipe.', 4, 13, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', 3),
  ('leitura', 'Enjoo na gestação: o que ajuda', 'O enjoo é comum no primeiro trimestre e costuma melhorar entre 12 e 16 semanas.

O que costuma ajudar:
- Refeições pequenas e frequentes, sem ficar muito tempo de estômago vazio.
- Algo seco (como uma torrada) ao acordar, antes de levantar.
- Beber líquidos aos poucos, ao longo do dia.
- Evitar cheiros e alimentos que pioram o enjoo.

Procurem atendimento se houver vômitos o dia todo, se não conseguir beber nem manter líquidos, se o xixi ficar escuro e pouco, ou se houver perda de peso. Isso tem tratamento.', 5, 16, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', 2),
  ('leitura', 'Sinais de alerta: quando procurar a maternidade', 'Alguns sinais pedem atendimento logo, sem esperar a próxima consulta:
- Sangramento pela vagina.
- Perda de líquido pela vagina.
- Dor de cabeça forte, visão embaçada ou pontos brilhantes.
- Inchaço de repente no rosto ou nas mãos.
- Febre ou dor ao fazer xixi.
- Dor forte na barriga.
- Bebê mexendo bem menos que o normal, depois de 28 semanas.
- Contrações regulares antes de 37 semanas.

Na dúvida, liguem para a equipe ou procurem a maternidade. É sempre melhor avaliar.', 4, 42, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', 2),
  ('leitura', 'Os movimentos do bebê', 'Os primeiros movimentos costumam ser sentidos entre 18 e 22 semanas, às vezes antes em quem já teve filhos. No começo parecem bolhas ou borboletas.

Com o tempo, cada bebê cria o próprio ritmo. No terceiro trimestre, vale prestar atenção nesse padrão no dia a dia.

Se os movimentos diminuírem ou mudarem muito, procurem atendimento no mesmo dia. Não é preciso esperar a próxima consulta, e ninguém vai achar que é exagero.', 18, 42, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', 2),
  ('leitura', 'Diabetes gestacional e a curva glicêmica', 'O diabetes gestacional é um aumento do açúcar no sangue que aparece na gestação. Muitas vezes não dá sintomas, por isso é rastreado com exame.

A curva glicêmica (TOTG 75 g) costuma ser feita entre 24 e 28 semanas:
- Jejum de 8 horas.
- Colhe o sangue, toma um líquido doce e colhe de novo depois de 1 e 2 horas.
- Reservem a manhã e levem um lanche para depois.

Se o resultado vier alterado, a equipe orienta a alimentação e o acompanhamento. Na maioria das vezes, dá para controlar bem.', 22, 30, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', 3),
  ('leitura', 'Para o pai: como estar presente', 'A gestação também é sua. Estar presente faz diferença para ela, para o bebê e para você.

Algumas ideias:
- Ir às consultas e aos ultrassons sempre que puder.
- Dividir as tarefas da casa e as burocracias.
- Perguntar como ela está e ouvir sem tentar resolver tudo.
- Conhecer os sinais de alerta e o caminho até a maternidade.

Cuidar da sua saúde emocional também importa. Se bater ansiedade, converse com ela, com amigos ou com um profissional.', 4, 42, 'pai', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', 3),
  ('leitura', 'Plano de parto e mala da maternidade', 'O plano de parto é uma lista do que é importante para vocês no parto: acompanhante, posições, alívio da dor, primeiros cuidados com o bebê. Ele ajuda a conversar com a equipe, que vai explicar o que é possível em cada situação.

No terceiro trimestre:
- Escrevam o plano (dá para fazer na aba Parto) e levem para a consulta.
- Se puderem, visitem a maternidade e conheçam o caminho.
- Deixem a mala pronta até 36 semanas, com documentos, a caderneta e os exames.', 28, 36, 'casal', 'Caderneta da Gestante (Ministério da Saúde) e FEBRASGO.', 3)
) AS v(kind, title, body, week_from, week_to, audience, source, minutes)
WHERE NOT EXISTS (SELECT 1 FROM content_items);

SELECT 'ok' AS conteudo, (SELECT COUNT(*) FROM content_items) AS textos;
