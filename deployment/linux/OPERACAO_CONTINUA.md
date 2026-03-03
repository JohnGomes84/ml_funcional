# Operacao Continua em Producao

Ultima atualizacao: 3 de marco de 2026

## 1. Objetivo

Este runbook fecha o que falta para manter o ML Gestao Total operando com:
- disponibilidade continua
- seguranca operacional
- evidencias para auditoria interna (LGPD, trabalhista e SST)

Escopo: infraestrutura Linux, dominio/HTTPS, backup/restaure, monitoramento, resposta a incidente e governanca tecnica.

## 2. Meta tecnica minima (Definition of Done)

Considere "100% operacional" quando todos os itens abaixo estiverem verdadeiros:

1. Dominio publico apontando para o servidor.
2. HTTPS ativo e renovacao automatica do certificado.
3. `ml-gestao-api` ativo via systemd e `smoke-test.sh` aprovado.
4. Backup diario executando sem falha + copia offsite.
5. `ops-check.sh` executando periodicamente com alerta em falha.
6. Restore testado em homologacao e documentado.
7. Segredos de producao fora de repositorio e com controle de acesso.
8. Logs de acesso/seguranca retidos conforme politica da empresa.

## 3. Implantacao base (P0)

### 3.1 DNS e TLS

1. Criar/validar DNS:
   - `A` ou `AAAA` para `seu-dominio.com` apontando para o IP do servidor.
2. Gerar certificado inicial (primeira emissao):

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo systemctl stop nginx
sudo certbot certonly --standalone -d seu-dominio.com
sudo systemctl start nginx
sudo certbot renew --dry-run
```

3. Publicar o vhost HTTPS:

```bash
sudo cp deployment/linux/nginx-ml-gestao-total.conf /etc/nginx/sites-available/ml-gestao-total
sudo ln -sfn /etc/nginx/sites-available/ml-gestao-total /etc/nginx/sites-enabled/ml-gestao-total
sudo nginx -t
sudo systemctl reload nginx
```

### 3.2 Servico da API (systemd)

1. Publicar unit:
   - `deployment/linux/ml-gestao-api.service`
2. Ativar servico:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ml-gestao-api
sudo systemctl restart ml-gestao-api
sudo systemctl status ml-gestao-api --no-pager
```

3. Validar:

```bash
BASE_URL=http://127.0.0.1:3001 bash deployment/linux/smoke-test.sh
curl -fsS https://seu-dominio.com/api/health
```

### 3.3 Deploy de release

```bash
APP_DIR=/opt/ml-gestao-total RUN_TESTS=1 bash deployment/linux/deploy-prod.sh
sudo systemctl restart ml-gestao-api
BASE_URL=http://127.0.0.1:3001 bash deployment/linux/smoke-test.sh
```

## 4. Backup e restore

### 4.1 Backup diario

Script: `deployment/linux/backup-sqlite.sh`

Caracteristicas:
- backup consistente com `sqlite3 .backup`
- `integrity_check` no artefato
- compressao opcional
- checksum SHA256
- upload opcional para S3 via `OFFSITE_S3_URI`
- retencao por idade e quantidade

Exemplo manual:

```bash
APP_DIR=/opt/ml-gestao-total \
OFFSITE_S3_URI=s3://meu-bucket/ml-gestao/backups \
bash deployment/linux/backup-sqlite.sh
```

### 4.2 Restore seguro

Script: `deployment/linux/restore-sqlite.sh`

Caracteristicas:
- valida checksum (quando existir)
- cria rollback point antes de sobrescrever
- valida integridade do banco restaurado
- reinicia servico ao final

Exemplo:

```bash
bash deployment/linux/restore-sqlite.sh /opt/ml-gestao-total/backups/prod-YYYY-MM-DD-HHMMSS.db.gz
```

Ambiente sem systemd (laboratorio/sandbox):

```bash
USE_SYSTEMD=0 bash deployment/linux/restore-sqlite.sh /tmp/prod-YYYY-MM-DD-HHMMSS.db.gz
```

## 5. Monitoramento e alerta

Script: `deployment/linux/ops-check.sh`

Verifica:
1. status do systemd (`ml-gestao-api`)
2. `/api/health`
3. idade do ultimo backup
4. uso de disco

Exemplo:

```bash
APP_DIR=/opt/ml-gestao-total \
BASE_URL=http://127.0.0.1:3001 \
MAX_BACKUP_AGE_HOURS=26 \
bash deployment/linux/ops-check.sh
```

Sem checagem de systemd:

```bash
CHECK_SYSTEMD=0 BASE_URL=http://127.0.0.1:3001 bash deployment/linux/ops-check.sh
```

## 6. Agendamentos recomendados (cron)

Arquivo base:
- `deployment/linux/crontab.example`

Aplicar:

```bash
crontab deployment/linux/crontab.example
crontab -l
```

## 7. Rotina operacional

### Diario

1. Checar `ops-check`.
2. Checar resultado do backup noturno.
3. Confirmar espaco em disco e crescimento do banco.

### Semanal

1. Testar restore em ambiente de homologacao.
2. Revisar logs de autenticacao e falhas (tentativas de login/429/401).
3. Validar renovacao do certificado (`certbot renew --dry-run`).

### Mensal

1. Atualizacao de seguranca do SO e runtime (Node/pnpm).
2. Revisao de acessos administrativos.
3. Rotacao planejada de segredos criticos (JWT, credenciais de backup offsite).

## 8. Matriz tecnica de conformidade (evidencias)

Esta matriz e operacional, para apoiar o trabalho do juridico/contabil.

1. LGPD - seguranca e governanca:
   - controle: logs de auth + trilha de auditoria + backup + resposta a incidente
   - evidencia: `journalctl`, `audit_logs`, logs de backup, relatorio de restore
2. Marco Civil - guarda e seguranca de registros:
   - controle: retention policy de logs e trilha de acesso administrativo
   - evidencia: configuracao de retenacao e registros exportados
3. Trabalhista/eSocial/SST:
   - controle: consistencia de cadastro, rastreabilidade de alteracoes, rotinas de disponibilidade
   - evidencia: historico de deploy, logs de transacao, backups e restore testado

## 9. Resposta a incidente (tecnico)

1. Detectar:
   - alerta do `ops-check`, erro 5xx, indisponibilidade de healthcheck ou falha de backup.
2. Conter:
   - bloquear origem ofensiva no edge/firewall (se aplicavel)
   - preservar evidencias (logs/journal/snapshot do banco)
3. Recuperar:
   - rollback de release ou restore do banco
   - validar `smoke-test.sh` e principais fluxos de login
4. Pos-incidente:
   - registrar causa raiz
   - abrir acao corretiva com prazo e responsavel
   - anexar evidencias

## 10. SLO/SLA internos sugeridos

1. Disponibilidade API mensal: >= 99.5%
2. RPO (perda maxima de dados): <= 24h (backup diario) ou <= 1h (com backup horario)
3. RTO (tempo para recuperar): <= 60 min
4. Tempo de deteccao de falha critica: <= 10 min

## 11. Checklist de auditoria interna (pronto para uso)

- [ ] Dominio e TLS funcionando
- [ ] Servico systemd ativo e com hardening aplicado
- [ ] Backup diario + checksum + offsite
- [ ] Teste de restore homologado no ultimo ciclo
- [ ] Monitoramento automatizado e alertas ativos
- [ ] Evidencias arquivadas (deploy, backup, restore, incidentes)
- [ ] Politica de acesso administrativo revisada
