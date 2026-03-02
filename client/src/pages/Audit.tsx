import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";

type AuditLog = {
  id: number;
  user_id: number | null;
  email: string | null;
  action: string;
  success: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem("token"), []);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);
    axios
      .get(`${API_BASE_URL}/api/auth/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50, offset: page * 50 },
      })
      .then((response) => {
        setLogs(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (err.response?.status === 403) {
          setError("Acesso restrito ao administrador.");
          return;
        }
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        setError("Erro ao carregar logs.");
      });
  }, [navigate, page, token]);

  if (loading) {
    return <div className="p-2">Carregando...</div>;
  }

  if (error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-red-600">{error}</p>
        <Link to="/admin" className="text-blue-600">
          Voltar
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Auditoria de Acesso</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 border">Data</th>
              <th className="text-left p-3 border">Email</th>
              <th className="text-left p-3 border">Acao</th>
              <th className="text-left p-3 border">Sucesso</th>
              <th className="text-left p-3 border">IP</th>
              <th className="text-left p-3 border">User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="p-3 border">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-3 border">{log.email || "-"}</td>
                <td className="p-3 border">{log.action}</td>
                <td className="p-3 border">{log.success ? "Sim" : "Nao"}</td>
                <td className="p-3 border">{log.ip || "-"}</td>
                <td className="p-3 border">{log.user_agent || "-"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td className="p-3 border text-center" colSpan={6}>
                  Sem registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          className="px-3 py-2 rounded border"
          disabled={page === 0}
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
        >
          Anterior
        </button>
        <span className="text-sm text-gray-600">Pagina {page + 1}</span>
        <button
          className="px-3 py-2 rounded border"
          disabled={logs.length < 50}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Proxima
        </button>
      </div>
    </section>
  );
}
