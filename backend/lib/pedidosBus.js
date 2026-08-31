// backend/lib/pedidosBus.js
// Bus de eventos en memoria para notificar pedidos web en tiempo real (SSE).
const { EventEmitter } = require("events");

const pedidosBus = new EventEmitter();
// Puede haber varias campanas abiertas (varias pestañas/usuarios del panel)
pedidosBus.setMaxListeners(0);

module.exports = pedidosBus;
