# Estrutura do Projeto - ML Gestão Total

## 📁 Visão Geral

```
ml-gestao-total/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── pages/                  # Páginas dos módulos
│   │   │   ├── Dashboard.tsx       # Dashboard principal
│   │   │   ├── rh/                 # Páginas RH Prime
│   │   │   │   ├── Employees.tsx
│   │   │   │   ├── Positions.tsx
│   │   │   │   └── Vacations.tsx
│   │   │   └── operacional/        # Páginas Gestão Operacional
│   │   │       ├── Workers.tsx
│   │   │       ├── Allocations.tsx
│   │   │       └── Clients.tsx
│   │   ├── components/             # Componentes reutilizáveis
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Table.tsx
│   │   │   └── Form.tsx
│   │   ├── lib/                    # Utilitários
│   │   │   ├── trpc.ts            # Configuração tRPC
│   │   │   └── utils.ts           # Funções auxiliares
│   │   ├── App.tsx                # Componente raiz
│   │   ├── index.css              # Estilos globais
│   │   └── main.tsx               # Entry point
│   └── index.html                 # HTML template
│
├── server/                          # Backend Node.js
│   ├── _core/                      # Infraestrutura
│   │   ├── index.ts               # Servidor Express
│   │   ├── trpc.ts                # Setup tRPC
│   │   ├── db.ts                  # Conexão banco de dados
│   │   ├── context.ts             # Contexto tRPC
│   │   ├── env.ts                 # Variáveis de ambiente
│   │   ├── auth.ts                # Autenticação JWT
│   │   └── oauth.ts               # OAuth integration
│   ├── modules/                    # Módulos de negócio
│   │   ├── rh/                    # Módulo RH Prime
│   │   │   ├── services.ts
│   │   │   ├── validators.ts
│   │   │   └── types.ts
│   │   └── operacional/           # Módulo Gestão Operacional
│   │       ├── services.ts
│   │       ├── validators.ts
│   │       └── types.ts
│   ├── routers.ts                 # Rotas tRPC unificadas
│   ├── db.ts                      # Funções de banco de dados
│   ├── middleware.ts              # Middleware Express
│   └── utils/                     # Utilitários
│       ├── encryption.ts
│       ├── validation.ts
│       └── logger.ts
│
├── drizzle/                         # Banco de Dados
│   ├── schema.ts                  # Definição de tabelas
│   ├── migrations/                # Histórico de migrações
│   └── seed.ts                    # Dados iniciais
│
├── shared/                          # Código compartilhado
│   ├── types.ts                   # Tipos TypeScript
│   ├── constants.ts               # Constantes
│   └── validators.ts              # Validações Zod
│
├── tests/                           # Testes
│   ├── unit/                      # Testes unitários
│   ├── integration/               # Testes de integração
│   └── e2e/                       # Testes end-to-end
│
├── .github/
│   └── workflows/                 # CI/CD
│       └── deploy.yml
│
├── public/                          # Arquivos estáticos
│   ├── logo.png
│   └── favicon.ico
│
├── .env.local                       # Variáveis de ambiente (local)
├── .env.production                  # Variáveis de ambiente (produção)
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── README.md
├── DEPLOYMENT.md
└── PROJECT_STRUCTURE.md
```

## 📦 Módulos Principais

### 1. Cliente (Frontend)

**Responsabilidades:**
- Interface do usuário
- Navegação entre módulos
- Chamadas à API tRPC
- Autenticação local

**Tecnologias:**
- React 19
- Tailwind CSS
- Wouter (roteamento)
- React Query
- Zod (validação)

### 2. Servidor (Backend)

**Responsabilidades:**
- Lógica de negócio
- Autenticação e autorização
- Acesso ao banco de dados
- Auditoria e logs

**Tecnologias:**
- Express
- tRPC
- Drizzle ORM
- JWT
- bcrypt

### 3. Banco de Dados

**Responsabilidades:**
- Persistência de dados
- Integridade referencial
- Auditoria

**Tecnologias:**
- MySQL 8.0+
- Drizzle ORM
- Migrations

## 🔄 Fluxo de Dados

```
Cliente (React)
    ↓
tRPC Client
    ↓
Express Server
    ↓
tRPC Router
    ↓
Database Functions
    ↓
Drizzle ORM
    ↓
MySQL
```

## 🎯 Padrões de Código

### Naming Conventions

- **Arquivos:** `kebab-case` (ex: `dashboard.tsx`)
- **Componentes:** `PascalCase` (ex: `Dashboard`)
- **Funções:** `camelCase` (ex: `getEmployee`)
- **Constantes:** `UPPER_SNAKE_CASE` (ex: `MAX_WORKERS`)

### Estrutura de Componente React

```typescript
import React from "react";
import { trpc } from "../lib/trpc";

interface Props {
  id: number;
}

export function MyComponent({ id }: Props) {
  const query = trpc.rh.employees.get.useQuery({ id });

  if (query.isLoading) return <div>Carregando...</div>;
  if (query.error) return <div>Erro: {query.error.message}</div>;

  return <div>{query.data?.fullName}</div>;
}
```

### Estrutura de Rota tRPC

```typescript
export const appRouter = router({
  rh: router({
    employees: router({
      list: protectedProcedure
        .input(z.object({ search: z.string().optional() }))
        .query(async ({ input }) => {
          return db.listEmployees(input.search);
        }),
    }),
  }),
});
```

## 🔐 Segurança

- **Autenticação:** JWT com refresh tokens
- **Autorização:** Role-based access control (RBAC)
- **Validação:** Zod em client e server
- **Criptografia:** bcrypt para senhas
- **HTTPS:** Obrigatório em produção
- **CORS:** Configurado para domínios específicos

## 📊 Performance

- **Frontend:** Lazy loading de componentes
- **Backend:** Caching de queries frequentes
- **Banco:** Índices em CPF, email, status
- **API:** Paginação de listas grandes

## 🧪 Testes

```bash
# Unitários
pnpm test

# Integração
pnpm test:integration

# E2E
pnpm test:e2e

# Cobertura
pnpm test:coverage
```

## 📝 Documentação

- **README.md:** Visão geral e setup
- **DEPLOYMENT.md:** Guia de deployment
- **PROJECT_STRUCTURE.md:** Este arquivo
- **Código:** Comentários em pontos críticos

## 🚀 Próximos Passos

1. Implementar páginas de cada módulo
2. Adicionar testes unitários
3. Configurar CI/CD
4. Deploy em staging
5. Testes de carga
6. Deploy em produção

---

**Última atualização:** 25 de fevereiro de 2026
