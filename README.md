# Nossa Gestação

App colaborativo para o casal acompanhar a gestação, da 4ª semana ao parto: agenda com visão mensal e semanal, diário de sintomas e medições, painel com os padrões dos sintomas, consultas por especialidade com resumo pronto para levar, e tarefas divididas.

- Produção: [gestacao-app.vercel.app](https://gestacao-app.vercel.app)
- Stack: React 19 + TypeScript, Vite, Tailwind CSS 4, PostgreSQL no Neon (`@neondatabase/serverless`)

## Rodando localmente

```bash
npm install
echo "VITE_DATABASE_URL=postgresql://..." > .env.local
npm run dev
```

| Comando         | O que faz                                      |
| --------------- | ---------------------------------------------- |
| `npm run dev`   | Servidor de desenvolvimento                     |
| `npm test`      | Testes das regras de datas e de saúde (Vitest) |
| `npm run lint`  | ESLint                                          |
| `npm run build` | Checagem de tipos + build de produção (Vercel) |

A CI no GitHub Actions roda lint, testes e build em todo PR. Se passar lá, passa na Vercel.

## Estrutura

```
src/
  App.tsx                 orquestra os dados, as abas e as ações
  db.ts                   conexão com o Neon
  types.ts                tipos dos registros
  index.css               tema (cores claras e escuras como variáveis)
  lib/dates.ts            idade gestacional, DPP e datas no fuso local
  lib/health.ts           alerta de pressão e validação das medições
  lib/symptoms.ts         estatísticas e padrões dos sintomas
  lib/weightGain.ts       IMC e faixa de ganho de peso (IOM 2009)
  lib/report.ts           resumo da consulta por especialidade
  lib/ficha.ts            ficha da gestante (cabeçalho de prontuário)
  lib/calendar.ts         eventos da agenda, grades de mês e semana, exportação .ics e Google Agenda
  data/                   semanas, especialidades, sintomas comuns, sugestões de tarefas
  hooks/                  carregamento dos dados e autor do aparelho
  components/             componentes visuais, gráficos e uma tela por aba
db/
  schema.sql              schema das tabelas
  migrations/             alterações numeradas, para rodar no console do Neon
```

## Banco de dados

O schema está em `db/schema.sql`. Toda alteração de banco entra como um arquivo novo em `db/migrations/` e deve ser executada no SQL Editor do Neon antes do deploy que depende dela.

## Regras importantes

- **Datas**: sempre use `parseLocalDate` e `formatBR` de `lib/dates.ts`. `new Date('AAAA-MM-DD')` volta um dia no Brasil.
- **Dados clínicos**: nunca preencha valores padrão em campos de saúde. Campo não medido é gravado como `NULL`.
- **Autoria**: todo registro grava `created_by` com quem está usando o aparelho (`mae` ou `pai`).
- **Build**: a Vercel falha com import ou variável sem uso. Rode `npm run build` antes de subir.
