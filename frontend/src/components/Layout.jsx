import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

import AddProductPage from "../pages/AddProduct/AddProductPage";
import InventoryPage from "../pages/InventoryPage";

import CaiPage from "../pages/CaiPage";
import CategoriesPage from "../pages/CategoriesPage";
import ClientesPage from "../pages/Clientes/ClientesPage";
import ClientesWebPage from "../pages/ClientesWebPage";
import TiendaConfigPage from "../pages/TiendaConfigPage";
import FacturasPage from "../pages/FacturasPage";
import LocationsPage from "../pages/LocationsPage";
import MovimientosPage from "../pages/MovimientosPage";
import RegistrarMovimientoPage from "../pages/RegistrarMovimientoPage";
import RegistrarVentaPage from "../pages/RegistrarVenta/RegistrarVentaPage";
import PedidosPage from "../pages/Pedidos/PedidosPage";
import ReportsPage from "../pages/ReportsPage";
import UnidadesMedidaPage from "../pages/UnidadesMedida/UnidadesMedidaPage";
import UsersPage from "../pages/UsersPage";

// ✅ CAJA
import AperturaCajaPage from "../pages/Caja/AperturaCajaPage";
import CierreCajaPage from "../pages/Caja/CierreCajaPage";
import HistorialCierresPage from "../pages/Caja/HistorialCierresPage";

// ✅ MANTENIMIENTO
import BackupBDPage from "../pages/Mantenimiento/BackupBDPage";
import DescuentosPage from "../pages/Mantenimiento/DescuentosPage";
import ImpuestosPage from "../pages/Mantenimiento/ImpuestosPage";
import PromocionesPage from "../pages/Promociones/PromocionesPage";

import PermisosPage from "../pages/Permisos/PermisosPage";

import BitacoraPage from "./BitacoraPage";
import ProductModal from "./ProductModal";
import InactivityWatcher from "./InactivityWatcher";

import "../styles/Layout.css";

// ✅ Si ya tenés UserContext, esto hará que el admin inicie en Dashboard.
// Si en tu proyecto el hook se llama diferente, cambialo aquí.
import { useUser } from "../context/UserContext";

export default function Layout({ onLogout }) {
  const { user, puede, permisosCargados } = useUser();

  // ✅ Pantalla inicial calculada de una sola vez según el rol (sin
  // useEffect), para no renderizar "inventory" primero y luego cambiar
  // a "dashboard" — eso era lo que causaba el parpadeo justo tras el login.
  const [currentPage, setCurrentPage] = useState(() => {
    if (user?.rol === "admin" || user?.rol === "superadmin") return "dashboard";
    if (user?.rol === "cajero") return "caja-apertura";
    return "inventory";
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ✅ Pedido web que se está por cobrar (se precarga en Registrar Venta)
  const [pedidoParaCobrar, setPedidoParaCobrar] = useState(null);

  const irACobrarPedido = (pedido) => {
    setPedidoParaCobrar(pedido);
    setCurrentPage("ventas");
  };

  // ✅ Desktop: colapsado/expandido
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ Móvil: drawer abierto/cerrado
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

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
  // ✅ Bloquea el acceso a módulos no permitidos para el rol
  const renderGuarded = () => {
    if (permisosCargados && !puede(currentPage)) {
      return (
        <div className="text-center py-5">
          <i
            className="bi bi-shield-lock-fill text-warning"
            style={{ fontSize: 56 }}
          />
          <h5 className="mt-3 mb-1">Acceso restringido</h5>
          <p className="text-muted mb-0">
            No tienes permisos para acceder a este módulo.
          </p>
        </div>
      );
    }
    return renderPage();
  };

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

      case "descuentos":
        return <DescuentosPage />;

      case "promociones":
        return <PromocionesPage />;

      case "backup":
        return <BackupBDPage />;

      // ✅ Si algún rol todavía usa "reports", lo dejamos funcional
      case "reports":
        return <ReportsPage />;

      // ✅ Gestión
      case "users":
        return <UsersPage />;

      case "permisos":
        return <PermisosPage />;

      case "clientes":
        return <ClientesPage />;

      case "clientes-web":
        return <ClientesWebPage />;

      case "tienda-config":
        return <TiendaConfigPage />;

      case "bitacora":
        return <BitacoraPage />;

      // ✅ Movimientos
      case "movimientos":
        return <MovimientosPage />;

      case "registrar-movimiento":
        return <RegistrarMovimientoPage />;

      // ✅ Ventas
      case "ventas":
        return (
          <RegistrarVentaPage
            onChangePage={setCurrentPage}
            pedidoInicial={pedidoParaCobrar}
            onPedidoCobrado={() => setPedidoParaCobrar(null)}
          />
        );

      // ✅ Pedidos web
      case "pedidos":
        return <PedidosPage onCobrarPedido={irACobrarPedido} />;

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
        className={[
          "sidebar-responsive",
          // Desktop: colapsar a íconos
          !isMobile && sidebarCollapsed ? "sidebar-collapsed" : "",
          // Móvil: abrir drawer
          isMobile && sidebarOpen ? "sidebar-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
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

      {/* Botón flotante para abrir sidebar en móvil (solo cuando está cerrado) */}
      {isMobile && !sidebarOpen && (
        <button
          className="sb-mobile-fab"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
          type="button"
        >
          <span className="sb-mobile-fab__lines">
            <span /><span /><span />
          </span>
        </button>
      )}

      {/* Main content */}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden main-content-responsive">
        <Navbar onLogout={onLogout} onChangePage={setCurrentPage} />

        <main className="flex-grow-1 p-4 overflow-auto main-content-inner">
          <div className="container-fluid py-3">
            <div className="card shadow-sm main-card-responsive">
              <div className="card-body p-4">{renderGuarded()}</div>
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

      <InactivityWatcher />
    </div>
  );
}
