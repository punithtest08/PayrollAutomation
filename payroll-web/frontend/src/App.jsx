import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Sidebar        from "./components/Sidebar";
import Navbar         from "./components/Navbar";
import LoginPage      from "./pages/LoginPage";
import Dashboard      from "./pages/Dashboard";
import Employees      from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Attendance     from "./pages/Attendance";
import Leaves         from "./pages/Leaves";
import Payroll        from "./pages/Payroll";
import Recruitment    from "./pages/Recruitment";
import ExitManagement from "./pages/ExitManagement";
import ConfirmPage    from "./pages/ConfirmPage";
import EmployeePortal from "./pages/EmployeePortal";

function Layout({ children, user, logout, isHR }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-200">
      <Sidebar user={user} onLogout={logout} isHR={isHR} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} onLogout={logout} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Guard({ element, user }) {
  return user ? element : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, login, logout, isHR, isManager, department } = useAuth();
  const { dark } = useTheme();

  const wrap = (el) => (
    <Guard user={user} element={
      <Layout user={user} logout={logout} isHR={isHR}>{el}</Layout>
    } />
  );

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: dark
            ? { background: "#1f2937", color: "#f9fafb", border: "1px solid #374151" }
            : { background: "#fff", color: "#111827" },
        }}
      />
      <Routes>
        <Route path="/login"   element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={login} />} />
        <Route path="/confirm" element={<ConfirmPage />} />

        <Route path="/"              element={wrap(<Dashboard />)} />
        <Route path="/employees"     element={wrap(<Employees isHR={isHR} isManager={isManager} department={department} />)} />
        <Route path="/employees/:id" element={wrap(<EmployeeDetail isHR={isHR} isManager={isManager} />)} />
        <Route path="/attendance"    element={wrap(<Attendance isHR={isHR} isManager={isManager} department={department} />)} />
        <Route path="/leaves"        element={wrap(<Leaves isHR={isHR} isManager={isManager} department={department} />)} />
        <Route path="/payroll"       element={wrap(<Payroll isHR={isHR} isManager={isManager} department={department} />)} />
        <Route path="/recruitment"   element={wrap(<Recruitment isHR={isHR || isManager} />)} />
        <Route path="/exit"          element={wrap(<ExitManagement isHR={isHR} />)} />
        <Route path="/portal"        element={wrap(<EmployeePortal />)} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
