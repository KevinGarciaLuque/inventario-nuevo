import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { CheckCircleFill, Trash, XCircleFill } from "react-bootstrap-icons";
import { FaBroom } from "react-icons/fa";
import api from "../api/axios";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { useUser } from "../context/UserContext";
import EditProductModal from "./AddProduct/EditProductModal";
import { renderCategoriaOptions } from "../utils/categoriasOptions.jsx";

const API_URL = "http://localhost:3000";

const getImgSrc = (imagen) => {
  if (!imagen) return "";
  if (imagen.startsWith("http")) return imagen;
  if (imagen.startsWith("/uploads")) return API_URL + imagen;
  if (imagen.startsWith("uploads")) return `${API_URL}/${imagen}`;
  return `${API_URL}/uploads/${imagen}`;
};

export default function InventoryPage({ onView }) {
  const { user } = useUser();
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [loading, setLoading] = useState(false);
   const [impuestos, setImpuestos] = useState([]);

   const [unidades, setUnidades] = useState([]);

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    productId: null,
    nombre: "",
  });
  const [toast, setToast] = useState({
    show: false,
    message: "",
    variant: "success",
  });
  const [editModal, setEditModal] = useState({ show: false, product: null });
  const usuario_id = user?.id;

  const [codigoBuffer, setCodigoBuffer] = useState("");
  const scannerTimeout = useRef(null);
  const flashRef = useRef(null);

  // Cargar datos
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, ubiRes] = await Promise.all([
        api.get("/productos"),
        api.get("/categorias"),
        api.get("/ubicaciones"),
      ]);
      setItems(prodRes.data);
      setCategorias(catRes.data);
      setUbicaciones(ubiRes.data);
    } catch {
      setToast({
        show: true,
        message: "Error al cargar datos",
        variant: "danger",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Escaneo de código de barras (para lector externo)
  useEffect(() => {
    const handleKeyPress = (e) => {
      const char = e.key;
      if (char.length === 1) setCodigoBuffer((prev) => prev + char);
      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
      scannerTimeout.current = setTimeout(() => {
        if (codigoBuffer.length > 0) {
          procesarCodigoEscaneado(codigoBuffer);
          setCodigoBuffer("");
        }
      }, 300);
    };
    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
    };
    // eslint-disable-next-line
  }, [codigoBuffer]);


  useEffect(() => {
    const cargarExtras = async () => {
      try {
        const [resImp, resUni] = await Promise.all([
          api.get("/impuestos"),
          api.get("/unidades"),
        ]);
        setImpuestos(Array.isArray(resImp.data) ? resImp.data : []);
        setUnidades(Array.isArray(resUni.data) ? resUni.data : []);
      } catch (e) {
        console.error("Error cargando impuestos/unidades:", e);
        setImpuestos([]);
        setUnidades([]);
      }
    };

    cargarExtras();
  }, []);


  const procesarCodigoEscaneado = async (codigo) => {
    try {
      const res = await api.get(`/productos/buscar?codigo=${codigo.trim()}`);
      if (res.data.length > 0) {
        const producto = res.data[0];
        setSearch(producto.codigo);
        beep();
        flashAnimation();
      } else {
        setToast({
          show: true,
          message: "Producto no encontrado",
          variant: "danger",
        });
      }
    } catch {
      setToast({ show: true, message: "Error de conexión", variant: "danger" });
    }
  };

  const beep = () => {
    const audio = new Audio(
      "https://assets.mixkit.co/sfx/download/mixkit-positive-interface-beep-221.mp3",
    );
    audio.play();
  };

  const flashAnimation = () => {
    if (flashRef.current) {
      flashRef.current.classList.add("flash-success");
      setTimeout(() => {
        flashRef.current.classList.remove("flash-success");
      }, 600);
    }
  };

  const limpiarFiltros = () => {
    setSearch("");
    setCategory("");
    setLocation("");
    setStockFilter("");
  };

  // Eliminar producto (mostrar modal)
  const askDelete = (id, nombre) =>
    setDeleteConfirm({ show: true, productId: id, nombre: nombre });

  // Confirmar eliminación
  const handleDelete = async () => {
    const id = deleteConfirm.productId;
    setDeleteConfirm({ show: false, productId: null, nombre: "" });
    if (!id) return;
    try {
      const response = await api.delete(
        `/productos/${id}?usuario_id=${usuario_id}`,
      );
      if (response.data?.message) {
        setToast({
          show: true,
          message: response.data.message,
          variant: "success",
        });
      }
      cargarDatos();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        "No se pudo eliminar. Es posible que el producto tenga registros relacionados.";
      setToast({
        show: true,
        message: msg,
        variant: "danger",
      });
      console.error("Error al eliminar:", e);
    }
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(
        () => setToast((t) => ({ ...t, show: false })),
        3000,
      );
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Filtrado de productos
  const filtered = items.filter(
    (item) =>
      (item.nombre.toLowerCase().includes(search.toLowerCase()) ||
        item.codigo.toLowerCase().includes(search.toLowerCase())) &&
      (category ? Number(item.categoria_id) === Number(category) : true) &&
      (location ? Number(item.ubicacion_id) === Number(location) : true) &&
      (stockFilter === ""
        ? true
        : stockFilter === "bajo"
          ? item.stock <= (item.stock_minimo || 1)
          : item.stock > (item.stock_minimo || 1)),
  );

  // Render
  return (
    <section className="container-fluid px-2 px-md-4 py-3 py-md-4">
      <div ref={flashRef}></div>
      <h2 className="mb-3 mb-md-4">Inventario</h2>

      {/* Toast de mensajes */}
      <Modal
        show={toast.show}
        onHide={() => setToast((t) => ({ ...t, show: false }))}
        centered
      >
        <Modal.Body className="text-center py-4">
          {toast.variant === "success" ? (
            <CheckCircleFill size={50} color="#198754" className="mb-3" />
          ) : (
            <XCircleFill size={50} color="#dc3545" className="mb-3" />
          )}
          <h5
            className={`fw-bold ${
              toast.variant === "success" ? "text-success" : "text-danger"
            }`}
          >
            {toast.message}
          </h5>
          <Button
            variant={toast.variant === "success" ? "success" : "danger"}
            className="mt-2 px-4"
            onClick={() => setToast((t) => ({ ...t, show: false }))}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>

      {/* Modal confirmación de eliminación reutilizable */}
      <ConfirmDeleteModal
        show={deleteConfirm.show}
        onHide={() =>
          setDeleteConfirm({ show: false, productId: null, nombre: "" })
        }
        onConfirm={handleDelete}
        mensaje={`¿Seguro que deseas eliminar el producto "${deleteConfirm.nombre}"?`}
        subtitulo="Si ya tiene ventas registradas no se puede borrar sin afectar el historial: en ese caso se desactivará en su lugar y dejará de aparecer en el inventario."
      />

      {/* Filtros */}
      <div className="row g-2 mb-3 align-items-center">
        <div className="col-sm-4">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-sm-2">
          <Button
            variant="warning"
            className="w-100 fw-bold d-flex align-items-center justify-content-center"
            style={{ backgroundColor: "#FFC107", borderColor: "#FFC107" }}
            onClick={limpiarFiltros}
          >
            <FaBroom className="me-2" /> Limpiar
          </Button>
        </div>
        <div className="col-sm-3">
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {renderCategoriaOptions(categorias)}
          </select>
        </div>
        <div className="col-sm-3">
          <select
            className="form-select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Todas las ubicaciones</option>
            {ubicaciones.map((ubi) => (
              <option key={ubi.id} value={ubi.id}>
                {ubi.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de productos — escritorio y tablet */}
      <div className="d-none d-md-block bg-white shadow rounded mb-4 border">
        <div className="table-responsive">
          <table className="table table-bordered align-middle mb-0 sticky-header">
            <thead className="table-light sticky-top">
              <tr>
                <th>Imagen</th>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Ubicación</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted">
                    No hay productos
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.imagen ? (
                        <img
                          src={getImgSrc(item.imagen)}
                          alt={item.nombre}
                          className="img-thumbnail inventory-img-clickable"
                          style={{ maxHeight: 50, maxWidth: 70 }}
                          onClick={() => onView(item)}
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      ) : (
                        <span
                          className="text-muted inventory-img-clickable"
                          onClick={() => onView(item)}
                        >
                          Sin imagen
                        </span>
                      )}
                    </td>
                    <td>{item.codigo}</td>
                    <td>{item.nombre}</td>
                    <td>{item.categoria || "-"}</td>
                    <td>{item.ubicacion || "-"}</td>
                    <td>
                      <span
                        className={
                          item.stock <= (item.stock_minimo || 1)
                            ? "badge bg-danger text-white"
                            : "badge bg-success text-white"
                        }
                      >
                        {item.stock}
                      </span>
                    </td>
                    <td>
                      {item.precio
                        ? Number(item.precio).toLocaleString("es-HN", {
                            style: "currency",
                            currency: "HNL",
                          })
                        : "-"}
                    </td>
                    <td>
                      {user?.rol === "admin" && (
                        <>
                          <button
                            className="btn btn-outline-primary btn-sm me-2"
                            onClick={() =>
                              setEditModal({ show: true, product: item })
                            }
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => askDelete(item.id, item.nombre)}
                          >
                            <Trash className="mb-1" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tarjetas de productos — móvil */}
      <div className="d-md-none mb-4">
        {loading ? (
          <div className="text-center text-muted py-4 bg-white rounded shadow-sm border">
            Cargando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted py-4 bg-white rounded shadow-sm border">
            No hay productos
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="inventory-card bg-white rounded shadow-sm border p-2"
              >
                <div className="d-flex gap-2">
                  <div
                    className="inventory-card__img flex-shrink-0 inventory-img-clickable"
                    onClick={() => onView(item)}
                  >
                    {item.imagen ? (
                      <img
                        src={getImgSrc(item.imagen)}
                        alt={item.nombre}
                        className="img-thumbnail"
                        style={{ width: 56, height: 56, objectFit: "cover" }}
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center text-muted bg-light rounded"
                        style={{ width: 56, height: 56, fontSize: "0.65rem" }}
                      >
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="min-w-0">
                        <div className="fw-semibold text-truncate">
                          {item.nombre}
                        </div>
                        <div className="text-muted small">{item.codigo}</div>
                      </div>
                      <span
                        className={
                          item.stock <= (item.stock_minimo || 1)
                            ? "badge bg-danger text-white flex-shrink-0"
                            : "badge bg-success text-white flex-shrink-0"
                        }
                      >
                        {item.stock}
                      </span>
                    </div>
                    <div className="text-muted small mt-1">
                      {item.categoria || "-"} · {item.ubicacion || "-"}
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="fw-bold">
                        {item.precio
                          ? Number(item.precio).toLocaleString("es-HN", {
                              style: "currency",
                              currency: "HNL",
                            })
                          : "-"}
                      </span>
                      <div className="d-flex gap-1">
                        {user?.rol === "admin" && (
                          <>
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() =>
                                setEditModal({ show: true, product: item })
                              }
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => askDelete(item.id, item.nombre)}
                            >
                              <Trash className="mb-1" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditProductModal
        show={editModal.show}
        product={editModal.product}
        categorias={categorias}
        ubicaciones={ubicaciones}
        impuestos={impuestos} // ✅ NUEVO
        unidades={unidades} // ✅ NUEVO
        usuario_id={user?.id} // ✅ opcional (bitácora)
        onClose={() => setEditModal({ show: false, product: null })}
        onUpdated={cargarDatos}
      />

      {/* Estilo para encabezado sticky corregido */}
    </section>
  );
}
