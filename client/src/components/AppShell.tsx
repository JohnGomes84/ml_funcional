import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import DashboardLayout from "../pages/DashboardLayout";

const baseItemClass =
  "block rounded-md px-3 py-2 text-sm font-medium transition-colors";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${baseItemClass} ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"}`;

const navSections = [
  {
    title: "Core",
    items: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/home", label: "Home" },
      { to: "/admin", label: "Admin" },
      { to: "/audit", label: "Audit" },
      { to: "/settings", label: "Settings" },
      { to: "/notifications", label: "Notifications" },
      { to: "/reports", label: "Reports" },
    ],
  },
  {
    title: "RH",
    items: [
      { to: "/employees", label: "Employees" },
      { to: "/employee-detail", label: "Employee Detail" },
      { to: "/recruitment", label: "Recruitment" },
      { to: "/positions", label: "Positions" },
      { to: "/payroll", label: "Payroll" },
      { to: "/payslip", label: "Payslip" },
      { to: "/vacations", label: "Vacations" },
      { to: "/time-bank", label: "Time Bank" },
      { to: "/time-tracking", label: "Time Tracking" },
      { to: "/timesheet", label: "Timesheet" },
      { to: "/overtime-management", label: "Overtime" },
    ],
  },
  {
    title: "Operacional e SST",
    items: [
      { to: "/integration", label: "Integration" },
      { to: "/safety-health", label: "Safety Health" },
      { to: "/medical-exams", label: "Medical Exams" },
      { to: "/professional-assessment", label: "Assessment" },
    ],
  },
  {
    title: "Documentos",
    items: [
      { to: "/documents", label: "Documents" },
      { to: "/document-templates", label: "Templates" },
      { to: "/document-generator", label: "Generator" },
    ],
  },
];

export default function AppShell() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <DashboardLayout>
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

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[280px_1fr]">
        <aside className="max-h-[calc(100vh-120px)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
          <nav className="space-y-4">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</p>
                {section.items.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="rounded-lg border border-slate-200 bg-white p-4">
          <Outlet />
        </main>
      </div>
      </div>
    </DashboardLayout>
  );
}
