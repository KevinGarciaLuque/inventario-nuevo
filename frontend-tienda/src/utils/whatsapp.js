// src/utils/whatsapp.js
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "50493877292";

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;

// wa.me exige solo dígitos (con código de país, sin espacios/guiones/+).
// Los números se guardan formateados para mostrarse (ej. "504 3378-1720"),
// así que hay que limpiarlos antes de armar el link.
export const buildWaLink = (numero, texto) =>
  `https://wa.me/${String(numero || "").replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

// Botón "Solicitar precio mayorista" en la ficha/tarjeta de producto
export const mensajeMayorista = (producto) =>
  `Hola, quisiera cotizar precio mayorista para:\n` +
  `• ${producto.nombre} (código: ${producto.codigo})\n` +
  `¿Me pueden dar más información?`;

// Botón "Enviar pedido por WhatsApp" desde el carrito.
// `datos` = { nombre, telefono, direccion, entrega: "envio" | "recoge" }
export const mensajePedido = (items, datos = {}) => {
  const lineas = items.map((it) => {
    const cod = it.codigo ? ` (código: ${it.codigo})` : "";
    return `• ${it.cantidad}x ${it.nombre}${cod} — ${money(it.precio * it.cantidad)}`;
  });
  const total = items.reduce((sum, it) => sum + it.precio * it.cantidad, 0);

  const entregaTexto =
    datos.entrega === "envio" ? "Envío a domicilio" : "Recoger en el local";

  const datosCliente = [
    `\n\nDatos del cliente:`,
    `Nombre: ${datos.nombre || "-"}`,
    datos.telefono ? `Teléfono: ${datos.telefono}` : null,
    `Entrega: ${entregaTexto}`,
    datos.entrega === "envio" ? `Dirección: ${datos.direccion || "-"}` : null,
  ].filter(Boolean);

  return (
    `Hola, quiero hacer este pedido:\n\n` +
    lineas.join("\n") +
    `\n\nTotal aproximado: ${money(total)}` +
    datosCliente.join("\n")
  );
};
