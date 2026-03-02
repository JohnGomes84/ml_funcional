import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, ALLOWED_EMAIL_DOMAIN, isAllowedEmail } from "../lib/api";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!isAllowedEmail(email)) {
        setError(`Use um email do domínio ${ALLOWED_EMAIL_DOMAIN}`);
        return;
      }
      await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email,
        password,
        name,
        acceptTerms,
      });
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao registrar");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6">Registrar</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Domínio permitido: {ALLOWED_EMAIL_DOMAIN}</p>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Mínimo de 8 caracteres.</p>
        </div>
        <div className="mb-6 flex items-start gap-2">
          <input
            id="acceptTerms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1"
            required
          />
          <label htmlFor="acceptTerms" className="text-sm text-gray-700">
            Li e aceito os{" "}
            <a className="text-blue-600" href="/terms" target="_blank" rel="noreferrer">
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a className="text-blue-600" href="/privacy" target="_blank" rel="noreferrer">
              Política de Privacidade
            </a>
            .
          </label>
        </div>
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
          Registrar
        </button>
        <p className="mt-4 text-center">
          Já tem conta?{" "}
          <a href="/login" className="text-blue-600">
            Login
          </a>
        </p>
      </form>
    </div>
  );
}

