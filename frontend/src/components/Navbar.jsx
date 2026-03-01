import React, { useState, useRef, useEffect } from "react";
import { useUser } from "../context/UserContext";
import "../styles/Navbar.css";

export default function Navbar({ onLogout }) {
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
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-box-seam-fill text-warning-emphasis" style={{ fontSize: "1.7rem" }} />
          <span className="fs-5 fw-bold text-dark">Gestión de Inventario</span>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar navbar-expand bg-white shadow-sm py-2 px-3 border-bottom navbar-main">
      <div className="nb-wrapper">

        {/* ── BRAND ── */}
        <div className="nb-brand user-select-none">
          {/* Desktop: ícono + "Gestión de Inventario" */}
          <div className="nb-brand-desktop">
            <i className="bi bi-box-seam-fill text-warning-emphasis" style={{ fontSize: "1.55rem" }} />
            <span className="nb-brand-text">Gestión de Inventario</span>
          </div>

          {/* Móvil: igual al header del sidebar */}
          <div className="nb-brand-mobile">
            <div className="nb-brand-mobile__logo">
              <i className="bi bi-box-seam-fill" />
            </div>
            <div className="nb-brand-mobile__text">
              <span className="nb-brand-mobile__title">INVENTARIO</span>
              <span className="nb-brand-mobile__sub">Sistema de Gestión</span>
            </div>
          </div>
        </div>

        {/* ── USUARIO ── */}
        <div
          className="dropdown d-flex align-items-center"
          ref={dropdownRef}
          style={{ position: "relative" }}
        >
          <button
            className="nb-user-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Usuario"
          >
            <span className="nb-avatar">
              {user.nombre?.charAt(0).toUpperCase() || "U"}
            </span>
            <span className="nb-user-info d-none d-md-flex">
              <span className="nb-user-name">{user.nombre}</span>
              <span className={`nb-user-badge ${user.rol === "admin" ? "nb-user-badge--admin" : ""}`}>
                {user.rol === "admin" ? "Administrador" : user.rol}
              </span>
            </span>
            <i className={`bi bi-chevron-down nb-chevron d-none d-md-inline ${menuOpen ? "nb-chevron--open" : ""}`} />
          </button>

          <ul
            className={`dropdown-menu dropdown-menu-end shadow ${menuOpen ? "show" : ""}`}
            style={{
              minWidth: 210,
              top: "calc(100% + 10px)",
              right: 0,
              left: "auto",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 14,
              padding: "0.4rem",
              zIndex: 9999,
            }}
          >
            <li>
              <button className="dropdown-item">
                <i className="bi bi-person-circle text-primary me-2" />
                Mi Perfil
              </button>
            </li>
            <li>
              <button className="dropdown-item">
                <i className="bi bi-gear text-secondary me-2" />
                Configuración
              </button>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button onClick={logout} className="dropdown-item text-danger">
                <i className="bi bi-box-arrow-right me-2" />
                Cerrar Sesión
              </button>
            </li>
          </ul>
        </div>
      </div>

      <style>{`
        .nb-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .nb-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Desktop: visible, Móvil: oculto */
        .nb-brand-desktop {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .nb-brand-text {
          font-size: 1rem;
          font-weight: 700;
          color: #1a202c;
          white-space: nowrap;
        }
        /* Móvil: oculto por defecto */
        .nb-brand-mobile {
          display: none;
        }

        @media (max-width: 991.98px) {
          /* En móvil centrar el brand completamente */
          .nb-brand-desktop { display: none; }
          .nb-wrapper {
            justify-content: center !important;
            position: relative;
          }
          .nb-brand {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
          }
          .nb-brand-mobile {
            display: flex;
            align-items: center;
            gap: 0.45rem;
          }
          /* Usuario a la derecha */
          .dropdown {
            margin-left: auto;
            position: relative;
            z-index: 10;
          }
          .nb-brand-mobile__logo {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: linear-gradient(135deg, #ffc107, #ff9800);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1a1d2e;
            font-size: 1rem;
            flex-shrink: 0;
            box-shadow: 0 3px 10px rgba(255,193,7,0.4);
          }
          .nb-brand-mobile__text {
            display: flex;
            flex-direction: column;
            line-height: 1.15;
          }
          .nb-brand-mobile__title {
            font-size: 0.82rem;
            font-weight: 800;
            color: #1a1d2e;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            white-space: nowrap;
          }
          .nb-brand-mobile__sub {
            font-size: 0.6rem;
            color: #888;
            letter-spacing: 0.05em;
            white-space: nowrap;
          }
        }
        .nb-user-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.35rem 0.75rem 0.35rem 0.35rem;
          background: #f8f9fa;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .nb-user-btn:hover {
          background: #eef0f4;
          border-color: rgba(0,0,0,0.14);
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
        }
        .nb-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ffc107, #ff9800);
          color: #1a1d2e;
          font-size: 0.95rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(255,193,7,0.45);
        }
        .nb-user-info {
          display: flex; flex-direction: column;
          align-items: flex-start; gap: 1px;
        }
        .nb-user-name {
          font-size: 0.82rem; font-weight: 600; color: #2d3748;
          max-width: 130px; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap; line-height: 1.2;
        }
        .nb-user-badge {
          font-size: 0.65rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: #6c757d; background: rgba(108,117,125,0.1);
          border-radius: 4px; padding: 1px 6px; line-height: 1.5;
        }
        .nb-user-badge--admin { color: #0d6efd; background: rgba(13,110,253,0.1); }
        .nb-chevron { font-size: 0.7rem; color: #6c757d; transition: transform 0.2s; }
        .nb-chevron--open { transform: rotate(180deg); }
        .dropdown-menu .dropdown-item {
          border-radius: 8px; font-size: 0.875rem;
          padding: 0.5rem 0.75rem; transition: background 0.15s;
        }
      `}</style>
    </nav>
  );
}