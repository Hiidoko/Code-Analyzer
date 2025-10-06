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
<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4-000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-0C344B?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-optional-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/SSE-streaming-FF6B6B" />
</p>

# Code Analyzer

> Multi‑language code insights + repo scan + reports — rápida visualização de questões estruturais e métricas básicas.

**Live demo:** https://code-analyzer-t04x.onrender.com  
**Screenshot:**

![Code Analyzer UI](./img/Print.PNG)

> Projeto em evolução (protótipo). Pode conter funcionalidades incompletas / heurísticas simplificadas.

---

## 🔎 Visão Geral
O Code Analyzer reúne em uma mesma interface: análise heurística de arquivos individuais, exportação de relatórios, histórico por usuário, métricas agregadas e análise de repositórios Git com progresso em tempo real.

**Objetivo principal:** demonstrar arquitetura full‑stack modular e extensível para cenários de inspeção leve de código (sem substituir ferramentas profissionais).

### Principais Recursos
- Suporte a múltiplas linguagens: Python, JavaScript, HTML, CSS (genérico para Ruby / PHP / Go)
- Relatórios exportáveis (PDF, HTML, CSV, JSON)
- Dashboard de métricas filtráveis (período / linguagem)
- Histórico persistido por usuário autenticado
- Autenticação JWT + bcrypt + rate limiting
- Análise de repositório Git via clonagem rasa + concorrência + SSE (progresso, cancelamento)
- Integração ESLint embutida para arquivos JS
- Arquitetura pronta para novos “analyzers”

---

## 🧩 Arquitetura
| Camada | Descrição |
|--------|-----------|
| Frontend (React + Vite) | SPA consumindo API REST + EventSource para streaming |
| Backend (Express + TS) | Endpoints, SSE, autenticação, geração de relatórios |
| Persistência (Prisma) | Modelo simples (User / Analysis) hoje usando MongoDB | 
| Analyzers | Heurísticas isoladas + enriquecimento de seções |
| Relatórios | PDFKit + templates HTML / CSV / JSON |

### Fluxo de Análise
1. Usuário envia código (ou URL de repositório).  
2. Backend detecta tipo e executa heurísticas (e ESLint se JS).  
3. Resultado é compactado em “sections” (issues, sugestões, estatísticas).  
4. Persistência opcional (se autenticado).  
5. Exportação imediata em múltiplos formatos.

### Streaming Git
Eventos SSE: `meta` → `progress` (por arquivo) → `done` ou `cancelled`/`error`.

---

## � Estrutura (Resumo)
```
backend/
  prisma/            # schema Prisma
  src/
    analyzers/       # Heurísticas por linguagem
    report/          # Geração de PDF/HTML/CSV/JSON
    utils/           # gitAnalyzer, eslintRunner, summaryBuilder
    server.ts        # Rotas + SSE + middlewares
    store.ts         # Persistência / agregações
frontend/
  src/               # Componentes React + painéis
scripts/             # copy-frontend-build.js
img/                 # Print de interface
```

---

## 🚀 Iniciando Localmente
Pré‑requisitos: Node 18+, git (para análise de repositórios), (opcional) MongoDB ou `DATABASE_URL` válido.

```bash
git clone https://github.com/Hiidoko/Code-Analyzer.git
cd Code-Analyzer

# Instala dependências
npm install --prefix backend
npm install --prefix frontend

# Variáveis (exemplo)
cp backend/.env.example backend/.env
echo "JWT_SECRET=algo-super-seguro" >> backend/.env

# Dev (2 processos)
npm run dev

# Produção single-service
npm run build
npm start
```

Backend: http://localhost:4000  –  Frontend: http://localhost:5173

### Variáveis Principais
| Variável | Função |
|----------|--------|
| `DATABASE_URL` | Conexão Prisma (Mongo/SQLite/Postgres conforme provider) |
| `JWT_SECRET` | Assinatura de tokens |
| `BCRYPT_ROUNDS` | Custo de hashing |
| `DISABLE_DEFAULT_DEMO` | Evita criação de usuário demo |
| `DISABLE_DEFAULT_ADMIN` | Evita admin padrão |
| `RATE_LIMIT_*` | Parametriza limites |

---

## 🔗 Endpoints Principais
| Método | Rota | Uso |
|--------|------|-----|
| POST | `/api/auth/register` | Cria usuário |
| POST | `/api/auth/login` | Retorna JWT |
| POST | `/api/analyze` | Analisa código único |
| POST | `/api/report/pdf` (etc) | Exporta relatório |
| GET | `/api/history` | Lista análises do usuário |
| GET | `/api/metrics` | Métricas agregadas |
| POST | `/api/git/analyze` | Análise síncrona de repo |
| GET | `/api/git/analyze/stream` | SSE de progresso |
| POST | `/api/git/analyze/cancel` | Cancela execução |

Formato simplificado de resposta de análise:
```json
{
  "fileType": "js",
  "result": { "lines": 120, "functions": 4 },
  "summary": {
    "generatedAt": "2025-10-06T10:00:00.000Z",
    "issuesCount": 5,
    "sections": [{ "id": "js-eslint", "title": "ESLint", "severity": "warning", "items": ["Linha 10: no-eval"] }]
  }
}
```

---

## 📤 Formatos de Exportação
| Formato | Objetivo |
|---------|----------|
| PDF | Compartilhamento visual rápido |
| HTML | Consulta offline rica |
| CSV | Manipulação em planilhas |
| JSON | Integração / pipelines |

---

## 🔐 Segurança Simplificada
- JWT expira em 12h
- Rate limiting básico
- Hash de senha com bcrypt
- CORS configurável via `CORS_ORIGINS`

> Requer hardening adicional antes de uso corporativo (MFA, auditoria, RBAC avançado etc.).

---

## 🧪 Testes
Backend: Jest + Supertest (rotas críticas, análise). Em build de produção os testes são excluídos do bundle.

```bash
npm --prefix backend run test
```

---

## 🛣️ Futuro (Ideias)
- Lints mais profundos (Python, segurança)
- Postgres com agregações avançadas
- Cache incremental para repositórios grandes
- Geração assíncrona de relatórios pesados
- Alertas de tendência / regressão

---

## FAQ Rápido
**Posso adicionar outra linguagem?** Sim – criar novo analyzer e registrar no switch.  
**Posso separar frontend?** Sim – servir `frontend/dist` como estático e ajustar baseURL.  
**As heurísticas são 100% confiáveis?** Não – são intencionais simplificações.  

---

## Licença
ISC. Revise antes de uso em contextos sensíveis.

## Créditos
Criado por **Caio Marques (Hiidoko)**. Se for útil, deixe uma ⭐ e adapte livremente.  

---

<p align="center">Explorar, aprender e iterar — aproveite o código! ⚡</p>
2. Crie uma branch (`feat/nome-da-feature`).
3. Siga commits semânticos (`feat:`, `fix:`, `chore:` ...).
4. Abra PR descrevendo motivação, passos de teste e screenshots quando aplicável.

Sugestões, issues e PRs são super bem-vindos! ✨

---

## 📄 Licença

Este projeto é distribuído sob a licença **ISC**. Consulte o arquivo `LICENSE` (ou `package.json`) para detalhes e verifique requisitos internos antes de uso em produção.


