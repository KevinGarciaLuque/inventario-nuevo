// backend/routes/pedidos_stream.js
// SSE (Server-Sent Events): empuja los pedidos web nuevos al panel al instante.
// EventSource no permite enviar cabeceras, así que el token JWT viaja por query (?token=).
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const pedidosBus = require("../lib/pedidosBus");

const ROLES_PERMITIDOS = ["superadmin", "admin", "cajero"];

router.get("/", (req, res) => {
  // --- Autenticación por query token ---
  const token = String(req.query.token || "").trim();
  let user;
  try {
    const secret = process.env.JWT_SECRET || "0ae7!bdA@Hgf#1x2ZLK";
    user = jwt.verify(token, secret);
  } catch {
    return res.status(401).json({ message: "No autenticado" });
  }
  if (!ROLES_PERMITIDOS.includes(user.rol)) {
    return res.status(403).json({ message: "No autorizado" });
  }

  // --- Cabeceras SSE ---
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // evita buffering en proxies (nginx/railway)
  });
  res.flushHeaders?.();

  res.write("retry: 5000\n\n");
  res.write(`event: ready\ndata: {"ok":true}\n\n`);

  const enviar = (pedido) => {
    res.write(`event: nuevo-pedido\ndata: ${JSON.stringify(pedido)}\n\n`);
  };

  pedidosBus.on("nuevo", enviar);

  // Ping cada 25s para mantener viva la conexión
  const ping = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(ping);
    pedidosBus.off("nuevo", enviar);
    res.end();
  });
});

module.exports = router;
