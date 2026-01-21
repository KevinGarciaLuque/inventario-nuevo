import { FormCheck } from "react-bootstrap";
import { FaBoxOpen } from "react-icons/fa";
import CardCaiDisponible from "../../ControlCAI/CardCaiDisponible";

export default function VentasHeader({
  usarRTN,
  setUsarRTN,
  refreshCaiTrigger,
}) {
  return (
    <>
      <h2 className="mb-4 text-center">
        <FaBoxOpen className="text-primary me-2" /> Módulo de Ventas
      </h2>

      <div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
        <FormCheck
          type="switch"
          id="switch-rt"
          label={
            <span style={{ fontSize: "1rem", fontWeight: "400" }}>
              Usar cliente con RTN
            </span>
          }
          checked={usarRTN}
          onChange={() => setUsarRTN(!usarRTN)}
          style={{
            fontSize: "2.0rem",
            padding: "0.5rem",
            marginBottom: "1rem",
            marginLeft: "4rem",
          }}
        />

        <div style={{ flexShrink: 0 }}>
          <CardCaiDisponible refreshTrigger={refreshCaiTrigger} />
        </div>
      </div>
    </>
  );
}
