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
    doc.text("INVENTARIO", 40, posY, { align: "center" });
    posY += 5;
    doc.text("CAFE", 40, posY, { align: "center" });
    posY += 5;
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Sucursal Tegucigalpa", 40, posY, { align: "center" });
    posY += 5;
    doc.text("RTN: XXX-XXXX-XXXX", 40, posY, { align: "center" });
    posY += 5;
    doc.text("Tel: (504) 9873-6249", 40, posY, { align: "center" });
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

    // Mostrar nombre del cliente o "Consumidor Final"
    if (cliente_nombre) {
      doc.text(`Cliente: ${cliente_nombre}`, 10, posY);
    } else {
      doc.text(`Cliente: Consumidor Final`, 10, posY);
    }
    posY += 4;

    // Mostrar RTN solo si existe
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
    doc.text("SU PAGO EFECTIVO: L", 10, posY);
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
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ];

  const parteEntera = Math.floor(numero);
  const parteDecimal = Math.round((numero - parteEntera) * 100);

  const convertir = (n) => {
    if (n === 0) return "cero";
    if (n === 100) return "cien";

    let letras = "";
    const mil = Math.floor(n / 1000);
    const restoMil = n % 1000;
    const cent = Math.floor(restoMil / 100);
    const dec = Math.floor((restoMil % 100) / 10);
    const uni = restoMil % 10;

    if (mil === 1) {
      letras += "mil ";
    } else if (mil > 1) {
      letras += `${convertir(mil)} mil `;
    }

    if (cent) letras += `${centenas[cent]} `;

    const decenasUnidades = restoMil % 100;

    if (decenasUnidades >= 11 && decenasUnidades <= 19) {
      letras += `${especiales[decenasUnidades]} `;
    } else {
      if (dec) {
        letras += `${decenas[dec]}`;
        if (uni) letras += ` y `;
      }
      if (uni && !(decenasUnidades >= 11 && decenasUnidades <= 19)) {
        letras += `${unidades[uni]} `;
      }
    }

    return letras.trim();
  };

  let resultado = `${convertir(parteEntera)} Lempiras`;

  if (parteDecimal > 0) {
    resultado += ` con ${convertir(parteDecimal)} centavos`;
  }

  resultado = resultado.charAt(0).toUpperCase() + resultado.slice(1);
  return resultado;
};


export default generarReciboPDF;
