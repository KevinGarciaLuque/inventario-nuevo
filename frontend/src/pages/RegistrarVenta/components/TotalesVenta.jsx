// frontend/src/pages/RegistrarVenta/components/TotalesVenta.jsx
import { Button, Spinner, FormSelect } from "react-bootstrap";
import { FaCashRegister, FaTags, FaReceipt } from "react-icons/fa";
import MetodosPagos from "../../../components/MetodosPagos";
import "../ventaPanel.css";

export default function TotalesVenta({
  venta = {},
  total,
  subtotal,
  impuesto,

  // ✅ detalle de impuestos dinámicos (15%, 18%, etc.)
  // Ej: { "ISV 15%": 12.34, "ISV 18%": 5.67 }
  impuestosDetalle = null,

  // ✅ totales extra
  subtotalBruto = 0,
  descuentoTotal = 0,

  // ✅ descuento cliente (monto calculado)
  totalConDescCliente = null,
  descuentoClienteMonto = 0,
  descuentoClienteNombre = "",

  // ✅ props para el SELECT (van desde useVenta)
  descuentos = [],
  descuentosLoading = false,
  descuentoSeleccionadoId = "",
  setDescuentoSeleccionadoId = () => {},

  handleCambio,
  resetPagoTrigger,
  registrarVenta,
}) {
  const totalFinal = Number(totalConDescCliente ?? total ?? 0);

  const descuentosDisponibles = (descuentos || []).filter(
    (d) => d?.activo !== false && d?.activo !== 0,
  );

  const etiquetaDescuento = (d) => {
    const tipo = String(d?.tipo || "").toUpperCase();
    const valor = Number(d?.valor ?? 0);
    if (tipo === "PORCENTAJE") return `${d.nombre} (${valor}%)`;
    if (tipo === "MONTO_FIJO") return `${d.nombre} (L ${valor.toFixed(2)})`;
    return d?.nombre || "Descuento";
  };

  const hayDetalleImpuestos =
    impuestosDetalle &&
    typeof impuestosDetalle === "object" &&
    Object.keys(impuestosDetalle).length > 0;

  // ✅ Normaliza etiqueta (por si llega "18%:" / "18%" / "ISV 18%")
  const normalizarEtiquetaImpuesto = (nombre) => {
    const limpio = String(nombre || "")
      .replace(":", "")
      .trim();
    if (!limpio) return "Impuesto";

    if (/^isv/i.test(limpio)) return limpio;

    const matchPct = limpio.match(/(\d+(\.\d+)?)/);
    const pct = matchPct ? matchPct[1] : null;
    if (pct) return `ISV ${pct}%`;

    return limpio;
  };

  // ✅ Extrae porcentaje numérico desde etiqueta
  const extraerPct = (nombre) =>
    Number(String(nombre).match(/(\d+(\.\d+)?)/)?.[1] || 0);

  // ✅ Montos "forzados" para 15% y 18% (aunque no vengan)
  const monto15 = (() => {
    if (!hayDetalleImpuestos) return 0;
    const key = Object.keys(impuestosDetalle).find((k) => extraerPct(k) === 15);
    return key ? Number(impuestosDetalle[key] || 0) : 0;
  })();

  const monto18 = (() => {
    if (!hayDetalleImpuestos) return 0;
    const key = Object.keys(impuestosDetalle).find((k) => extraerPct(k) === 18);
    return key ? Number(impuestosDetalle[key] || 0) : 0;
  })();

  // ✅ Otros impuestos distintos a 15 y 18 (si existen)
  const otrosImpuestosOrdenados = hayDetalleImpuestos
    ? Object.entries(impuestosDetalle)
        .filter(([, v]) => Number(v || 0) !== 0)
        .filter(([k]) => {
          const p = extraerPct(k);
          return p !== 15 && p !== 18;
        })
        .sort(([a], [b]) => extraerPct(a) - extraerPct(b))
    : [];

  // Resumen del método de pago para el bloque de totales
  const metodoResumen = (() => {
    const m = venta?.metodo_pago || "efectivo";
    if (m === "tarjeta") return "Pago con tarjeta";
    if (m === "transferencia") return "Pago por transferencia";
    if (m === "mixto") {
      return `Tarjeta L ${Number(venta?.monto_tarjeta || 0).toFixed(2)} + Efectivo L ${Number(
        venta?.efectivo || 0,
      ).toFixed(2)}`;
    }
    return `Efectivo recibido L ${Number(venta?.efectivo || 0).toFixed(2)}`;
  })();

  return (
    <div className="row mt-3 g-3">
      {/* ✅ Columna 1: Métodos de pago */}
      <div className="col-md-4">
        <MetodosPagos
          total={totalFinal}
          onCambioCalculado={handleCambio}
          resetTrigger={resetPagoTrigger}
        />
      </div>

      {/* ✅ Columna 2: Descuento por cliente */}
      <div className="col-md-4">
        <div className="venta-panel h-100">
          <div className="venta-panel__header">
            <FaTags className="venta-panel__icon" />
            <div>
              <div className="venta-panel__title">Descuento por cliente</div>
              <div className="venta-panel__subtitle">
                Tercera edad, discapacidad, empleados, etc.
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="venta-field-label">Descuento a aplicar</label>
            <FormSelect
              value={descuentoSeleccionadoId || ""}
              onChange={(e) => setDescuentoSeleccionadoId(e.target.value)}
              disabled={descuentosLoading}
            >
              <option value="">
                {descuentosLoading
                  ? "Cargando descuentos..."
                  : descuentosDisponibles.length === 0
                    ? "No hay descuentos disponibles"
                    : "-- Sin descuento --"}
              </option>
              {descuentosDisponibles.map((d) => (
                <option key={d.id} value={d.id}>
                  {etiquetaDescuento(d)}
                </option>
              ))}
            </FormSelect>
          </div>

          {descuentosLoading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              Cargando descuentos...
            </div>
          ) : Number(descuentoClienteMonto || 0) > 0 ? (
            <div className="venta-discount-applied">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Descuento aplicado
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <strong>{descuentoClienteNombre || "Descuento"}</strong>
                <span className="text-danger fw-bold">
                  - L {Number(descuentoClienteMonto).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="venta-discount-empty">
              Sin descuento seleccionado.
            </div>
          )}
        </div>
      </div>

      {/* ✅ Columna 3: Totales + botón */}
      <div className="col-md-4">
        <div className="venta-panel h-100">
          <div className="venta-panel__header">
            <FaReceipt className="venta-panel__icon" />
            <div>
              <div className="venta-panel__title">Resumen de la venta</div>
              <div className="venta-panel__subtitle">{metodoResumen}</div>
            </div>
          </div>

          <div className="venta-totals-row">
            <span>Subtotal (bruto)</span>
            <span>L {Number(subtotalBruto).toFixed(2)}</span>
          </div>

          <div className="venta-totals-row">
            <span>Descuento (productos)</span>
            <span className="text-danger">
              - L {Number(descuentoTotal).toFixed(2)}
            </span>
          </div>

          <div className="venta-totals-row">
            <span>
              Descuento cliente
              {descuentoClienteNombre ? ` (${descuentoClienteNombre})` : ""}
            </span>
            <span className="text-danger">
              - L {Number(descuentoClienteMonto || 0).toFixed(2)}
            </span>
          </div>

          <hr className="venta-totals-divider" />

          <div className="venta-totals-row">
            <span>Subtotal</span>
            <span>L {Number(subtotal).toFixed(2)}</span>
          </div>

          <div className="venta-totals-row">
            <span>ISV 15%</span>
            <span>L {Number(monto15).toFixed(2)}</span>
          </div>

          <div className="venta-totals-row">
            <span>ISV 18%</span>
            <span>L {Number(monto18).toFixed(2)}</span>
          </div>

          {otrosImpuestosOrdenados.map(([nombre, monto]) => (
            <div key={nombre} className="venta-totals-row">
              <span>{normalizarEtiquetaImpuesto(nombre)}</span>
              <span>L {Number(monto).toFixed(2)}</span>
            </div>
          ))}

          <div className="venta-totals-row venta-totals-row--muted">
            <span>Total impuestos</span>
            <span>L {Number(impuesto).toFixed(2)}</span>
          </div>

          <div className="venta-total-final">
            <span>Total</span>
            <strong>L {Number(totalFinal).toFixed(2)}</strong>
          </div>

          <Button
            variant="success"
            size="lg"
            onClick={registrarVenta}
            className="w-100"
          >
            <FaCashRegister className="me-2" /> Registrar Venta
          </Button>
        </div>
      </div>
    </div>
  );
}
