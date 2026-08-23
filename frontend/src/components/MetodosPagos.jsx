import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { FaMoneyBillWave, FaCreditCard, FaRandom } from "react-icons/fa";
import "../pages/RegistrarVenta/ventaPanel.css";

const METODOS = [
  { value: "efectivo", label: "Efectivo", icon: FaMoneyBillWave },
  { value: "tarjeta", label: "Tarjeta", icon: FaCreditCard },
  { value: "mixto", label: "Mixto", icon: FaRandom },
];

export default function MetodosPagos({
  total,
  onCambioCalculado,
  resetTrigger,
}) {
  const [metodo, setMetodo] = useState("efectivo");
  const [efectivo, setEfectivo] = useState("");
  const [montoTarjeta, setMontoTarjeta] = useState("");
  const [cambio, setCambio] = useState(0);

  // 🔁 Recalcula el cambio cada vez que cambian estos valores
  useEffect(() => {
    const totalNum = Number(total) || 0;
    const pagoEfectivo = parseFloat(efectivo) || 0;
    const pagoTarjeta = metodo === "mixto" ? parseFloat(montoTarjeta) || 0 : 0;

    let cambioCalculado = 0;
    if (metodo === "efectivo") {
      cambioCalculado =
        pagoEfectivo > totalNum
          ? parseFloat((pagoEfectivo - totalNum).toFixed(2))
          : 0;
    } else if (metodo === "mixto") {
      const restante = Math.max(0, totalNum - pagoTarjeta);
      cambioCalculado =
        pagoEfectivo > restante
          ? parseFloat((pagoEfectivo - restante).toFixed(2))
          : 0;
    }
    setCambio(cambioCalculado);

    onCambioCalculado({
      metodo,
      efectivo: metodo === "tarjeta" ? 0 : pagoEfectivo,
      cambio: cambioCalculado,
      monto_tarjeta: metodo === "tarjeta" ? totalNum : pagoTarjeta,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [efectivo, montoTarjeta, metodo, total]);

  // 🔄 Reset cuando cambie la prop resetTrigger
  useEffect(() => {
    setMetodo("efectivo");
    setEfectivo("");
    setMontoTarjeta("");
    setCambio(0);
  }, [resetTrigger]);

  const totalNum = Number(total) || 0;
  const restanteMixto = Math.max(0, totalNum - (parseFloat(montoTarjeta) || 0));

  return (
    <div className="venta-panel h-100">
      <div className="venta-panel__header">
        <FaMoneyBillWave className="venta-panel__icon" />
        <div>
          <div className="venta-panel__title">Método de Pago</div>
          <div className="venta-panel__subtitle">¿Cómo paga el cliente?</div>
        </div>
      </div>

      <div className="venta-payment-tabs" role="tablist">
        {METODOS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={metodo === value}
            className={`venta-payment-tab ${metodo === value ? "venta-payment-tab--active" : ""}`}
            onClick={() => setMetodo(value)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      {metodo === "efectivo" && (
        <>
          <Form.Group className="mt-3">
            <Form.Label className="venta-field-label">Pago en efectivo</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={efectivo}
              onChange={(e) => setEfectivo(e.target.value)}
              placeholder="0.00"
            />
          </Form.Group>

          <div className="venta-change-box mt-2">
            <span>Cambio a entregar</span>
            <strong>L {cambio.toFixed(2)}</strong>
          </div>
        </>
      )}

      {metodo === "tarjeta" && (
        <div className="venta-info-box mt-3">
          Se cobrará el total (<strong>L {totalNum.toFixed(2)}</strong>) completo
          con tarjeta. No aplica cambio.
        </div>
      )}

      {metodo === "mixto" && (
        <>
          <Form.Group className="mt-3">
            <Form.Label className="venta-field-label">Monto pagado con tarjeta</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={montoTarjeta}
              onChange={(e) => setMontoTarjeta(e.target.value)}
              placeholder="0.00"
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label className="venta-field-label">
              Restante en efectivo{" "}
              <span className="text-muted fw-normal">
                (mínimo L {restanteMixto.toFixed(2)})
              </span>
            </Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={efectivo}
              onChange={(e) => setEfectivo(e.target.value)}
              placeholder="0.00"
            />
          </Form.Group>

          <div className="venta-change-box mt-2">
            <span>Cambio a entregar</span>
            <strong>L {cambio.toFixed(2)}</strong>
          </div>
        </>
      )}
    </div>
  );
}
