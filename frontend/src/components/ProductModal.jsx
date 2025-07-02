import React from "react";

// PUERTO CORRECTO DEL BACKEND:
const API_URL = "http://localhost:3000";

function formatCurrency(n) {
  if (!n) return "-";
  return Number(n).toLocaleString("es-HN", {
    style: "currency",
    currency: "HNL",
  });
}

export default function ProductModal({ product, onClose }) {
  if (!product) return null;

  const {
    imagen,
    nombre,
    codigo,
    categoria,
    ubicacion,
    stock,
    precio,
    descripcion,
  } = product;

  // Construye el src correcto para la imagen, según el valor de 'imagen'
  const getImgSrc = () => {
    if (!imagen) return "";
    if (imagen.startsWith("http")) return imagen;
    if (imagen.startsWith("/uploads")) return API_URL + imagen;
    if (imagen.startsWith("uploads")) return `${API_URL}/${imagen}`;
    // Si solo es el nombre del archivo:
    return `${API_URL}/uploads/${imagen}`;
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2000 }}
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-dialog modal-dialog-centered modal-responsive-custom">
        <div className="modal-content border-0 shadow-lg">
          {/* Encabezado */}
          <div className="modal-header bg-primary text-white">
            <div className="d-flex align-items-center">
              <i
                className="bi bi-box-seam me-2"
                style={{ fontSize: "1.5rem" }}
              ></i>
              <h5 className="modal-title mb-0">{nombre}</h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Cerrar"
            ></button>
          </div>

          {/* Cuerpo */}
          <div className="modal-body">
            <div className="row g-3">
              {/* Imagen */}
              <div className="col-12 text-center mb-2">
                {imagen ? (
                  <img
                    src={getImgSrc()}
                    alt={nombre}
                    className="img-fluid rounded border shadow product-modal-img"
                    style={{ maxHeight: 180, maxWidth: "95%" }}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div className="text-muted small">Sin imagen</div>
                )}
              </div>
              {/* Primera columna */}
              <div className="col-md-6 col-12">
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-upc-scan text-muted me-2"></i>
                  <div>
                    <small className="text-muted">Código</small>
                    <div className="fw-semibold">{codigo}</div>
                  </div>
                </div>
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-tag text-muted me-2"></i>
                  <div>
                    <small className="text-muted">Categoría</small>
                    <div className="fw-semibold">{categoria || "-"}</div>
                  </div>
                </div>
              </div>
              {/* Segunda columna */}
              <div className="col-md-6 col-12">
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-geo-alt text-muted me-2"></i>
                  <div>
                    <small className="text-muted">Ubicación</small>
                    <div className="fw-semibold">{ubicacion || "-"}</div>
                  </div>
                </div>
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-box text-muted me-2"></i>
                  <div>
                    <small className="text-muted">Stock</small>
                    <div className="fw-semibold">{stock} unidades</div>
                  </div>
                </div>
              </div>
              {/* Precio */}
              <div className="col-12">
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-currency-dollar text-muted me-2"></i>
                  <div>
                    <small className="text-muted">Precio</small>
                    <div className="fw-semibold">{formatCurrency(precio)}</div>
                  </div>
                </div>
              </div>
              {/* Descripción */}
              <div className="col-12">
                <div className="border-top pt-3">
                  <div className="d-flex align-items-start mb-2">
                    <i className="bi bi-text-paragraph text-muted me-2 mt-1"></i>
                    <div>
                      <small className="text-muted">Descripción</small>
                      <p className="mb-0 text-break">{descripcion || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Pie del Modal */}
          <div className="modal-footer bg-light">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              <i className="bi bi-x-lg me-1"></i> Cerrar
            </button>
          </div>
        </div>
      </div>
      {/* CSS en línea para responsividad del modal */}
      <style>{`
        @media (max-width: 991.98px) {
          .modal-responsive-custom {
            max-width: 98vw !important;
            min-width: 0 !important;
            margin: 1rem !important;
          }
        }
        @media (max-width: 767.98px) {
          .modal-responsive-custom {
            max-width: 99vw !important;
            margin: 0.5rem !important;
          }
          .product-modal-img {
            max-height: 140px !important;
          }
        }
        @media (max-width: 575.98px) {
          .modal-responsive-custom {
            max-width: 100vw !important;
            margin: 0.3rem !important;
          }
          .product-modal-img {
            max-height: 90px !important;
          }
        }
      `}</style>
    </div>
  );
}
