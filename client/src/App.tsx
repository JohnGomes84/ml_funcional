import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import Admin from "./pages/Admin";
import Audit from "./pages/Audit";
import Dashboard from "./pages/Dashboard";
import DocumentGenerator from "./pages/DocumentGenerator";
import DocumentTemplates from "./pages/DocumentTemplates";
import Documents from "./pages/Documents";
import EmployeeDetail from "./pages/EmployeeDetail";
import Employees from "./pages/Employees";
import Home from "./pages/Home";
import Integration from "./pages/Integration";
import Login from "./pages/Login";
import MedicalExams from "./pages/MedicalExams";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import OvertimeManagement from "./pages/OvertimeManagement";
import Payroll from "./pages/Payroll";
import Payslip from "./pages/Payslip";
import Positions from "./pages/Positions";
import Privacy from "./pages/Privacy";
import ProfessionalAssessment from "./pages/ProfessionalAssessment";
import Recruitment from "./pages/Recruitment";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import SafetyHealth from "./pages/SafetyHealth";
import Settings from "./pages/Settings";
import Terms from "./pages/Terms";
import TimeBank from "./pages/TimeBank";
import TimeTracking from "./pages/TimeTracking";
import Timesheet from "./pages/Timesheet";
import Vacations from "./pages/Vacations";

function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function RootRedirect() {
  const token = localStorage.getItem("token");
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/home" element={<Home />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employee-detail" element={<EmployeeDetail />} />
            <Route path="/integration" element={<Integration />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/document-templates" element={<DocumentTemplates />} />
            <Route path="/document-generator" element={<DocumentGenerator />} />
            <Route path="/medical-exams" element={<MedicalExams />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/overtime-management" element={<OvertimeManagement />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payslip" element={<Payslip />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/professional-assessment" element={<ProfessionalAssessment />} />
            <Route path="/recruitment" element={<Recruitment />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/safety-health" element={<SafetyHealth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/time-bank" element={<TimeBank />} />
            <Route path="/time-tracking" element={<TimeTracking />} />
            <Route path="/timesheet" element={<Timesheet />} />
            <Route path="/vacations" element={<Vacations />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
