// src/context/UserContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();
export const useUser = () => useContext(UserContext);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // <- loading state

  useEffect(() => {
    const storedUser = localStorage.getItem("usuario");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false); // <-- Listo para renderizar
  }, []);

  const login = (usuario, token) => {
    setUser(usuario);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    if (token) localStorage.setItem("token", token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
  };

  return (
    <UserContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
}
