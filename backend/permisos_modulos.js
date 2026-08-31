// backend/permisos_modulos.js
// Registro central de módulos del sidebar y permisos por defecto por rol.
// Compartido conceptualmente con frontend/src/config/modulos.js

// Lista canónica de módulos (mismos keys que usa el Layout del frontend)
const MODULOS = [
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

// Módulo exclusivo del superadmin (no aparece en la matriz de permisos)
const MODULO_PERMISOS = { key: "permisos", label: "Permisos", grupo: "GESTIÓN USUARIOS" };

const MODULO_KEYS = MODULOS.map((m) => m.key);

// Roles configurables desde el módulo de permisos
const ROLES_CONFIGURABLES = ["admin", "almacen", "cajero"];

// Todos los roles válidos del sistema
const ROLES_VALIDOS = ["superadmin", ...ROLES_CONFIGURABLES];

// Permisos por defecto (se usan como seed y como fallback si la BD no tiene fila)
function permisosPorDefecto(rol) {
  const all = (val) => Object.fromEntries(MODULO_KEYS.map((k) => [k, val]));

  if (rol === "admin") {
    const p = all(true);
    p.backup = false; // el admin no accede a Backup BD
    return p;
  }

  if (rol === "almacen") {
    const p = all(false);
    [
      "inventory",
      "add-product",
      "registrar-movimiento",
      "movimientos",
      "categories",
      "locations",
      "unidades",
      "impuestos",
      "promociones",
    ].forEach((k) => (p[k] = true));
    return p;
  }

  if (rol === "cajero") {
    const p = all(false);
    [
      "caja-apertura",
      "ventas",
      "pedidos",
      "facturas",
      "caja-cierre",
      "caja-historial",
    ].forEach((k) => (p[k] = true));
    return p;
  }

  return all(false);
}

module.exports = {
  MODULOS,
  MODULO_PERMISOS,
  MODULO_KEYS,
  ROLES_CONFIGURABLES,
  ROLES_VALIDOS,
  permisosPorDefecto,
};
