<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4-black?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Prisma-ORM-0C344B?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/SQLite-persist%C3%AAncia-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/SSE-real--time-FF6B6B" alt="Server Sent Events" />
</p>

<h1 align="center">Code Analyzer</h1>
<p align="center">Plataforma full‑stack para análise multilíngue de código, geração de relatórios, histórico persistente e métricas com atualização em tempo real.</p>
<p align="center"><strong>Status:</strong> Preview • release candidate com fluxo completo autenticado</p>

---

## 📌 Por que este projeto importa?

- 🔐 **Autenticação forte** com JWT, bcrypt, rate limiting e usuários padrão (admin + demo)
- 🧠 **Análises multi‑linguagem** (Python, JavaScript, HTML, CSS + fallback genérico) com integração ESLint
- 🗃️ **Persistência durável** via Prisma + SQLite (com migrações e histórico por usuário)
- 📡 **Streaming SSE** para acompanhar progresso de análise Git e cancelar em tempo real
- 📊 **Dashboard de métricas** com filtros por período/linguagem e tendências históricas
- 📦 **Relatórios exportáveis** (PDF, HTML, CSV, JSON) prontos para compartilhar
- 🧰 **Arquitetura modular**: fácil plugar novos analisadores, formatos e integrações

---

## 🧭 Índice rápido

- [Visão geral da arquitetura](#visão-geral-da-arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Configuração e execução](#configuração-e-execução)
- [Fluxo de uso](#fluxo-de-uso)
- [APIs e integrações](#apis-e-integrações)
- [Segurança](#segurança)
- [Scripts e automações](#scripts-e-automações)
- [Qualidade e testes](#qualidade-e-testes)
- [Roadmap](#roadmap)
- [FAQ](#faq)
- [Contribuindo](#contribuindo)

---

## 🏗️ Visão geral da arquitetura

| Camada | Stack | Destaques |
|--------|-------|-----------|
| Frontend | React 18 + Vite + TypeScript | SPA modular, tema dinâmico, streaming SSE via EventSource, UX responsiva |
| Backend | Node.js 18 + Express + TypeScript | APIs REST, SSE, geração de relatórios, autenticação, rate limiting |
| Persistência | Prisma ORM + SQLite | Migrações versionadas, histórico de análises, usuários e métricas |
| Analisadores | Heurísticas custom + ESLint | Estratégia por linguagem, enriquecimento de sumário, fácil extensão |
| Relatórios | PDFKit + templates HTML/CSV/JSON | Exportáveis diretamente das rotas /api/report/* |

> O backend inicializa usuários padrão (`admin@example.com` / senha configurável e `user@email.com` / `user`) para agilizar testes.

---

## 📁 Estrutura de pastas

```
Code-Analyzer/
├─ backend/
│  ├─ prisma/          # schema.prisma, migrações, banco SQLite (dev/test)
│  ├─ src/
│  │  ├─ analyzers/    # Heurísticas por linguagem
│  │  ├─ report/       # Geradores PDF/HTML/CSV/JSON
│  │  ├─ utils/        # Git analyzer, ESLint runner, summary builder
│  │  ├─ server.ts     # Rotas HTTP + SSE + middlewares
│  │  └─ store.ts      # Camada de persistência Prisma
│  └─ ...              # configs (tsconfig, jest, .env.example)
├─ frontend/
│  └─ src/
│     ├─ components/   # Painéis (Auth, Git, Métricas, Histórico, Resultado)
│     ├─ api.ts        # Axios com injeção de token
│     ├─ App.tsx       # Shell e roteamento interno
│     └─ styles.css    # Tema claro/escuro e layout
└─ package.json        # Scripts combinados com concurrently
```

---

## ⚙️ Configuração e execução

### Pré-requisitos

| Ferramenta | Versão recomendada |
|------------|--------------------|
| Node.js    | 18 ou superior     |
| npm        | 9 ou superior      |

### Passo a passo inicial

```powershell
git clone https://github.com/Hiidoko/Code-Analyzer.git
cd Code-Analyzer

# Instale dependências separadamente
npm install --prefix backend
npm install --prefix frontend

# Copie as variáveis de ambiente e ajuste conforme necessário
Copy-Item backend/.env.example backend/.env

# Opcional: gere cliente Prisma (útil para IDEs)
npm --prefix backend run prisma:generate

# Aplique as migrações SQLite (gera dev.db se não existir)
npm --prefix backend run prisma:migrate

# Inicie frontend + backend em paralelo
npm run dev
```

> O comando `npm run dev` inicia o backend em <http://localhost:4000> e o frontend em <http://localhost:5173>. Ambos usam proxy `/api` para comunicação.

### Execução isolada

- **Backend**
  ```powershell
  cd backend
  npm run dev
  ```
- **Frontend**
  ```powershell
  cd frontend
  npm run dev
  ```

### Build de produção

```powershell
cd backend
npm run build

cd ../frontend
npm run build
```

Os artefatos ficam em `backend/dist` e `frontend/dist`. Sirva o frontend com `npm --prefix frontend run preview` ou integre ao backend conforme necessidade.

### Variáveis de ambiente relevantes (`backend/.env`)

| Variável | Descrição | Default |
|----------|-----------|---------|
| `DATABASE_URL` | Caminho do banco SQLite (suporta `file:./dev.db`) | `file:./dev.db` |
| `JWT_SECRET` | Segredo para assinar tokens | gerado aleatoriamente se vazio (não persistente) |
| `BCRYPT_ROUNDS` | Custo de hashing | `12` |
| `PORT` | Porta do backend | `4000` |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_AUTH_MAX` | Ajustes de rate limiting | `60s / 120 / 20` |
| `DEFAULT_ADMIN_PASSWORD` | Senha do admin padrão | `admin` |
| `DISABLE_DEFAULT_ADMIN`, `DISABLE_DEFAULT_DEMO` | Evita criação automática | não definidos |

Para redefinir o banco durante o desenvolvimento utilize `npx prisma migrate reset` (atenção: remove dados).

---

## 🚦 Fluxo de uso

1. Crie uma conta ou use **Entrar como demo** (gera token JWT).
2. Escolha entre upload / colagem de código e selecione a linguagem.
3. Aplique a análise para receber sumário estruturado + detalhes específicos.
4. Exporte relatórios conforme necessidade (PDF/HTML/CSV/JSON).
5. Consulte o **Histórico** e o **Dashboard** para métricas agregadas.
6. (Opcional) Analise um repositório Git: acompanhe o progresso em tempo real via SSE e cancele se desejar.

---

## 🔗 APIs e integrações

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/register` | POST | Cadastro de usuário com verificação de senha forte |
| `/api/auth/login` | POST | Login com retorno de token JWT |
| `/api/auth/demo` | POST | Cria/retorna sessão demo | 
| `/api/analyze` | POST | Analisa código (py/js/html/css/rb/php/go) e persiste histórico |
| `/api/report/(pdf|html|csv|json)` | POST | Exporta relatório conforme formato |
| `/api/history`, `/api/history/:id` | GET | Histórico de análises do usuário |
| `/api/metrics` | GET | Métricas com filtros `period` (7d/30d/90d/all) e `fileType` |
| `/api/git/analyze` | POST | Análise síncrona de repositório Git |
| `/api/git/analyze/stream` | GET (SSE) | Streaming de progresso com eventos `meta`, `progress`, `done`, `cancelled`, `error` |
| `/api/git/analyze/cancel` | POST | Cancela execução SSE ativa (usa `reqId`) |

### Streaming SSE (frontend)

- Autenticação por query `token` (JWT) + fallback para header `Authorization`.
- Eventos interpretados pelo `GitPanel.tsx`, com mensagens de progresso, cancelamento e erros.
- Cancelamento envia `POST /api/git/analyze/cancel` com o `reqId` recebido em `event: meta`.

---

## 🛡️ Segurança

- Tokens JWT expiram em 12h e são armazenados em `localStorage` ou `sessionStorage` conforme preferência.
- Login demo é isolado do admin e reforça ambiente de testes.
- Rate limiting segmentado (`/api` geral vs `/api/auth`).
- Hash de senha com bcrypt (configurável via `BCRYPT_ROUNDS`).
- Rotas protegidas usam middleware que revalida token e usuário no banco.
- SSE requer autenticação (token em query string) e suporta cancelamento manual/automático.

---

## 🧰 Scripts e automações

### Monorepo (raiz)

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Sobe backend (4000) + frontend (5173) em paralelo |

### Backend

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Watch mode via `tsx` |
| `npm run build` | Compila TS para `dist/` |
| `npm start` | Executa build gerada |
| `npm run lint` | ESLint em `src/` |
| `npm run prisma:generate` | Gera cliente Prisma |
| `npm run prisma:migrate` | Aplica migrações (`prisma migrate deploy`) |
| `npm test` | Executa Jest (aplica migrações em `test.db` automaticamente) |

### Frontend

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Vite dev server |
| `npm run build` | Build de produção |
| `npm run preview` | Serve build com Vite |

---

## ✅ Qualidade e testes

- Jest configurado com `ts-jest` e `supertest` para cobrir rotas críticas (backend).
- ESLint programático roda dentro da análise JavaScript, garantindo relatórios ricos.
- Build do frontend validado com Vite (`npm --prefix frontend run build`).
- Métricas agregadas validadas via `buildMetrics` (inclui filtros e tendência diária).

### Como executar

```powershell
npm --prefix backend run lint
npm --prefix backend run test
npm --prefix frontend run build
```

Os testes criam um banco `test.db` isolado. Após a execução, o Prisma é desligado automaticamente.

---

## 🛣️ Roadmap

- Integração com bancos externos (PostgreSQL) e seeds configuráveis
- Linter Python dedicado (flake8/pylint) + checagens de segurança (bandit)
- Export assíncrono com notificações in-app
- Webhooks / tokens de API para automação CI
- Painel avançado com gráficos interativos (D3/Recharts) e alertas de regressão
- Cache incremental para repositórios Git grandes

---

## 🙋 FAQ

| Pergunta | Resposta |
|----------|----------|
| Quais credenciais padrão existem? | `admin@example.com` / senha definida em `DEFAULT_ADMIN_PASSWORD` (padrão `admin`) e demo `user@email.com` / `user`. |
| Posso trocar o banco? | Sim. Ajuste `DATABASE_URL` (ex. `file:../data.db` ou conexões PostgreSQL) e replique migrações. |
| Como adicionar uma nova linguagem? | Crie um analisador em `backend/src/analyzers`, exporte no `index.ts` e ajuste o frontend para oferecê-la. |
| O SSE funciona sem HTTPS? | Sim em dev. Para produção habilite HTTPS e avalie CORS/Firewall. |
| O frontend pode rodar em outro domínio? | Sim, basta configurar CORS no backend (arquivo `server.ts`) e ajustar `baseURL` do Axios. |

---

## 🤝 Contribuindo

1. Faça um fork.
2. Crie uma branch (`feat/nome-da-feature`).
3. Siga commits semânticos (`feat:`, `fix:`, `chore:` ...).
4. Abra PR descrevendo motivação, passos de teste e screenshots quando aplicável.

Sugestões, issues e PRs são super bem-vindos! ✨

---

## 📄 Licença

Este projeto é distribuído sob a licença **ISC**. Consulte o arquivo `LICENSE` (ou `package.json`) para detalhes e verifique requisitos internos antes de uso em produção.

---

<p align="center">Feito com ♥ para acelerar análises de código e dar visibilidade ao progresso.</p>
