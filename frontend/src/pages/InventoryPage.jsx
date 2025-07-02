import React, { useState, useEffect, useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import { Trash, CheckCircleFill, XCircleFill } from "react-bootstrap-icons";
import api from "../../api/axios";
import EditProductModal from "../components/EditProductModal";
import { useUser } from "../context/UserContext";
import { FaBroom } from "react-icons/fa";


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
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    productId: null,
  });
  const [deleteSuccess, setDeleteSuccess] = useState(false);
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

  const beep = () => {
    const audio = new Audio(
      "https://assets.mixkit.co/sfx/download/mixkit-positive-interface-beep-221.mp3"
    );
    audio.play();
  };

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

  // Escaneo de código de barras
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
  }, [codigoBuffer]);

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

  const askDelete = (id) => setDeleteConfirm({ show: true, productId: id });

  const handleDelete = async () => {
    const id = deleteConfirm.productId;
    setDeleteConfirm({ show: false, productId: null });
    if (!id) return;
    try {
      await api.delete(`/productos/${id}?usuario_id=${usuario_id}`);
      setItems((prev) => prev.filter((prod) => prod.id !== id));
      setDeleteSuccess(true);
    } catch {
      setToast({
        show: true,
        message: "No se pudo eliminar",
        variant: "danger",
      });
    }
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(
        () => setToast((t) => ({ ...t, show: false })),
        2500
      );
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

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
        : item.stock > (item.stock_minimo || 1))
  );

  return (
    <section className="container py-4">
      <div ref={flashRef}></div>

      <h2 className="mb-4 text-center">Inventario de Repuestos</h2>

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
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
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

      <div
        className="bg-white shadow rounded table-responsive"
        style={{ maxHeight: "500px", overflowY: "auto" }}
      >
        <table className="table table-bordered align-middle   sticky-header">
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
                        className="img-thumbnail"
                        style={{ maxHeight: 50, maxWidth: 70 }}
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    ) : (
                      <span className="text-muted">Sin imagen</span>
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
                    <button
                      className="btn btn-outline-warning btn-sm me-2"
                      onClick={() => onView(item)}
                    >
                      <i className="bi bi-eye"></i>
                    </button>
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
                          onClick={() => askDelete(item.id)}
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

      <EditProductModal
        show={editModal.show}
        product={editModal.product}
        categorias={categorias}
        ubicaciones={ubicaciones}
        onClose={() => setEditModal({ show: false, product: null })}
        onUpdated={cargarDatos}
      />

      <style>{`
        .flash-success { animation: flash 0.6s ease-in-out; }
        @keyframes flash { 0% { background-color: #d4edda; } 50% { background-color: #28a745; } 100% { background-color: transparent; } }
        .sticky-header thead th { position: sticky; top: 0; z-index: 2; }
      `}</style>
    </section>
  );
}
