import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Alert } from "react-bootstrap";

export default function AlertCaiMinimo() {
  const [cai, setCai] = useState(null);

  useEffect(() => {
    const fetchCai = async () => {
      try {
        const res = await api.get("/cai/activo");
        setCai(res.data);
      } catch (err) {}
    };
    fetchCai();
  }, []);

  if (!cai) return null;

  const disponible = cai.rango_fin - cai.correlativo_actual;

  if (disponible > 20) return null;

  return (
    <Alert variant="warning" className="text-center">
      ⚠ Quedan solo <b>{disponible}</b> facturas disponibles en el CAI activo.
    </Alert>
  );
}
