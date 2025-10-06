## Code Analyzer

> Interface única para inspecionar rapidamente código em múltiplas linguagens, analisar repositórios Git em streaming e gerar relatórios exportáveis.

**Live demo:** https://code-analyzer-t04x.onrender.com  
**Screenshot:**

![Interface](./img/Print.PNG)

> Projeto em evolução. Heurísticas são simplificadas (não substituem ferramentas como SonarQube, ESLint completo ou Bandit).

## 🚀 Tech Stack
- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Node.js 18 + Express 4 + TypeScript
- **Persistência:** Prisma (atualmente usando MongoDB via `DATABASE_URL`)
- **Streaming:** Server-Sent Events (SSE) para progresso de análise Git
- **Relatórios:** PDFKit + templates HTML/CSV/JSON
- **Autenticação & Segurança:** JWT, bcrypt, rate limiting básico, CORS configurável
- **Testes:** Jest + Supertest (foco no backend)

## 🌐 Visão Geral
O usuário pode:
1. Colar código e obter análise heurística imediata.
2. Enviar URL de repositório Git e acompanhar progresso em tempo real (SSE).
3. Salvar histórico autenticado de análises e consultar métricas agregadas.
4. Exportar resultados em PDF, HTML, CSV ou JSON.

O sistema padroniza resultados em “sections” (id, título, severidade, itens) para reaproveitar entre UI, métricas e exportações.

## ✨ Principais Funcionalidades
- Suporte a: JavaScript, Python, HTML, CSS (+ fallback genérico para Ruby/PHP/Go)
- Integração ESLint em memória para JavaScript
- Clonagem rasa + varredura concorrente de repositórios (cancelável)
- Histórico por usuário + métricas filtradas (período / linguagem)
- Exportação multi-formato (PDF/HTML/CSV/JSON)
- Autenticação JWT + usuário demo opcional
- Arquitetura modular para adicionar novos analisadores

## 🧩 Arquitetura
| Camada | Papel |
| ------ | ----- |
| Backend (Express + TS) | Rotas REST, SSE, autenticação, geração de relatórios |
| Analyzers | Heurísticas por linguagem + enriquecimento de estatísticas |
| Summary Builder | Converte resultado bruto em sections uniformes |
| Persistência (Prisma) | Usuários e análises (MongoDB na versão atual) |
| Frontend (React) | Painéis: Auth, Git, Métricas, Histórico, Resultado |
| Reporting | PDFKit + serializadores HTML/CSV/JSON |

### Pipeline de Análise
1. Recebe código + `fileType`.
2. Executa heurística específica.
3. (JS) Agrega diagnóstico do ESLint.
4. Normaliza em sections (issues, estatísticas, dicas).
5. (Opcional) Persiste e disponibiliza para histórico / métricas.

### Streaming de Repositório Git
- Endpoint SSE: `/api/git/analyze/stream?repoUrl=...&token=...`
- Eventos: `meta` → múltiplos `progress` → `done` | `cancelled` | `error`
- Cancelamento via `POST /api/git/analyze/cancel` (com `reqId`).

## 🗂 Estrutura (Resumo)
```
backend/
  prisma/          # schema.prisma (Mongo) + dbs locais de dev/test
  src/
    analyzers/     # Heurísticas por linguagem
    report/        # Geração de PDF/HTML/CSV/JSON
    utils/         # gitAnalyzer, eslintRunner, summaryBuilder
    server.ts      # Rotas, SSE e middlewares
    store.ts       # Persistência e agregações
frontend/
  src/             # Componentes React e api.ts
img/               # Print da interface
scripts/           # copy-frontend-build.js
```

## 🚀 Como Rodar Localmente
Pré-requisitos: Node 18+, git, (opcional) instância MongoDB ou Atlas.

```bash
git clone https://github.com/Hiidoko/Code-Analyzer.git
cd Code-Analyzer

# Instalar dependências
npm install --prefix backend
npm install --prefix frontend

# Variáveis de ambiente
cp backend/.env.example backend/.env
echo "JWT_SECRET=uma-senha-forte" >> backend/.env

# Desenvolvimento (frontend + backend)
npm run dev

# Produção (single service: backend serve build do frontend)
npm run build
npm start
```

Dev: Backend http://localhost:4000 • Frontend http://localhost:5173

### Variáveis Principais
| Nome | Descrição |
| ---- | --------- |
| `DATABASE_URL` | Conexão Prisma (Mongo/Postgres/etc.) |
| `JWT_SECRET` | Assinatura de tokens |
| `BCRYPT_ROUNDS` | Custo do hash (default 12) |
| `DISABLE_DEFAULT_DEMO` | Impede criação de usuário demo |
| `DISABLE_DEFAULT_ADMIN` | Impede admin padrão |
| `RATE_LIMIT_*` | Ajustes de limites (janela, máximo) |
| `CORS_ORIGINS` | Lista de origens permitidas (se vazio libera em dev) |

## 🔗 Endpoints Principais
| Método | Rota | Descrição |
| ------ | ----- | --------- |
| POST | `/api/auth/register` | Cria usuário |
| POST | `/api/auth/login` | Gera JWT |
| POST | `/api/auth/demo` | Sessão demo (se habilitado) |
| POST | `/api/analyze` | Analisa código isolado |
| POST | `/api/report/pdf|html|json|csv` | Exporta relatório |
| GET | `/api/history` | Lista análises do usuário |
| GET | `/api/history/:id` | Detalhe de análise |
| GET | `/api/metrics` | Métricas agregadas (query: `period`, `fileType`) |
| POST | `/api/git/analyze` | Análise rápida de repo (sem streaming) |
| GET | `/api/git/analyze/stream` | Streaming SSE do repo |
| POST | `/api/git/analyze/cancel` | Cancela processo ativo |
| GET | `/health` | Health check |

Exemplo (request de análise):
```json
{
  "code": "def soma(a,b):\n    return a+b",
  "fileType": "py",
  "fileName": "soma.py"
}
```

Resposta (simplificada):
```json
{
  "fileType": "py",
  "result": { "lines": 2, "functions": 1 },
  "summary": {
    "generatedAt": "2025-10-06T12:00:00.000Z",
    "issuesCount": 0,
    "sections": [ { "id": "py-basic", "title": "Python Básico", "severity": "info", "items": ["1 função detectada"] } ]
  }
}
```

## 🔐 Segurança (Atual)
- JWT (expiração 12h)
- Hash de senha com bcrypt
- Rate limiting para auth e API geral
- CORS configurável
> Recomendado adicionar: MFA, logs estruturados, auditoria, rotação de chave e RBAC granular antes de produção real.

## 📤 Formatos de Exportação
| Formato | Uso |
| ------- | --- |
| PDF | Compartilhar snapshot legível |
| HTML | Visualização rica offline |
| CSV | Planilhas / BI simples |
| JSON | Integrações / pipelines |

## 🧪 Testes & Qualidade
| Área | Status |
| ---- | ------ |
| Autenticação | Coberta por testes de integração |
| Analyzers | Cobertura parcial de heurísticas | 
| Git (stream) | Cobertura unit básica (expandir) |
| Exportações | Testes parciais (HTML/JSON) |

Rodar testes:
```bash
npm --prefix backend run test
```

## �️ Roadmap
- Lints de segurança (bandit, semgrep) e Python avançado
- Postgres com agregações (queries analíticas)
- Cache incremental de repositórios + diff re-run
- Geração assíncrona de relatórios pesados
- Alertas de regressão de métricas
- Logger estruturado (pino) + correlação
- Testes E2E (Playwright) para fluxo streaming completo

## FAQ
**Posso adicionar outra linguagem?** Criar novo arquivo em `analyzers/` e registrar no índice.  
**Por que heurísticas simples?** Objetivo é velocidade e arquitetura demonstrativa.  
**Posso separar frontend e backend?** Sim: servir `frontend/dist` em CDN e apontar `baseURL` no `api.ts`.  
**Posso usar em produção?** Só após hardening (segurança, observabilidade, escalabilidade).  

## ⚠️ Disclaimer
Conteúdo técnico ilustrativo; não garante análise exaustiva nem segurança robusta em produção sem reforços adicionais.

## 📄 Licença
Licença **MIT**. Verifique requisitos antes de uso corporativo.

## 🙌 Créditos
Criado por **Caio Marques (Hiidoko)**  \
[LinkedIn](https://linkedin.com/in/hiidoko)


 Se este projeto te ajudou, deixe uma ⭐.

---
<p align="center">Code Analyzer — métricas, insights e relatórios em um fluxo simples. ⚡</p>


