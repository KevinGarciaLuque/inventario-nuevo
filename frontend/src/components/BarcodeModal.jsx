import { useEffect, useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import JsBarcode from "jsbarcode";
import { FaPrint } from "react-icons/fa";

export default function BarcodeModal({ show, onHide, producto }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (show && producto?.codigo && svgRef.current) {
      JsBarcode(svgRef.current, producto.codigo, {
        format: "CODE128",
        width: 2,
        height: 70,
        displayValue: true,
        fontSize: 16,
        margin: 10,
      });
    }
  }, [show, producto]);

  const handleImprimir = () => {
    if (!svgRef.current) return;

    const svgMarkup = svgRef.current.outerHTML;
    const ventana = window.open("", "_blank", "width=420,height=340");
    if (!ventana) return;

    ventana.document.write(`
      <html>
        <head>
          <title>Código de barras</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 24px;
            }
            h5 { margin: 0 0 12px; font-size: 16px; }
          </style>
        </head>
        <body>
          <h5>${producto?.nombre || ""}</h5>
          ${svgMarkup}
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Código de barras</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <div className="fw-semibold mb-3">{producto?.nombre}</div>
        <svg ref={svgRef}></svg>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
        <Button variant="primary" onClick={handleImprimir}>
          <FaPrint className="me-2" />
          Imprimir
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
