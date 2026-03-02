import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type SecurityMetrics = {
  lockedUsers: number;
  usersWithFailedAttempts: number;
};

type Worker = {
  id: number;
  full_name: string;
  cpf: string;
  status: "available" | "unavailable";
  created_at: string;
};

type Allocation = {
  id: number;
  worker_id: number;
  worker_name: string;
  client_name: string;
  work_date: string;
  created_at: string;
};

type PagedResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

type AuditLog = {
  id: number;
  email: string | null;
  action: string;
  success: number;
  created_at: string;
};

type TrpcResponse<T> = {
  result?: {
    data: T;
  };
};

type WorkerForm = {
  fullName: string;
  cpf: string;
  status: "available" | "unavailable";
};

type AllocationForm = {
  workerId: number;
  clientName: string;
  workDate: string;
};

type WorkerFormErrors = {
  fullName?: string;
  cpf?: string;
};

type AllocationFormErrors = {
  workerId?: string;
  clientName?: string;
  workDate?: string;
};

const PAGE_SIZE = 10;

export default function Integration() {
  const [security, setSecurity] = useState<SecurityMetrics | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workersTotal, setWorkersTotal] = useState(0);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [allocationsTotal, setAllocationsTotal] = useState(0);
  const [workerSearch, setWorkerSearch] = useState("");
  const [allocationSearch, setAllocationSearch] = useState("");
  const [workerPage, setWorkerPage] = useState(0);
  const [allocationPage, setAllocationPage] = useState(0);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [auditBlocked, setAuditBlocked] = useState(false);
  const [error, setError] = useState("");
  const [workerForm, setWorkerForm] = useState<WorkerForm>({ fullName: "", cpf: "", status: "available" });
  const [workerFormErrors, setWorkerFormErrors] = useState<WorkerFormErrors>({});
  const [allocationForm, setAllocationForm] = useState<AllocationForm>({
    workerId: 0,
    clientName: "",
    workDate: new Date().toISOString().slice(0, 10),
  });
  const [allocationFormErrors, setAllocationFormErrors] = useState<AllocationFormErrors>({});
  const [savingWorker, setSavingWorker] = useState(false);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const token = useMemo(() => localStorage.getItem("token"), []);
  const navigate = useNavigate();

  const loadData = async (
    authToken: string,
    nextWorkerPage: number,
    nextAllocationPage: number,
    nextWorkerSearch: string,
    nextAllocationSearch: string,
  ) => {
    const headers = { Authorization: `Bearer ${authToken}` };
    const me = await axios.get<{ role: "admin" | "user" }>(`${API_BASE_URL}/api/auth/me`, { headers });
    setIsAdmin(me.data.role === "admin");

    const workersInput = encodeURIComponent(
      JSON.stringify({
        search: nextWorkerSearch || undefined,
        limit: PAGE_SIZE,
        offset: nextWorkerPage * PAGE_SIZE,
      }),
    );
    const allocationsInput = encodeURIComponent(
      JSON.stringify({
        search: nextAllocationSearch || undefined,
        limit: PAGE_SIZE,
        offset: nextAllocationPage * PAGE_SIZE,
      }),
    );

    const [securityRes, workersRes, allocationsRes] = await Promise.all([
      axios.get<TrpcResponse<SecurityMetrics>>(`${API_BASE_URL}/api/trpc/operacional/security`, { headers }),
      axios.get<TrpcResponse<PagedResult<Worker>>>(`${API_BASE_URL}/api/trpc/operacional/workers?input=${workersInput}`, {
        headers,
      }),
      axios.get<TrpcResponse<PagedResult<Allocation>>>(
        `${API_BASE_URL}/api/trpc/operacional/allocations?input=${allocationsInput}`,
        { headers },
      ),
    ]);

    setSecurity(securityRes.data.result?.data ?? null);
    const workersData = workersRes.data.result?.data;
    const allocationsData = allocationsRes.data.result?.data;
    const workersItems = workersData?.items ?? [];
    setWorkers(workersItems);
    setWorkersTotal(workersData?.total ?? 0);
    setAllocations(allocationsData?.items ?? []);
    setAllocationsTotal(allocationsData?.total ?? 0);
    setAllocationForm((prev) => ({ ...prev, workerId: prev.workerId || (workersItems[0]?.id ?? 0) }));

    axios
      .get<TrpcResponse<AuditLog[]>>(
        `${API_BASE_URL}/api/trpc/operacional/audit?input=${encodeURIComponent('{"limit":5,"offset":0}')}`,
        { headers },
      )
      .then((res) => {
        setAudit(res.data.result?.data ?? []);
        setAuditBlocked(false);
      })
      .catch((err: unknown) => {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setAuditBlocked(true);
          return;
        }
      });
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    loadData(token, workerPage, allocationPage, workerSearch, allocationSearch).catch((err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      setError("Falha ao carregar dados do modulo Operacional.");
    });
  }, [navigate, token, workerPage, allocationPage, workerSearch, allocationSearch]);

  const refresh = async () => {
    if (!token) return;
    await loadData(token, workerPage, allocationPage, workerSearch, allocationSearch);
  };

  const validateWorkerForm = (value: WorkerForm): WorkerFormErrors => {
    const errors: WorkerFormErrors = {};
    if (value.fullName.trim().length < 3) {
      errors.fullName = "Nome deve ter pelo menos 3 caracteres.";
    }
    const cpfDigits = value.cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      errors.cpf = "CPF deve conter 11 digitos.";
    }
    return errors;
  };

  const validateAllocationForm = (value: AllocationForm): AllocationFormErrors => {
    const errors: AllocationFormErrors = {};
    if (!value.workerId || value.workerId <= 0) {
      errors.workerId = "Selecione um diarista.";
    }
    if (value.clientName.trim().length < 2) {
      errors.clientName = "Cliente deve ter pelo menos 2 caracteres.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.workDate)) {
      errors.workDate = "Data invalida.";
    }
    return errors;
  };

  const handleCreateWorker = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const nextErrors = validateWorkerForm(workerForm);
    setWorkerFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Revise os campos de diarista.");
      return;
    }
    setSavingWorker(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/trpc/operacional/createWorker`, workerForm, { headers });
      setWorkerForm({ fullName: "", cpf: "", status: "available" });
      setWorkerFormErrors({});
      setWorkerPage(0);
      await loadData(token, 0, allocationPage, workerSearch, allocationSearch);
      toast.success("Diarista cadastrado.");
    } catch {
      setError("Nao foi possivel cadastrar diarista.");
      toast.error("Falha ao cadastrar diarista.");
    } finally {
      setSavingWorker(false);
    }
  };

  const handleUpdateWorkerStatus = async (id: number, status: Worker["status"]) => {
    if (!token) return;
    setUpdatingId(id);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/trpc/operacional/updateWorker`, { id, status }, { headers });
      await refresh();
      toast.success("Status do diarista atualizado.");
    } catch {
      setError("Nao foi possivel atualizar diarista.");
      toast.error("Falha ao atualizar diarista.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteWorker = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Confirma exclusao deste diarista?")) {
      return;
    }
    setUpdatingId(id);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/trpc/operacional/deleteWorker`, { id }, { headers });
      const nextPage = workerPage > 0 && workers.length === 1 ? workerPage - 1 : workerPage;
      setWorkerPage(nextPage);
      await loadData(token, nextPage, allocationPage, workerSearch, allocationSearch);
      toast.success("Diarista excluido.");
    } catch {
      setError("Nao foi possivel excluir diarista.");
      toast.error("Falha ao excluir diarista.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateAllocation = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const nextErrors = validateAllocationForm(allocationForm);
    setAllocationFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Revise os campos de alocacao.");
      return;
    }
    setSavingAllocation(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/trpc/operacional/createAllocation`, allocationForm, { headers });
      setAllocationForm((prev) => ({ ...prev, clientName: "" }));
      setAllocationFormErrors({});
      setAllocationPage(0);
      await loadData(token, workerPage, 0, workerSearch, allocationSearch);
      toast.success("Alocacao cadastrada.");
    } catch {
      setError("Nao foi possivel cadastrar alocacao.");
      toast.error("Falha ao cadastrar alocacao.");
    } finally {
      setSavingAllocation(false);
    }
  };

  const handleDeleteAllocation = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Confirma exclusao desta alocacao?")) {
      return;
    }
    setUpdatingId(id);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/trpc/operacional/deleteAllocation`, { id }, { headers });
      const nextPage = allocationPage > 0 && allocations.length === 1 ? allocationPage - 1 : allocationPage;
      setAllocationPage(nextPage);
      await loadData(token, workerPage, nextPage, workerSearch, allocationSearch);
      toast.success("Alocacao excluida.");
    } catch {
      setError("Nao foi possivel excluir alocacao.");
      toast.error("Falha ao excluir alocacao.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (error && !security) return <p className="text-red-600">{error}</p>;
  if (!security) return <div className="p-2">Carregando...</div>;

  const workersPages = Math.max(Math.ceil(workersTotal / PAGE_SIZE), 1);
  const allocationsPages = Math.max(Math.ceil(allocationsTotal / PAGE_SIZE), 1);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Operacional</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded border p-3"><p className="text-xs text-gray-500">Contas bloqueadas</p><p className="text-xl font-semibold">{security.lockedUsers}</p></div>
        <div className="rounded border p-3"><p className="text-xs text-gray-500">Usuarios com tentativas falhas</p><p className="text-xl font-semibold">{security.usersWithFailedAttempts}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <form onSubmit={handleCreateWorker} className="space-y-2 rounded border p-3">
          <h2 className="text-sm font-semibold">Novo diarista</h2>
          <input value={workerForm.fullName} onChange={(e) => setWorkerForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="Nome completo" className="w-full rounded border px-3 py-2 text-sm" required />
          {workerFormErrors.fullName && <p className="text-xs text-red-600">{workerFormErrors.fullName}</p>}
          <input value={workerForm.cpf} onChange={(e) => setWorkerForm((p) => ({ ...p, cpf: e.target.value }))} placeholder="CPF" className="w-full rounded border px-3 py-2 text-sm" required />
          {workerFormErrors.cpf && <p className="text-xs text-red-600">{workerFormErrors.cpf}</p>}
          <select value={workerForm.status} onChange={(e) => setWorkerForm((p) => ({ ...p, status: e.target.value as WorkerForm["status"] }))} className="w-full rounded border px-3 py-2 text-sm"><option value="available">Disponivel</option><option value="unavailable">Indisponivel</option></select>
          <button type="submit" disabled={savingWorker || !isAdmin} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60">{savingWorker ? "Salvando..." : "Cadastrar diarista"}</button>
        </form>

        <form onSubmit={handleCreateAllocation} className="space-y-2 rounded border p-3">
          <h2 className="text-sm font-semibold">Nova alocacao</h2>
          <select value={allocationForm.workerId} onChange={(e) => setAllocationForm((p) => ({ ...p, workerId: Number(e.target.value) }))} className="w-full rounded border px-3 py-2 text-sm" required>
            {workers.length === 0 ? <option value={0}>Nenhum diarista</option> : workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.full_name}</option>)}
          </select>
          {allocationFormErrors.workerId && <p className="text-xs text-red-600">{allocationFormErrors.workerId}</p>}
          <input value={allocationForm.clientName} onChange={(e) => setAllocationForm((p) => ({ ...p, clientName: e.target.value }))} placeholder="Cliente" className="w-full rounded border px-3 py-2 text-sm" required />
          {allocationFormErrors.clientName && <p className="text-xs text-red-600">{allocationFormErrors.clientName}</p>}
          <input type="date" value={allocationForm.workDate} onChange={(e) => setAllocationForm((p) => ({ ...p, workDate: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" required />
          {allocationFormErrors.workDate && <p className="text-xs text-red-600">{allocationFormErrors.workDate}</p>}
          <button type="submit" disabled={savingAllocation || !isAdmin || workers.length === 0} className="rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60">{savingAllocation ? "Salvando..." : "Cadastrar alocacao"}</button>
        </form>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded border p-3 space-y-2">
          <h2 className="text-sm font-semibold">Diaristas</h2>
          <input value={workerSearch} onChange={(e) => { setWorkerSearch(e.target.value); setWorkerPage(0); }} placeholder="Buscar diarista" className="w-full rounded border px-3 py-2 text-sm" />
          <ul className="space-y-1 text-sm">
            {workers.map((worker) => (
              <li key={worker.id} className="flex items-center justify-between gap-2 border-b py-1">
                <span>{worker.full_name} ({worker.cpf})</span>
                <span className="flex items-center gap-2">
                  {isAdmin ? (
                    <select
                      value={worker.status}
                      disabled={updatingId === worker.id}
                      onChange={(e) => handleUpdateWorkerStatus(worker.id, e.target.value as Worker["status"])}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      <option value="available">Disponivel</option>
                      <option value="unavailable">Indisponivel</option>
                    </select>
                  ) : (
                    worker.status
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={updatingId === worker.id}
                      onClick={() => handleDeleteWorker(worker.id)}
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                    >
                      Excluir
                    </button>
                  )}
                </span>
              </li>
            ))}
            {workers.length === 0 && <li>Nenhum diarista encontrado.</li>}
          </ul>
          <div className="flex items-center justify-between">
            <button type="button" disabled={workerPage === 0} onClick={() => setWorkerPage((p) => Math.max(p - 1, 0))} className="rounded border px-3 py-1 text-sm disabled:opacity-60">Anterior</button>
            <span className="text-xs text-gray-600">Pagina {workerPage + 1} de {workersPages}</span>
            <button type="button" disabled={workerPage + 1 >= workersPages} onClick={() => setWorkerPage((p) => p + 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-60">Proxima</button>
          </div>
        </div>

        <div className="rounded border p-3 space-y-2">
          <h2 className="text-sm font-semibold">Alocacoes</h2>
          <input value={allocationSearch} onChange={(e) => { setAllocationSearch(e.target.value); setAllocationPage(0); }} placeholder="Buscar por cliente ou diarista" className="w-full rounded border px-3 py-2 text-sm" />
          <ul className="space-y-1 text-sm">
            {allocations.map((allocation) => (
              <li key={allocation.id} className="flex items-center justify-between gap-2 border-b py-1">
                <span>{allocation.work_date} - {allocation.worker_name} - {allocation.client_name}</span>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={updatingId === allocation.id}
                    onClick={() => handleDeleteAllocation(allocation.id)}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                  >
                    Excluir
                  </button>
                )}
              </li>
            ))}
            {allocations.length === 0 && <li>Nenhuma alocacao encontrada.</li>}
          </ul>
          <div className="flex items-center justify-between">
            <button type="button" disabled={allocationPage === 0} onClick={() => setAllocationPage((p) => Math.max(p - 1, 0))} className="rounded border px-3 py-1 text-sm disabled:opacity-60">Anterior</button>
            <span className="text-xs text-gray-600">Pagina {allocationPage + 1} de {allocationsPages}</span>
            <button type="button" disabled={allocationPage + 1 >= allocationsPages} onClick={() => setAllocationPage((p) => p + 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-60">Proxima</button>
          </div>
        </div>
      </div>

      <div className="rounded border p-3">
        <h2 className="mb-2 text-sm font-semibold">Ultimos eventos de auditoria</h2>
        {auditBlocked ? (
          <p className="text-sm text-gray-600">Visivel apenas para administradores.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {audit.map((item) => (
              <li key={item.id}>
                {new Date(item.created_at).toLocaleString()} - {item.action} - {item.success ? "ok" : "erro"} - {item.email || "-"}
              </li>
            ))}
            {audit.length === 0 && <li>Nenhum evento recente.</li>}
          </ul>
        )}
      </div>
    </section>
  );
}
