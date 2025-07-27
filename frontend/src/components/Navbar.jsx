import React, { useState, useRef, useEffect } from "react";
import { useUser } from "../context/UserContext";
import "../styles/Navbar.css";

export default function Navbar({
  onLogout,
  onToggleSidebar,
  sidebarCollapsed,
}) {
  const { user, logout } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (!user) {
    return (
      <nav className="navbar navbar-expand bg-white shadow-sm py-2 px-3 border-bottom navbar-main">
        <div className="navbar-brand">
          <i
            className="bi bi-box-seam-fill text-warning-emphasis me-2"
            style={{ fontSize: "2rem" }}
          ></i>
          <span className="fs-5 fw-bold text-dark">Gestión de Inventario</span>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar navbar-expand bg-white shadow-sm py-2 px-3 border-bottom navbar-main">
      <div className="container-fluid d-flex align-items-center justify-content-between">
        {/* Botón sidebar */}
        <button
          onClick={onToggleSidebar}
          className="btn d-inline-flex d-print-none"
          style={{
            backgroundColor: "#e8ecefff",
            borderRadius: "30%",
            padding: "4px",
            transition: "all 0.3s ease",
            marginRight: "5px",
          }}
          title="Menú"
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#bec4bbff")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#f8f9fa")
          }
        >
          <i
            className="bi bi-list text-dark text-bold"
            style={{
              fontSize: "1.7rem",
              transform: sidebarCollapsed ? "rotate(90deg)" : "none",
              transition: "transform .25s cubic-bezier(.7,2,.4,1)",
            }}
          />
        </button>

        {/* Título */}
        <div className="navbar-brand d-flex align-items-center user-select-none">
          <i
            className="bi bi-box-seam-fill text-warning-emphasis me-2"
            style={{ fontSize: "1.7rem" }}
          ></i>
          <span className="fs-5 fw-bold text-dark">Gestión de Inventario</span>
        </div>

        {/* Usuario */}
        <div
          className="dropdown d-flex align-items-center ms-auto"
          ref={dropdownRef}
        >
          <button
            className="btn d-flex flex-column align-items-center p-0 border-0 bg-transparent"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Usuario"
            style={{
              minWidth: 0,
              padding: "1.5rem",
              
              transform: "translateY(7px)",
            }}
          >
            {/* Avatar */}
            <span
              className="avatar bg-primary bg-opacity-25 d-flex align-items-center  justify-content-center rounded-circle"
              style={{ width: 40, height: 40, marginRight: 40 }}
            >
              <i className="bi bi-person-fill fs-4 text-primary"></i>
            </span>

            {/* Nombre y rol debajo del avatar (solo en móviles) */}
            <div
              className="d-block d-md-none mt-1 text-center "
              style={{
                fontSize: "0.70rem",
                maxWidth: 100,
               
                transform: "translateX(-30px)",
              }}
            >
              <div className="fw-semibold text-secondary text-truncate">
                {user.nombre}
              </div>
              <span
                className={`badge ${
                  user.rol === "admin" ? "bg-primary" : "bg-secondary"
                }`}
                style={{ fontSize: "0.65rem" }}
              >
                {user.rol === "admin" ? "Administrador" : "Usuario"}
              </span>
            </div>

            {/* Nombre y rol horizontal en pantallas md+ */}
            <span className="fw-semibold text-secondary d-none d-md-inline ms-2">
              {user.nombre}
              <span
                className={`badge ms-2 ${
                  user.rol === "admin" ? "bg-primary" : "bg-secondary"
                }`}
              >
                {user.rol === "admin" ? "Administrador" : "Usuario"}
              </span>
            </span>

            <i
              className="bi bi-caret-down-fill ms-1 text-muted d-none d-md-inline"
              style={{ fontSize: 13 }}
            />
          </button>

          {/* MENÚ DESPLEGABLE */}
          <ul
            className={`dropdown-menu dropdown-menu-end shadow-sm ${
              menuOpen ? "show" : ""
            }`}
            style={{
              minWidth: 190,
              top: "100%",
              right: 0,
              left: "auto",
              marginTop: 8,
            }}
          >
            <li>
              <button className="dropdown-item">
                <i className="bi bi-person-circle text-primary me-2"></i>
                Mi Perfil
              </button>
            </li>
            <li>
              <button className="dropdown-item">
                <i className="bi bi-gear text-secondary me-2"></i>
                Configuración
              </button>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <button onClick={logout} className="dropdown-item text-danger">
                <i className="bi bi-box-arrow-right me-2"></i>
                Cerrar Sesión
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
