import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { Card, Spinner, Modal } from "react-bootstrap";
import { FaFileInvoiceDollar } from "react-icons/fa";
import { BsExclamationTriangleFill } from "react-icons/bs";

export default function CardCaiDisponible() {
  const [disponible, setDisponible] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const yaAlertoRef = useRef(false);
  const intervalRef = useRef(null);

  const fetchCai = async () => {
    try {
      const res = await api.get("/cai/activo");
      const { rango_fin, correlativo_actual } = res.data;
      const disponibles = rango_fin - correlativo_actual;
      setDisponible(disponibles);

      // Alerta si baja a 50 o menos y aún no ha alertado
      if (disponibles <= 50 && !yaAlertoRef.current) {
        yaAlertoRef.current = true;
        reproducirAlerta();
        setShowModal(true);
      }
    } catch (error) {
      console.warn("⚠️ No hay CAI activo (CardCaiDisponible).", error.message);
      setDisponible(null);
    } finally {
      setLoading(false);
    }
  };

  const reproducirAlerta = () => {
    const audio = new Audio("/alerta.mp3");
    audio
      .play()
      .catch((e) => console.warn("🔇 Error al reproducir alerta:", e));
  };

  useEffect(() => {
    fetchCai();

    intervalRef.current = setInterval(fetchCai, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) {
    return (
      <Card
        className="text-center shadow-sm border-warning"
        style={{ width: "15rem" }}
      >
        <Card.Body>
          <Spinner animation="border" variant="warning" />
          <div className="mt-2 text-muted">Cargando stock CAI...</div>
        </Card.Body>
      </Card>
    );
  }

  if (disponible === null) {
    return (
      <Card
        className="text-center shadow-sm border-danger"
        style={{ width: "15rem" }}
      >
        <Card.Body>
          <FaFileInvoiceDollar size={36} className="text-danger mb-2" />
          <h5 className="text-danger">No hay CAI activo</h5>
          <div>Por favor registre un nuevo CAI.</div>
        </Card.Body>
      </Card>
    );
  }

  const borderColor = disponible <= 50 ? "danger" : "success";
  const textColor =
    disponible <= 10
      ? "text-danger"
      : disponible <= 50
      ? "text-warning"
      : "text-success";

  return (
    <>
      <Card
        className={`text-center shadow-sm border-${borderColor}`}
        style={{ width: "15rem" }}
      >
        <Card.Body>
          <FaFileInvoiceDollar size={36} className="text-primary mb-2" />
          <h5 className="mb-1">Stock disponible de facturas</h5>
          <h3 className={`fw-bold ${textColor}`}>{disponible}</h3>
          <div className="text-muted">en el CAI activo</div>
        </Card.Body>
      </Card>

      {/* Modal de alerta */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill
            size={64}
            color="#dc3545"
            className="mb-3"
          />
          <h5 className="text-danger fw-bold">¡Atención!</h5>
          <p className="text-muted mb-0">
            El stock de facturas en el CAI activo ha bajado a{" "}
            <strong>{disponible}</strong>. Es recomendable registrar uno nuevo
            pronto.
          </p>
        </Modal.Body>
      </Modal>
    </>
  );
}
