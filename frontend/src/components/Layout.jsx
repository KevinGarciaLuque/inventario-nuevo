import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import InventoryPage from "../pages/InventoryPage";
import AddProductPage from "../pages/AddProductPage";
import CategoriesPage from "../pages/CategoriesPage";
import LocationsPage from "../pages/LocationsPage";
import ReportsPage from "../pages/ReportsPage";
import ProductModal from "./ProductModal";
import UsersPage from "../pages/UsersPage";
import BitacoraPage from "./BitacoraPage";
import MovimientosPage from "../pages/MovimientosPage";
import RegistrarMovimientoPage from "../pages/RegistrarMovimientoPage";
import RegistrarVentaPage from "../pages/RegistrarVentaPage";
import CaiPage from "../pages/CaiPage";
import FacturasPage from "../pages/FacturasPage";
import Soporte from "../components/Soporte";
import ClientesPage from "../pages/ClientesPage";

import "../styles/Layout.css";

export default function Layout({ onLogout }) {
  const [currentPage, setCurrentPage] = useState("inventory");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
    else setSidebarCollapsed(false);
  }, [isMobile]);

  const toggleSidebar = () => {
    setSidebarCollapsed((v) => !v);
  };

  return (
    <div className="layout-root d-flex min-vh-100 bg-light ">
      {/* Sidebar */}
      <div
        className={`sidebar sidebar-responsive d-flex flex-column flex-shrink-0 bg-dark text-white transition-all
          ${sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}
          ${isMobile ? "sidebar-mobile" : ""}`}
      >
        <Sidebar
          currentPage={currentPage}
          onChangePage={setCurrentPage}
          isCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>

      {/* Main content */}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden main-content-responsive">
        <Navbar
          onLogout={onLogout}
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
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
              </div>
            </div>
            {/* Botón de Soporte fijo abajo */}
            <div className="position-fixed bottom-0 end-0 m-4">
              <Soporte />
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

      {/* CSS específico para el Layout */}
      <style>{`
        /* Ajuste sidebar para móvil */
        @media (max-width: 768px) {
          .sidebar {
            max-width: 70vw !important;
            min-width: 70vw !important;
            z-index: 2000;
          }
          .main-content-responsive {
            /* Asegura que el contenido principal se vea bien */
            min-width: 0 !important;
          }
          .table-responsive {
            max-height: none !important;
            overflow-y: visible !important;
          }
          .sticky-header thead th {
            position: static !important; /* quita el sticky en móvil si molesta */
          }
        }
      `}</style>
    </div>
  );
}
