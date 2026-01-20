import { useState, useEffect, useRef } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

import InventoryPage from "../pages/InventoryPage";
import AddProductPage from "../pages/AddProduct/AddProductPage";

import CategoriesPage from "../pages/CategoriesPage";
import LocationsPage from "../pages/LocationsPage";
import ReportsPage from "../pages/ReportsPage";
import UsersPage from "../pages/UsersPage";
import ClientesPage from "../pages/ClientesPage";
import MovimientosPage from "../pages/MovimientosPage";
import RegistrarMovimientoPage from "../pages/RegistrarMovimientoPage";
import RegistrarVentaPage from "../pages/RegistrarVenta/RegistrarVentaPage";
import CaiPage from "../pages/CaiPage";
import FacturasPage from "../pages/FacturasPage";
import UnidadesMedidaPage from "../pages/UnidadesMedida/UnidadesMedidaPage";

// ✅ CAJA
import AperturaCajaPage from "../pages/Caja/AperturaCajaPage";
import CierreCajaPage from "../pages/Caja/CierreCajaPage";
import HistorialCierresPage from "../pages/Caja/HistorialCierresPage";

// ✅ MANTENIMIENTO
import ImpuestosPage from "../pages/Mantenimiento/ImpuestosPage";
import PromocionesPage from "../pages/Promociones/PromocionesPage";


import ProductModal from "./ProductModal";
import BitacoraPage from "./BitacoraPage";

import "../styles/Layout.css";

// ✅ Si ya tenés UserContext, esto hará que el admin inicie en Dashboard.
// Si en tu proyecto el hook se llama diferente, cambialo aquí.
import { useUser } from "../context/UserContext";

export default function Layout({ onLogout }) {
  const { user } = useUser();

  // ✅ Por defecto NO amarramos a "inventory", lo decide el rol
  const [currentPage, setCurrentPage] = useState("inventory");
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ✅ Desktop: colapsado/expandido
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ Móvil: drawer abierto/cerrado
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  // ✅ Para NO re-setear currentPage y evitar loops
  const yaInicializoRef = useRef(false);

  // ✅ Cuando existe el usuario, define pantalla inicial por rol
  useEffect(() => {
    if (!user) return;
    if (yaInicializoRef.current) return;

    if (user.rol === "admin") {
      setCurrentPage("dashboard"); // ✅ Dashboard primero para admin
    } else if (user.rol === "cajero") {
      setCurrentPage("caja-apertura"); // ✅ recomendado para cajero
    } else {
      setCurrentPage("inventory"); // ✅ default general
    }

    yaInicializoRef.current = true;
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);

      // ✅ Si pasas a desktop, cierra drawer móvil
      if (!mobile) setSidebarOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Evita scroll del body cuando el drawer está abierto (móvil)
  useEffect(() => {
    const prev = document.body.style.overflow;

    if (isMobile && sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev || "";
    }

    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [isMobile, sidebarOpen]);

  // ✅ Toggle único:
  // - Móvil: abre/cierra drawer
  // - Desktop: colapsa/expande
  const toggleSidebar = (force) => {
    if (isMobile) {
      if (typeof force === "boolean") return setSidebarOpen(force);
      setSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  /* =====================================================
     ✅ Render de páginas centralizado
===================================================== */
  const renderPage = () => {
    switch (currentPage) {
      // ✅ Dashboard (admin) -> usa tu ReportsPage como Dashboard
      case "dashboard":
        return <ReportsPage />;

      case "inventory":
        return <InventoryPage onView={setSelectedProduct} />;

      case "add-product":
        return <AddProductPage />;

      // ✅ Mantenimiento (catálogos)
      case "categories":
        return <CategoriesPage />;

      case "locations":
        return <LocationsPage />;

      case "unidades":
        return <UnidadesMedidaPage />;

      // ✅ Mantenimiento (nuevos módulos)
      case "impuestos":
        return <ImpuestosPage />;

      case "promociones":
        return <PromocionesPage />;

      // ✅ Si algún rol todavía usa "reports", lo dejamos funcional
      case "reports":
        return <ReportsPage />;

      // ✅ Gestión
      case "users":
        return <UsersPage />;

      case "clientes":
        return <ClientesPage />;

      case "bitacora":
        return <BitacoraPage />;

      // ✅ Movimientos
      case "movimientos":
        return <MovimientosPage />;

      case "registrar-movimiento":
        return <RegistrarMovimientoPage />;

      // ✅ Ventas
      case "ventas":
        return <RegistrarVentaPage onChangePage={setCurrentPage} />;

      // ✅ Facturación
      case "cai":
        return <CaiPage />;

      case "facturas":
        return <FacturasPage />;

      // ✅ Caja
      case "caja-apertura":
        return <AperturaCajaPage onChangePage={setCurrentPage} />;

      case "caja-cierre":
        return <CierreCajaPage onChangePage={setCurrentPage} />;

      case "caja-historial":
        return <HistorialCierresPage onChangePage={setCurrentPage} />;

      default:
        return (
          <div>
            <h5 className="mb-2">Página no encontrada</h5>
            <p className="text-muted mb-0">
              La opción <code>{currentPage}</code> no está configurada en
              Layout.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="layout-root d-flex min-vh-100 bg-light position-relative">
      {/* Sidebar */}
      <div
        className={`sidebar sidebar-responsive d-flex flex-column flex-shrink-0 bg-dark text-white transition-all
          ${!isMobile && sidebarCollapsed ? "sidebar-collapsed" : ""}
          ${isMobile ? "sidebar-mobile" : ""}
          ${isMobile && sidebarOpen ? "sidebar-open" : ""}`}
        style={{
          borderTopRightRadius: "12px",
          borderBottomRightRadius: "12px",
          zIndex: 2060,
          overflowX: "hidden",
        }}
      >
        <Sidebar
          currentPage={currentPage}
          onChangePage={(page) => {
            setCurrentPage(page);

            // ✅ en móvil: al elegir opción, cierra el drawer
            if (isMobile) setSidebarOpen(false);
          }}
          // ✅ en desktop sí usamos collapsed; en móvil siempre false
          isCollapsed={!isMobile ? sidebarCollapsed : false}
          // ✅ toggle controla drawer en móvil y colapsado en desktop
          onToggle={toggleSidebar}
        />
      </div>

      {/* Overlay (solo móvil y abierto) */}
      {isMobile && sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden main-content-responsive">
        <Navbar
          onLogout={onLogout}
          onToggleSidebar={() => toggleSidebar()}
          // (si tu Navbar usa esto para icono/estado visual)
          sidebarCollapsed={!isMobile ? sidebarCollapsed : !sidebarOpen}
        />

        <main className="flex-grow-1 p-4 overflow-auto main-content-inner">
          <div className="container-fluid py-3">
            <div className="card shadow-sm main-card-responsive">
              <div className="card-body p-4">{renderPage()}</div>
            </div>
          </div>
        </main>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* CSS del Layout */}
      <style>{`
        /* Overlay */
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2059;
          background-color: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(3px);
        }

        /* MÓVIL: drawer */
        @media (max-width: 991.98px) {
          .sidebar.sidebar-mobile {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;

            width: 78vw;
            max-width: 320px;
            min-width: 260px;

            transform: translateX(-100%);
            pointer-events: none;
            transition: transform 0.35s ease;
          }

          .sidebar.sidebar-mobile.sidebar-open {
            transform: translateX(0);
            pointer-events: auto;
          }

          .main-content-responsive {
            min-width: 0 !important;
          }

          .table-responsive {
            max-height: none !important;
            overflow-y: visible !important;
          }

          .sticky-header thead th {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}
