const EFFECTIVE_DATE = "02/03/2026";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Politica de Privacidade</h1>
        <p className="text-sm text-gray-600">Vigencia: {EFFECTIVE_DATE}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Escopo</h2>
          <p className="text-gray-700">
            Esta politica regula o tratamento de dados pessoais na plataforma ML Gestao Total, incluindo
            os modulos RH Prime e Gestao Operacional.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Dados coletados</h2>
          <p className="text-gray-700">
            Podemos tratar dados de identificacao, contato, perfil de acesso, registros de auditoria,
            dados operacionais e dados relacionados a obrigacoes trabalhistas e legais.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Finalidades e bases legais</h2>
          <p className="text-gray-700">
            Os dados sao tratados para autenticacao, seguranca, execucao de contratos, cumprimento de
            obrigacoes legais e legitimo interesse, sempre conforme a LGPD.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Compartilhamento</h2>
          <p className="text-gray-700">
            O compartilhamento ocorre apenas quando necessario para operacao da plataforma, exigencia legal,
            auditoria ou suporte tecnico, com controles de acesso e confidencialidade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Retencao e descarte</h2>
          <p className="text-gray-700">
            Os dados sao mantidos pelo prazo necessario para cada finalidade e obrigacoes legais aplicaveis.
            Apos o prazo, os dados sao anonimizados ou eliminados de forma segura.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Direitos do titular</h2>
          <p className="text-gray-700">
            O titular pode solicitar confirmacao de tratamento, acesso, correcao, portabilidade, eliminacao
            e revisao, observadas as hipoteses legais.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Seguranca da informacao</h2>
          <p className="text-gray-700">
            Adotamos medidas tecnicas e administrativas para proteger os dados, incluindo controle de acesso,
            trilhas de auditoria e monitoramento de incidentes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">8. Contato do encarregado (DPO)</h2>
          <p className="text-gray-700">
            Email: privacidade@mlgestao.com.br
            <br />
            Canal de solicitacoes: /privacy
          </p>
        </section>
      </div>
    </div>
  );
}
