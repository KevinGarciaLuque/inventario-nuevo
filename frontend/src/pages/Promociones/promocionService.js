// src/pages/Promociones/promocionService.js
import api from "../../api/axios";

/* =====================================================
   Promociones
===================================================== */
export async function getPromociones({ search = "", activo, vigente } = {}) {
  const params = {};
  if (search?.trim()) params.search = search.trim();
  if (activo === 1 || activo === 0) params.activo = activo;
  if (vigente === 1) params.vigente = 1;

  const { data } = await api.get("/promociones", { params });
  return data;
}

export async function createPromocion(payload) {
  const { data } = await api.post("/promociones", payload);
  return data;
}

export async function updatePromocion(id, payload) {
  const { data } = await api.put(`/promociones/${id}`, payload);
  return data;
}

export async function setPromocionEstado(id, activo) {
  const { data } = await api.patch(`/promociones/${id}/estado`, { activo });
  return data;
}

export async function deletePromocion(id) {
  const { data } = await api.delete(`/promociones/${id}`);
  return data;
}

/* =====================================================
   Combos (para registrar venta)
===================================================== */
export async function getCombosVigentes() {
  const { data } = await api.get("/promociones/combos-vigentes");
  return data;
}

export async function getPromocionDetalle(id) {
  // devuelve { promocion, productos: [...] }
  const { data } = await api.get(`/promociones/${id}/detalle`);
  return data;
}

/* =====================================================
   Productos (para armar combos)
   - Si tu backend usa otro nombre de query param, ajústalo.
===================================================== */
export async function getProductos(search = "") {
  const params = {};
  if (search?.trim()) params.search = search.trim();

  const { data } = await api.get("/productos", { params });
  return data;
}

/* =====================================================
   promocion_productos (items del combo)
===================================================== */
export async function addProductoCombo(payload) {
  // { promocion_id, producto_id, cantidad, es_regalo, activo }
  const { data } = await api.post("/promocion_productos", payload);
  return data;
}

export async function updateComboItem(id, payload) {
  // payload: { cantidad?, es_regalo?, activo? }
  const { data } = await api.put(`/promocion_productos/${id}`, payload);
  return data;
}

export async function setComboItemEstado(id, activo) {
  const { data } = await api.patch(`/promocion_productos/${id}/estado`, {
    activo,
  });
  return data;
}

export async function deleteComboItem(id) {
  const { data } = await api.delete(`/promocion_productos/${id}`);
  return data;
}
