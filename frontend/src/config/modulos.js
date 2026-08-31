// src/config/modulos.js
// Registro central de módulos del sidebar (mismos keys que usa Layout.jsx).
// Debe mantenerse alineado con backend/permisos_modulos.js

export const MODULOS = [
  { key: "dashboard", label: "Dashboard", grupo: "DASHBOARD" },
  { key: "inventory", label: "Inventario", grupo: "INVENTARIO" },
  { key: "add-product", label: "Añadir Producto", grupo: "INVENTARIO" },
  { key: "ventas", label: "Registrar Venta", grupo: "REGISTRAR VENTAS" },
  { key: "pedidos", label: "Pedidos Web", grupo: "REGISTRAR VENTAS" },
  { key: "movimientos", label: "Movimientos", grupo: "REGISTRAR VENTAS" },
  { key: "registrar-movimiento", label: "Registrar Movimiento", grupo: "REGISTRAR VENTAS" },
  { key: "caja-apertura", label: "Apertura de Caja", grupo: "CIERRES DE CAJA" },
  { key: "caja-cierre", label: "Cierre de Caja", grupo: "CIERRES DE CAJA" },
  { key: "caja-historial", label: "Historial de Cierres", grupo: "CIERRES DE CAJA" },
  { key: "facturas", label: "Facturas Emitidas", grupo: "FACTURACIÓN" },
  { key: "cai", label: "Control de CAI", grupo: "FACTURACIÓN" },
  { key: "users", label: "Usuarios", grupo: "GESTIÓN USUARIOS" },
  { key: "clientes", label: "Clientes", grupo: "GESTIÓN USUARIOS" },
  { key: "bitacora", label: "Bitácora", grupo: "GESTIÓN USUARIOS" },
  { key: "tienda-config", label: "Configuración Tienda", grupo: "TIENDA WEB" },
  { key: "clientes-web", label: "Solicitudes Web", grupo: "TIENDA WEB" },
  { key: "categories", label: "Categorías", grupo: "MANTENIMIENTO" },
  { key: "locations", label: "Ubicaciones", grupo: "MANTENIMIENTO" },
  { key: "unidades", label: "Unidades de Medida", grupo: "MANTENIMIENTO" },
  { key: "impuestos", label: "Impuestos", grupo: "MANTENIMIENTO" },
  { key: "descuentos", label: "Descuentos", grupo: "MANTENIMIENTO" },
  { key: "promociones", label: "Promociones", grupo: "MANTENIMIENTO" },
  { key: "backup", label: "Backup BD", grupo: "MANTENIMIENTO" },
];

export const MODULO_KEYS = MODULOS.map((m) => m.key);

export const ROLES_CONFIGURABLES = ["admin", "almacen", "cajero"];

export const ROL_LABEL = {
  superadmin: "Super Administrador",
  admin: "Administrador",
  almacen: "Almacén",
  cajero: "Cajero",
  usuario: "Usuario",
};

// Módulos que siempre están disponibles para un rol (no filtrables)
// "permisos" solo lo ve el superadmin.
export const MODULOS_SUPERADMIN = [...MODULO_KEYS, "permisos"];
