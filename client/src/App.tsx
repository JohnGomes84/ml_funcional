import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import Admin from "./pages/Admin";
import Audit from "./pages/Audit";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Home from "./pages/Home";
import Integration from "./pages/Integration";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Register from "./pages/Register";
import Terms from "./pages/Terms";

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
            <Route path="/integration" element={<Integration />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/audit" element={<Audit />} />
          </Route>
        </Route>

        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
