import { Button } from "react-bootstrap";
import { FaCashRegister } from "react-icons/fa";
import MetodosPagos from "../../../components/MetodosPagos";

export default function TotalesVenta({
  total,
  subtotal,
  impuesto,

  // ✅ nuevos
  subtotalBruto = 0,
  descuentoTotal = 0, // ✅ default

  handleCambio,
  resetPagoTrigger,
  registrarVenta,
}) {
  return (
    <div className="row mt-3">
      <div className="col-md-6 mb-3">
        <MetodosPagos
          total={total}
          onCambioCalculado={handleCambio}
          resetTrigger={resetPagoTrigger}
        />
      </div>

      <div className="col-md-6 d-flex flex-column justify-content-between">
        <div className="bg-light p-3 rounded shadow-sm h-100">
          <div className="mb-2">
            <strong>Subtotal (bruto):</strong> L{" "}
            {Number(subtotalBruto).toFixed(2)}
          </div>

          <div className="mb-2">
            <strong>Descuento:</strong>{" "}
            <span className="text-danger">
              - L {Number(descuentoTotal).toFixed(2)}
            </span>
          </div>

          <hr className="my-2" />

          <div className="mb-2">
            <strong>Subtotal:</strong> L {Number(subtotal).toFixed(2)}
          </div>

          <div className="mb-2">
            <strong>ISV 15%:</strong> L {Number(impuesto).toFixed(2)}
          </div>
          {descuentoTotal > 0 && (
            <div className="mb-2">
              <strong>Descuento:</strong> - L {descuentoTotal.toFixed(2)}
            </div>
          )}

          <div className="mb-3">
            <h5 className="m-0">
              <strong>Total:</strong> L {Number(total).toFixed(2)}
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
