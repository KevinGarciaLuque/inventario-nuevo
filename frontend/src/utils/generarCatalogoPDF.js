// frontend/src/utils/generarCatalogoPDF.js
import jsPDF from "jspdf";

const money = (v) =>
  v === null || v === undefined || v === "" ? "-" : `L ${Number(v).toFixed(2)}`;

// Convierte la imagen de un producto (URL) a data URL para poder incrustarla
// en el PDF. Si falla (sin imagen, error de red, etc.) devuelve null y se
// dibuja un placeholder en su lugar.
const cargarImagenComoDataURL = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    fetch(url)
      .then((res) => (res.ok ? res.blob() : Promise.reject()))
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      })
      .catch(() => resolve(null));
  });

/**
 * Genera y descarga un catálogo en PDF con imagen, nombre, descripción y
 * los dos precios (detalle/venta y mayorista) de cada producto.
 *
 * @param {Object} opts
 * @param {Array} opts.productos - productos a incluir (ya filtrados)
 * @param {string} opts.titulo - subtítulo (ej. nombre de la categoría o "Todos los productos")
 * @param {(imagen: string) => string} opts.getImgSrc - resuelve la URL completa de la imagen
 */
export default async function generarCatalogoPDF({
  productos = [],
  titulo = "Todos los productos",
  getImgSrc,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const headerHeight = 24;

  const cols = 2;
  const gapX = 6;
  const gapY = 6;
  const cardWidth = (pageWidth - margin * 2 - gapX * (cols - 1)) / cols;
  const cardHeight = 62;
  const imgSize = 30;

  const dibujarEncabezado = () => {
    doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(30);
    doc.text("Catálogo de Productos", margin, 15);

    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(90);
    doc.text(titulo, margin, 21);

    doc.setFontSize(8.5).setTextColor(140);
    doc.text(
      `Generado: ${new Date().toLocaleDateString("es-HN")}`,
      pageWidth - margin,
      15,
      { align: "right" },
    );
    doc.setTextColor(0);
    doc.setDrawColor(230);
    doc.line(margin, headerHeight, pageWidth - margin, headerHeight);
  };

  dibujarEncabezado();

  // Precarga todas las imágenes en paralelo antes de dibujar
  const imagenes = await Promise.all(
    productos.map((p) =>
      p.imagen ? cargarImagenComoDataURL(getImgSrc(p.imagen)) : Promise.resolve(null),
    ),
  );

  let x = margin;
  let y = headerHeight + 6;
  let col = 0;

  productos.forEach((p, idx) => {
    if (y + cardHeight > pageHeight - margin) {
      doc.addPage();
      dibujarEncabezado();
      y = headerHeight + 6;
      col = 0;
      x = margin;
    }

    doc.setDrawColor(225);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2);

    const imgX = x + 4;
    const imgY = y + (cardHeight - imgSize) / 2;
    const dataUrl = imagenes[idx];

    if (dataUrl) {
      try {
        doc.addImage(dataUrl, imgX, imgY, imgSize, imgSize, undefined, "FAST");
      } catch {
        // si falla el formato de la imagen, se ignora silenciosamente
      }
    } else {
      doc.setFillColor(245, 245, 245);
      doc.rect(imgX, imgY, imgSize, imgSize, "F");
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(160);
      doc.text("Sin imagen", imgX + imgSize / 2, imgY + imgSize / 2, {
        align: "center",
      });
      doc.setTextColor(0);
    }

    const textX = imgX + imgSize + 4;
    const textWidth = cardWidth - imgSize - 12;
    let textY = y + 8;

    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20);
    const nombreLineas = doc.splitTextToSize(p.nombre || "-", textWidth);
    doc.text(nombreLineas.slice(0, 2), textX, textY);
    textY += Math.min(nombreLineas.length, 2) * 4.2 + 2;

    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
    const descLineas = doc.splitTextToSize(p.descripcion || "Sin descripción", textWidth);
    doc.text(descLineas.slice(0, 3), textX, textY);
    doc.setTextColor(0);

    const precioY = y + cardHeight - 11;
    doc.setDrawColor(235);
    doc.line(textX, precioY - 3, x + cardWidth - 4, precioY - 3);

    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(30);
    doc.text(`Detalle: ${money(p.precio)}`, textX, precioY);

    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(90);
    doc.text(`Mayorista: ${money(p.precio_mayorista)}`, textX, precioY + 4.5);
    doc.setTextColor(0);

    col += 1;
    if (col >= cols) {
      col = 0;
      x = margin;
      y += cardHeight + gapY;
    } else {
      x += cardWidth + gapX;
    }
  });

  doc.save(`catalogo-productos-${new Date().toISOString().slice(0, 10)}.pdf`);
}
