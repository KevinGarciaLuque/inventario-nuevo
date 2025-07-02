import React, { useEffect, useState } from "react";
import { Table, Form, InputGroup, Button } from "react-bootstrap";
import { FaBroom, FaPrint } from "react-icons/fa";
import api from "../../api/axios";
import generarReciboPDF from "../utils/generarReciboPDF"; // Ajusta el path según tu proyecto

export default function FacturasPage() {
  const [facturas, setFacturas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    try {
      const res = await api.get("/facturas");
      setFacturas(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filtradas = facturas.filter(
    (f) =>
      f.numero_factura.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.cai_codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const manejarImpresion = async (factura) => {
    try {
      const res = await api.get(`/facturas/${factura.id}`);
      const datosFactura = res.data;

      generarReciboPDF({
        numeroFactura: datosFactura.numero_factura,
        carrito: datosFactura.carrito,
        subtotal: datosFactura.subtotal,
        impuesto: datosFactura.impuesto,
        total: datosFactura.total,
        user: datosFactura.user,
        cai: datosFactura.cai,
        cliente_nombre: datosFactura.cliente_nombre,
        cliente_rtn: datosFactura.cliente_rtn,
        cliente_direccion: datosFactura.cliente_direccion,
      });
      
    } catch (error) {
      console.error("Error al generar el PDF:", error);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">Facturas Emitidas</h2>

      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Buscar por número de factura o CAI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Button
          variant="warning"
          className="fw-bold d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "#FFC107", borderColor: "#FFC107" }}
          onClick={() => setBusqueda("")}
        >
          <FaBroom className="me-2" /> Limpiar
        </Button>
      </InputGroup>

      <div
        className="table-responsive"
        style={{ maxHeight: "400px", overflowY: "auto" }}
      >
        <Table striped bordered hover className="mb-0">
          <thead className="table-primary sticky-top">
            <tr>
              <th>#</th>
              <th>Número Factura</th>
              <th>CAI</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((f, index) => (
              <tr key={f.id}>
                <td>{index + 1}</td>
                <td>{f.numero_factura}</td>
                <td>{f.cai_codigo}</td>
                <td>{new Date(f.fecha_emision).toLocaleString()}</td>
                <td>{parseFloat(f.total_factura).toFixed(2)} Lps</td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => manejarImpresion(f)}
                  >
                    <FaPrint className="me-1" /> Imprimir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
