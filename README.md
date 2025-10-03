<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4-black?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/PDFKit-reporting-orange" alt="PDFKit" />
</p>

<h1 align="center">Code Analyzer</h1>
<p align="center">Plataforma full‑stack para análise multilíngue de código, geração de relatórios e inspeção de qualidade com métricas e histórico.</p>
<p align="center"><strong>Status:</strong> Preview / v1.0.0 (arquitetura modular em evolução)</p>

---

## ✨ Principais Recursos

- 🔐 Autenticação JWT (usuário padrão demo + cadastro) + sessão persistente/temporária
- 🧠 Análise heurística de múltiplas linguagens: Python, JavaScript, HTML, CSS (+ genéricos Ruby, PHP, Go)
- 🛡️ Integração com ESLint (execução programática) incorporada ao relatório de JS
- 📦 Exportação de relatórios: PDF, HTML, CSV e JSON
- 🧾 Histórico de análises + Métricas agregadas (por linguagem, média de issues, últimas execuções)
- 🌐 Análise de repositórios Git (clone superficial, filtros, limites, estatísticas por linguagem)
- 🔄 SSE infra básica (em evolução para streaming de progresso avançado)
- 🎯 UI moderna com: tema claro/escuro, sidebar recolhível, scrollspy, skeleton loaders
- 🔒 Regras de força de senha com zxcvbn e bloqueio de cadastro fraco
- 🧩 Arquitetura preparada para expansão (linters adicionais, DB, chaves de API)

---

## 🏗 Arquitetura Geral

| Camada | Stack | Destaques |
|--------|-------|-----------|
| Frontend | React + Vite + TS | SPA modular, tema dinâmico, componentes desacoplados, design system leve (CSS custom) |
| Backend | Node.js + Express + TS | Endpoints REST, geração de relatórios, análise + lint, git analyzer, JWT auth |
| Relatórios | PDFKit + HTML templates | Layout sumarizado (seções, severidade, métricas) |
| Lint | ESLint API | Execução isolada por arquivo e incorporação no sumário |
| Git | simple-git + filtros FS | Clone superficial, filtros de extensão, estatísticas agregadas |
| Segurança | JWT, heurísticas de senha | Gating de cadastro por força mínima (zxcvbn) |

---

## 📂 Estrutura de Pastas Simplificada

```
backend/
  src/
    analyzers/          # Analisadores por linguagem + genérico
    report/              # Geradores de PDF / HTML / CSV / JSON wrappers
    utils/               # Eslint runner, git analyzer, summary builder
    types.ts             # Tipagens centrais backend
    server.ts            # Setup Express, rotas e middlewares
frontend/
  src/
    components/          # Painéis (Auth, Git, Métricas, Histórico, Resultado)
    App.tsx              # Shell principal + tema + navegação + modal
    styles.css           # Design system e temas
    types.ts             # Tipos compartilhados para consumo da API
```

---

## 🚀 Início Rápido

### Requisitos
| Ferramenta | Versão Recomendada |
|------------|--------------------|
| Node.js    | 18+                |
| npm        | 9+                 |

### Ambiente de Desenvolvimento (monorepo simplificado)

```powershell
git clone https://github.com/Hiidoko/Code-Analyzer.git
cd Code-Analyzer
npm install --prefix backend
npm install --prefix frontend
npm run dev
```

Scripts combinados: `npm run dev` (root) levanta backend (porta 4000) e frontend (porta 5173) simultaneamente via concurrently.

### Executar Backend isolado
```powershell
cd backend
npm install
npm run dev
```

### Executar Frontend isolado
```powershell
cd frontend
npm install
npm run dev
```

### Build Produção
```powershell
cd backend && npm run build
cd ../frontend && npm run build
```

---

## 🔐 Autenticação
Fluxo simples com registro e login JWT. Tokens podem ser armazenados em localStorage (persistente) ou sessionStorage (sessão). Usuário demo disponível via botão “Testar a Demo”, com badge visual e banner informativo.

Campos de senha passam por avaliação zxcvbn; cadastro é bloqueado se força < nível “Razoável”.

---

## 🧪 Análise de Código
Cada arquivo enviado (upload ou colagem) passa por heurísticas específicas da linguagem:

| Linguagem | Heurísticas / Notas |
|-----------|---------------------|
| Python    | Contagem de funções, classes, complexidade superficial (heurística) |
| JavaScript| ESLint (issues), contagem de estruturas, padrões de risco básicos |
| HTML      | Estrutura, tags repetidas, acessibilidade básica (heurística) |
| CSS       | Seletores, profundidade e possíveis sobrecargas |
| Genérico (rb/php/go)| Fallback de contagem de linhas, tokens e densidade |

Resumo estruturado em seções com severidade (`info`, `warning`, `success`) e itens descritivos.

---

## 🌐 Análise de Repositório Git
Endpoint recebe `repoUrl` (e opcional `branch`), clona de forma superficial e processa apenas extensões suportadas. Estatísticas:

- Arquivos analisados / ignorados
- Issues totais agregadas
- Distribuição por linguagem (`files`, `issues`)

A arquitetura já contempla callback de progresso (infra para SSE / streaming). Limites protegem contra repositórios muito extensos.

---

## 📊 Histórico & Métricas
Armazenamento in-memory (preview) registra análises para compor:

- Total de análises
- Média de issues
- Últimas análises (timestamp + linguagem + contagem)
- Agrupamento por linguagem

Rota `/api/history` para listagem e `/api/history/:id` para detalhamento individual.

---

## 📝 Relatórios
| Formato | Uso / Características |
|---------|-----------------------|
| PDF     | Sumário formatado com títulos e listagens legíveis (PDFKit) |
| HTML    | Estrutura leve para visualização direta em navegador |
| CSV     | Export das linhas principais / issues sintetizadas |
| JSON    | Objeto completo retornado pela análise |

Downloads acionados diretamente pelo frontend após POST para `/api/report/{formato}`.

---

## 🧰 Scripts Importantes

### Root
| Script | Descrição |
|--------|-----------|
| `npm run dev` | Sobe backend + frontend em paralelo |

### Backend
| Script | Descrição |
|--------|-----------|
| `npm run dev` | Watch com `tsx` |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Inicia build compilada |
| `npm run lint` | Executa ESLint |
| `npm test` | Jest (placeholder inicial) |

### Frontend
| Script | Descrição |
|--------|-----------|
| `npm run dev` | Vite dev server |
| `npm run build` | Build de produção |
| `npm run preview` | Servir build gerada |

---

## 🔄 Fluxo Resumido (Exemplo de Uso)
1. Autentique-se (ou use a Demo)  
2. Cole ou selecione um arquivo de código  
3. Selecione a linguagem (detecção automática tenta inferir pela extensão)  
4. Clique em “Analisar”  
5. Visualize resumo por seções + (opcional) JSON bruto  
6. Exporte em PDF / HTML / CSV / JSON conforme necessidade  
7. Consulte histórico e métricas agregadas  
8. (Opcional) Forneça URL de repositório Git para análise em lote  

---

## 🧱 Design & UX
- Tema claro/escuro com transições suaves
- Sidebar com scrollspy e ícones SVG inline
- Skeleton loaders (quick stats, histórico, métricas, cards de resultado)
- Modal “Sobre” com grid de seções
- Password strength feedback + requisitos dinâmicos

---

## 🔮 Roadmap Futuro (Planejado)
- Persistência em banco (PostgreSQL / SQLite / Prisma)
- Cache de repositórios Git e diff incremental
- Linter Python (flake8 / pylint) e segurança (bandit)
- Streaming granular (SSE) de progresso por arquivo
- Geração de token de API e automação CI usage
- Painel de vulnerabilidades / hotspots de complexidade

---

## 📦 Dependências Principais
| Área | Libs |
|------|------|
| Backend | express, cors, jsonwebtoken, pdfkit, simple-git |
| Lint | eslint (programático) |
| Frontend | react, react-dom, axios, zxcvbn |
| Tooling | typescript, ts-jest, tsx, concurrently |

---

## 🔒 Segurança (Atual / Próxima Fase)
| Item | Status |
|------|--------|
| JWT Auth | Implementado |
| Password Strength (zxcvbn) | Implementado (gating) |
| Rate limiting | Pendente |
| Brute force mitigations | Pendente |
| Hardening headers (helmet) | Pendente |

---

## ✅ Qualidade & Testes
Testes iniciais configurados (Jest + ts-jest + supertest). Cobertura ainda mínima — foco futuro em:
- Integração Git analyzer (mock fs / shallow clone fake)
- Casos de erro e limites (tamanho / extensão / timeout)
- Teste de lint (ESLint) comparando contagens esperadas

Para executar:
```powershell
cd backend
npm test
```

---

## 🐞 Troubleshooting Rápido
| Problema | Causa Comum | Ação |
|----------|-------------|------|
| Erro CORS | Backend não iniciado | Verifique porta 4000 ativa |
| PDF vazio | Código não enviado / erro interno | Inspecione resposta JSON de /analyze |
| Clone Git lento | Repositório grande | Limitar escopo, confirmar rede, adicionar cache (futuro) |
| Registro bloqueado | Senha fraca | Aumente diversidade / comprimento |

---

## 🤝 Contribuindo
1. Faça um fork
2. Crie branch de feature (`feat/nome`)
3. Commits semânticos (ex: `feat: adiciona suporte a ...`)
4. Abra Pull Request descrevendo motivação + mudanças

Sugestões, issues e PRs são bem-vindos.

---

## 📄 Licença
Projeto sob licença ISC (padrão do repositório). Avalie requisitos da sua organização antes de uso em produção.

---

## 🙋 FAQ Curto
| Pergunta | Resposta |
|----------|----------|
| Por que in‑memory storage? | Foco em prototipagem rápida; persistência será plugada depois. |
| Suporta outras linguagens? | Estrutura pronta – basta criar novo analyzer e registrar no índice. |
| Como adicionar outro formato de relatório? | Criar módulo em `backend/src/report` e expor rota em `server.ts`. |
| Posso integrar CI? | Sim, chamando as rotas de análise e coletando JSON. Token de API futura facilitará. |

---

## 🙌 Agradecimentos
Inspirado em ferramentas de code quality e linters modernos. Construído para demonstrar boas práticas de modularização, DX e UX progressiva.

---

<p align="center">Feito com ♥ para elevar a qualidade e velocidade de análise de código.</p>
