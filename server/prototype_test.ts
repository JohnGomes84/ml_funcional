/**
 * PROTÓTIPO DE TESTE: Interconexão RH Prime e Gestão Operacional
 * Objetivo: Validar a consulta cruzada via CPF entre os dois módulos.
 */

// Simulação de Dados do Módulo RH Prime (Funcionários CLT)
const rhEmployees = [
  { id: 1, fullName: "João Silva", cpf: "123.456.789-00", status: "Ativo", role: "Ajudante Geral" },
  { id: 2, fullName: "Maria Oliveira", cpf: "987.654.321-11", status: "Férias", role: "Recepcionista" }
];

// Simulação de Dados do Módulo Gestão Operacional (Diaristas e Alocações)
const operacionalWorkers = [
  { id: 101, fullName: "João Silva", cpf: "123.456.789-00", riskScore: 85, riskLevel: "high" },
  { id: 102, fullName: "Carlos Santos", cpf: "111.222.333-44", riskScore: 10, riskLevel: "low" }
];

const operacionalAllocations = [
  { workerId: 101, client: "Cliente A", date: "2026-02-18" },
  { workerId: 101, client: "Cliente A", date: "2026-02-19" },
  { workerId: 101, client: "Cliente A", date: "2026-02-20" }
];

/**
 * Função de Consulta Unificada (Interface de Interconexão)
 */
async function getUnifiedColaboradorStatus(cpf: string) {
  console.log(`\n--- Consultando CPF: ${cpf} ---`);

  // 1. Busca no Módulo RH
  const rhData = rhEmployees.find(e => e.cpf === cpf);
  
  // 2. Busca no Módulo Operacional
  const opData = operacionalWorkers.find(w => w.cpf === cpf);
  const opAllocations = opData ? operacionalAllocations.filter(a => a.workerId === opData.id) : [];

  // 3. Lógica de Interconexão (Regra de Negócio Híbrida)
  const isHybrid = rhData && opData;
  const riskAlert = opData?.riskLevel === "high" || opData?.riskLevel === "critical";
  const cltStatus = rhData?.status || "Não cadastrado no RH";

  return {
    cpf,
    nome: rhData?.fullName || opData?.fullName || "Não encontrado",
    vinculoRH: rhData ? "CLT" : "Nenhum",
    statusRH: cltStatus,
    vinculoOperacional: opData ? "Diarista" : "Nenhum",
    alocaçõesRecentes: opAllocations.length,
    nivelRisco: opData?.riskLevel || "N/A",
    alertaHibrido: isHybrid ? "⚠️ ATENÇÃO: Colaborador com cadastro CLT e Diarista simultâneo!" : "Normal",
    recomendacao: (isHybrid || riskAlert) ? "Bloquear novas alocações e revisar contrato." : "Liberado para operação."
  };
}

/**
 * Execução do Teste (Passo a Passo)
 */
async function runPrototype() {
  console.log("=== INICIANDO PROTÓTIPO DE INTERCONEXÃO ML GESTÃO TOTAL ===");

  // Caso 1: Colaborador Híbrido (Risco de Vínculo)
  const result1 = await getUnifiedColaboradorStatus("123.456.789-00");
  console.table(result1);

  // Caso 2: Somente CLT
  const result2 = await getUnifiedColaboradorStatus("987.654.321-11");
  console.table(result2);

  // Caso 3: Somente Diarista (Baixo Risco)
  const result3 = await getUnifiedColaboradorStatus("111.222.333-44");
  console.table(result3);

  console.log("\n=== TESTE CONCLUÍDO COM SUCESSO ===");
}

runPrototype();
