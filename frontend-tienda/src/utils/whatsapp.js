// src/utils/whatsapp.js
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "50493877292";

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;

export const buildWaLink = (numero, texto) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;

// Botón "Solicitar precio mayorista" en la ficha/tarjeta de producto
export const mensajeMayorista = (producto) =>
  `Hola, quisiera cotizar precio mayorista para:\n` +
  `• ${producto.nombre} (código: ${producto.codigo})\n` +
  `¿Me pueden dar más información?`;

// Botón "Enviar pedido por WhatsApp" desde el carrito
export const mensajePedido = (items) => {
  const lineas = items.map(
    (it) =>
      `• ${it.cantidad}x ${it.nombre} — ${money(it.precio * it.cantidad)}`,
  );
  const total = items.reduce((sum, it) => sum + it.precio * it.cantidad, 0);

  return (
    `Hola, quiero hacer este pedido:\n\n` +
    lineas.join("\n") +
    `\n\nTotal aproximado: ${money(total)}`
  );
};
