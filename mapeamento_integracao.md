# Mapeamento de Funcionalidades e Integração - ML Gestão Total

## 1. Módulo RH Prime (Administrativo/CLT)
Focado na gestão de longo prazo e conformidade legal de funcionários fixos.

| Funcionalidade | Descrição | Status |
| :--- | :--- | :--- |
| **Gestão de Funcionários** | Cadastro completo (CLT), Dossiê Digital, Dependentes. | Existente |
| **Cargos e Salários** | Estrutura de cargos, CBO, Histórico salarial. | Existente |
| **Férias e Afastamentos** | Controle de períodos aquisitivos e gozo. | Existente |
| **Saúde e Segurança** | ASO, PGR, PCMSO, Treinamentos. | Existente |
| **Folha de Pagamento** | Processamento de holerites e benefícios. | Existente |
| **Ponto e Horas Extras** | Registro de jornada e banco de horas. | Existente |

## 2. Módulo Gestão Operacional (Campo/Diaristas)
Focado na agilidade operacional e controle de riscos de terceiros/diaristas.

| Funcionalidade | Descrição | Status |
| :--- | :--- | :--- |
| **Gestão de Diaristas** | Cadastro simplificado, Termos de aceite, Documentação. | Existente |
| **Controle de Clientes** | Cadastro de empresas e locais de prestação de serviço. | Existente |
| **Alocações** | Escala de trabalho, Sugestão inteligente de pessoal. | Existente |
| **Motor de Risco** | Alerta de continuidade (evitar vínculo empregatício). | Existente |
| **Pagamento de Diárias** | Controle de valores por função e cliente. | Existente |
| **Relatório Quinzenal** | Fechamento para faturamento por cliente. | Existente |

## 3. Pontos de Interconexão (A Chave é o CPF)

### A. Sincronização de Identidade (Auth & Profile)
- **Unificação de Usuários:** Uma única tabela `users` para acesso a ambos os sistemas.
- **Perfil Híbrido:** O sistema deve identificar se um CPF existe em ambos os módulos (ex: um ex-diarista que virou CLT).

### B. Gestão de Riscos Integrada
- **Consulta Cruzada:** Ao alocar um diarista no Operacional, o sistema consulta o RH Prime para verificar se há impedimentos (ex: ex-funcionário em período de quarentena ou processo trabalhista).
- **Histórico Unificado:** O "Dossiê" do colaborador deve mostrar sua jornada na empresa, seja como diarista ou CLT.

### C. Dashboard Executivo
- **Visão 360°:** Total de "Pessoas em Operação" (CLT + Diaristas).
- **Alertas de Conformidade:** Exibir em uma única tela vencimentos de ASO (RH) e Riscos de Continuidade (Operacional).

## 4. Estrutura de Dados (Proposta de Unificação)
- **Shared Schema:** Tabelas de `users`, `audit_logs`, `settings`.
- **RH Schema:** Tabelas de `employees`, `vacations`, `payroll`, etc.
- **Operacional Schema:** Tabelas de `workers`, `allocations`, `clients`, `shifts`.
