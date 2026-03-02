import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { toast } from "sonner";

type RhMetrics = {
  totalUsers: number;
  admins: number;
  usersWithoutConsent: number;
  totalEmployees: number;
};

type Employee = {
  id: number;
  full_name: string;
  cpf: string;
  employment_type: "CLT" | "PJ";
  status: "active" | "inactive";
  created_at: string;
};

type EmployeesListResult = {
  items: Employee[];
  total: number;
  limit: number;
  offset: number;
};

type TrpcResponse<T> = {
  result?: {
    data: T;
  };
};

type CreateEmployeeInput = {
  fullName: string;
  cpf: string;
  employmentType: "CLT" | "PJ";
  status: "active" | "inactive";
};

type EmployeeFormErrors = {
  fullName?: string;
  cpf?: string;
};

const PAGE_SIZE = 10;

export default function Employees() {
  const [metrics, setMetrics] = useState<RhMetrics | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<CreateEmployeeInput>({
    fullName: "",
    cpf: "",
    employmentType: "CLT",
    status: "active",
  });
  const [formErrors, setFormErrors] = useState<EmployeeFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const token = useMemo(() => localStorage.getItem("token"), []);
  const navigate = useNavigate();

  const loadData = async (authToken: string, nextPage: number, nextSearch: string) => {
    const headers = { Authorization: `Bearer ${authToken}` };
    const me = await axios.get<{ role: "admin" | "user" }>(`${API_BASE_URL}/api/auth/me`, { headers });
    const employeesInput = encodeURIComponent(
      JSON.stringify({ search: nextSearch || undefined, limit: PAGE_SIZE, offset: nextPage * PAGE_SIZE }),
    );
    const [metricsRes, employeesRes] = await Promise.all([
      axios.get<TrpcResponse<RhMetrics>>(`${API_BASE_URL}/api/trpc/rh/metrics`, { headers }),
      axios.get<TrpcResponse<EmployeesListResult>>(`${API_BASE_URL}/api/trpc/rh/employees?input=${employeesInput}`, {
        headers,
      }),
    ]);

    setMetrics(metricsRes.data.result?.data ?? null);
    const list = employeesRes.data.result?.data;
    setEmployees(list?.items ?? []);
    setTotalEmployees(list?.total ?? 0);
    setIsAdmin(me.data.role === "admin");
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadData(token, page, search).catch((err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      setError("Falha ao carregar dados do modulo RH.");
    });
  }, [navigate, token, page, search]);

  const refresh = async () => {
    if (!token) return;
    await loadData(token, page, search);
  };

  const validateEmployeeForm = (value: CreateEmployeeInput): EmployeeFormErrors => {
    const errors: EmployeeFormErrors = {};
    if (value.fullName.trim().length < 3) {
      errors.fullName = "Nome deve ter pelo menos 3 caracteres.";
    }

    const cpfDigits = value.cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      errors.cpf = "CPF deve conter 11 digitos.";
    }

    return errors;
  };

  const handleCreateEmployee = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    const nextErrors = validateEmployeeForm(form);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Revise os campos do formulario.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/trpc/rh/createEmployee`, form, { headers });
      setForm({ fullName: "", cpf: "", employmentType: "CLT", status: "active" });
      setFormErrors({});
      setPage(0);
      await loadData(token, 0, search);
      toast.success("Colaborador cadastrado.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError("Apenas administradores podem cadastrar colaboradores.");
      } else {
        setError("Nao foi possivel cadastrar colaborador.");
      }
      toast.error("Falha ao cadastrar colaborador.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: Employee["status"]) => {
    if (!token) return;
    setUpdatingId(id);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_BASE_URL}/api/trpc/rh/updateEmployee`,
        { id, status },
        { headers },
      );
      await refresh();
      toast.success("Status do colaborador atualizado.");
    } catch {
      setError("Nao foi possivel atualizar colaborador.");
      toast.error("Falha ao atualizar colaborador.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Confirma exclusao deste colaborador?")) {
      return;
    }
    setUpdatingId(id);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/trpc/rh/deleteEmployee`, { id }, { headers });
      const nextPage = page > 0 && employees.length === 1 ? page - 1 : page;
      setPage(nextPage);
      await loadData(token, nextPage, search);
      toast.success("Colaborador excluido.");
    } catch {
      setError("Nao foi possivel excluir colaborador.");
      toast.error("Falha ao excluir colaborador.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (error && !metrics) return <p className="text-red-600">{error}</p>;
  if (!metrics) return <div className="p-2">Carregando...</div>;

  const totalPages = Math.max(Math.ceil(totalEmployees / PAGE_SIZE), 1);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">RH</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded border p-3"><p className="text-xs text-gray-500">Usuarios</p><p className="text-xl font-semibold">{metrics.totalUsers}</p></div>
        <div className="rounded border p-3"><p className="text-xs text-gray-500">Admins</p><p className="text-xl font-semibold">{metrics.admins}</p></div>
        <div className="rounded border p-3"><p className="text-xs text-gray-500">Sem consentimento</p><p className="text-xl font-semibold">{metrics.usersWithoutConsent}</p></div>
        <div className="rounded border p-3"><p className="text-xs text-gray-500">Colaboradores</p><p className="text-xl font-semibold">{metrics.totalEmployees}</p></div>
      </div>

      <form onSubmit={handleCreateEmployee} className="space-y-2 rounded border p-3">
        <h2 className="text-sm font-semibold">Novo colaborador</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="Nome completo" className="rounded border px-3 py-2 text-sm" required />
          {formErrors.fullName && <p className="text-xs text-red-600">{formErrors.fullName}</p>}
          <input value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))} placeholder="CPF" className="rounded border px-3 py-2 text-sm" required />
          {formErrors.cpf && <p className="text-xs text-red-600">{formErrors.cpf}</p>}
          <select value={form.employmentType} onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value as "CLT" | "PJ" }))} className="rounded border px-3 py-2 text-sm"><option value="CLT">CLT</option><option value="PJ">PJ</option></select>
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as "active" | "inactive" }))} className="rounded border px-3 py-2 text-sm"><option value="active">Ativo</option><option value="inactive">Inativo</option></select>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving || !isAdmin} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Salvando..." : "Cadastrar"}</button>
          {!isAdmin && <p className="text-xs text-gray-600">Apenas admin pode cadastrar.</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </form>

      <div className="rounded border p-3 space-y-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por nome ou CPF"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2 text-left">ID</th>
                <th className="border p-2 text-left">Nome</th>
                <th className="border p-2 text-left">CPF</th>
                <th className="border p-2 text-left">Tipo</th>
                <th className="border p-2 text-left">Status</th>
                {isAdmin && <th className="border p-2 text-left">Acoes</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="border p-2">{employee.id}</td>
                  <td className="border p-2">{employee.full_name}</td>
                  <td className="border p-2">{employee.cpf}</td>
                  <td className="border p-2">{employee.employment_type}</td>
                  <td className="border p-2">
                    {isAdmin ? (
                      <select
                        value={employee.status}
                        disabled={updatingId === employee.id}
                        onChange={(e) => handleStatusChange(employee.id, e.target.value as Employee["status"])}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    ) : (
                      employee.status
                    )}
                  </td>
                  {isAdmin && (
                    <td className="border p-2">
                      <button
                        type="button"
                        disabled={updatingId === employee.id}
                        onClick={() => handleDelete(employee.id)}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                      >
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="border p-3 text-center text-gray-600">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            className="rounded border px-3 py-2 text-sm disabled:opacity-60"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Pagina {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-2 text-sm disabled:opacity-60"
          >
            Proxima
          </button>
        </div>
      </div>
    </section>
  );
}
