import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";

type User = {
  id: number;
  email: string;
  name: string | null;
  role: "admin" | "user";
  created_at: string;
};

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem("token"), []);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    axios
      .get(`${API_BASE_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setUsers(response.data);
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
        setError("Erro ao carregar usuÃ¡rios.");
      });
  }, [navigate, token]);

  const updateRole = async (id: number, role: "admin" | "user") => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/auth/users/${id}/role`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUsers((prev) => prev.map((user) => (user.id === id ? response.data : user)));
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao atualizar papel.");
    }
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
          <h1 className="text-2xl font-bold mb-4">AdministraÃ§Ã£o</h1>
          <p className="text-red-600">{error}</p>
          <a href="/dashboard" className="text-blue-600 mt-4 inline-block">
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">GestÃ£o de UsuÃ¡rios</h1>
          <div className="flex items-center gap-4">
            <a href="/audit" className="text-blue-600">
              Auditoria
            </a>
            <a href="/dashboard" className="text-blue-600">
              Voltar ao Dashboard
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 border">ID</th>
                <th className="text-left p-3 border">Email</th>
                <th className="text-left p-3 border">Nome</th>
                <th className="text-left p-3 border">Perfil</th>
                <th className="text-left p-3 border">AÃ§Ãµes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-3 border">{user.id}</td>
                  <td className="p-3 border">{user.email}</td>
                  <td className="p-3 border">{user.name || "-"}</td>
                  <td className="p-3 border">
                    {user.role === "admin" ? "Administrador" : "UsuÃ¡rio"}
                  </td>
                  <td className="p-3 border">
                    {user.role === "admin" ? (
                      <button
                        onClick={() => updateRole(user.id, "user")}
                        className="bg-amber-500 text-white px-3 py-1 rounded hover:bg-amber-600"
                      >
                        Tornar usuÃ¡rio
                      </button>
                    ) : (
                      <button
                        onClick={() => updateRole(user.id, "admin")}
                        className="bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700"
                      >
                        Tornar admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

