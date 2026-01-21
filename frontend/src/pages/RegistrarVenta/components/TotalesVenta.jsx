// frontend/src/pages/RegistrarVenta/components/TotalesVenta.jsx
import { Button, Spinner, FormSelect } from "react-bootstrap";
import { FaCashRegister } from "react-icons/fa";
import MetodosPagos from "../../../components/MetodosPagos";

export default function TotalesVenta({
  total,
  subtotal,
  impuesto,

  // ✅ totales extra
  subtotalBruto = 0,
  descuentoTotal = 0,

  // ✅ descuento cliente (monto calculado)
  totalConDescCliente = null,
  descuentoClienteMonto = 0,
  descuentoClienteNombre = "",

  // ✅ props para el SELECT (van desde useVenta)
  tipoCliente = "",
  setTipoCliente = () => {},
  descuentos = [],
  descuentosLoading = false,
  descuentoSeleccionadoId = "",
  setDescuentoSeleccionadoId = () => {},

  handleCambio,
  resetPagoTrigger,
  registrarVenta,
}) {
  const totalFinal = Number(totalConDescCliente ?? total ?? 0);

  const TIPOS_CON_DESCUENTO = [
    "tercera_edad",
    "cuarta_edad",
    "discapacitado",
    "empleado",
    "preferencial",
  ];
  const tipoAplica = TIPOS_CON_DESCUENTO.includes(tipoCliente);

  return (
    <div className="row mt-3">
      {/* ✅ Columna 1: Métodos de pago */}
      <div className="col-md-4 mb-3">
        <MetodosPagos
          total={totalFinal}
          onCambioCalculado={handleCambio}
          resetTrigger={resetPagoTrigger}
        />
      </div>

      {/* ✅ Columna 2: AQUÍ VA TU CUADRO NEGRO (Select descuento) */}
      <div className="col-md-4 mb-3">
        <div className="bg-white p-3 rounded shadow-sm border h-100">
          <div className="mb-2">
            <strong>Descuento por cliente</strong>
            <div className="text-muted" style={{ fontSize: 13 }}>
              Aplica solo a tercera edad, cuarta edad, discapacitado, etc.
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold mb-1">
              Tipo de cliente
            </label>
            <FormSelect
              value={tipoCliente || ""}
              onChange={(e) => {
                setTipoCliente(e.target.value);
                setDescuentoSeleccionadoId("");
              }}
            >
              <option value="">-- Seleccionar --</option>
              <option value="tercera_edad">Tercera edad</option>
              <option value="cuarta_edad">Cuarta edad</option>
              <option value="discapacitado">Discapacitado</option>
              <option value="empleado">Empleado</option>
              <option value="preferencial">Preferencial</option>
            </FormSelect>
          </div>

          <div className="mb-2">
            <label className="form-label fw-semibold mb-1">
              Seleccionar descuento
            </label>

            {!tipoAplica ? (
              <input
                className="form-control"
                disabled
                value="Selecciona un tipo con descuento"
              />
            ) : (
              <FormSelect
                value={descuentoSeleccionadoId || ""}
                onChange={(e) => setDescuentoSeleccionadoId(e.target.value)}
                disabled={descuentosLoading}
              >
                <option value="">
                  {descuentosLoading
                    ? "Cargando descuentos..."
                    : "-- Seleccionar descuento --"}
                </option>

                {(descuentos || [])
                  .filter((d) => d?.activo !== false)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                      {Number(d.porcentaje || 0) > 0
                        ? ` (${d.porcentaje}%)`
                        : ""}
                      {Number(d.monto || 0) > 0
                        ? ` (L ${Number(d.monto).toFixed(2)})`
                        : ""}
                    </option>
                  ))}
              </FormSelect>
            )}
          </div>

          <hr className="my-3" />

          {/* Resumen del descuento cliente */}
          {descuentosLoading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              Cargando descuentos...
            </div>
          ) : Number(descuentoClienteMonto || 0) > 0 ? (
            <div>
              <div className="mb-1">
                <strong>Aplicado:</strong>{" "}
                {descuentoClienteNombre || "Descuento"}
              </div>
              <div className="text-danger fw-semibold">
                - L {Number(descuentoClienteMonto).toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="text-muted">Sin descuento seleccionado.</div>
          )}
        </div>
      </div>

      {/* ✅ Columna 3: Totales + botón */}
      <div className="col-md-4 d-flex flex-column justify-content-between mb-3">
        <div className="bg-light p-3 rounded shadow-sm h-100">
          <div className="mb-2">
            <strong>Subtotal (bruto):</strong> L{" "}
            {Number(subtotalBruto).toFixed(2)}
          </div>

          <div className="mb-2">
            <strong>Descuento (productos):</strong>{" "}
            <span className="text-danger">
              - L {Number(descuentoTotal).toFixed(2)}
            </span>
          </div>

          {Number(descuentoClienteMonto || 0) > 0 && (
            <div className="mb-2">
              <strong>
                Descuento cliente
                {descuentoClienteNombre ? ` (${descuentoClienteNombre})` : ""}:
              </strong>{" "}
              <span className="text-danger">
                - L {Number(descuentoClienteMonto).toFixed(2)}
              </span>
            </div>
          )}

          <hr className="my-2" />

          <div className="mb-2">
            <strong>Subtotal:</strong> L {Number(subtotal).toFixed(2)}
          </div>

          <div className="mb-2">
            <strong>ISV 15%:</strong> L {Number(impuesto).toFixed(2)}
          </div>

          <div className="mb-3">
            <h5 className="m-0">
              <strong>Total:</strong> L {Number(totalFinal).toFixed(2)}
            </h5>
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
