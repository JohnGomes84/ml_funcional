# ML Gestão Total - Plataforma Unificada de RH e Operações

**Versão:** 1.0.0  
**Status:** Blueprint Executável (Pronto para Produção)

## 📋 Visão Geral

ML Gestão Total é uma plataforma corporativa que unifica dois sistemas independentes:

- **RH Prime:** Gestão de Recursos Humanos (CLT, Folha, Conformidade)
- **Gestão Operacional:** Controle de Diaristas e Operações de Campo

A plataforma utiliza **CPF como chave de interconexão**, permitindo consultas cruzadas e identificação automática de riscos trabalhistas.

## 🏗️ Arquitetura

```
ml-gestao-total/
├── client/src/              # Frontend React + Tailwind
│   ├── pages/              # Páginas dos módulos
│   ├── lib/                # Configuração tRPC
│   └── index.html          # Entry point
├── server/                 # Backend Node.js + Express
│   ├── _core/              # Autenticação, DB, tRPC
│   ├── routers.ts          # Rotas unificadas
│   └── db.ts               # Funções de banco de dados
├── drizzle/                # Schema do banco de dados
│   └── schema.ts           # Tabelas unificadas
└── package.json            # Dependências
```

## 🚀 Instalação e Setup

### Pré-requisitos

- Node.js 18+
- pnpm 10+
- MySQL 8.0+ ou TiDB
- Git

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/ml-gestao-total.git
cd ml-gestao-total
```

### 2. Instalar Dependências

```bash
pnpm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Banco de Dados
DATABASE_URL="mysql://usuario:senha@localhost:3306/ml_gestao_total"

# Autenticação
JWT_SECRET="sua-chave-secreta-muito-segura-aqui"
OAUTH_SERVER_URL="https://seu-oauth-provider.com"

# API
VITE_APP_TITLE="ML Gestão Total"
VITE_APP_LOGO="https://seu-logo.png"

# Ambiente
NODE_ENV="development"
```

### 4. Criar Banco de Dados

```bash
pnpm db:push
```

Este comando:
- Gera as migrações Drizzle
- Cria todas as tabelas (RH + Operacional)
- Popula dados iniciais

### 5. Iniciar o Servidor de Desenvolvimento

```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:5173`

## 📊 Funcionalidades Principais

### Módulo RH Prime

- ✅ Cadastro de Funcionários CLT
- ✅ Gestão de Cargos e Salários
- ✅ Controle de Férias e Afastamentos
- ✅ Saúde e Segurança (ASO, PGR, PCMSO)
- ✅ Folha de Pagamento
- ✅ Dossiê Digital

### Módulo Gestão Operacional

- ✅ Cadastro de Diaristas
- ✅ Alocações Inteligentes
- ✅ Motor de Risco Trabalhista
- ✅ Controle de Clientes
- ✅ Relatório Quinzenal

### Interconexão Unificada

- ✅ Consulta CPF Cruzada (RH + Operacional)
- ✅ Detecção de Conflitos de Vínculo
- ✅ Dashboard 360°
- ✅ Alertas de Risco Automáticos

## 🔌 API tRPC

### Endpoints RH Prime

```typescript
// Listar funcionários
trpc.rh.employees.list.query({ search: "João" })

// Criar funcionário
trpc.rh.employees.create.mutate({
  fullName: "João Silva",
  cpf: "123.456.789-00",
  employmentType: "CLT"
})

// Listar cargos
trpc.rh.positions.list.query()
```

### Endpoints Gestão Operacional

```typescript
// Listar diaristas
trpc.operacional.workers.list.query({ search: "Maria" })

// Criar alocação
trpc.operacional.allocations.create.mutate({
  workerId: 1,
  clientId: 1,
  workDate: "2026-02-25"
})
```

### Endpoints de Interconexão

```typescript
// Consulta CPF unificada
trpc.integration.getUnifiedColaboradorStatus.query({ cpf: "123.456.789-00" })

// Dashboard com métricas
trpc.integration.getDashboardMetrics.query()
```

## 🔐 Segurança

- **Autenticação:** JWT com OAuth
- **Criptografia:** Hash bcrypt para senhas
- **Auditoria:** Log completo de operações
- **LGPD:** Conformidade com legislação de dados pessoais
- **CLT:** Conformidade com legislação trabalhista

## 📈 Deployment

### Opção 1: Manus (Recomendado)

```bash
# Fazer checkpoint
pnpm build

# Publicar via UI Manus
# Clique no botão "Publish" na interface
```

### Opção 2: Railway

```bash
# Instalar CLI
npm i -g @railway/cli

# Deploy
railway up
```

### Opção 3: Render

1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Deploy automático

### Opção 4: Seu Próprio Servidor

```bash
# Build
pnpm build

# Iniciar
NODE_ENV=production node dist/index.js
```

## 🧪 Testes

```bash
# Executar testes
pnpm test

# Modo watch
pnpm test --watch
```

## 📝 Estrutura de Dados

### Tabelas Compartilhadas

- `users` - Autenticação unificada
- `audit_logs` - Auditoria de operações

### Tabelas RH Prime

- `employees` - Funcionários CLT
- `positions` - Cargos
- `contracts` - Contratos
- `vacations` - Férias

### Tabelas Gestão Operacional

- `workers` - Diaristas
- `clients` - Clientes
- `allocations` - Alocações
- `shifts` - Turnos

## 🎯 Fluxo de Integração via CPF

```
1. Usuário busca CPF "123.456.789-00"
   ↓
2. Sistema consulta tabela `employees` (RH)
   ↓
3. Sistema consulta tabela `workers` (Operacional)
   ↓
4. Se encontrado em ambas:
   - Alerta: "Conflito de Vínculo"
   - Recomendação: "Bloquear alocações"
   ↓
5. Dashboard exibe status unificado
```

## 🚨 Alertas de Risco

O motor de risco analisa:

- **Continuidade:** Alocações no mesmo cliente > 30 dias
- **Frequência:** Mais de 20 dias/mês com mesmo cliente
- **Híbrido:** Cadastro simultâneo como CLT e Diarista
- **Documentação:** Falta de ASO, PGR, PCMSO

## 📞 Suporte

Para dúvidas ou issues:

1. Abra uma issue no GitHub
2. Contate: support@mlgestao.com.br
3. Documentação: https://docs.mlgestao.com.br

## 📄 Licença

MIT

## 🤝 Contribuições

Contribuições são bem-vindas! Por favor:

1. Faça um fork
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

**Desenvolvido com ❤️ por Manus AI**
