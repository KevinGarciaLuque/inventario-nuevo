import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

import InventoryPage from "../pages/InventoryPage";
import AddProductPage from "../pages/AddProductPage";
import CategoriesPage from "../pages/CategoriesPage";
import LocationsPage from "../pages/LocationsPage";
import ReportsPage from "../pages/ReportsPage";
import UsersPage from "../pages/UsersPage";
import ClientesPage from "../pages/ClientesPage";
import MovimientosPage from "../pages/MovimientosPage";
import RegistrarMovimientoPage from "../pages/RegistrarMovimientoPage";
import RegistrarVentaPage from "../pages/RegistrarVentaPage";
import CaiPage from "../pages/CaiPage";
import FacturasPage from "../pages/FacturasPage";
import UnidadesMedidaPage from "../pages/UnidadesMedidaPage";

import ProductModal from "./ProductModal";
import BitacoraPage from "./BitacoraPage";

import "../styles/Layout.css";

export default function Layout({ onLogout }) {
  const [currentPage, setCurrentPage] = useState("inventory");
  const [selectedProduct, setSelectedProduct] = useState(null);

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
    if (isMobile && sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
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
          // ✅ en desktop sí usamos collapsed; en móvil siempre false (drawer siempre “expandido”)
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
              <div className="card-body p-4">
                {currentPage === "inventory" && (
                  <InventoryPage onView={setSelectedProduct} />
                )}
                {currentPage === "add-product" && <AddProductPage />}
                {currentPage === "categories" && <CategoriesPage />}
                {currentPage === "locations" && <LocationsPage />}
                {currentPage === "reports" && <ReportsPage />}
                {currentPage === "users" && <UsersPage />}
                {currentPage === "clientes" && <ClientesPage />}
                {currentPage === "bitacora" && <BitacoraPage />}
                {currentPage === "movimientos" && <MovimientosPage />}
                {currentPage === "registrar-movimiento" && (
                  <RegistrarMovimientoPage />
                )}
                {currentPage === "ventas" && <RegistrarVentaPage />}
                {currentPage === "cai" && <CaiPage />}
                {currentPage === "facturas" && <FacturasPage />}
                {currentPage === "unidades" && <UnidadesMedidaPage />}
              </div>
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
