import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

const baseItemClass =
  "block rounded-md px-3 py-2 text-sm font-medium transition-colors";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${baseItemClass} ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"}`;

export default function AppShell() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="text-sm font-semibold tracking-wide text-slate-800">
            ML Gestao Total
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-3">
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/home" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/employees" className={navLinkClass}>
              Employees
            </NavLink>
            <NavLink to="/integration" className={navLinkClass}>
              Integration
            </NavLink>
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
            <NavLink to="/audit" className={navLinkClass}>
              Audit
            </NavLink>
          </nav>
        </aside>

        <main className="rounded-lg border border-slate-200 bg-white p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
