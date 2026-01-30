import { useEffect, useMemo, useState } from "react";
import { Button, Form, InputGroup, Modal, Table } from "react-bootstrap";
import { FaBroom, FaEye, FaPrint } from "react-icons/fa";
import api from "../api/axios";
import generarReciboPDF from "../utils/generarReciboPDF";

export default function FacturasPage() {
  const [facturas, setFacturas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // Vista previa
  const [showVista, setShowVista] = useState(false);
  const [facturaVista, setFacturaVista] = useState(null);

  // Evita doble click de impresión
  const [imprimiendoId, setImprimiendoId] = useState(null);

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    try {
      const res = await api.get("/facturas");
      setFacturas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setFacturas([]);
    }
  };

  const filtradas = useMemo(() => {
    const q = String(busqueda || "")
      .toLowerCase()
      .trim();
    if (!q) return facturas;

    return facturas.filter((f) => {
      const num = String(f?.numero_factura ?? "").toLowerCase();
      const cai = String(f?.cai_codigo ?? "").toLowerCase();
      return num.includes(q) || cai.includes(q);
    });
  }, [facturas, busqueda]);

  // ✅ Imprimir (COPIA) usando autoImprimir
  const manejarImpresion = async (factura) => {
    if (!factura?.id) return;
    if (imprimiendoId === factura.id) return;

    try {
      setImprimiendoId(factura.id);

      const res = await api.get(`/facturas/${factura.id}`);
      const datosFactura = res.data || {};

      // Normaliza carrito para el recibo (por si el backend manda "precio")
      const carritoNormalizado = Array.isArray(datosFactura.carrito)
        ? datosFactura.carrito.map((it) => ({
            ...it,
            // si no trae precio_final, caemos a precio
            precio_final: it?.precio_final ?? it?.precio ?? 0,
            precio_unitario: it?.precio_unitario ?? it?.precio ?? 0,
          }))
        : [];

      generarReciboPDF({
        numeroFactura: datosFactura.numero_factura,
        carrito: carritoNormalizado,

        subtotal: Number(datosFactura.subtotal) || 0,
        impuesto: Number(datosFactura.impuesto) || 0,
        total: Number(datosFactura.total) || 0,

        user: datosFactura.user,
        cai: datosFactura.cai,

        cliente_nombre: datosFactura.cliente_nombre || "Consumidor Final",
        cliente_rtn: datosFactura.cliente_rtn || "",
        cliente_telefono: datosFactura.cliente_telefono || "",
        cliente_direccion: datosFactura.cliente_direccion || "",

        metodoPago: datosFactura.metodo_pago || "efectivo",
        efectivo: Number(datosFactura.efectivo) || 0,
        cambio: Number(datosFactura.cambio) || 0,

        esCopia: true,

        // ✅ NUEVO: imprimir directo
        autoImprimir: true,
        abrirEnNuevaPestana: false,
      });
    } catch (error) {
      console.error("Error al generar/imprimir el PDF:", error);
      alert("Error al generar/imprimir el recibo.");
    } finally {
      // suelta bloqueo un poco después (por popups/print)
      setTimeout(() => setImprimiendoId(null), 800);
    }
  };

  // Vista previa
  const verFactura = async (factura) => {
    try {
      const res = await api.get(`/facturas/${factura.id}`);
      setFacturaVista(res.data);
      setShowVista(true);
    } catch (err) {
      console.error(err);
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
          title="Limpiar búsqueda"
        >
          <FaBroom className="me-2" /> Limpiar
        </Button>
      </InputGroup>

      <div
        className="bg-white shadow-sm rounded mb-4"
        style={{
          maxHeight: "400px",
          height: "300px",
          overflowY: "auto",
          overflowX: "auto",
          border: "1px solid #dee2e6",
        }}
      >
        <Table
          striped
          bordered
          hover
          className="mb-0 sticky-header"
          style={{ minWidth: "800px" }}
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
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  No hay facturas para mostrar.
                </td>
              </tr>
            ) : (
              filtradas.map((f, index) => (
                <tr key={f.id}>
                  <td>{index + 1}</td>
                  <td>{f.numero_factura}</td>
                  <td>{f.cai_codigo}</td>
                  <td>
                    {f.fecha_emision
                      ? new Date(f.fecha_emision).toLocaleString("es-HN")
                      : "-"}
                  </td>
                  <td>{Number(f.total_factura || 0).toFixed(2)} Lps</td>
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
                      disabled={imprimiendoId === f.id}
                      title="Imprimir recibo (copia)"
                    >
                      <FaPrint className="me-1" />
                      {imprimiendoId === f.id ? "Imprimiendo..." : "Imprimir"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
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
                {facturaVista.cliente_nombre || "Consumidor Final"}
              </h5>

              <div className="mb-2">
                <b>Fecha:</b>{" "}
                {facturaVista.fecha_emision
                  ? new Date(facturaVista.fecha_emision).toLocaleString("es-HN")
                  : "-"}
              </div>

              <div>
                <b>RTN:</b> {facturaVista.cliente_rtn || "N/A"} <br />
                <b>Dirección:</b> {facturaVista.cliente_direccion || "N/A"}
              </div>

              <hr />

              <div>
                <b>Detalle:</b>
                <ul className="mb-2">
                  {Array.isArray(facturaVista.carrito) &&
                    facturaVista.carrito.map((item, idx) => (
                      <li key={idx}>
                        {item.nombre || "Producto"} x{" "}
                        {Number(item.cantidad || 0)} — Lps{" "}
                        {Number(item.precio_final ?? item.precio ?? 0).toFixed(
                          2,
                        )}
                      </li>
                    ))}
                </ul>
              </div>

              <div className="mt-2">
                <b>Subtotal:</b> Lps{" "}
                {Number(facturaVista.subtotal || 0).toFixed(2)} <br />
                <b>Impuesto:</b> Lps{" "}
                {Number(facturaVista.impuesto || 0).toFixed(2)} <br />
                <b>Total:</b>{" "}
                <span className="fw-bold">
                  Lps {Number(facturaVista.total || 0).toFixed(2)}
                </span>
              </div>

              <hr />

              {String(facturaVista.metodo_pago || "").toLowerCase() ===
                "efectivo" && (
                <div className="mt-2">
                  <b>Método de pago:</b> Efectivo <br />
                  <b>Efectivo recibido:</b> Lps{" "}
                  {Number(facturaVista.efectivo || 0).toFixed(2)} <br />
                  <b>Cambio entregado:</b> Lps{" "}
                  {Number(facturaVista.cambio || 0).toFixed(2)}
                </div>
              )}

              {String(facturaVista.metodo_pago || "").toLowerCase() ===
                "tarjeta" && (
                <div className="mt-2">
                  <b>Método de pago:</b> Tarjeta
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted">No se pudo cargar la factura.</div>
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
