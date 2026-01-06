// src/components/Sidebar.jsx
import { useMemo, useRef } from "react";
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
    {
      title: "Ventas",
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
      title: "Caja",
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
      title: "Inventario",
      items: [
        { key: "inventory", label: "Inventario", icon: <FaBoxes /> },
        { key: "add-product", label: "Añadir Producto", icon: <FaPlus /> },
        { key: "categories", label: "Categorías", icon: <FaTags /> },
        { key: "locations", label: "Ubicaciones", icon: <FaMapMarkerAlt /> },
        {
          key: "unidades",
          label: "Unidades de Medida",
          icon: <FaRulerCombined />,
        },
      ],
    },
    {
      title: "Facturación",
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
      title: "Gestión",
      items: [
        { key: "users", label: "Usuarios", icon: <FaUserFriends /> },
        { key: "clientes", label: "Clientes", icon: <FaUser /> },
        { key: "reports", label: "Reportes", icon: <FaChartBar /> },
        { key: "bitacora", label: "Bitácora", icon: <FaFilter /> },
      ],
    },
  ],

  usuario: [
    {
      title: "Ventas",
      items: [
        { key: "inventory", label: "Inventario", icon: <FaBoxes /> },
        { key: "add-product", label: "Añadir Producto", icon: <FaPlus /> },
        { key: "ventas", label: "Registrar Venta", icon: <FaCashRegister /> },
      ],
    },
    {
      title: "Inventario",
      items: [
        { key: "categories", label: "Categorías", icon: <FaTags /> },
        { key: "locations", label: "Ubicaciones", icon: <FaMapMarkerAlt /> },
        {
          key: "registrar-movimiento",
          label: "Registrar Movimiento",
          icon: <FaHistory />,
        },
        { key: "movimientos", label: "Movimientos", icon: <FaExchangeAlt /> },
      ],
    },
  ],

  almacen: [
    {
      title: "Inventario",
      items: [
        { key: "inventory", label: "Inventario", icon: <FaBoxes /> },
        { key: "add-product", label: "Añadir Producto", icon: <FaPlus /> },
        { key: "categories", label: "Categorías", icon: <FaTags /> },
        { key: "locations", label: "Ubicaciones", icon: <FaMapMarkerAlt /> },
        {
          key: "registrar-movimiento",
          label: "Registrar Movimiento",
          icon: <FaHistory />,
        },
        { key: "movimientos", label: "Movimientos", icon: <FaExchangeAlt /> },
      ],
    },
  ],

  cajero: [
    {
      title: "Caja",
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

  const sections = useMemo(() => {
    if (!user) return [];
    return MENU_BY_ROLE[user.rol] || MENU_BY_ROLE.usuario;
  }, [user]);

  const handleMenuClick = (key) => {
    onChangePage(key);

    // ✅ En móvil: cerrar drawer
    if (window.innerWidth < 992) {
      onToggle?.(false);
    }
  };

  // ✅ lista plana (para modo colapsado)
  const flatItems = useMemo(() => {
    return sections.flatMap((s) => s.items);
  }, [sections]);

  return (
    <div
      className={`d-flex flex-column bg-dark sidebar-container ${
        isCollapsed ? "collapsed" : ""
      }`}
    >
      {/* HEADER */}
      <div
        className={`d-flex align-items-center justify-content-between border-bottom sidebar-header ${
          isCollapsed ? "justify-content-center px-2" : "px-3"
        }`}
      >
        <span className="fw-bold fs-4 sidebar-title">
          {isCollapsed ? <FaBoxes size={28} /> : "INVENTARIO"}
        </span>

        <button
          className="btn btn-link text-secondary p-0 ms-auto"
          onClick={onToggle}
          type="button"
          aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? <FaAngleDoubleRight /> : <FaAngleDoubleLeft />}
        </button>
      </div>

      {/* MENU */}
      <nav className="flex-grow-1 py-2">
        {/* ✅ MODO NORMAL (expandido): secciones colapsables */}
        {!isCollapsed && (
          <div className="accordion accordion-flush" id="sidebarAccordion">
            {sections.map((sec, idx) => {
              const collapseId = `sidebar-sec-${idx}`;
              const headingId = `sidebar-heading-${idx}`;

              // ✅ abrir el grupo que contiene la página actual
              const contieneActual = sec.items.some(
                (it) => it.key === currentPage
              );

              return (
                <div
                  className="accordion-item bg-dark border-0"
                  key={sec.title}
                >
                  <h2 className="accordion-header" id={headingId}>
                    <button
                      className={`accordion-button ${
                        contieneActual ? "" : "collapsed"
                      } bg-dark text-light px-3 py-2`}
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#${collapseId}`}
                      aria-expanded={contieneActual ? "true" : "false"}
                      aria-controls={collapseId}
                      style={{
                        boxShadow: "none",
                        fontSize: "0.85rem",
                        opacity: 0.9,
                      }}
                    >
                      {sec.title}
                    </button>
                  </h2>

                  <div
                    id={collapseId}
                    className={`accordion-collapse collapse ${
                      contieneActual ? "show" : ""
                    }`}
                    aria-labelledby={headingId}
                    data-bs-parent="#sidebarAccordion"
                  >
                    <div className="accordion-body p-0">
                      {sec.items.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => handleMenuClick(item.key)}
                          type="button"
                          className={`sidebar-link d-flex align-items-center w-100 border-0 bg-transparent px-3 py-2 ${
                            currentPage === item.key
                              ? "text-warning bg-warning bg-opacity-10"
                              : "text-light"
                          }`}
                        >
                          <span className="me-3 fs-5">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ✅ MODO COLAPSADO: solo íconos (mismo estilo que ya usas) */}
        {isCollapsed && (
          <div className="pt-2">
            {flatItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleMenuClick(item.key)}
                type="button"
                className={`sidebar-link d-flex align-items-center w-100 border-0 bg-transparent px-2 py-2 justify-content-center ${
                  currentPage === item.key
                    ? "text-warning bg-warning bg-opacity-10"
                    : "text-light"
                }`}
                title={item.label}
              >
                <span className="fs-5">{item.icon}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* SOPORTE */}
      <div className="px-4 py-2 border-top text-center">
        <button
          type="button"
          className="btn btn-outline-info btn-sm w-100"
          onClick={() => soporteRef.current?.abrirModal?.()}
        >
          <MdSupportAgent className="me-2" /> Ayuda / Soporte
        </button>
        <Soporte ref={soporteRef} />
      </div>

      {/* ✅ Mini estilo SOLO para quitar el "chevron" del accordion y que se vea limpio.
          (No toca tus clases, es opcional, pero se ve más elegante) */}
      <style>{`
        .accordion-button::after { display: none !important; }
        .accordion-button:not(.collapsed) { color: #fff !important; }
        .accordion-button:focus { box-shadow: none !important; }
      `}</style>
    </div>
  );
}
