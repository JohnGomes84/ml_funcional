# Trilha de Lancamento Passo a Passo (Sem Pular Etapas)

Ultima atualizacao: 2026-03-03

Objetivo:
- Levar o app para producao com previsibilidade.
- Nao perder contexto nem pular etapas.
- Registrar evidencias de cada fase.

Regra de ouro:
- So avance para a proxima etapa se TODOS os criterios de aceite da etapa atual estiverem verdes.

---

## Etapa 0 - Controle da execucao

### 0.1 Criar pasta de evidencias no servidor

```bash
mkdir -p /opt/ml-gestao-total/evidencias-go-live
```

### 0.2 Abrir diario de execucao

Salvar em `/opt/ml-gestao-total/evidencias-go-live/diario-go-live.md`:

```md
# Diario Go-Live
- Data/hora inicio:
- Responsavel:
- Dominio:
- IP servidor:
```

Criterio de aceite:
- [ ] Pasta criada.
- [ ] Diario criado.

---

## Etapa 1 - Pre-check local (codigo)

No repositorio local:

```bash
git pull origin main
pnpm install
pnpm run validate
```

Criterio de aceite:
- [ ] `git pull` sem conflito.
- [ ] `pnpm run validate` passou 100%.

Evidencia:
- Copiar saida final para `evidencias-go-live/etapa-1-validate.txt`.

---

## Etapa 2 - Provisionar servidor Linux

Minimo recomendado:
- Ubuntu 22.04+.
- 2 vCPU, 4 GB RAM, 60+ GB SSD.
- Usuario de app: `mlgestao`.
- Diretorio: `/opt/ml-gestao-total`.

Comandos base:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y nginx certbot sqlite3 curl git
```

Instalar Node 22 + pnpm (conforme padrao da empresa).

Criterio de aceite:
- [ ] `node -v` disponivel.
- [ ] `pnpm -v` disponivel.
- [ ] `nginx -v` disponivel.

---

## Etapa 3 - DNS e dominio

1. Configurar dominio (ex.: `app.seudominio.com.br`) para IP do servidor.
2. Confirmar propagacao:

```bash
dig +short app.seudominio.com.br
```

Criterio de aceite:
- [ ] `dig` retorna IP correto do servidor.

---

## Etapa 4 - Publicar codigo no servidor

```bash
cd /opt
sudo git clone https://github.com/JohnGomes84/ml_funcional.git ml-gestao-total
sudo chown -R $USER:$USER /opt/ml-gestao-total
cd /opt/ml-gestao-total
git checkout main
git pull origin main
```

Criterio de aceite:
- [ ] Repositorio clonado/atualizado.
- [ ] Commit esperado presente (`git rev-parse --short HEAD`).

---

## Etapa 5 - Configuracao de ambiente

```bash
cd /opt/ml-gestao-total
cp deployment/linux/.env.production.example .env.local
```

Editar `.env.local`:
- `JWT_SECRET` forte e unico.
- `CORS_ORIGIN` com dominio real HTTPS.
- `VITE_API_BASE_URL` com dominio real HTTPS.
- `DB_PATH=/opt/ml-gestao-total/data/prod.db`.

Criterio de aceite:
- [ ] `.env.local` preenchido.
- [ ] Sem segredo default.

---

## Etapa 6 - Build de release no servidor

```bash
cd /opt/ml-gestao-total
APP_DIR=/opt/ml-gestao-total RUN_TESTS=1 bash deployment/linux/deploy-prod.sh
```

Criterio de aceite:
- [ ] Deploy script finalizado sem erro.
- [ ] `dist/` e `server-dist/` gerados.

Evidencia:
- Salvar saida em `evidencias-go-live/etapa-6-deploy.txt`.

---

## Etapa 7 - Certificado TLS (primeira emissao)

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d app.seudominio.com.br
sudo systemctl start nginx
sudo certbot renew --dry-run
```

Criterio de aceite:
- [ ] Certificado emitido.
- [ ] `renew --dry-run` sem erro.

---

## Etapa 8 - Nginx em HTTPS + proxy API

```bash
sudo cp /opt/ml-gestao-total/deployment/linux/nginx-ml-gestao-total.conf /etc/nginx/sites-available/ml-gestao-total
sudo ln -sfn /etc/nginx/sites-available/ml-gestao-total /etc/nginx/sites-enabled/ml-gestao-total
sudo nginx -t
sudo systemctl reload nginx
```

Lembrar de ajustar `server_name` no arquivo para dominio real.

Criterio de aceite:
- [ ] `nginx -t` ok.
- [ ] HTTPS respondendo no dominio.

---

## Etapa 9 - Subir API com systemd

```bash
sudo cp /opt/ml-gestao-total/deployment/linux/ml-gestao-api.service /etc/systemd/system/ml-gestao-api.service
sudo systemctl daemon-reload
sudo systemctl enable ml-gestao-api
sudo systemctl restart ml-gestao-api
sudo systemctl status ml-gestao-api --no-pager
```

Criterio de aceite:
- [ ] Servico ativo (`active (running)`).

---

## Etapa 10 - Validacoes de producao

```bash
cd /opt/ml-gestao-total
BASE_URL=http://127.0.0.1:3001 bash deployment/linux/smoke-test.sh
curl -fsS https://app.seudominio.com.br/api/health
```

Validar tambem no navegador:
1. Registro.
2. Login.
3. Dashboard.
4. RH (cadastro/listagem).
5. Operacional (diaristas/alocacoes).
6. Admin e Auditoria (perfil admin).

Criterio de aceite:
- [ ] `smoke-test` passou.
- [ ] `/api/health` HTTPS respondeu.
- [ ] Fluxos principais sem erro.

---

## Etapa 11 - Backup e monitoramento continuo

```bash
cd /opt/ml-gestao-total
crontab deployment/linux/crontab.example
crontab -l
```

Teste manual:

```bash
bash deployment/linux/backup-sqlite.sh
bash deployment/linux/ops-check.sh
```

Criterio de aceite:
- [ ] Cron ativo.
- [ ] Backup gerado com checksum.
- [ ] `ops-check` sem falha critica.

---

## Etapa 12 - Encerramento formal do go-live

Checklist final:
- [ ] Dominio + HTTPS ok.
- [ ] API + frontend ok.
- [ ] Backup + restore testado.
- [ ] Monitoramento ativo.
- [ ] Diario de go-live preenchido.

Arquivos de referencia:
- `deployment/linux/OPERACAO_CONTINUA.md`
- `deployment/linux/README.md`
- `Guia de Deployment - ML Gestao Total.md`

Decisao:
- [ ] Go-Live aprovado.
- [ ] Go-Live bloqueado (abrir plano de acao).

---

## Controle de mudancas pos-go-live (anti-colcha-de-retalhos)

Para cada nova demanda:
1. Abrir ticket.
2. Definir impacto (Auth, RH, Operacional, Infra).
3. Definir criterio de aceite e teste.
4. Implementar em branch dedicada.
5. Rodar `pnpm run validate`.
6. Registrar no changelog de release.
7. Deploy com backup previo obrigatorio.
