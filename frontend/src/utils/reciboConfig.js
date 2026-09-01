// frontend/src/utils/reciboConfig.js
// Carga (con caché) la configuración del encabezado/textos del recibo y factura.
import api from "../api/axios";

export const DEFAULT_RECIBO_CONFIG = {
  logo_base64: "",
  negocio_nombre: "Sistema Inventario",
  sucursal: "Sucursal Tegucigalpa",
  rtn: "0801-1900-10000",
  telefono: "(504) 9800-0000",
  recibo_titulo: "RECIBO DE VENTA",
  recibo_leyenda: "Documento no fiscal - no genera crédito fiscal",
  recibo_pie: "*** GRACIAS POR SU COMPRA ***",
  recibo_nota1: "Este documento NO es una factura.",
  recibo_nota2: "Si necesita factura, solicítela.",
  recibo_color: "#000000",
  factura_titulo: "FACTURA",
  factura_pie: "*** GRACIAS POR SU COMPRA ***",
  factura_nota1: "La factura es beneficio de todos.",
  factura_nota2: "EXÍJALA",
  factura_color: "#000000",
};

let _cache = null;
let _inflight = null;

export async function getReciboConfig(force = false) {
  if (!force && _cache) return _cache;
  if (!_inflight) {
    _inflight = api
      .get("/recibo-config")
      .then((r) => {
        _cache = { ...DEFAULT_RECIBO_CONFIG, ...(r.data || {}) };
        return _cache;
      })
      .catch(() => ({ ...DEFAULT_RECIBO_CONFIG }))
      .finally(() => {
        _inflight = null;
      });
  }
  return _inflight;
}

export function clearReciboConfigCache() {
  _cache = null;
}
