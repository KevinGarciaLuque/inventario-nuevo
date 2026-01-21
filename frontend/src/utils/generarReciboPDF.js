// frontend/src/utils/generarReciboPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../assets/logo.png";

/**
 * ✅ Recibo/Factura 80mm (ISV incluido en precios)
 * - NO recalcula subtotal/impuesto/total (usa lo que ya calculaste)
 * - Soporta descuentos por producto (precio_unitario / precio_final)
 * - Soporta descuento por cliente (descuentoCliente) si lo envías
 * - Soporta COPIA
 * - Método de pago efectivo/tarjeta
 * - Cliente: nombre, RTN, teléfono, dirección
 */
const generarReciboPDF = ({
  numeroFactura,
  carrito = [],

  // totales ya calculados (del hook/backend)
  subtotal = 0,
  impuesto = 0,
  total = 0,

  // extras opcionales
  subtotalBruto = 0,
  descuentoTotal = 0, // descuento productos (si lo envías)
  totalSinDescCliente = null,
  descuentoCliente = 0,
  descuentoClienteNombre = "",

  user,
  cai = {},

  cliente_nombre,
  cliente_rtn,
  cliente_telefono, // ✅ NUEVO
  cliente_direccion,

  metodoPago = "efectivo",
  efectivo = 0,
  cambio = 0,

  esCopia = false,
}) => {
  const formatoLempiras = (valor) =>
    `L ${Number(valor || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const round2 = (n) => Number((Number(n) || 0).toFixed(2));
  const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  // ✅ Totales (no recalculamos impuesto/subtotal aquí; ya vienen listos)
  const totalNumerico = round2(safeNum(total));
  const subtotalNumerico = round2(safeNum(subtotal));
  const impuestoNumerico = round2(safeNum(impuesto));

  // ✅ Descuento por producto (si NO lo mandas, lo calculamos desde carrito)
  const descuentoProductosCalculado = round2(
    carrito.reduce((acc, item) => {
      const cant = safeNum(item.cantidad);
      const pu = safeNum(item.precio_unitario ?? item.precio); // base
      const pf = safeNum(item.precio_final ?? item.precio); // final con desc
      return acc + cant * Math.max(0, pu - pf);
    }, 0),
  );

  const descuentoProductosFinal =
    round2(safeNum(descuentoTotal)) > 0
      ? round2(safeNum(descuentoTotal))
      : descuentoProductosCalculado;

  const descuentoClienteFinal = round2(safeNum(descuentoCliente));

  // ✅ Descuento total a mostrar
  const descuentosRebajas = round2(
    Math.max(0, descuentoProductosFinal + descuentoClienteFinal),
  );

  // ✅ Para “Total antes de desc cliente” si lo quieres mostrar
  const totalAntesDescCliente =
    totalSinDescCliente != null
      ? round2(safeNum(totalSinDescCliente))
      : round2(totalNumerico + descuentoClienteFinal);

  // ✅ Altura dinámica del ticket
  const alturaBase = 185;
  const alturaFila = 8;
  const alturaTotal = alturaBase + carrito.length * alturaFila + 70;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, alturaTotal],
  });

  let posY = 8;
  const margenIzq = 10;
  const margenDer = 70;

  const renderRecibo = (conLogo) => {
    // ==========================
    // LOGO
    // ==========================
    if (conLogo) {
      try {
        doc.addImage(conLogo, "PNG", 10, posY, 60, 28);
        posY += 32;
      } catch {
        // si falla addImage, seguimos sin logo
        posY += 2;
      }
    }

    // ==========================
    // ENCABEZADO
    // ==========================
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("Sistema", 40, posY, { align: "center" });
    posY += 5;
    doc.text("Inventario", 40, posY, { align: "center" });
    posY += 6;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Sucursal Tegucigalpa", 40, posY, { align: "center" });
    posY += 4;
    doc.text("RTN: 0801-1900-10000", 40, posY, { align: "center" });
    posY += 4;
    doc.text("Tel: (504) 9800-0000", 40, posY, { align: "center" });
    posY += 4;

    doc.line(10, posY, 70, posY);
    posY += 5;

    // ==========================
    // CAI
    // ==========================
    doc.setFontSize(8);
    doc.text(`CAI: ${cai.cai_codigo || "-"}`, margenIzq, posY);
    posY += 4;
    doc.text(
      `Rango: ${cai.rango_inicio || "-"} - ${cai.rango_fin || "-"}`,
      margenIzq,
      posY,
    );
    posY += 4;
    doc.text(`Autorizado: ${cai.fecha_autorizacion || "-"}`, margenIzq, posY);
    posY += 4;
    doc.text(`Vence: ${cai.fecha_limite_emision || "-"}`, margenIzq, posY);
    posY += 6;

    // ==========================
    // TÍTULO
    // ==========================
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("FACTURA", 40, posY, { align: "center" });
    posY += 5;

    if (esCopia) {
      doc.setFontSize(9);
      doc.setTextColor(220, 53, 69); // rojo bootstrap
      doc.text("COPIA", 40, posY, { align: "center" });
      doc.setTextColor(0, 0, 0);
      posY += 5;
    }

    // ==========================
    // DATOS FACTURA/CLIENTE
    // ==========================
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(`No. ${numeroFactura || "-"}`, margenIzq, posY);
    posY += 4;
    doc.text(`Fecha: ${new Date().toLocaleString("es-HN")}`, margenIzq, posY);
    posY += 4;
    doc.text(`Cajero: ${user?.nombre || "Sistema"}`, margenIzq, posY);
    posY += 4;

    doc.text(
      `Cliente: ${cliente_nombre || "Consumidor Final"}`,
      margenIzq,
      posY,
    );
    posY += 4;

    if (cliente_rtn) {
      doc.text(`RTN: ${cliente_rtn}`, margenIzq, posY);
      posY += 4;
    }

    if (cliente_telefono) {
      doc.text(`Tel: ${cliente_telefono}`, margenIzq, posY);
      posY += 4;
    }

    if (cliente_direccion) {
      const lineasDir = doc.splitTextToSize(
        `Dirección: ${cliente_direccion}`,
        58,
      );
      lineasDir.forEach((ln) => {
        doc.text(ln, margenIzq, posY);
        posY += 4;
      });
    }

    doc.line(10, posY, 70, posY);
    posY += 4;

    // ==========================
    // DETALLE (TABLA)
    // ==========================
    const body = carrito.map((item) => {
      const cant = safeNum(item.cantidad);
      const codigo = item.codigo || "-";

      const pu = safeNum(item.precio_unitario ?? item.precio);
      const pf = safeNum(item.precio_final ?? item.precio);

      const totalLinea = round2(cant * pf);

      const nombre = String(item.nombre || item.descripcion || "").trim();
      const descCorta = nombre.length > 14 ? `${nombre.slice(0, 14)}…` : nombre;

      return [
        String(cant),
        String(codigo).slice(0, 10),
        descCorta,
        round2(pf).toFixed(2),
        totalLinea.toFixed(2),
      ];
    });

    autoTable(doc, {
      startY: posY,
      head: [["Cant", "Código", "Descripción", "P/U", "Total"]],
      body,
      margin: { left: 3, right: 3 },
      styles: { fontSize: 7, halign: "center", cellPadding: 1 },
      headStyles: { fillColor: [50, 50, 50], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 9 },
        1: { cellWidth: 16 },
        2: { cellWidth: 25, halign: "left" },
        3: { cellWidth: 12 },
        4: { cellWidth: 15 },
      },
    });

    posY = doc.lastAutoTable.finalY + 4;

    doc.line(10, posY, 70, posY);
    posY += 5;

    // ==========================
    // TOTALES (ISV incluido)
    // ==========================
    doc.setFont("helvetica", "normal").setFontSize(8);

    doc.text("Subtotal Exonerado:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal Exento:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal Gravado 15%:", margenIzq, posY);
    doc.text(formatoLempiras(subtotalNumerico), margenDer, posY, {
      align: "right",
    });
    posY += 4;

    doc.text("Subtotal Gravado 18%:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    // ✅ Descuentos/Rebajas (productos + cliente)
    doc.text("Descuentos/Rebajas:", margenIzq, posY);
    doc.text(formatoLempiras(descuentosRebajas), margenDer, posY, {
      align: "right",
    });
    posY += 4;

    // ✅ Si hubo descuento por cliente, lo mostramos con nombre (opcional)
    if (descuentoClienteFinal > 0) {
      const label = descuentoClienteNombre?.trim()
        ? `Desc. cliente (${descuentoClienteNombre}):`
        : "Desc. cliente:";
      doc.text(label, margenIzq, posY);
      doc.text(formatoLempiras(descuentoClienteFinal), margenDer, posY, {
        align: "right",
      });
      posY += 4;

      doc.text("Total antes desc. cliente:", margenIzq, posY);
      doc.text(formatoLempiras(totalAntesDescCliente), margenDer, posY, {
        align: "right",
      });
      posY += 4;
    }

    doc.text("Subtotal General:", margenIzq, posY);
    doc.text(formatoLempiras(subtotalNumerico), margenDer, posY, {
      align: "right",
    });
    posY += 4;

    doc.text("ISV 15%:", margenIzq, posY);
    doc.text(formatoLempiras(impuestoNumerico), margenDer, posY, {
      align: "right",
    });
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

    // ==========================
    // MÉTODO DE PAGO
    // ==========================
    doc.setFont("helvetica", "normal").setFontSize(8);
    const metodo = String(metodoPago || "efectivo").toLowerCase();

    doc.text(
      `Método de pago: ${metodo === "tarjeta" ? "Tarjeta" : "Efectivo"}`,
      margenIzq,
      posY,
    );
    posY += 4;

    if (metodo === "efectivo") {
      doc.text(
        `Pago en efectivo: ${formatoLempiras(efectivo)}`,
        margenIzq,
        posY,
      );
      posY += 4;
      doc.text(`Cambio entregado: ${formatoLempiras(cambio)}`, margenIzq, posY);
      posY += 4;
    } else {
      doc.text("Pago realizado con tarjeta", margenIzq, posY);
      posY += 4;
    }

    posY += 3;
    doc.line(10, posY, 70, posY);
    posY += 5;

    // ==========================
    // TOTAL EN LETRAS (multi-línea centrado)
    // ==========================
    doc.setFont("helvetica", "italic").setFontSize(8);
    doc.text("Su cantidad a pagar es de:", 40, posY, { align: "center" });
    posY += 4;

    const textoEnLetras = `"${convertirNumeroALetras(totalNumerico)} Exactos"`;
    const lineas = doc.splitTextToSize(textoEnLetras, 60);
    lineas.forEach((linea) => {
      doc.text(linea, 40, posY, { align: "center" });
      posY += 4;
    });

    posY += 8;

    // ==========================
    // PIE
    // ==========================
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text("*** GRACIAS POR SU COMPRA ***", 40, posY, { align: "center" });
    posY += 6;

    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text("La factura es beneficio de todos.", 40, posY, {
      align: "center",
    });
    posY += 4;

    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text("EXÍJALA", 40, posY, { align: "center" });

    window.open(doc.output("bloburl"), "_blank");
  };

  // ==========================
  // CARGA LOGO con fallback
  // ==========================
  const img = new Image();
  img.src = logoImage;

  img.onload = () => {
    renderRecibo(img);
  };

  img.onerror = () => {
    console.warn("⚠️ No se pudo cargar el logo, generando recibo sin imagen.");
    renderRecibo(null);
  };
};

// Convertidor a letras
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

  const convertir = (n) => {
    if (n === 0) return "cero";
    if (n === 100) return "cien";

    let letras = "";

    const miles = Math.floor(n / 1000);
    const resto = n % 1000;

    if (miles === 1) letras += "mil ";
    else if (miles > 1) letras += `${convertir(miles)} mil `;

    const centena = Math.floor(resto / 100);
    const restoCentena = resto % 100;

    if (centena > 0) letras += `${centenas[centena]} `;

    if (especiales[restoCentena]) {
      letras += `${especiales[restoCentena]} `;
    } else {
      const dec = Math.floor(restoCentena / 10);
      const uni = restoCentena % 10;

      if (dec > 0) {
        letras += decenas[dec];
        if (uni > 0) letras += ` y ${unidades[uni]} `;
        else letras += " ";
      } else if (uni > 0) {
        letras += `${unidades[uni]} `;
      }
    }

    return letras.trim();
  };

  const parteEntera = Math.floor(Number(numero) || 0);
  const parteDecimal = Math.round(((Number(numero) || 0) - parteEntera) * 100);

  let resultado = `${convertir(parteEntera)} Lempiras`;

  if (parteDecimal > 0) {
    resultado += ` con ${convertir(parteDecimal)} centavos`;
  }

  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
};

export default generarReciboPDF;
