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
  FaRulerCombined,
} from "react-icons/fa";
import { useUser } from "../context/UserContext";
import { MdSupportAgent } from "react-icons/md";
import Soporte from "../components/Soporte";

/** ✅ ADMIN: todo */
const allMenuItems = [
  { key: "inventory", label: "Inventario", icon: <FaBoxes /> },
  { key: "reports", label: "Reportes", icon: <FaChartBar /> },
  { key: "users", label: "Usuarios", icon: <FaUserFriends /> },
  { key: "clientes", label: "Clientes", icon: <FaUser /> },
  { key: "add-product", label: "Añadir Producto", icon: <FaPlus /> },
  { key: "categories", label: "Categorías", icon: <FaTags /> },
  { key: "locations", label: "Ubicaciones", icon: <FaMapMarkerAlt /> },

  // ✅ SOLO ADMIN
  { key: "unidades", label: "Unidades de Medida", icon: <FaRulerCombined /> },

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

/** ✅ USUARIO: normal (sin admin) */
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

/** ✅ ALMACÉN: inventario/movimientos (sin ventas, sin CAI, sin unidades, sin usuarios, sin reportes, sin bitácora) */
const almacenMenuItems = [
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
];

export default function Sidebar({
  currentPage,
  onChangePage,
  isCollapsed = false,
  onToggle,
}) {
  const { user } = useUser();
  const soporteRef = useRef(null);

  const menuItems = useMemo(() => {
    // Si todavía no hay user (loading), devolvemos vacío para no mostrar cosas incorrectas
    if (!user) return [];

    if (user.rol === "admin") return allMenuItems;
    if (user.rol === "almacen") return almacenMenuItems;

    // usuario por defecto
    return usuarioMenuItems;
  }, [user]);

const handleMenuClick = (key) => {
  onChangePage(key);

  // ✅ En móvil: cerrar drawer (NO colapsar)
  if (window.innerWidth < 992) {
    onToggle?.(false); // false = cerrar
  }
};


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
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => handleMenuClick(item.key)}
            type="button"
            className={`sidebar-link d-flex align-items-center w-100 border-0 bg-transparent px-3 py-2 ${
              currentPage === item.key
                ? "text-warning bg-warning bg-opacity-10"
                : "text-light"
            } ${isCollapsed ? "justify-content-center px-2" : ""}`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="me-3 fs-5">{item.icon}</span>
            {!isCollapsed && item.label}
          </button>
        ))}
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
    </div>
  );
}
