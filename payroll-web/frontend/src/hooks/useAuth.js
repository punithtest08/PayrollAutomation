import { useState } from "react";

export function useAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return {
    user,
    login,
    logout,
    isHR:        user?.role === "HR",
    isManager:   user?.role === "Manager",
    isEmployee:  user?.role === "Employee",
    isRecruiter: user?.role === "Recruiter",
    department:  user?.department ?? null,
    linkedEmployeeId: user?.linkedEmployee ?? null,
  };
}
