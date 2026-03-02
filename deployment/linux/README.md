# Linux Production Kit

Este diretório contém os arquivos operacionais para publicar e implantar o ML Gestao Total em Linux.

## Arquivos

- `.env.production.example`: modelo de variáveis de produção.
- `deploy-prod.sh`: build + instalação local de release no servidor.
- `ml-gestao-api.service`: unit file do systemd para API.
- `nginx-ml-gestao-total.conf`: vhost Nginx (frontend + proxy `/api`).
- `smoke-test.sh`: validação pós-deploy.
- `backup-sqlite.sh`: backup do banco SQLite.
- `restore-sqlite.sh`: restauração de backup.

## Fluxo recomendado

1. Ajustar variáveis com base em `.env.production.example` (incluindo `CORS_ORIGIN` com o domínio público).
2. Rodar `deploy-prod.sh`.
3. Instalar `ml-gestao-api.service` e iniciar serviço.
4. Instalar config do Nginx e recarregar.
5. Executar `smoke-test.sh`.
6. Agendar `backup-sqlite.sh` no cron.

## Exemplo de cron (backup diário às 02:30)

```bash
30 2 * * * /opt/ml-gestao-total/deployment/linux/backup-sqlite.sh >> /var/log/ml-gestao-backup.log 2>&1
```
