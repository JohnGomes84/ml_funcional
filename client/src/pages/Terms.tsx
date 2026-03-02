const EFFECTIVE_DATE = "02/03/2026";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Termos de Uso</h1>
        <p className="text-sm text-gray-600">Vigencia: {EFFECTIVE_DATE}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Aceitacao</h2>
          <p className="text-gray-700">
            Ao acessar a plataforma ML Gestao Total, o usuario declara ciencia e concordancia com estes
            termos e com a Politica de Privacidade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Conta e credenciais</h2>
          <p className="text-gray-700">
            O usuario e responsavel por manter sigilo da senha, nao compartilhar credenciais e reportar
            imediatamente qualquer suspeita de uso indevido.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Uso permitido</h2>
          <p className="text-gray-700">
            E vedado usar o sistema para atividades ilicitas, tentativa de fraude, acesso nao autorizado,
            exfiltracao de dados ou qualquer acao que comprometa seguranca e disponibilidade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Perfis e autorizacoes</h2>
          <p className="text-gray-700">
            O acesso a funcionalidades depende do perfil de permissao configurado. Acoes administrativas
            devem ser realizadas apenas por usuarios autorizados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Disponibilidade e manutencao</h2>
          <p className="text-gray-700">
            Podem ocorrer indisponibilidades temporarias por manutencao, seguranca ou evolucao tecnica.
            Sempre que possivel, a manutencao sera comunicada previamente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Auditoria e conformidade</h2>
          <p className="text-gray-700">
            A plataforma registra trilhas de auditoria para fins de seguranca, governanca e conformidade
            legal, incluindo eventos de autenticacao e operacoes criticas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Responsabilidades</h2>
          <p className="text-gray-700">
            Cada parte responde por suas obrigacoes legais e contratuais. O usuario deve inserir apenas
            dados necessarios, corretos e atualizados, respeitando a legislacao aplicavel.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">8. Contato</h2>
          <p className="text-gray-700">
            Duvidas contratuais e de uso: suporte@mlgestao.com.br
            <br />
            Questoes de privacidade: privacidade@mlgestao.com.br
          </p>
        </section>
      </div>
    </div>
  );
}
