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

  const getImgSrc = () => {
    if (!imagen) return "";
    if (imagen.startsWith("http")) return imagen;
    if (imagen.startsWith("/uploads")) return API_URL + imagen;
    if (imagen.startsWith("uploads")) return `${API_URL}/${imagen}`;
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
          <div className="modal-body px-3">
            <div className="row g-2">
              {/* Imagen */}
              <div className="col-12 text-center mb-2">
                {imagen ? (
                  <img
                    src={getImgSrc()}
                    alt={nombre}
                    className="img-fluid rounded border shadow-sm product-modal-img"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div className="text-muted small">Sin imagen</div>
                )}
              </div>

              {/* Info en dos columnas compactas */}
              <div className="col-6">
                <div className="mb-2 small">
                  <i className="bi bi-upc-scan text-muted me-1"></i>
                  <span className="fw-semibold">{codigo}</span>
                </div>
                <div className="mb-2 small">
                  <i className="bi bi-tag text-muted me-1"></i>
                  <span>{categoria || "-"}</span>
                </div>
                <div className="mb-2 small">
                  <i className="bi bi-currency-dollar text-muted me-1"></i>
                  <span>{formatCurrency(precio)}</span>
                </div>
              </div>

              <div className="col-6">
                <div className="mb-2 small">
                  <i className="bi bi-geo-alt text-muted me-1"></i>
                  <span>{ubicacion || "-"}</span>
                </div>
                <div className="mb-2 small">
                  <i className="bi bi-box text-muted me-1"></i>
                  <span>{stock} unidades</span>
                </div>
              </div>

              <div className="col-12">
                <div className="border-top pt-2 mt-1 small">
                  <i className="bi bi-text-paragraph text-muted me-1"></i>
                  <span>{descripcion || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
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

      {/* Estilos embebidos */}
      <style>{`
        .product-modal-img {
          max-height: 500px; /* 🔧 Aquí modificas el tamaño en escritorio */
          max-width: 100%;
          object-fit: contain;
        }

        @media (max-width: 991.98px) {
          .modal-responsive-custom {
            max-width: 98vw !important;
            margin: 1rem !important;
          }
          .product-modal-img {
            max-height: 400px !important;
          }
        }

        @media (max-width: 767.98px) {
          .modal-responsive-custom {
            max-width: 99vw !important;
            margin: 0.5rem !important;
          }
          .product-modal-img {
            max-height: 300px !important;
          }
        }

        @media (max-width: 575.98px) {
          .modal-responsive-custom {
            max-width: 100vw !important;
            margin: 0.3rem !important;
          }
          .product-modal-img {
            max-height: 250px !important;
          }
        }
      `}</style>
    </div>
  );
}
