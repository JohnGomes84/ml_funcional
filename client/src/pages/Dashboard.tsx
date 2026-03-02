import { useEffect, useState } from "react";
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

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    axios
      .get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setUser(response.data))
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (!user) return <div className="p-6">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p>Bem-vindo, {user.name || user.email}!</p>
        <p className="text-sm text-gray-600">Perfil: {user.role === "admin" ? "Administrador" : "Usuário"}</p>
        {user.role === "admin" && (
          <div className="mt-4">
            <a
              href="/admin"
              className="inline-block bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900"
            >
              Gestão de Usuários
            </a>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

