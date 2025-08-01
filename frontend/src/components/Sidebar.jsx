import React, { useMemo, useRef } from "react";
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
  FaQuestionCircle,
} from "react-icons/fa";
import { useUser } from "../context/UserContext";
import { MdSupportAgent } from "react-icons/md"; // <== Agrega esto

import Soporte from "../components/Soporte";

const allMenuItems = [
  { key: "inventory", label: "Inventario", icon: <FaBoxes /> },
  { key: "reports", label: "Reportes", icon: <FaChartBar /> },
  { key: "users", label: "Usuarios", icon: <FaUserFriends /> },
  { key: "clientes", label: "Clientes", icon: <FaUser /> },
  { key: "add-product", label: "Añadir Producto", icon: <FaPlus /> },
  { key: "categories", label: "Categorías", icon: <FaTags /> },
  { key: "locations", label: "Ubicaciones", icon: <FaMapMarkerAlt /> },
  {
    key: "registrar-movimiento",
    label: "Registrar Movimiento",
    icon: <FaHistory />,
  },
  { key: "movimientos", label: "Movimientos", icon: <FaExchangeAlt /> },
  { key: "ventas", label: "Registrar Venta", icon: <FaCashRegister /> },
  {
    key: "facturas",
    label: "Facturas Emitidas",
    icon: <FaFileInvoiceDollar />,
  },
  { key: "cai", label: "Control de CAI", icon: <FaKey /> },
  { key: "bitacora", label: "Bitácora", icon: <FaFilter /> },
];

const usuarioMenuItems = [
  { key: "inventory", label: "Inventario", icon: <FaBoxes /> },
  { key: "add-product", label: "Añadir Producto", icon: <FaPlus /> },
  { key: "ventas", label: "Registrar Venta", icon: <FaCashRegister /> },
  { key: "categories", label: "Categorías", icon: <FaTags /> },
  { key: "locations", label: "Ubicaciones", icon: <FaMapMarkerAlt /> },
  {
    key: "registrar-movimiento",
    label: "Registrar Movimiento",
    icon: <FaHistory />,
  },
  { key: "movimientos", label: "Movimientos", icon: <FaExchangeAlt /> },
];

export default function Sidebar({
  currentPage,
  onChangePage,
  isCollapsed = false,
  onToggle,
}) {
  const { user } = useUser();
  const soporteRef = useRef();

  const menuItems = useMemo(() => {
    return !user || user.rol === "admin" ? allMenuItems : usuarioMenuItems;
  }, [user]);

  const handleMenuClick = (key) => {
    onChangePage(key);
    if (window.innerWidth < 992 && !isCollapsed) {
      onToggle();
    }
  };

  return (
    <div
      className={`d-flex flex-column bg-dark shadow-lg sidebar-container ${
        isCollapsed ? "collapsed" : ""
      }`}
    >
      {/* Header */}
      <div
        className={`d-flex align-items-center justify-content-between border-bottom sidebar-header ${
          isCollapsed ? "justify-content-center px-2" : "px-3"
        }`}
      >
        <span className="fw-bold fs-4 text-wathi text-center sidebar-title">
          {isCollapsed ? (
            <FaBoxes size={28} title="Inventario" />
          ) : (
            "INVENTARIO"
          )}
        </span>
        <button
          className="btn btn-link text-secondary p-0 ms-auto sidebar-toggle-btn"
          onClick={onToggle}
          aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? <FaAngleDoubleRight /> : <FaAngleDoubleLeft />}
        </button>
      </div>

      {/* Menú */}
      <nav className="flex-grow-1 py-2">
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => handleMenuClick(item.key)}
            className={`d-flex align-items-center w-100 border-0 bg-transparent px-3 py-2 sidebar-link ${
              currentPage === item.key
                ? "text-warning bg-warning bg-opacity-10 shadow-sm"
                : "text-light"
            } ${isCollapsed ? "justify-content-center px-2" : ""}`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="me-3 d-flex align-items-center fs-5">
              {item.icon}
            </span>
            {!isCollapsed && (
              <span className="sidebar-label">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Soporte */}
      <div className="px-5 py-2 border-top small text-muted text-center">
        <button
          className={`btn btn-outline-info btn-sm w-100 d-flex align-items-center justify-content-center ${
            isCollapsed ? "flex-column" : ""
          }`}
          onClick={() => {
            if (window.innerWidth < 992 && !isCollapsed) {
              onToggle(); // Ocultar Sidebar en móviles
            }
            soporteRef.current?.abrirModal(); // Mostrar modal
          }}
          title={isCollapsed ? "Soporte" : undefined}
        >
          <MdSupportAgent size={20} className="me-2" />
          {!isCollapsed && (
            <>
              Ayuda <br />/ Soporte
            </>
          )}
        </button>
        <Soporte ref={soporteRef} />
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="sidebar-footer px-3 py-2  mb-4  border-top small text-center">
          <i className="bi bi-info-circle me-1"></i> Pixel Digital <br />
          Desarrollado por: Kevin Garcia
        </div>
      )}

      {/* Estilos */}
      {/* Dentro del return, al final */}
      <style>{`
  .sidebar-container {
    width: 100%;
    max-width: 250px;
    min-width: 72px;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1051;
    transition: all 0.3s ease;
    overflow-y: auto;
    background-color: #212529;
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    box-shadow: none;
  }

  .sidebar-container.collapsed {
    max-width: 72px !important;
  }

  .sidebar-header {
    height: 60px;
    padding: 0.75rem 1rem;
  }

  .sidebar-title {
    font-family: 'Montserrat', sans-serif;
    letter-spacing: 1px;
  }

  .sidebar-link {
    min-height: 44px;
    transition: background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
    text-align: left;
    border-radius: 6px;
    display: flex;
    align-items: center;
  }

  .sidebar-link:hover {
    background-color: #343a40 !important;
    color: #ffc107 !important;
    box-shadow: inset 10px 0 0 #ffc107;
  }

  .sidebar-link:hover .icon-wrapper {
    color: #ffc107;
    transform: scale(1.1);
  }

  .icon-wrapper {
    transition: all 0.2s ease-in-out;
  }

  .sidebar-footer {
    color: #dee2e6;
    background-color: #212529;
    font-size: 0.85rem;
    transition: opacity 0.3s ease;
    border-top: 1px solid #2e2e2e;
  }
`}</style>
    </div>
  );
}
