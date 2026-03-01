// src/components/Sidebar.jsx
import { useMemo, useRef, useState } from "react";
import {
  FaBoxes,
  FaPlus,
  FaTags,
  FaFilter,
  FaExchangeAlt,
  FaMapMarkerAlt,
  FaChartBar,
  FaHistory,
  FaUserFriends,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaCashRegister,
  FaFileInvoiceDollar,
  FaKey,
  FaUser,
  FaRulerCombined,
  FaPercentage,
  FaChevronDown,
} from "react-icons/fa";
import { MdSupportAgent } from "react-icons/md";

import { useUser } from "../context/UserContext";
import Soporte from "../components/Soporte";

/* =====================================================
   MENÚ AGRUPADO POR ROL
   - Mantiene los mismos keys que usas en Layout
===================================================== */
const MENU_BY_ROLE = {
  admin: [
    // ✅ Dashboard NO será accordion (se renderiza fijo arriba)
    {
      topItems: [
        { key: "dashboard", label: "DASHBOARD", icon: <FaChartBar /> },
      ],
    },

    {
      title: "INVENTARIO",
      items: [
        { key: "inventory", label: "Inventario", icon: <FaBoxes /> },
        { key: "add-product", label: "Añadir Producto", icon: <FaPlus /> },
      ],
    },

    {
      title: "REGISTRAR VENTAS",
      items: [
        { key: "ventas", label: "Registrar Venta", icon: <FaCashRegister /> },
        { key: "movimientos", label: "Movimientos", icon: <FaExchangeAlt /> },
        {
          key: "registrar-movimiento",
          label: "Registrar Movimiento",
          icon: <FaHistory />,
        },
      ],
    },

    {
      title: "CIERRES DE CAJA",
      items: [
        {
          key: "caja-apertura",
          label: "Apertura de Caja",
          icon: <FaCashRegister />,
        },
        {
          key: "caja-cierre",
          label: "Cierre de Caja",
          icon: <FaCashRegister />,
        },
        {
          key: "caja-historial",
          label: "Historial de Cierres",
          icon: <FaHistory />,
        },
      ],
    },

    {
      title: "FACTURACIÓN",
      items: [
        {
          key: "facturas",
          label: "Facturas Emitidas",
          icon: <FaFileInvoiceDollar />,
        },
        { key: "cai", label: "Control de CAI", icon: <FaKey /> },
      ],
    },

    {
      title: "GESTIÓN USUARIOS",
      items: [
        { key: "users", label: "Usuarios", icon: <FaUserFriends /> },
        { key: "clientes", label: "Clientes", icon: <FaUser /> },
        { key: "bitacora", label: "Bitácora", icon: <FaFilter /> },
      ],
    },

    {
      title: "MANTENIMIENTO",
      items: [
        { key: "categories", label: "Categorías", icon: <FaTags /> },
        { key: "locations", label: "Ubicaciones", icon: <FaMapMarkerAlt /> },
        {
          key: "unidades",
          label: "Unidades de Medida",
          icon: <FaRulerCombined />,
        },
        { key: "impuestos", label: "Impuestos", icon: <FaFilter /> },
        { key: "descuentos", label: "Descuentos", icon: <FaPercentage /> },
        { key: "promociones", label: "Promociones", icon: <FaTags /> },
        { key: "backup", label: "Backup BD", icon: <FaHistory /> },
      ],
    },
  ],

  usuario: [
    {
      title: "VENTAS",
      items: [
        { key: "inventory", label: "Inventario", icon: <FaBoxes /> },
        { key: "add-product", label: "Añadir Producto", icon: <FaPlus /> },
        { key: "ventas", label: "Registrar Venta", icon: <FaCashRegister /> },
      ],
    },
    {
      title: "INVENTARIO",
      items: [
        {
          key: "registrar-movimiento",
          label: "Registrar Movimiento",
          icon: <FaHistory />,
        },
        { key: "movimientos", label: "Movimientos", icon: <FaExchangeAlt /> },
      ],
    },
    {
      title: "MANTENIMIENTO",
      items: [
        { key: "categories", label: "Categorías", icon: <FaTags /> },
        { key: "locations", label: "Ubicaciones", icon: <FaMapMarkerAlt /> },
      ],
    },
  ],

  almacen: [
    {
      title: "INVENTARIO",
      items: [
        { key: "inventory", label: "Inventario", icon: <FaBoxes /> },
        { key: "add-product", label: "Añadir Producto", icon: <FaPlus /> },
        {
          key: "registrar-movimiento",
          label: "Registrar Movimiento",
          icon: <FaHistory />,
        },
        { key: "movimientos", label: "Movimientos", icon: <FaExchangeAlt /> },
      ],
    },
    {
      title: "MANTENIMIENTO",
      items: [
        { key: "categories", label: "Categorías", icon: <FaTags /> },
        { key: "locations", label: "Ubicaciones", icon: <FaMapMarkerAlt /> },
        {
          key: "unidades",
          label: "Unidades de Medida",
          icon: <FaRulerCombined />,
        },
        { key: "impuestos", label: "Impuestos", icon: <FaFilter /> },
        { key: "promociones", label: "Promociones", icon: <FaTags /> },
      ],
    },
  ],

  cajero: [
    {
      title: "CIERRES DE CAJA",
      items: [
        {
          key: "caja-apertura",
          label: "Apertura de Caja",
          icon: <FaCashRegister />,
        },
        { key: "ventas", label: "Registrar Venta", icon: <FaCashRegister /> },
        {
          key: "facturas",
          label: "Facturas Emitidas",
          icon: <FaFileInvoiceDollar />,
        },
        {
          key: "caja-cierre",
          label: "Cierre de Caja",
          icon: <FaCashRegister />,
        },
        {
          key: "caja-historial",
          label: "Historial de Cierres",
          icon: <FaHistory />,
        },
      ],
    },
  ],
};

export default function Sidebar({
  currentPage,
  onChangePage,
  isCollapsed = false,
  onToggle,
}) {
  const { user } = useUser();
  const soporteRef = useRef(null);
  const [openSections, setOpenSections] = useState({});

  const sections = useMemo(() => {
    if (!user) return [];
    return MENU_BY_ROLE[user.rol] || MENU_BY_ROLE.usuario;
  }, [user]);

  const topItems = useMemo(() => {
    const first = sections.find((s) => Array.isArray(s.topItems));
    return first?.topItems || [];
  }, [sections]);

  const accordionSections = useMemo(() => {
    return sections.filter((s) => s.title && Array.isArray(s.items));
  }, [sections]);

  const flatItems = useMemo(() => {
    const normal = accordionSections.flatMap((s) => s.items);
    return [...topItems, ...normal];
  }, [accordionSections, topItems]);

  const handleMenuClick = (key) => {
    onChangePage(key);
    if (window.innerWidth < 992) onToggle?.(false);
  };

  const toggleSection = (title) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Determina si una sección está abierta
  const isSectionOpen = (sec) => {
    const contieneActual = sec.items.some((it) => it.key === currentPage);
    return openSections[sec.title] !== undefined
      ? openSections[sec.title]
      : contieneActual;
  };

  // Íconos de sección
  const SECTION_ICONS = {
    "INVENTARIO": <FaBoxes />,
    "REGISTRAR VENTAS": <FaCashRegister />,
    "CIERRES DE CAJA": <FaHistory />,
    "FACTURACIÓN": <FaFileInvoiceDollar />,
    "GESTIÓN USUARIOS": <FaUserFriends />,
    "MANTENIMIENTO": <FaFilter />,
    "VENTAS": <FaCashRegister />,
  };

  const MenuItem = ({ item, collapsed }) => {
    const isActive = currentPage === item.key;
    return (
      <button
        onClick={() => handleMenuClick(item.key)}
        type="button"
        title={collapsed ? item.label : undefined}
        className={`sb-item d-flex align-items-center w-100 border-0 ${
          collapsed ? "justify-content-center" : ""
        } ${isActive ? "sb-item--active" : ""}`}
      >
        <span className={`sb-item__icon ${isActive ? "sb-item__icon--active" : ""}`}>
          {item.icon}
        </span>
        {!collapsed && (
          <span className="sb-item__label">{item.label}</span>
        )}
        {!collapsed && isActive && <span className="sb-item__dot" />}
      </button>
    );
  };

  return (
    <div className={`sb-root d-flex flex-column ${isCollapsed ? "sb-root--collapsed" : ""}`}>

      {/* ── HEADER ── */}
      <div className="sb-header">
        {!isCollapsed ? (
          <div className="sb-header__brand">
            <div className="sb-header__logo">
              <FaBoxes />
            </div>
            <div className="sb-header__text">
              <span className="sb-header__title">INVENTARIO</span>
              <span className="sb-header__subtitle">Sistema de Gestión</span>
            </div>
          </div>
        ) : (
          <div className="sb-header__logo sb-header__logo--center">
            <FaBoxes />
          </div>
        )}

        <button
          className="sb-toggle"
          onClick={onToggle}
          type="button"
          aria-label={isCollapsed ? "Expandir" : "Colapsar"}
        >
          {isCollapsed ? <FaAngleDoubleRight /> : <FaAngleDoubleLeft />}
        </button>
      </div>

      {/* ── SEPARADOR ── */}
      <div className="sb-divider" />

      {/* ── NAVEGACIÓN ── */}
      <nav className="sb-nav flex-grow-1">

        {/* MODO EXPANDIDO */}
        {!isCollapsed && (
          <>
            {/* Top items (Dashboard) */}
            {topItems.map((item) => (
              <MenuItem key={item.key} item={item} collapsed={false} />
            ))}

            {topItems.length > 0 && <div className="sb-divider sb-divider--soft" />}

            {/* Secciones colapsables personalizadas */}
            {accordionSections.map((sec) => {
              const open = isSectionOpen(sec);
              const contieneActual = sec.items.some((it) => it.key === currentPage);
              return (
                <div key={sec.title} className="sb-section">
                  <button
                    type="button"
                    className={`sb-section__header ${open ? "sb-section__header--open" : ""} ${contieneActual ? "sb-section__header--active" : ""}`}
                    onClick={() => toggleSection(sec.title)}
                  >
                    <span className="sb-section__icon">
                      {SECTION_ICONS[sec.title] || <FaFilter />}
                    </span>
                    <span className="sb-section__title">{sec.title}</span>
                    <span className={`sb-section__chevron ${open ? "sb-section__chevron--open" : ""}`}>
                      <FaChevronDown />
                    </span>
                  </button>

                  <div className={`sb-section__body ${open ? "sb-section__body--open" : ""}`}>
                    {sec.items.map((item) => (
                      <MenuItem key={item.key} item={item} collapsed={false} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* MODO COLAPSADO — solo íconos */}
        {isCollapsed && (
          <div className="sb-collapsed-list">
            {flatItems.map((item) => (
              <MenuItem key={item.key} item={item} collapsed />
            ))}
          </div>
        )}
      </nav>

      {/* ── FOOTER / SOPORTE ── */}
      <div className="sb-footer">
        {!isCollapsed ? (
          <>
            {user && (
              <div className="sb-user">
                <div className="sb-user__avatar">
                  <FaUser />
                </div>
                <div className="sb-user__info">
                  <span className="sb-user__name">{user.nombre}</span>
                  <span className="sb-user__role">
                    {user.rol === "admin" ? "Administrador" : user.rol}
                  </span>
                </div>
              </div>
            )}
            <button
              type="button"
              className="sb-support-btn"
              onClick={() => soporteRef.current?.abrirModal?.()}
            >
              <MdSupportAgent className="me-2" style={{ fontSize: "1.1rem" }} />
              Soporte Técnico
            </button>
          </>
        ) : (
          <button
            type="button"
            className="sb-support-btn sb-support-btn--icon"
            title="Soporte"
            onClick={() => soporteRef.current?.abrirModal?.()}
          >
            <MdSupportAgent style={{ fontSize: "1.3rem" }} />
          </button>
        )}
        <Soporte ref={soporteRef} />
      </div>

      {/* ── ESTILOS ENCAPSULADOS ── */}
      <style>{`
        /* ─── ROOT ─────────────────────────────── */
        .sb-root {
          width: 100%;
          height: 100%;
          min-height: 100vh;
          background: linear-gradient(180deg, #1a1d2e 0%, #12141f 100%);
          border-right: 1px solid rgba(255,193,7,0.12);
          overflow: hidden;
          position: relative;
        }

        /* ─── HEADER ────────────────────────────── */
        .sb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 0.85rem 1rem;
          min-height: 70px;
          flex-shrink: 0;
        }
        .sb-header__brand {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          overflow: hidden;
        }
        .sb-header__logo {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ffc107, #ff9800);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a1d2e;
          font-size: 1.1rem;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(255,193,7,0.4);
        }
        .sb-header__logo--center {
          margin: 0 auto;
          box-shadow: 0 4px 14px rgba(255,193,7,0.4);
        }
        .sb-header__text {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .sb-header__title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.12em;
          white-space: nowrap;
          line-height: 1.2;
        }
        .sb-header__subtitle {
          font-size: 0.68rem;
          color: rgba(255,193,7,0.7);
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .sb-toggle {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.5);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          flex-shrink: 0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sb-toggle:hover {
          background: rgba(255,193,7,0.15);
          border-color: rgba(255,193,7,0.4);
          color: #ffc107;
        }

        /* ─── DIVIDER ───────────────────────────── */
        .sb-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,193,7,0.25), transparent);
          margin: 0 0.75rem;
          flex-shrink: 0;
        }
        .sb-divider--soft {
          background: rgba(255,255,255,0.06);
          margin: 0.35rem 0.75rem;
        }

        /* ─── NAV ───────────────────────────────── */
        .sb-nav {
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0.5rem 0;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,193,7,0.2) transparent;
        }
        .sb-nav::-webkit-scrollbar { width: 3px; }
        .sb-nav::-webkit-scrollbar-thumb {
          background: rgba(255,193,7,0.25);
          border-radius: 3px;
        }

        /* ─── MENU ITEM ─────────────────────────── */
        .sb-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.52rem 1rem 0.52rem 1.1rem;
          margin: 0.1rem 0.5rem;
          border-radius: 10px;
          background: transparent;
          color: rgba(255,255,255,0.62);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
        }
        .sb-item:hover {
          background: rgba(255,255,255,0.07);
          color: #ffffff;
          padding-left: 1.35rem;
        }
        .sb-item--active {
          background: linear-gradient(135deg, rgba(255,193,7,0.18), rgba(255,152,0,0.1));
          color: #ffc107 !important;
          font-weight: 600;
          border: 1px solid rgba(255,193,7,0.2);
        }
        .sb-item--active:hover {
          background: linear-gradient(135deg, rgba(255,193,7,0.22), rgba(255,152,0,0.14));
          padding-left: 1.1rem;
        }
        .sb-item__icon {
          font-size: 0.95rem;
          flex-shrink: 0;
          color: rgba(255,255,255,0.4);
          transition: color 0.2s;
        }
        .sb-item:hover .sb-item__icon { color: rgba(255,255,255,0.85); }
        .sb-item__icon--active { color: #ffc107 !important; }
        .sb-item__label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sb-item__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ffc107;
          flex-shrink: 0;
          box-shadow: 0 0 6px rgba(255,193,7,0.7);
        }

        /* ─── COLLAPSED LIST ────────────────────── */
        .sb-collapsed-list {
          padding: 0.25rem 0;
        }
        .sb-root--collapsed .sb-item {
          justify-content: center;
          padding: 0.62rem 0;
          margin: 0.15rem 0.5rem;
          gap: 0;
        }
        .sb-root--collapsed .sb-item:hover { padding-left: 0; }
        .sb-root--collapsed .sb-item--active { padding-left: 0; }
        .sb-root--collapsed .sb-item__icon { font-size: 1.1rem; }

        /* ─── SECTION ───────────────────────────── */
        .sb-section { margin: 0.15rem 0; }
        .sb-section__header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          width: 100%;
          padding: 0.45rem 1rem 0.45rem 1.1rem;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.38);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sb-section__header:hover {
          color: rgba(255,255,255,0.65);
          background: rgba(255,255,255,0.03);
        }
        .sb-section__header--open,
        .sb-section__header--active {
          color: rgba(255,193,7,0.75);
        }
        .sb-section__header--open:hover,
        .sb-section__header--active:hover {
          color: #ffc107;
        }
        .sb-section__icon {
          font-size: 0.78rem;
          flex-shrink: 0;
          opacity: 0.75;
        }
        .sb-section__title { flex: 1; }
        .sb-section__chevron {
          font-size: 0.6rem;
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
          opacity: 0.5;
        }
        .sb-section__chevron--open { transform: rotate(180deg); opacity: 1; }

        /* ─── SECTION BODY (animación) ──────────── */
        .sb-section__body {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .sb-section__body--open { max-height: 600px; }

        /* ─── FOOTER ────────────────────────────── */
        .sb-footer {
          flex-shrink: 0;
          padding: 0.75rem 0.6rem 0.85rem;
          border-top: 1px solid rgba(255,255,255,0.07);
        }
        .sb-user {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.5rem 0.75rem;
        }
        .sb-user__avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255,193,7,0.12);
          border: 1px solid rgba(255,193,7,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffc107;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .sb-user__info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .sb-user__name {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sb-user__role {
          font-size: 0.66rem;
          color: rgba(255,193,7,0.65);
          text-transform: capitalize;
          letter-spacing: 0.05em;
        }
        .sb-support-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: rgba(255,193,7,0.08);
          border: 1px solid rgba(255,193,7,0.25);
          border-radius: 10px;
          color: rgba(255,193,7,0.8);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .sb-support-btn:hover {
          background: rgba(255,193,7,0.16);
          border-color: rgba(255,193,7,0.5);
          color: #ffc107;
          box-shadow: 0 0 14px rgba(255,193,7,0.18);
        }
        .sb-support-btn--icon {
          width: 42px;
          height: 42px;
          margin: 0 auto;
          border-radius: 12px;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
