import React, { useState, useRef, useEffect } from "react";
import { useUser } from "../context/UserContext";

export default function Navbar({ onLogout, onToggleSidebar, sidebarCollapsed }) {
  const { user, logout } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef();

  // Cierra el menú usuario al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Si no hay user, muestra solo el título
  if (!user) {
    return (
      <nav className="navbar navbar-expand bg-white shadow-sm py-2 px-3 border-bottom position-sticky top-0 z-2">
        <div className="navbar-brand">
          <i className="bi bi-box-seam-fill text-warning-emphasis me-2" style={{ fontSize: "2rem" }}></i>
          <span className="fs-5 fw-bold text-dark">Gestión de Inventario</span>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar navbar-expand bg-white shadow-sm py-2 px-3 border-bottom position-sticky top-0 z-2">
      <div className="container-fluid d-flex align-items-center">
        {/* Botón menú/sidebar: visible SIEMPRE y en todas las resoluciones */}
        <button
          onClick={onToggleSidebar}
          className="btn btn-link text-dark me-2 d-inline-flex d-print-none"
          style={{ transition: "transform 0.2s" }}
          title="Menú"
        >
          <i
            className="bi bi-list"
            style={{
              fontSize: "1.7rem",
              transform: sidebarCollapsed ? "rotate(90deg)" : "none",
              transition: "transform .25s cubic-bezier(.7,2,.4,1)",
            }}
          />
        </button>
        {/* Título con icono */}
        <div className="navbar-brand d-flex align-items-center user-select-none flex-shrink-1 flex-grow-0">
          <i
            className="bi bi-box-seam-fill text-warning-emphasis me-2"
            style={{
              fontSize: "2rem",
              animation: "bounceIn 0.6s cubic-bezier(.6,-0.28,.74,.05)",
            }}
          ></i>
          <span className="fs-5 fw-bold text-dark">
            Gestión de Inventario
          </span>
        </div>
        <div className="flex-grow-1" />
        {/* Usuario */}
        <div className="dropdown" ref={dropdownRef}>
          <button
            className="btn d-flex align-items-center p-0 border-0 bg-transparent"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Usuario"
            style={{ minWidth: 0 }}
          >
            <span
              className="avatar bg-primary bg-opacity-25 d-flex align-items-center justify-content-center rounded-circle me-2"
              style={{ width: 40, height: 40 }}
            >
              <i className="bi bi-person-fill fs-4 text-primary"></i>
            </span>
            {/* Usuario y rol solo en md+ */}
            <span className="fw-semibold text-secondary d-none d-md-inline">
              {user.nombre}
              <span className={`badge ms-2 ${user.rol === "admin" ? "bg-primary" : "bg-secondary"}`}>
                {user.rol === "admin" ? "Administrador" : "Usuario"}
              </span>
            </span>
            <i className="bi bi-caret-down-fill ms-1 text-muted d-none d-md-inline" style={{ fontSize: 13 }} />
          </button>
          <ul
            className={`dropdown-menu dropdown-menu-end shadow-sm mt-2 ${
              menuOpen ? "show" : ""
            }`}
            style={{ minWidth: 190, right: 0, left: "auto" }}
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
              <button
                onClick={logout}
                className="dropdown-item text-danger"
              >
                <i className="bi bi-box-arrow-right me-2"></i>
                Cerrar Sesión
              </button>
            </li>
          </ul>
        </div>
      </div>
      <style>{`
        @media (max-width: 575.98px) {
  .user-dropdown-menu {
    min-width: 94vw !important;
    left: 3vw !important;
    right: 3vw !important;
    border-radius: 15px !important;
    box-shadow: 0 8px 32px rgba(60,60,60,0.13) !important;
    padding: 0.4rem 0 !important;
  }
  .user-dropdown-menu .dropdown-item {
    font-size: 1rem !important;
    padding: 0.8rem 1.15rem !important;
    white-space: normal !important;
    word-break: break-word !important;
  }
}
@media (max-width: 370px) {
  .user-dropdown-menu {
    min-width: 99vw !important;
    left: 0.5vw !important;
    right: 0.5vw !important;
    border-radius: 11px !important;
  }
}

      `}</style>
    </nav>
  );
}
