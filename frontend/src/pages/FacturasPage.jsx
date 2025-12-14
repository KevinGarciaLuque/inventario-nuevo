import React, { useEffect, useState } from "react";
import { Table, Form, InputGroup, Button, Modal } from "react-bootstrap";
import { FaBroom, FaPrint, FaEye } from "react-icons/fa";
import api from "../../api/axios";
import generarReciboPDF from "../utils/generarReciboPDF"; // Ajusta el path según tu proyecto

export default function FacturasPage() {
  const [facturas, setFacturas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // Estados para la vista previa de la factura
  const [showVista, setShowVista] = useState(false);
  const [facturaVista, setFacturaVista] = useState(null);

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

  // Botón imprimir
  // Botón imprimir
  const manejarImpresion = async (factura) => {
    try {
      const res = await api.get(`/facturas/${factura.id}`);
      const datosFactura = res.data;

      generarReciboPDF({
        numeroFactura: datosFactura.numero_factura,
        carrito: datosFactura.carrito,
        subtotal: Number(datosFactura.subtotal) || 0,
        impuesto: Number(datosFactura.impuesto) || 0,
        total: Number(datosFactura.total) || 0,
        user: datosFactura.user,
        cai: datosFactura.cai,
        cliente_nombre: datosFactura.cliente_nombre || "Consumidor Final",
        cliente_rtn: datosFactura.cliente_rtn || "",
        cliente_direccion: datosFactura.cliente_direccion || "",
        metodoPago: datosFactura.metodo_pago || "efectivo",
        efectivo: Number(datosFactura.efectivo) || 0,
        cambio: Number(datosFactura.cambio) || 0,
        esCopia: true, // ✅ Se imprimirá como copia
      });
    } catch (error) {
      console.error("Error al generar el PDF:", error);
    }
  };

  // Botón vista previa
  const verFactura = async (factura) => {
    try {
      const res = await api.get(`/facturas/${factura.id}`);
      setFacturaVista(res.data);
      setShowVista(true);
    } catch (err) {
      setFacturaVista(null);
      setShowVista(false);
      alert("Error al cargar la factura para vista previa.");
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
        className="bg-white shadow-sm rounded mb-4"
        style={{
          maxHeight: "400px",
          height: "300px", // 🔥 Altura fija para scroll vertical
          overflowY: "auto",
          overflowX: "auto", // 🔁 Scroll horizontal en celular
          border: "1px solid #dee2e6", // 🧱 Opcional para claridad visual
        }}
      >
        <Table
          striped
          bordered
          hover
          className="mb-0 sticky-header"
          style={{ minWidth: "800px" }} // ⬅️ Ancho mínimo para scroll horizontal
        >
          <thead className="table-primary sticky-top">
            <tr>
              <th>#</th>
              <th>Número Factura</th>
              <th>CAI</th>
              <th>Fecha</th>
              <th>Total (ISV)</th>

              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((f, index) => (
              <tr key={f.id}>
                <td>{index + 1}</td>
                <td>{f.numero_factura}</td>
                <td>{f.cai_codigo}</td>
                <td>{new Date(f.fecha_emision).toLocaleString("es-HN")}</td>
                <td>{parseFloat(f.total_factura).toFixed(2)} Lps</td>
                <td>
                  <Button
                    variant="info"
                    size="sm"
                    className="me-2"
                    title="Vista previa"
                    onClick={() => verFactura(f)}
                  >
                    <FaEye />
                  </Button>
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

      {/* Modal de Vista Previa */}
      <Modal
        show={showVista}
        onHide={() => setShowVista(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Vista previa de factura</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {facturaVista ? (
            <div>
              <h5>
                Factura #{facturaVista.numero_factura} |{" "}
                {facturaVista.cliente_nombre}
              </h5>

              <div className="mb-2">
                <b>Fecha:</b>{" "}
                {new Date(facturaVista.fecha_emision).toLocaleString()}
              </div>

              <div>
                <b>RTN:</b> {facturaVista.cliente_rtn || "N/A"} <br />
                <b>Dirección:</b> {facturaVista.cliente_direccion || "N/A"}
              </div>

              <hr />

              <div>
                <b>Detalle:</b>
                <ul>
                  {facturaVista.carrito &&
                    facturaVista.carrito.map((item, idx) => (
                      <li key={idx}>
                        {item.nombre} x {item.cantidad} &mdash; Lps{" "}
                        {parseFloat(item.precio).toFixed(2)}
                      </li>
                    ))}
                </ul>
              </div>

              <div className="mt-2">
                <b>Subtotal:</b> Lps{" "}
                {parseFloat(facturaVista.subtotal).toFixed(2)} <br />
                <b>Impuesto:</b> Lps{" "}
                {parseFloat(facturaVista.impuesto).toFixed(2)} <br />
                <b>Total:</b>{" "}
                <span className="fw-bold">
                  Lps {parseFloat(facturaVista.total).toFixed(2)}
                </span>
              </div>

              <hr />

              {facturaVista.metodo_pago === "efectivo" && (
                <div className="mt-2">
                  <b>Método de pago:</b> Efectivo <br />
                  <b>Efectivo recibido:</b> Lps{" "}
                  {parseFloat(facturaVista.efectivo).toFixed(2)} <br />
                  <b>Cambio entregado:</b> Lps{" "}
                  {parseFloat(facturaVista.cambio).toFixed(2)}
                </div>
              )}

              {facturaVista.metodo_pago === "tarjeta" && (
                <div className="mt-2">
                  <b>Método de pago:</b> Tarjeta
                </div>
              )}
            </div>
          ) : (
            <div>No se pudo cargar la factura.</div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVista(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
