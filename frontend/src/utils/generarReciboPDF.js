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

    autoTable(doc, {
      startY: posY,
      head: [["Cant", "Descripción", "P/U", "Total"]],
      body: carrito.map((item) => [
        item.cantidad,
        item.nombre.substring(0, 10),
        Number(item.precio).toFixed(2),
        (item.cantidad * Number(item.precio)).toFixed(2),
      ]),
      margin: { left: 10, right: 10 },
      styles: { fontSize: 8, halign: "center" },
      headStyles: { fillColor: [50, 50, 50], textColor: 255 },
    });

    posY = doc.lastAutoTable.finalY + 5;
    doc.line(10, posY, 70, posY);
    posY += 5;

    doc.setFontSize(8);
    doc.text(`Sub Total Exonerado: L 0.00`, 10, posY);
    posY += 4;
    doc.text(`Sub Total Exento: L 0.00`, 10, posY);
    posY += 4;
    doc.text(
      `Sub Total Gravado 15%: L ${Number(subtotal).toFixed(2)}`,
      10,
      posY
    );
    posY += 4;
    doc.text(`Sub Total Gravado 18%: L 0.00`, 10, posY);
    posY += 4;
    doc.text(`Descuentos/Rebajas: L 0.00`, 10, posY);
    posY += 4;
    doc.text(`Sub Total: L ${Number(subtotal).toFixed(2)}`, 10, posY);
    posY += 4;
    doc.text(`15% ISV: L ${Number(impuesto).toFixed(2)}`, 10, posY);
    posY += 4;
    doc.text(`18% ISV: L 0.00`, 10, posY);
    posY += 6;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(`TOTAL A PAGAR: L ${Number(total).toFixed(2)}`, 10, posY);
    posY += 8;

    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text("SU PAGO EFECTIVO: L", 10, posY);
    posY += 4;
    doc.text("SU CAMBIO: L", 10, posY);
    posY += 6;

    doc.setFont("helvetica", "italic");
    doc.text("Su cantidad a pagar es de:", 10, posY);
    posY += 4;
    doc.text(`"${convertirNumeroALetras(total)} Lempiras Exactos"`, 10, posY);
    posY += 8;

    doc.setFont("helvetica", "normal");
    doc.text("Registro SAG:", 10, posY);
    posY += 4;
    doc.text("Registro Exonerado:", 10, posY);
    posY += 4;
    doc.text("N° Orden Exoneración:", 10, posY);
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
