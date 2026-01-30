// frontend/src/utils/generarReciboPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../assets/logo.png";

/**
 * ✅ Recibo/Factura 80mm (ISV incluido en precios)
 * - NO recalcula subtotal/impuesto/total (usa lo que ya calculaste)
 * - Soporta descuentos por producto (precio_unitario / precio_final)
 * - Soporta descuento por cliente (descuentoCliente)
 * - Soporta COPIA
 * - Método de pago efectivo/tarjeta
 * - Cliente: nombre, RTN, teléfono, dirección
 *
 * ✅ MEJORAS:
 * - Márgenes 4mm izquierda/derecha
 * - Alto del recibo calculado en 2 PASADAS (para que NO se corte el final)
 * - Opción autoImprimir: abre el diálogo de impresión automáticamente
 */
// utils/generarReciboPDF.js
// ✅ Mantiene tus tamaños/colores tal cual (fonts 12/11/10/9, header negro, etc.)
// ✅ Solo corrige el bloque de TOTALES para que salga ISV 15% y ISV 18% (y bases gravadas)
// ✅ Usa impuestosDetalle si viene; si no, cae al impuesto/subtotal que ya mandas.

const generarReciboPDF = ({
  numeroFactura,
  carrito = [],

  // totales ya calculados
  subtotal = 0,
  impuesto = 0,
  total = 0,
  impuestosDetalle = null, // ✅ NUEVO

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
  cliente_telefono,
  cliente_direccion,

  metodoPago = "efectivo",
  efectivo = 0,
  cambio = 0,

  esCopia = false,

  /**
   * ✅ NUEVO:
   * - autoImprimir: si true, abre el print dialog automáticamente
   * - abrirEnNuevaPestana: si true y autoImprimir=false, abre el PDF en pestaña nueva (como antes)
   */
  autoImprimir = false,
  abrirEnNuevaPestana = true,
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
      const pu = safeNum(item.precio_unitario ?? item.precio);
      const pf = safeNum(item.precio_final ?? item.precio);
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

  // ✅ Para “Total antes de desc cliente”
  const totalAntesDescCliente =
    totalSinDescCliente != null
      ? round2(safeNum(totalSinDescCliente))
      : round2(totalNumerico + descuentoClienteFinal);

  // ==========================
  // ✅ IMPUESTOS DESDE DETALLE (15% / 18% / otros)
  // ==========================
  const getPctFromLabel = (label) =>
    Number(String(label || "").match(/(\d+(\.\d+)?)/)?.[1] || 0);

  const normalizarEtiquetaImpuesto = (nombre) => {
    const limpio = String(nombre || "")
      .replace(":", "")
      .trim();
    if (!limpio) return "Impuesto";
    if (/^isv/i.test(limpio)) return limpio;
    const pct = getPctFromLabel(limpio);
    return pct ? `ISV ${pct}%` : limpio;
  };

  const impuestosObj =
    impuestosDetalle && typeof impuestosDetalle === "object"
      ? impuestosDetalle
      : {};

  const hayDetalleImpuestos = Object.keys(impuestosObj).length > 0;

  const buscarMontoPorPct = (pct) => {
    const entry = Object.entries(impuestosObj).find(
      ([k]) => getPctFromLabel(k) === pct,
    );
    return entry ? round2(safeNum(entry[1])) : 0;
  };

  const isv15 = hayDetalleImpuestos ? buscarMontoPorPct(15) : 0;
  const isv18 = hayDetalleImpuestos ? buscarMontoPorPct(18) : 0;

  const otrosIsv = hayDetalleImpuestos
    ? Object.entries(impuestosObj)
        .filter(([, v]) => safeNum(v) !== 0)
        .filter(([k]) => ![15, 18].includes(getPctFromLabel(k)))
        .sort(([a], [b]) => getPctFromLabel(a) - getPctFromLabel(b))
        .map(([k, v]) => ({
          label: normalizarEtiquetaImpuesto(k),
          pct: getPctFromLabel(k),
          monto: round2(safeNum(v)),
        }))
    : [];

  const totalImpuestosDetalle = round2(
    isv15 + isv18 + otrosIsv.reduce((a, x) => a + safeNum(x.monto), 0),
  );

  // ✅ Total impuestos final: si hay detalle -> úsalo; si no -> usa el impuesto ya calculado
  const totalImpuestosFinal = hayDetalleImpuestos
    ? totalImpuestosDetalle
    : impuestoNumerico;

  // ✅ Bases gravadas (netas) por tasa: base = isv / (tasa/100)
  const base15 = isv15 > 0 ? round2(isv15 / 0.15) : 0;
  const base18 = isv18 > 0 ? round2(isv18 / 0.18) : 0;

  const basesOtros = otrosIsv.map((x) => {
    const pct = safeNum(x.pct);
    const base = pct > 0 ? round2(safeNum(x.monto) / (pct / 100)) : 0;
    return { ...x, base };
  });

  // ✅ Subtotal general neto: total - impuestos (si hay detalle); si no, usa subtotalNumerico
  const subtotalGeneralFinal = hayDetalleImpuestos
    ? round2(totalNumerico - totalImpuestosFinal)
    : subtotalNumerico;

  // ==========================
  // CONFIG TICKET 80mm
  // ==========================
  const ANCHO_MM = 80;
  const MARGEN = 2; // ✅ 4mm izq/der
  const X_IZQ = MARGEN;
  const X_DER = ANCHO_MM - MARGEN;
  const X_CENTRO = ANCHO_MM / 2;

  const linea = (doc, y) => doc.line(X_IZQ, y, X_DER, y);

  // ==========================
  // IMPRESIÓN DESDE WEB (print dialog auto)
  // ==========================
  const imprimirBlobEnDialogo = (blob) => {
    const blobUrl = URL.createObjectURL(blob);

    // Abrimos una ventana "limpia" y embebemos el PDF en iframe
    const w = window.open("", "_blank");
    if (!w) {
      // Popup bloqueado: fallback a abrir pestaña con blobUrl
      window.open(blobUrl, "_blank");
      return;
    }

    w.document.open();
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Imprimir recibo</title>
          <style>
            html, body { margin:0; padding:0; height:100%; }
            iframe { border:0; width:100%; height:100%; }
          </style>
        </head>
        <body>
          <iframe id="pdfFrame" src="${blobUrl}"></iframe>
          <script>
            const f = document.getElementById("pdfFrame");
            f.onload = () => {
              try {
                f.contentWindow.focus();
                f.contentWindow.print();
              } catch(e) {
                window.focus();
                window.print();
              }
            };
            window.onafterprint = () => {
              try { window.close(); } catch(e) {}
            };
          </script>
        </body>
      </html>
    `);
    w.document.close();

    // Nota: no revocamos de inmediato porque se está usando en el iframe.
    // Lo revocamos tras un tiempo prudente:
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    }, 60000);
  };

  // ==========================
  // RENDER (1 PASADA) - retorna posY final
  // ==========================
  const renderRecibo = (doc, conLogo) => {
    let posY = 8;

    // ===== LOGO (centrado y dentro de márgenes)
    if (conLogo) {
      try {
        const logoW = 56;
        const logoH = 26;
        const logoX = (ANCHO_MM - logoW) / 2;
        doc.addImage(conLogo, "PNG", logoX, posY, logoW, logoH);
        posY += logoH + 6;
      } catch {
        posY += 2;
      }
    }

    // ===== ENCABEZADO
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("Sistema", X_CENTRO, posY, { align: "center" });
    posY += 5;
    doc.text("Inventario", X_CENTRO, posY, { align: "center" });
    posY += 6;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Sucursal Tegucigalpa", X_CENTRO, posY, { align: "center" });
    posY += 4;
    doc.text("RTN: 0801-1900-10000", X_CENTRO, posY, { align: "center" });
    posY += 4;
    doc.text("Tel: (504) 9800-0000", X_CENTRO, posY, { align: "center" });
    posY += 4;

    linea(doc, posY);
    posY += 5;

    // ===== CAI
    doc.setFontSize(9);
    doc.text(`CAI: ${cai.cai_codigo || "-"}`, X_IZQ, posY);
    posY += 4;
    doc.text(
      `Rango: ${cai.rango_inicio || "-"} - ${cai.rango_fin || "-"}`,
      X_IZQ,
      posY,
    );
    posY += 4;
    doc.text(`Autorizado: ${cai.fecha_autorizacion || "-"}`, X_IZQ, posY);
    posY += 4;
    doc.text(`Vence: ${cai.fecha_limite_emision || "-"}`, X_IZQ, posY);
    posY += 6;

    // ===== TÍTULO
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("FACTURA", X_CENTRO, posY, { align: "center" });
    posY += 5;

    if (esCopia) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("COPIA", X_CENTRO, posY, { align: "center" });
      doc.setTextColor(0, 0, 0);
      posY += 5;
    }

    // ===== DATOS FACTURA/CLIENTE
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(`No. ${numeroFactura || "-"}`, X_IZQ, posY);
    posY += 4;
    doc.text(`Fecha: ${new Date().toLocaleString("es-HN")}`, X_IZQ, posY);
    posY += 4;
    doc.text(`Cajero: ${user?.nombre || "Sistema"}`, X_IZQ, posY);
    posY += 4;

    doc.text(`Cliente: ${cliente_nombre || "Consumidor Final"}`, X_IZQ, posY);
    posY += 4;

    if (cliente_rtn) {
      doc.text(`RTN: ${cliente_rtn}`, X_IZQ, posY);
      posY += 4;
    }

    if (cliente_telefono) {
      doc.text(`Tel: ${cliente_telefono}`, X_IZQ, posY);
      posY += 4;
    }

    if (cliente_direccion) {
      // ✅ ancho útil = 80 - 8 = 72mm
      const lineasDir = doc.splitTextToSize(
        `Dirección: ${cliente_direccion}`,
        ANCHO_MM - MARGEN * 2,
      );
      lineasDir.forEach((ln) => {
        doc.text(ln, X_IZQ, posY);
        posY += 4;
      });
    }

    linea(doc, posY);
    posY += 4;

    // ===== DETALLE (TABLA)
    const body = carrito.map((item) => {
      const cant = safeNum(item.cantidad);
      const codigo = item.codigo || "-";
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

      // ✅ Márgenes 4mm
      margin: { left: MARGEN, right: MARGEN },

      styles: {
        fontSize: 9,
        font: "helvetica",

        textColor: 0,
        halign: "center",
        cellPadding: 0.5,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
        lineWidth: 0.2,
      },

      // ✅ Ajustado a 72mm de ancho útil (80 - 4 - 4)
      columnStyles: {
        0: { cellWidth: 9 }, // Cant
        1: { cellWidth: 14 }, // Código
        2: { cellWidth: 24, halign: "left" }, // Desc
        3: { cellWidth: 11 }, // P/U
        4: { cellWidth: 16 }, // Total
      },
    });

    posY = doc.lastAutoTable.finalY + 4;

    linea(doc, posY);
    posY += 5;

    // ===== TOTALES (ISV incluido)
    doc.setFont("helvetica", "normal").setFontSize(10);

    doc.text("Subtotal Exonerado:", X_IZQ, posY);
    doc.text(formatoLempiras(0), X_DER, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal Exento:", X_IZQ, posY);
    doc.text(formatoLempiras(0), X_DER, posY, { align: "right" });
    posY += 4;

    // ✅ Bases gravadas correctas
    doc.text("Subtotal Gravado 15%:", X_IZQ, posY);
    doc.text(
      formatoLempiras(hayDetalleImpuestos ? base15 : subtotalGeneralFinal),
      X_DER,
      posY,
      { align: "right" },
    );
    posY += 4;

    doc.text("Subtotal Gravado 18%:", X_IZQ, posY);
    doc.text(
      formatoLempiras(hayDetalleImpuestos ? base18 : 0),
      X_DER,
      posY,
      { align: "right" },
    );
    posY += 4;

    // ✅ Otros gravados (si existen tasas nuevas)
    if (hayDetalleImpuestos && basesOtros.length > 0) {
      basesOtros.forEach((x) => {
        doc.text(`Subtotal Gravado ${x.pct}%:`, X_IZQ, posY);
        doc.text(formatoLempiras(x.base), X_DER, posY, { align: "right" });
        posY += 4;
      });
    }

    doc.text("Descuentos/Rebajas:", X_IZQ, posY);
    doc.text(formatoLempiras(descuentosRebajas), X_DER, posY, {
      align: "right",
    });
    posY += 4;

    if (descuentoClienteFinal > 0) {
      const label = descuentoClienteNombre?.trim()
        ? `Desc. cliente (${descuentoClienteNombre}):`
        : "Desc. cliente:";
      doc.text(label, X_IZQ, posY);
      doc.text(formatoLempiras(descuentoClienteFinal), X_DER, posY, {
        align: "right",
      });
      posY += 4;

      doc.text("Total antes desc. cliente:", X_IZQ, posY);
      doc.text(formatoLempiras(totalAntesDescCliente), X_DER, posY, {
        align: "right",
      });
      posY += 4;
    }

    doc.text("Subtotal General:", X_IZQ, posY);
    doc.text(formatoLempiras(subtotalGeneralFinal), X_DER, posY, {
      align: "right",
    });
    posY += 4;

    // ✅ ISV 15 / 18 separados
    doc.text("ISV 15%:", X_IZQ, posY);
    doc.text(
      formatoLempiras(hayDetalleImpuestos ? isv15 : impuestoNumerico),
      X_DER,
      posY,
      { align: "right" },
    );
    posY += 4;

    doc.text("ISV 18%:", X_IZQ, posY);
    doc.text(
      formatoLempiras(hayDetalleImpuestos ? isv18 : 0),
      X_DER,
      posY,
      { align: "right" },
    );
    posY += 4;

    // ✅ Otros ISV (si existen)
    if (hayDetalleImpuestos && otrosIsv.length > 0) {
      otrosIsv.forEach((x) => {
        doc.text(`${x.label}:`, X_IZQ, posY);
        doc.text(formatoLempiras(x.monto), X_DER, posY, { align: "right" });
        posY += 4;
      });
    }

    // ✅ Total impuestos (siempre)
    doc.text("Total ISV:", X_IZQ, posY);
    doc.text(formatoLempiras(totalImpuestosFinal), X_DER, posY, {
      align: "right",
    });
    posY += 6;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("TOTAL A PAGAR:", X_IZQ, posY);
    doc.text(formatoLempiras(totalNumerico), X_DER, posY, { align: "right" });
    posY += 6;

    // ===== MÉTODO DE PAGO
    doc.setFont("helvetica", "normal").setFontSize(10);
    const metodo = String(metodoPago || "efectivo").toLowerCase();

    doc.text(
      `Método de pago: ${metodo === "tarjeta" ? "Tarjeta" : "Efectivo"}`,
      X_IZQ,
      posY,
    );
    posY += 4;

    if (metodo === "efectivo") {
      doc.text(`Pago en efectivo: ${formatoLempiras(efectivo)}`, X_IZQ, posY);
      posY += 4;
      doc.text(`Cambio entregado: ${formatoLempiras(cambio)}`, X_IZQ, posY);
      posY += 4;
    } else {
      doc.text("Pago realizado con tarjeta", X_IZQ, posY);
      posY += 4;
    }

    posY += 3;
    linea(doc, posY);
    posY += 5;

    // ===== TOTAL EN LETRAS (multi-línea centrado)
    doc.setFont("helvetica", "italic").setFontSize(10);
    doc.text("Su cantidad a pagar es de:", X_CENTRO, posY, { align: "center" });
    posY += 4;

    const textoEnLetras = `"${convertirNumeroALetras(totalNumerico)} Exactos"`;
    const lineas = doc.splitTextToSize(textoEnLetras, ANCHO_MM - MARGEN * 2);
    lineas.forEach((lineaTxt) => {
      doc.text(lineaTxt, X_CENTRO, posY, { align: "center" });
      posY += 4;
    });

    posY += 8;

    // ===== PIE
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("*** GRACIAS POR SU COMPRA ***", X_CENTRO, posY, {
      align: "center",
    });
    posY += 8;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("La factura es beneficio de todos.", X_CENTRO, posY, {
      align: "center",
    });
    posY += 6;

    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("EXÍJALA", X_CENTRO, posY, { align: "center" });

    // ✅ dejamos un “aire” final para que nunca se coma la última línea
    posY += 10;

    return posY;
  };

  // ==========================
  // 2 PASADAS PARA ALTURA EXACTA (NO SE CORTA)
  // ==========================
  const generarConAlturaExacta = (imgOrNull) => {
    // 1) Doc temporal (alto grande)
    const docTmp = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [ANCHO_MM, 600],
    });

    const finalY = renderRecibo(docTmp, imgOrNull);
    const alturaFinal = Math.max(220, Math.ceil(finalY)); // mínimo razonable

    // 2) Doc final con altura exacta
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [ANCHO_MM, alturaFinal],
    });

    renderRecibo(doc, imgOrNull);

    // ✅ salida
    const blob = doc.output("blob");

    if (autoImprimir) {
      imprimirBlobEnDialogo(blob);
      return;
    }

    if (abrirEnNuevaPestana) {
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      // revocar luego
      setTimeout(() => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 60000);
      return;
    }

    // fallback (si no quieres abrir pestaña): descarga
    doc.save(`recibo_${numeroFactura || "sin_numero"}.pdf`);
  };

  // ==========================
  // CARGA LOGO con fallback
  // ==========================
  const img = new Image();
  img.src = logoImage;

  img.onload = () => generarConAlturaExacta(img);
  img.onerror = () => {
    console.warn("⚠️ No se pudo cargar el logo, generando recibo sin imagen.");
    generarConAlturaExacta(null);
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
