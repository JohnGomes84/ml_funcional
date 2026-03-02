# Guia de Deploy em Producao - ML Gestao Total

Ultima atualizacao: 1 de marco de 2026

## 1. Objetivo

Este roteiro descreve como publicar e implantar o sistema em producao com:
- Frontend estatico (Vite)
- Backend Node.js (Express)
- Banco SQLite (better-sqlite3)

## 1.1 Kit Pronto no Repositorio

Arquivos operacionais prontos em `deployment/linux/`:
- `deploy-prod.sh`
- `ml-gestao-api.service`
- `nginx-ml-gestao-total.conf`
- `smoke-test.sh`
- `backup-sqlite.sh`
- `restore-sqlite.sh`
- `.env.production.example`

Antes de usar:

```bash
cd /opt/ml-gestao-total
chmod +x deployment/linux/*.sh
cp deployment/linux/.env.production.example .env.local
```

## 2. Arquitetura de Producao

- Frontend: arquivos em `dist/` servidos por Nginx
- Backend API: processo Node em `server-dist/server/core/index.js`
- Banco: arquivo SQLite definido por `DB_PATH`
- Reverse proxy:
  - `https://seu-dominio` -> frontend
  - `https://seu-dominio/api/*` -> backend (`127.0.0.1:3001`)

## 3. Pre-requisitos do Servidor

1. Linux Ubuntu 22.04+ (recomendado)
2. Node.js 22 LTS
3. pnpm 10.x
4. Nginx
5. Usuario de sistema para app (ex: `mlgestao`)
6. Diretoria de app (ex: `/opt/ml-gestao-total`)

## 4. Variaveis de Ambiente de Producao

Crie `.env.local` no servidor com:

```env
NODE_ENV=production
PORT=3001
DB_PATH=/opt/ml-gestao-total/data/prod.db
JWT_SECRET=COLOQUE_AQUI_UM_SEGREDO_FORTE_E_UNICO
ALLOWED_EMAIL_DOMAIN=mlservicoseco.com.br
VITE_APP_TITLE=ML Gestao Total
```

Notas:
- `JWT_SECRET` e obrigatorio em producao.
- Use segredo com 32+ caracteres aleatorios.
- `DB_PATH` deve apontar para disco persistente.

## 5. Publicacao (Build de Release)

No ambiente de CI ou maquina de release:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm run check:server
pnpm run build:server
pnpm build
```

Artefatos gerados:
- Frontend: `dist/`
- Backend compilado: `server-dist/`

## 6. Implantacao no Servidor

### 6.1. Copiar codigo

```bash
rsync -av --delete ./ usuario@servidor:/opt/ml-gestao-total/
```

### 6.2. Instalar dependencias e build final

```bash
cd /opt/ml-gestao-total
pnpm install --frozen-lockfile
pnpm run build:server
pnpm build
```

### 6.3. Teste local da API no servidor

```bash
PORT=3001 NODE_ENV=production pnpm start
# em outro terminal
curl -sS http://127.0.0.1:3001/api/health
```

Resposta esperada: `{"status":"ok",...}`

## 7. Servico Systemd (Backend)

Crie `/etc/systemd/system/ml-gestao-api.service`:

```ini
[Unit]
Description=ML Gestao Total API
After=network.target

[Service]
Type=simple
User=mlgestao
WorkingDirectory=/opt/ml-gestao-total
Environment=NODE_ENV=production
Environment=PORT=3001
EnvironmentFile=/opt/ml-gestao-total/.env.local
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Ativar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ml-gestao-api
sudo systemctl start ml-gestao-api
sudo systemctl status ml-gestao-api
```

## 8. Nginx (Frontend + Proxy API)

Arquivo exemplo `/etc/nginx/sites-available/ml-gestao-total`:

```nginx
server {
  listen 80;
  server_name seu-dominio.com;

  root /opt/ml-gestao-total/dist;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Ativar:

```bash
sudo ln -s /etc/nginx/sites-available/ml-gestao-total /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Depois configure HTTPS com Certbot.

## 9. Validacao Pos-Deploy

1. API health:

```bash
curl -sS https://seu-dominio.com/api/health
```

2. Fluxos de autenticacao:
- Registro com dominio permitido
- Login
- `/api/auth/me` com token
- Admin `/api/auth/users` e `/api/auth/audit-logs`

3. Verificar logs:

```bash
sudo journalctl -u ml-gestao-api -f
```

## 10. Backup e Restauracao (SQLite)

### Backup diario

```bash
mkdir -p /opt/ml-gestao-total/backups
cp /opt/ml-gestao-total/data/prod.db /opt/ml-gestao-total/backups/prod-$(date +%F-%H%M).db
```

### Restauracao

1. Parar servico:

```bash
sudo systemctl stop ml-gestao-api
```

2. Restaurar arquivo:

```bash
cp /opt/ml-gestao-total/backups/prod-AAAA-MM-DD-HHMM.db /opt/ml-gestao-total/data/prod.db
```

3. Subir servico:

```bash
sudo systemctl start ml-gestao-api
```

## 11. Plano de Rollback

1. Manter release anterior em pasta separada (ex: `/opt/ml-gestao-total/releases/<versao>`)
2. Se falhar:
- voltar symlink `current` para versao anterior
- restaurar backup do `prod.db` se houve mudanca de dados
- reiniciar servico
3. Validar novamente `/api/health` e login admin

## 12. Checklist de Go-Live

- [ ] `pnpm check` OK
- [ ] `pnpm run check:server` OK
- [ ] `pnpm run build:server` OK
- [ ] `pnpm build` OK
- [ ] `JWT_SECRET` definido e forte
- [ ] `NODE_ENV=production`
- [ ] `DB_PATH` persistente
- [ ] Service systemd ativo
- [ ] Nginx + HTTPS ativo
- [ ] Backup inicial realizado
- [ ] Smoke test funcional concluido

## 13. Operacao Continua

- Janela de deploy com backup antes de cada release
- Monitorar:
  - disponibilidade (`/api/health`)
  - erros no journal
  - tamanho do banco SQLite
- Rotina sugerida:
  - backup diario
  - teste de restauracao mensal
  - rotacao de logs
