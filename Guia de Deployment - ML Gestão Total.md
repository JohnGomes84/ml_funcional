# Guia de Deploy em Producao - ML Gestao Total

Ultima atualizacao: 2 de marco de 2026

## 1. Objetivo

Este roteiro descreve como publicar e implantar o sistema em producao com:
- Frontend estatico (Vite)
- Backend Node.js (Express)
- Banco SQLite (better-sqlite3)

## 1.1 Kit pronto no repositorio

Arquivos operacionais em `deployment/linux/`:
- `deploy-prod.sh`
- `ml-gestao-api.service`
- `nginx-ml-gestao-total.conf`
- `smoke-test.sh`
- `backup-sqlite.sh`
- `restore-sqlite.sh`
- `ops-check.sh`
- `crontab.example`
- `OPERACAO_CONTINUA.md`
- `.env.production.example`

Antes de usar:

```bash
cd /opt/ml-gestao-total
chmod +x deployment/linux/*.sh
cp deployment/linux/.env.production.example .env.local
```

## 2. Arquitetura de producao

- Frontend: arquivos em `dist/` servidos por Nginx
- Backend API: processo Node em `server-dist/server/core/index.js`
- Banco: arquivo SQLite definido por `DB_PATH`
- Reverse proxy:
  - `https://seu-dominio` -> frontend
  - `https://seu-dominio/api/*` -> backend (`127.0.0.1:3001`)

## 3. Pre-requisitos do servidor

1. Linux Ubuntu 22.04+ (recomendado)
2. Node.js 22 LTS
3. pnpm 10.x
4. Nginx
5. Usuario de sistema para app (ex: `mlgestao`)
6. Diretorio de app (ex: `/opt/ml-gestao-total`)

## 4. Variaveis de ambiente de producao

Crie `.env.local` no servidor com:

```env
NODE_ENV=production
PORT=3001
TRUST_PROXY=1
JSON_BODY_LIMIT=1mb
DB_PATH=/opt/ml-gestao-total/data/prod.db
JWT_SECRET=COLOQUE_AQUI_UM_SEGREDO_FORTE_E_UNICO
ALLOWED_EMAIL_DOMAIN=mlservicoseco.com.br
CORS_ORIGIN=https://seu-dominio.com
VITE_APP_TITLE=ML Gestao Total
VITE_API_BASE_URL=https://seu-dominio.com
VITE_ALLOWED_EMAIL_DOMAIN=mlservicoseco.com.br
```

Notas:
- `JWT_SECRET` e obrigatorio em producao.
- Use segredo com 32+ caracteres aleatorios.
- `DB_PATH` deve apontar para disco persistente.
- `TRUST_PROXY=1` quando existir um proxy reverso entre cliente e API.
- `JSON_BODY_LIMIT=1mb` limita payload JSON para reduzir abuso e exaustao de memoria.
- `VITE_*` sao variaveis de build-time do frontend.

## 5. Publicacao (build de release)

No ambiente de CI ou maquina de release:

```bash
pnpm install --frozen-lockfile --prod=false
pnpm check
pnpm run check:server
pnpm run build:server
pnpm build
pnpm run test
```

Artefatos gerados:
- Frontend: `dist/`
- Backend compilado: `server-dist/`

## 6. Implantacao no servidor

### 6.1 Copiar codigo

```bash
rsync -av --delete ./ usuario@servidor:/opt/ml-gestao-total/
```

### 6.2 Instalar dependencias e build final

```bash
cd /opt/ml-gestao-total
pnpm install --frozen-lockfile --prod=false
pnpm run build:server
pnpm build
```

### 6.3 Teste local da API no servidor

```bash
PORT=3001 NODE_ENV=production pnpm start
# em outro terminal
curl -sS http://127.0.0.1:3001/api/health
```

Resposta esperada: `{"status":"ok",...}`

Opcional (scripts prontos):

```bash
pnpm run smoke
pnpm run smoke:local
```

- `smoke`: valida API ja ativa.
- `smoke:local`: sobe API localmente, valida e encerra.

## 7. Servico systemd (backend)

Crie `/etc/systemd/system/ml-gestao-api.service`:

```ini
[Unit]
Description=ML Gestao Total API
After=network.target

[Service]
Type=simple
User=mlgestao
Group=mlgestao
WorkingDirectory=/opt/ml-gestao-total
Environment=NODE_ENV=production
Environment=PORT=3001
EnvironmentFile=/opt/ml-gestao-total/.env.local
ExecStart=/usr/bin/node /opt/ml-gestao-total/server-dist/server/core/index.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=20
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectHome=true
ProtectSystem=strict
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ProtectClock=true
RestrictSUIDSGID=true
LockPersonality=true
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
SystemCallArchitectures=native
UMask=0077
ReadWritePaths=/opt/ml-gestao-total/data /opt/ml-gestao-total/backups

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

## 8. Nginx (frontend + proxy API)

Arquivo exemplo `/etc/nginx/sites-available/ml-gestao-total`:

```nginx
server {
  listen 80;
  listen [::]:80;
  server_name seu-dominio.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name seu-dominio.com;

  ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:10m;
  ssl_session_tickets off;
  ssl_protocols TLSv1.2 TLSv1.3;

  root /opt/ml-gestao-total/dist;
  index index.html;
  client_max_body_size 2m;

  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
  add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self';" always;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }
}
```

Ativar:

```bash
sudo ln -s /etc/nginx/sites-available/ml-gestao-total /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Primeira emissao do certificado (antes de ativar o vhost HTTPS):

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo systemctl stop nginx
sudo certbot certonly --standalone -d seu-dominio.com
sudo systemctl start nginx
```

Depois, ativar vhost e recarregar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Teste de renovacao automatica:

```bash
sudo certbot renew --dry-run
```

## 9. Validacao pos-deploy

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

## 10. Backup e restauracao (SQLite)

### Backup diario (com integridade + checksum)

```bash
APP_DIR=/opt/ml-gestao-total \
OFFSITE_S3_URI=s3://seu-bucket/ml-gestao/backups \
bash deployment/linux/backup-sqlite.sh
```

### Restauracao

```bash
bash deployment/linux/restore-sqlite.sh /opt/ml-gestao-total/backups/prod-AAAA-MM-DD-HHMMSS.db.gz
```

O script cria rollback point antes de restaurar e valida `PRAGMA integrity_check`.

## 11. Plano de rollback

1. Manter release anterior em pasta separada (ex: `/opt/ml-gestao-total/releases/<versao>`)
2. Se falhar:
- voltar symlink `current` para versao anterior
- restaurar backup do `prod.db` se houve mudanca de dados
- reiniciar servico
3. Validar novamente `/api/health` e login admin

## 12. Checklist de go-live

- [ ] `pnpm check` OK
- [ ] `pnpm run check:server` OK
- [ ] `pnpm run build:server` OK
- [ ] `pnpm build` OK
- [ ] `pnpm run test` OK
- [ ] `JWT_SECRET` definido e forte
- [ ] `NODE_ENV=production`
- [ ] `DB_PATH` persistente
- [ ] Service systemd ativo
- [ ] Nginx + HTTPS ativo
- [ ] Backup inicial realizado
- [ ] Smoke test funcional concluido

## 13. Operacao continua

- Janela de deploy com backup antes de cada release
- Monitorar:
  - disponibilidade (`/api/health`)
  - erros de autenticacao
  - crescimento do arquivo SQLite
- Revisar backups e teste de restauracao periodicamente
- Rodar verificacao automatica:

```bash
BASE_URL=http://127.0.0.1:3001 bash deployment/linux/ops-check.sh
```

Para cron, usar:

```bash
crontab deployment/linux/crontab.example
```

Runbook completo de operacao:
- `deployment/linux/OPERACAO_CONTINUA.md`
