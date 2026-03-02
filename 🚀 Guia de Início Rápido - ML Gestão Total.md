# Guia de Inicio Rapido - ML Gestao Total

Tempo estimado: 5-10 minutos

## 1) Pre-requisitos

Certifique-se de ter instalado:

```bash
node --version
pnpm --version
sqlite3 --version
```

Se faltar algo:
- Node.js: https://nodejs.org/
- pnpm: `npm install -g pnpm`
- SQLite CLI (Windows): `winget install --id SQLite.SQLite -e`

## 2) Instalar dependencias

```bash
pnpm install
```

## 3) Configurar ambiente

Crie o arquivo `.env.local` com base no exemplo:

```bash
cp .env.example .env.local
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Campos importantes:
- `JWT_SECRET`: use uma chave forte.
- `ALLOWED_EMAIL_DOMAIN`: dominio permitido para cadastro/login.
- `DB_PATH`: caminho do arquivo SQLite.

## 4) Iniciar desenvolvimento

```bash
pnpm dev
```

Servicos esperados:
- Frontend: http://localhost:5173
- API health: http://localhost:3001/api/health

## 5) Primeiro acesso

A API de autenticacao nao cria usuario fixo por padrao.
O primeiro usuario registrado vira `admin` automaticamente.

Exemplo de cadastro:

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@mlservicoseco.com.br",
  "password": "admin12345",
  "name": "Administrador",
  "acceptTerms": true
}
```

Depois, faca login em:

```http
POST /api/auth/login
```

## 6) Comandos uteis

```bash
pnpm dev
pnpm check
pnpm build
pnpm test
```

## 7) Troubleshooting

### `sqlite3` nao reconhecido
Abra um novo terminal e rode:

```bash
sqlite3 --version
```

### Porta em uso

```bash
$env:PORT=3002
pnpm dev
```

### Erro de dominio no login/cadastro
Ajuste `ALLOWED_EMAIL_DOMAIN` no `.env.local`.

## Proximos passos

1. Subir `pnpm dev` e validar `/api/health`.
2. Criar usuario admin pelo endpoint de registro.
3. Integrar login no frontend com o token JWT.
