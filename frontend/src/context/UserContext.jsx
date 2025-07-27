// src/context/UserContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

// Crear contexto
const UserContext = createContext();

// Hook personalizado para consumir el contexto
export const useUser = () => useContext(UserContext);

// Proveedor del contexto
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Leer usuario desde localStorage al cargar
  useEffect(() => {
    const storedUser = localStorage.getItem("usuario");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.warn("Error al leer usuario desde localStorage", e);
        setUser(null);
        localStorage.removeItem("usuario");
      }
    }
    setLoading(false);
  }, []);

  // Función para iniciar sesión
  const login = (usuario, token = null) => {
    setUser(usuario);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    if (token) localStorage.setItem("token", token);
  };

  // Función para cerrar sesión
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
