# Nossa Gestação

App colaborativo para o casal acompanhar a gestação, da 4ª semana ao parto: agenda com visão mensal e semanal, diário de sintomas e medições, painel com os padrões dos sintomas, consultas por especialidade com resumo pronto para levar, tarefas divididas e o kit da reta final (contador de movimentos, cronômetro de contrações e plano de parto).

- Produção: [gestacao-app.vercel.app](https://gestacao-app.vercel.app)
- Stack: React 19 + TypeScript, Vite, Tailwind CSS 4, funções da Vercel em `api/`, PostgreSQL no Neon (`pg`), login com [Better Auth](https://www.better-auth.com)

## Rodando localmente

Precisa de um Postgres (o do Neon ou um local com as migrações aplicadas).

```bash
npm install
cat > .env.local <<'ENV'
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=uma-frase-aleatoria-longa
BETTER_AUTH_URL=http://localhost:5173
ENV
npm run dev:api   # funções de /api em http://localhost:3001
npm run dev       # app em http://localhost:5173 (encaminha /api para o servidor acima)
```

### Variáveis de ambiente (Vercel)

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão com o Neon. Só o servidor lê; nunca use o prefixo `VITE_`. |
| `BETTER_AUTH_SECRET` | sim | Assina as sessões de login (32+ caracteres aleatórios). |
| `BETTER_AUTH_URL` | produção | Endereço público do app, ex.: `https://gestacao-app.vercel.app`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | não | Liga o botão "Continuar com o Google". |
| `RESEND_API_KEY` / `EMAIL_FROM` | não | Liga o "Esqueci minha senha" (exige domínio próprio no Resend). |
| `GOOGLE_MAPS_API_KEY` | não | Sugestões de endereço pelo Google Places. Sem ela, usa o OpenStreetMap (gratuito). |

| Comando         | O que faz                                      |
| --------------- | ---------------------------------------------- |
| `npm run dev`   | Servidor de desenvolvimento                     |
| `npm run dev:api` | Funções de `/api` localmente                 |
| `npm test`      | Testes das regras de datas e de saúde (Vitest) |
| `npm run lint`  | ESLint                                          |
| `npm run build` | Checagem de tipos + build de produção (Vercel) |

A CI no GitHub Actions roda lint, testes e build em todo PR. Se passar lá, passa na Vercel.

## Estrutura

```
api/                      funções da Vercel (rodam no servidor)
  auth.ts                 rotas do login (/api/auth/*)
  data.ts                 leitura e gravação dos registros, sempre filtradas pelo espaço
  family.ts               espaço da família: criar, convidar, entrar, papel, remover
  config.ts               o que a tela de login oferece (Google, recuperar senha)
  account.ts              LGPD: baixar os dados (GET) e excluir conta ou espaço (POST)
  places.ts               sugestões de endereço para o cadastro da consulta
  _lib/                   conexão com o banco, configuração do login e utilitários
src/
  Root.tsx                porta de entrada: login, espaço da família e app
  App.tsx                 orquestra os dados, as abas e as ações
  api.ts                  chamadas para /api
  components/auth/        tela de login, criação do espaço e "Nosso espaço"
  types.ts                tipos dos registros
  index.css               tema (cores claras e escuras como variáveis)
  lib/dates.ts            idade gestacional, DPP e datas no fuso local
  lib/health.ts           alerta de pressão e validação das medições
  lib/symptoms.ts         estatísticas e padrões dos sintomas
  lib/weightGain.ts       IMC e faixa de ganho de peso (IOM 2009)
  lib/report.ts           resumo da consulta por especialidade
  lib/ficha.ts            ficha da gestante (cabeçalho de prontuário)
  lib/labor.ts            contagem de movimentos e análise das contrações (regra 5-1-1)
  lib/birthPlan.ts        plano de parto (temas da Caderneta da Gestante)
  lib/journey.ts          jornada do pré-natal: situação de cada item, próximos passos e progresso
  data/prenatalPlan.ts    fases, consultas, exames e vacinas com a janela de semanas (Caderneta + FEBRASGO)
  data/hospitalBag.ts     mala da maternidade
  lib/calendar.ts         eventos da agenda, grades de mês e semana, exportação .ics e Google Agenda
  data/                   semanas, especialidades, sintomas comuns, sugestões de tarefas
  hooks/                  carregamento dos dados e autor do aparelho
  components/             componentes visuais, gráficos e uma tela por aba
db/
  schema.sql              schema das tabelas
  migrations/             alterações numeradas, para rodar no console do Neon
```

## Banco de dados

O schema está em `db/schema.sql`. Cada família é uma linha de `families` (o "espaço"); quem faz login entra em um espaço por `family_members`, e todas as tabelas de dados têm `family_id`. A API só lê e grava no espaço de quem está logado.

Toda alteração de banco entra como um arquivo novo em `db/migrations/` e deve ser executada no SQL Editor do Neon antes do deploy que depende dela.

## Regras importantes

- **Datas**: sempre use `parseLocalDate` e `formatBR` de `lib/dates.ts`. `new Date('AAAA-MM-DD')` volta um dia no Brasil.
- **Dados clínicos**: nunca preencha valores padrão em campos de saúde. Campo não medido é gravado como `NULL`.
- **Autoria**: o servidor grava `created_by` com o papel de quem está logado (`mae` ou `pai`), nunca com o que o navegador envia.
- **LGPD**: dados de saúde exigem consentimento. Ao mudar `public/termos.html` ou `public/privacidade.html` de forma relevante, atualize a data no topo das páginas e `CONSENT_VERSION` em `api/_lib/consent.ts`: todos aceitam de novo ao entrar.
- **Isolamento**: toda consulta em `api/` filtra por `family_id`. Nunca escreva SQL no navegador.
- **Build**: a Vercel falha com import ou variável sem uso. Rode `npm run build` antes de subir.
