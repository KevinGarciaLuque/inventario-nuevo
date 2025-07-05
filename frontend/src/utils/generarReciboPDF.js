import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../assets/logo.png";

const generarReciboPDF = ({
  numeroFactura,
  carrito,
  subtotal,
  impuesto,
  total,
  user,
  cai,
  cliente_nombre,
  cliente_rtn,
  cliente_direccion,
}) => {
  const alturaTotal = 150 + carrito.length * 10 + 100;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, alturaTotal],
  });

  let posY = 10;
  const anchoRecibo = 80;
  const margenIzq = 10;
  const margenDer = anchoRecibo - 10;

  const img = new Image();
  img.src = logoImage;

  img.onload = () => {
    doc.addImage(img, "PNG", 20, posY, 40, 20);
    posY += 25;

    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("MOTO REPUESTOS S.A.", 40, posY, { align: "center" });
    posY += 5;
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Sucursal Tegucigalpa", 40, posY, { align: "center" });
    posY += 5;
    doc.text("RTN: 08011999123456", 40, posY, { align: "center" });
    posY += 5;
    doc.text("Tel: (504) 2222-3333", 40, posY, { align: "center" });
    posY += 5;
    doc.line(10, posY, 70, posY);
    posY += 5;

    doc.setFontSize(8);
    doc.text(`CAI: ${cai.cai_codigo}`, 10, posY);
    posY += 4;
    doc.text(`Rango: ${cai.rango_inicio} - ${cai.rango_fin}`, 10, posY);
    posY += 4;
    doc.text(`Autorizado: ${cai.fecha_autorizacion}`, 10, posY);
    posY += 4;
    doc.text(`Vence: ${cai.fecha_limite_emision}`, 10, posY);
    posY += 6;

    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("FACTURA", 40, posY, { align: "center" });
    posY += 5;

    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(`No. ${numeroFactura}`, 10, posY);
    posY += 4;
    doc.text(`Fecha: ${new Date().toLocaleString("es-HN")}`, 10, posY);
    posY += 4;
    doc.text(`Cajero: ${user.nombre}`, 10, posY);
    posY += 4;

    if (cliente_nombre) {
      doc.text(`Cliente: ${cliente_nombre}`, 10, posY);
      posY += 4;
    }
    if (cliente_rtn) {
      doc.text(`RTN: ${cliente_rtn}`, 10, posY);
      posY += 4;
    }
    if (cliente_direccion) {
      doc.text(`Dirección: ${cliente_direccion}`, 10, posY);
      posY += 4;
    }

    doc.line(10, posY, 70, posY);
    posY += 5;

    // Tabla con Código de Producto
    autoTable(doc, {
      startY: posY,
      head: [["Cant", "Código", "Descripción", "P/U", "Total"]],
      body: carrito.map((item) => [
        item.cantidad,
        item.codigo ? String(item.codigo) : "-",
        item.nombre ? item.nombre.substring(0, 12) : "",
        item.precio ? Number(item.precio).toFixed(2) : "0.00",
        item.cantidad && item.precio
          ? (item.cantidad * Number(item.precio)).toFixed(2)
          : "0.00",
      ]),
      margin: { left: 3, right: 3 }, // Tus márgenes personalizados
      styles: { fontSize: 7, halign: "center" },
      headStyles: { fillColor: [50, 50, 50], textColor: 255 },
    });

    posY = doc.lastAutoTable.finalY + 5;
    doc.line(10, posY, 70, posY);
    posY += 5;

    // Alinea valores a la derecha
    doc.setFont("helvetica", "normal").setFontSize(8);

    doc.text("Sub Total Exonerado:", margenIzq, posY);
    doc.text(`L 0.00`, margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Sub Total Exento:", margenIzq, posY);
    doc.text(`L 0.00`, margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Sub Total Gravado 15%:", margenIzq, posY);
    doc.text(`L ${Number(subtotal).toFixed(2)}`, margenDer, posY, {
      align: "right",
    });
    posY += 4;

    doc.text("Sub Total Gravado 18%:", margenIzq, posY);
    doc.text(`L 0.00`, margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Descuentos/Rebajas:", margenIzq, posY);
    doc.text(`L 0.00`, margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Sub Total:", margenIzq, posY);
    doc.text(`L ${Number(subtotal).toFixed(2)}`, margenDer, posY, {
      align: "right",
    });
    posY += 4;

    doc.text("15% ISV:", margenIzq, posY);
    doc.text(`L ${Number(impuesto).toFixed(2)}`, margenDer, posY, {
      align: "right",
    });
    posY += 4;

    doc.text("18% ISV:", margenIzq, posY);
    doc.text(`L 0.00`, margenDer, posY, { align: "right" });
    posY += 6;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(`TOTAL A PAGAR:`, margenIzq, posY);
    doc.text(`L ${Number(total).toFixed(2)}`, margenDer, posY, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    posY += 8;

    doc.setFontSize(8);
    doc.text("SU PAGO EFECTIVO: L", 10, posY, );
    posY += 4;
    doc.text("SU CAMBIO: L", 10, posY);
    posY += 6;

    doc.setFont("helvetica", "italic");
    doc.text("Su cantidad a pagar es de:", 10, posY);
    posY += 4;
    doc.text(`"${convertirNumeroALetras(total)} Lempiras Exactos"`, 10, posY);
    posY += 8;

  

    doc.setFont("helvetica", "bold");
    doc.text("*** GRACIAS POR SU COMPRA ***", 40, posY, { align: "center" });
    posY += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Original - Cliente", 10, posY);
    posY += 4;
    doc.text("Copia Amarilla - Contabilidad", 10, posY);
    posY += 4;
    doc.text("Copia Rosada - Obligación Tributaria", 10, posY);
    posY += 5;
    doc.setFont("helvetica", "bold");
    doc.text("La factura es beneficio de todos.", 40, posY, {
      align: "center",
    });
    posY += 5;
    doc.text("EXÍJALA", 40, posY, { align: "center" });

    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };
};

// Convertidor simple (puedes personalizarlo con lógica real después)
const convertirNumeroALetras = (numero) => {
  return "Un mil seiscientos seis";
};

export default generarReciboPDF;
