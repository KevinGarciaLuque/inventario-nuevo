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
  cai = {},
  cliente_nombre,
  cliente_rtn,
  cliente_direccion,
  metodoPago = "efectivo",
  efectivo = 0,
  cambio = 0,
  esCopia = false,
}) => {
  const alturaTotal = 150 + carrito.length * 10 + 100;
  const totalNumerico = Number(total || 0);

  const formatoLempiras = (valor) =>
    `L ${Number(valor).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, alturaTotal],
  });

  let posY = 10;
  const margenIzq = 10;
  const margenDer = 70;

  const img = new Image();
  img.src = logoImage;

  img.onload = () => {
    doc.addImage(img, "PNG", 20, posY, 40, 20);
    posY += 25;

    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("MERCADITO", 40, posY, { align: "center" });
    posY += 5;
    doc.text("CRISTIAN", 40, posY, { align: "center" });
    posY += 5;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Sucursal Tegucigalpa", 40, posY, { align: "center" });
    posY += 5;
    doc.text("RTN: 0801-1900-10000", 40, posY, { align: "center" });
    posY += 5;
    doc.text("Tel: (504) 9800-0000", 40, posY, { align: "center" });
    posY += 5;
    doc.line(10, posY, 70, posY);
    posY += 5;

    doc.setFontSize(8);
    doc.text(`CAI: ${cai.cai_codigo || "-"}`, 10, posY);
    posY += 4;
    doc.text(
      `Rango: ${cai.rango_inicio || "-"} - ${cai.rango_fin || "-"}`,
      10,
      posY
    );
    posY += 4;
    doc.text(`Autorizado: ${cai.fecha_autorizacion || "-"}`, 10, posY);
    posY += 4;
    doc.text(`Vence: ${cai.fecha_limite_emision || "-"}`, 10, posY);
    posY += 6;

    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("FACTURA", 40, posY, { align: "center" });
    posY += 5;

    if (esCopia) {
      doc.setFontSize(9);
      doc.setTextColor(255, 0, 0);
      doc.text("COPIA", 40, posY, { align: "center" });
      doc.setTextColor(0, 0, 0);
      posY += 5;
    }

    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(`No. ${numeroFactura}`, 10, posY);
    posY += 4;
    doc.text(`Fecha: ${new Date().toLocaleString("es-HN")}`, 10, posY);
    posY += 4;
    doc.text(`Cajero: ${user?.nombre || "Sistema"}`, 10, posY);
    posY += 4;
    doc.text(`Cliente: ${cliente_nombre || "Consumidor Final"}`, 10, posY);
    posY += 4;

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
      head: [["Cant", "Código", "Descripción", "P/U", "Total"]],
      body: carrito.map((item) => [
        item.cantidad,
        item.codigo || "-",
        item.nombre?.substring(0, 12) || "",
        item.precio ? Number(item.precio).toFixed(2) : "0.00",
        item.cantidad && item.precio
          ? (item.cantidad * item.precio).toFixed(2)
          : "0.00",
      ]),
      margin: { left: 3, right: 3 },
      styles: { fontSize: 7, halign: "center" },
      headStyles: { fillColor: [50, 50, 50], textColor: 255 },
    });

    posY = doc.lastAutoTable.finalY + 5;
    doc.line(10, posY, 70, posY);
    posY += 5;

    doc.setFontSize(8);
    doc.text("Subtotal Exonerado:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal Exento:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal Gravado 15%:", margenIzq, posY);
    doc.text(formatoLempiras(subtotal), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal Gravado 18%:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Descuentos/Rebajas:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal General:", margenIzq, posY);
    doc.text(formatoLempiras(subtotal), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("ISV 15%:", margenIzq, posY);
    doc.text(formatoLempiras(impuesto), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("ISV 18%:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 6;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("TOTAL A PAGAR:", margenIzq, posY);
    doc.text(formatoLempiras(totalNumerico), margenDer, posY, {
      align: "right",
    });
    posY += 6;

    doc.setFont("helvetica", "normal").setFontSize(8);
    const metodo = metodoPago.toLowerCase();
    doc.text(
      `Método de pago: ${metodo === "tarjeta" ? "Tarjeta" : "Efectivo"}`,
      margenIzq,
      posY
    );
    posY += 4;

    if (metodo === "efectivo") {
      doc.text(
        `Pago en efectivo: L ${Number(efectivo).toFixed(2)}`,
        margenIzq,
        posY
      );
      posY += 4;
      doc.text(
        `Cambio entregado: L ${Number(cambio).toFixed(2)}`,
        margenIzq,
        posY
      );
      posY += 4;
    } else if (metodo === "tarjeta") {
      doc.text("Pago realizado con tarjeta", margenIzq, posY);
      posY += 4;
    }

    posY += 4;
    doc.setFont("helvetica", "italic").setFontSize(8);
    doc.text("Su cantidad a pagar es de:", 40, posY, { align: "center" });
    posY += 4;

    const textoEnLetras = `"${convertirNumeroALetras(totalNumerico)} Exactos"`;
    const lineas = doc.splitTextToSize(textoEnLetras, 60); // Ajusta a 60mm
    lineas.forEach((linea) => {
      doc.text(linea, 40, posY, { align: "center" });
      posY += 4;
    });

    posY += 4;

    doc.setFont("helvetica", "bold");
    doc.text("*** GRACIAS POR SU COMPRA ***", 40, posY, { align: "center" });
    posY += 5;
    doc.text("La factura es beneficio de todos.", 40, posY, {
      align: "center",
    });
    posY += 5;
    doc.text("EXÍJALA", 40, posY, { align: "center" });

    window.open(doc.output("bloburl"), "_blank");
  };
};

// Convertidor a letras (sin cambios)
const convertirNumeroALetras = (numero) => {
  const unidades = [
    "",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
  ];
  const decenas = [
    "",
    "diez",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ];
  const especiales = {
    11: "once",
    12: "doce",
    13: "trece",
    14: "catorce",
    15: "quince",
    16: "dieciséis",
    17: "diecisiete",
    18: "dieciocho",
    19: "diecinueve",
  };
  const centenas = [
    "",
    "cien",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ];

  const convertir = (n) => {
    if (n === 0) return "cero";
    if (n === 100) return "cien";
    let letras = "";
    const mil = Math.floor(n / 1000);
    const restoMil = n % 1000;
    const cent = Math.floor(restoMil / 100);
    const dec = Math.floor((restoMil % 100) / 10);
    const uni = restoMil % 10;
    if (mil === 1) letras += "mil ";
    else if (mil > 1) letras += `${convertir(mil)} mil `;
    if (cent) letras += `${centenas[cent]} `;
    const decenasUnidades = restoMil % 100;
    if (especiales[decenasUnidades]) {
      letras += `${especiales[decenasUnidades]} `;
    } else {
      if (dec) {
        letras += `${decenas[dec]}`;
        if (uni) letras += ` y ${unidades[uni]} `;
      } else if (uni) {
        letras += `${unidades[uni]} `;
      }
    }
    return letras.trim();
  };

  const parteEntera = Math.floor(numero);
  const parteDecimal = Math.round((numero - parteEntera) * 100);
  let resultado = `${convertir(parteEntera)} Lempiras`;
  if (parteDecimal > 0) resultado += ` con ${convertir(parteDecimal)} centavos`;
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
};

export default generarReciboPDF;
