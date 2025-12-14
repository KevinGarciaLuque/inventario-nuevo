import { useState, useEffect } from "react";
import { Form } from "react-bootstrap";

export default function MetodosPagos({
  total,
  onCambioCalculado,
  resetTrigger,
}) {
  const [metodo, setMetodo] = useState("efectivo");
  const [efectivo, setEfectivo] = useState("");
  const [cambio, setCambio] = useState(0);

  // 🔁 Recalcula el cambio cada vez que cambian estos valores
  useEffect(() => {
    const pago = parseFloat(efectivo) || 0;
    const cambioCalculado =
      pago > total ? parseFloat((pago - total).toFixed(2)) : 0;
    setCambio(cambioCalculado);

    onCambioCalculado({
      metodo,
      efectivo: pago,
      cambio: cambioCalculado,
    });
  }, [efectivo, metodo, total]);

  // 🔄 Reset cuando cambie la prop resetTrigger
  useEffect(() => {
    setMetodo("efectivo");
    setEfectivo("");
    setCambio(0);
  }, [resetTrigger]);

  return (
    <div
      className="border p-3 rounded with-shadow"
      style={{ width: "60%", backgroundColor: "#d4d6d5ff" }}
    >
      <h6>Método de Pago</h6>
      <Form.Group>
        <Form.Select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
        </Form.Select>
      </Form.Group>

      {metodo === "efectivo" && (
        <>
          <Form.Group className="mt-2">
            <Form.Label>Pago en efectivo</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={efectivo}
              onChange={(e) => setEfectivo(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Cambio entregado</Form.Label>
            <Form.Control
              type="text"
              readOnly
              value={`L ${cambio.toFixed(2)}`}
            />
          </Form.Group>
        </>
      )}
    </div>
  );
}
