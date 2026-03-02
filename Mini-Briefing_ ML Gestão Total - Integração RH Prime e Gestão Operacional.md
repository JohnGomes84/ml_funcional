# Mini-Briefing: ML Gestão Total - Integração RH Prime e Gestão Operacional

**Autor:** Manus AI
**Data:** 20 de fevereiro de 2026

## 1. Introdução

Este documento apresenta o mini-briefing para a integração dos sistemas **RH Prime** e **Gestão Operacional**, visando a criação de uma ferramenta corporativa unificada, denominada **ML Gestão Total**. O objetivo principal é consolidar as funcionalidades de Recursos Humanos e gestão de operações de diaristas, mantendo a modularidade e o baixo acoplamento entre os sistemas, com o CPF como chave central de interconexão.

## 2. Escopo da Integração

A integração visa criar um ambiente unificado onde ambos os sistemas coexistam como módulos independentes, compartilhando uma infraestrutura comum de autenticação e banco de dados. As principais áreas de atuação de cada módulo são:

*   **RH Prime:** Responsável pela gestão administrativa de funcionários CLT, incluindo cadastro completo, dossiê digital, gestão de cargos e salários, controle de férias e afastamentos, saúde e segurança ocupacional (ASO, PGR, PCMSO), folha de pagamento, ponto e horas extras.
*   **Gestão Operacional:** Focado na gestão de diaristas e operações de campo, abrangendo cadastro simplificado de trabalhadores, controle de clientes e locais de serviço, alocações de pessoal com sugestões inteligentes, motor de risco trabalhista para evitar vínculo empregatício, controle de pagamento de diárias e relatórios quinzenais para faturamento.

## 3. Arquitetura Proposta: Modularidade e Baixo Acoplamento

A arquitetura proposta baseia-se na manutenção da independência dos módulos, com uma camada de orquestração que gerencia a comunicação e a apresentação unificada. A estrutura de diretórios será organizada para refletir essa modularidade:

*   `server/modules/rh/`: Conterá toda a lógica de negócio, serviços e rotas específicas do RH Prime.
*   `server/modules/operacional/`: Conterá toda a lógica de negócio, serviços e rotas específicas da Gestão Operacional.
*   `client/src/modules/`: Organizará os componentes e páginas da interface do usuário, separados por contexto de cada módulo.
*   `shared/`: Um diretório para tipos, constantes e utilitários comuns que podem ser utilizados por ambos os módulos, como definições de autenticação e estruturas de dados básicas.

A **autenticação** e o **banco de dados** serão unificados. Ambos os sistemas utilizarão a mesma tabela de `users` para autenticação e gerenciamento de perfis de acesso. Os esquemas de banco de dados serão integrados, mas as tabelas específicas de cada módulo permanecerão separadas, garantindo a independência lógica.

## 4. Pontos de Interconexão e Fluxos de Dados

A interconexão entre os módulos será realizada de forma controlada, utilizando o **CPF como chave principal** para vincular informações entre os sistemas. Isso garante a rastreabilidade e a integridade dos dados do colaborador em diferentes contextos.

| Fluxo de Integração | Descrição | Módulos Envolvidos | Chave de Ligação | Benefício | Observações |
| :------------------ | :-------- | :----------------- | :--------------- | :-------- | :---------- |
| **Sincronização de Cadastro** | Quando um diarista do módulo de Gestão Operacional é efetivado ou necessita de um registro mais completo, seus dados básicos são migrados ou sincronizados com o módulo RH Prime para um cadastro CLT. | Gestão Operacional -> RH Prime | CPF | Evitar duplicidade de cadastros e garantir conformidade legal para funcionários CLT. | A migração deve ser um processo manual ou semi-automático, com validação. |
| **Validação de Risco Trabalhista** | O módulo de Gestão Operacional consulta o RH Prime para verificar o histórico de um trabalhador (diarista) antes de uma nova alocação. Isso inclui verificar se o CPF está associado a um funcionário CLT ativo, se há histórico de afastamentos, férias recentes ou processos trabalhistas que possam gerar risco de vínculo empregatício. | Gestão Operacional <-> RH Prime | CPF | Reduzir riscos trabalhistas, garantir a rotatividade adequada de diaristas e evitar a caracterização de vínculo empregatício. | A consulta deve ser assíncrona e não bloquear a alocação, mas gerar alertas. |
| **Dashboard Unificado** | Uma interface centralizada apresentará métricas e alertas consolidados de ambos os sistemas, como o número total de pessoas em operação (CLT + Diaristas), status de conformidade (ASO, PGR, PCMSO do RH Prime) e alertas de risco trabalhista (do Gestão Operacional). | RH Prime -> Dashboard, Gestão Operacional -> Dashboard | N/A (agregação de dados) | Visão gerencial 360 graus para tomada de decisões estratégicas. | Apenas dados agregados e alertas serão exibidos para manter o baixo acoplamento. |

## 5. Protótipo de Teste (Exemplo de Fluxo de Validação)

Para demonstrar a viabilidade da interconexão via CPF, será desenvolvido um protótipo simples com o seguinte fluxo:

1.  **Entrada:** Um CPF de um trabalhador.
2.  **Processamento:**
    *   O sistema consulta o módulo RH Prime para verificar se o CPF corresponde a um funcionário CLT ativo.
    *   Simultaneamente, consulta o módulo Gestão Operacional para verificar se o CPF está associado a um diarista e se há alocações recentes ou alertas de risco.
3.  **Saída Esperada:** Um status unificado que indica:
    *   Se o CPF é de um funcionário CLT.
    *   Se o CPF é de um diarista com alocações ativas.
    *   Se há algum alerta de risco trabalhista associado a esse CPF (ex: alta frequência de alocações no mesmo cliente).

Este protótipo permitirá validar a comunicação entre os módulos e a eficácia do CPF como chave de ligação, sem a necessidade de desenvolver todas as funcionalidades completas.

## 6. Estimativa de Custo (Complexidade)

A complexidade desta fase inicial de estruturação e prototipagem é considerada **média**. Envolve a criação de uma nova estrutura de projeto, a adaptação de configurações de build, a unificação de dependências, a refatoração de rotas e schemas para suportar a modularidade, e o desenvolvimento do protótipo de interconexão. A maior parte do esforço estará na organização e adaptação dos códigos existentes para o novo paradigma modular, garantindo que as bases para futuras expansões sejam sólidas e eficientes.

## 7. Próximos Passos

Após a sua aprovação deste mini-briefing, o próximo passo será a criação da estrutura de pastas unificada e o desenvolvimento do protótipo de teste, conforme descrito no item 5.
