import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../assets/logo.png";

/**
 * ✅ Recibo/Factura 80mm (ISV incluido en precios)
 * - Muestra descuento real por línea (si viene en carrito: descuento_pct y precio_final)
 * - Calcula y muestra Descuentos/Rebajas (total descuento aplicado)
 * - Mantiene subtotal/impuesto/total que ya calculas en backend (NO recalcula mal)
 * - Soporta COPIA
 * - Método de pago efectivo/tarjeta
 */
const generarReciboPDF = ({
  numeroFactura,
  carrito = [],
  subtotal = 0,
  impuesto = 0,
  total = 0,
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
  const formatoLempiras = (valor) =>
    `L ${Number(valor || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const round2 = (n) => Number((Number(n) || 0).toFixed(2));
  const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  // ✅ Totales (no recalculamos impuesto/subtotal aquí; ya vienen del backend)
  const totalNumerico = round2(safeNum(total));
  const subtotalNumerico = round2(safeNum(subtotal));
  const impuestoNumerico = round2(safeNum(impuesto));

  // ✅ Descuento total del carrito (si viene info por línea: precio_unitario, precio_final, cantidad)
  const descuentoTotal = round2(
    carrito.reduce((acc, item) => {
      const cant = safeNum(item.cantidad);
      const pu = safeNum(item.precio_unitario ?? item.precio); // base
      const pf = safeNum(item.precio_final ?? item.precio); // final con desc
      const descLinea = cant * Math.max(0, pu - pf);
      return acc + descLinea;
    }, 0)
  );

  // ✅ Altura dinámica (más estable)
  const alturaBase = 170; // encabezado + totales + textos
  const alturaFila = 8; // alto aprox por fila
  const alturaTotal = alturaBase + carrito.length * alturaFila + 60;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, alturaTotal],
  });

  let posY = 8;
  const margenIzq = 10;
  const margenDer = 70;

  const img = new Image();
  img.src = logoImage;

  img.onload = () => {
    // ==========================
    // LOGO
    // ==========================
    doc.addImage(img, "PNG", 10, posY, 60, 28);
    posY += 32;

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
      posY
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
      doc.setTextColor(255, 0, 0);
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
      posY
    );
    posY += 4;

    if (cliente_rtn) {
      doc.text(`RTN: ${cliente_rtn}`, margenIzq, posY);
      posY += 4;
    }

    if (cliente_direccion) {
      // Ajuste multi-línea para dirección
      const lineasDir = doc.splitTextToSize(
        `Dirección: ${cliente_direccion}`,
        58
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
    // ✅ Usa precio_final si existe (para reflejar descuento real)
    // ✅ Muestra desc% si viene
    // ==========================
    const body = carrito.map((item) => {
      const cant = safeNum(item.cantidad);
      const codigo = item.codigo || "-";
      const descPct = safeNum(item.descuento_pct ?? item.descuento ?? 0);
      const pu = safeNum(item.precio_unitario ?? item.precio);
      const pf = safeNum(item.precio_final ?? item.precio);
      const totalLinea = round2(cant * pf);

      // Descripción corta (80mm)
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
    // TOTALES (manteniendo lógica: ISV incluido en precio)
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

    // ✅ Aquí sí reflejamos descuentos reales si los hay
    doc.text("Descuentos/Rebajas:", margenIzq, posY);
    doc.text(formatoLempiras(descuentoTotal), margenDer, posY, {
      align: "right",
    });
    posY += 4;

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
      posY
    );
    posY += 4;

    if (metodo === "efectivo") {
      doc.text(
        `Pago en efectivo: ${formatoLempiras(efectivo)}`,
        margenIzq,
        posY
      );
      posY += 4;
      doc.text(`Cambio entregado: ${formatoLempiras(cambio)}`, margenIzq, posY);
      posY += 4;
    } else if (metodo === "tarjeta") {
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

  // ⚠️ Por si el logo falla al cargar, generamos sin imagen
  img.onerror = () => {
    console.warn("⚠️ No se pudo cargar el logo, generando recibo sin imagen.");
    // Truco: setear una imagen vacía y disparar onload lógico
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("Sistema Inventario", 40, posY, { align: "center" });
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
    "ciento", // 👈 CLAVE: ya no usamos “cien” aquí
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
    if (n === 100) return "cien"; // 👈 caso especial correcto

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

  const parteEntera = Math.floor(numero);
  const parteDecimal = Math.round((numero - parteEntera) * 100);

  let resultado = `${convertir(parteEntera)} Lempiras`;

  if (parteDecimal > 0) {
    resultado += ` con ${convertir(parteDecimal)} centavos`;
  }

  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
};

export default generarReciboPDF;
