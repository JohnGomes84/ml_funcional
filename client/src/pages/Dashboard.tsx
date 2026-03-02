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

  if (!user) return <div className="p-2">Carregando...</div>;

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Bem-vindo, {user.name || user.email}.</p>
      <p className="text-sm text-gray-600">Perfil: {user.role === "admin" ? "Administrador" : "Usuario"}</p>
    </section>
  );
}
