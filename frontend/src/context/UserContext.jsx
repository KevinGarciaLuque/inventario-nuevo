// src/context/UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { MODULOS_SUPERADMIN } from "../config/modulos";

// Crear contexto
const UserContext = createContext();

// Hook personalizado para consumir el contexto
export const useUser = () => useContext(UserContext);

// Proveedor del contexto
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Lista de keys de módulos permitidos para el rol del usuario
  const [permisos, setPermisos] = useState([]);
  const [permisosCargados, setPermisosCargados] = useState(false);

  // Trae los módulos permitidos del backend según el rol
  const refreshPermisos = useCallback(async (usuario = user) => {
    if (!usuario) {
      setPermisos([]);
      setPermisosCargados(true);
      return;
    }
    if (usuario.rol === "superadmin") {
      setPermisos(MODULOS_SUPERADMIN);
      setPermisosCargados(true);
      return;
    }
    try {
      const res = await api.get("/permisos/me");
      setPermisos(Array.isArray(res.data?.modulos) ? res.data.modulos : []);
    } catch (e) {
      console.warn("No se pudieron cargar permisos", e);
      setPermisos([]);
    } finally {
      setPermisosCargados(true);
    }
  }, [user]);

  // Leer usuario desde localStorage al cargar
  useEffect(() => {
    const storedUser = localStorage.getItem("usuario");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        refreshPermisos(parsed).finally(() => setLoading(false));
        return;
      } catch (e) {
        console.warn("Error al leer usuario desde localStorage", e);
        setUser(null);
        localStorage.removeItem("usuario");
      }
    }
    setPermisosCargados(true);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función para iniciar sesión
  const login = (usuario, token = null) => {
    setUser(usuario);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    if (token) localStorage.setItem("token", token);
    setPermisosCargados(false);
    refreshPermisos(usuario);
  };

  // Función para cerrar sesión
  const logout = () => {
    setUser(null);
    setPermisos([]);
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
  };

  // ¿El usuario puede ver/usar un módulo?
  const puede = useCallback(
    (key) => {
      if (!user) return false;
      if (user.rol === "superadmin") return true;
      return permisos.includes(key);
    },
    [user, permisos]
  );

  return (
    <UserContext.Provider
      value={{ user, login, logout, loading, permisos, permisosCargados, puede, refreshPermisos }}
    >
      {children}
    </UserContext.Provider>
  );
}
