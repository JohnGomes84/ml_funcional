# Linux Production Kit

Este diretorio contem os arquivos operacionais para publicar e implantar o ML Gestao Total em Linux.

## Arquivos

- `.env.production.example`: modelo de variaveis de producao.
- `deploy-prod.sh`: build + instalacao local de release no servidor.
- `ml-gestao-api.service`: unit file do systemd para API.
- `nginx-ml-gestao-total.conf`: vhost Nginx (frontend + proxy `/api`).
- `smoke-test.sh`: validacao pos-deploy.
- `backup-sqlite.sh`: backup do banco SQLite.
- `restore-sqlite.sh`: restauracao de backup.
- `ops-check.sh`: verificacao operacional (servico, health, backup, disco).
- `crontab.example`: agendamentos de backup e monitoramento.
- `OPERACAO_CONTINUA.md`: runbook completo de operacao e conformidade tecnica.

## Fluxo recomendado

1. Criar `.env.local` em `/opt/ml-gestao-total` com base em `.env.production.example`.
2. Ajustar `CORS_ORIGIN`, `TRUST_PROXY`, `JSON_BODY_LIMIT` e `JWT_SECRET` para o dominio publico.
3. Definir `VITE_*` antes do build (sao variaveis de build-time do frontend).
4. Rodar `deploy-prod.sh`.
5. Instalar `ml-gestao-api.service` e iniciar o servico.
6. Instalar config do Nginx com HTTPS e recarregar.
7. Executar `smoke-test.sh`.
8. Agendar `backup-sqlite.sh` e `ops-check.sh` no cron.

Comandos uteis:

```bash
pnpm run smoke
pnpm run smoke:local
```

- `smoke`: apenas valida uma API ja ativa.
- `smoke:local`: sobe a API localmente, executa smoke e finaliza o processo.

Por padrao, o smoke-test espera ate 30s a API responder. Para ajustar:

```bash
HEALTH_TIMEOUT_SECONDS=60 HEALTH_INTERVAL_SECONDS=2 pnpm run smoke
```

## Hardening aplicado/recomendado

- Encerrar trafego externo em HTTPS (TLS) no Nginx e redirecionar HTTP para HTTPS.
- Na primeira emissao de certificado, usar `certbot certonly --standalone` antes de ativar o vhost HTTPS.
- Definir `TRUST_PROXY=1` quando houver apenas um proxy reverso entre cliente e API.
- Revisar periodicamente `JWT_SECRET` e aplicar rotacao com janela de manutencao.
- Manter `CORS_ORIGIN` estritamente no dominio oficial do frontend.
- Rodar API no systemd com usuario sem privilegio e `ProtectSystem=strict`.
- Executar backup com `sqlite3 .backup`, checksum e (opcional) copia offsite.

## Exemplo de cron

```bash
crontab deployment/linux/crontab.example
```

Teste manual dos controles:

```bash
BASE_URL=http://127.0.0.1:3001 bash deployment/linux/smoke-test.sh
CHECK_SYSTEMD=0 BASE_URL=http://127.0.0.1:3001 bash deployment/linux/ops-check.sh
```
