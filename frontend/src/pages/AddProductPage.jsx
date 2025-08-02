import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Modal, Button } from "react-bootstrap";
import { CheckCircleFill } from "react-bootstrap-icons";

export default function AddProductPage() {
  const [categorias, setCategorias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria_id: "",
    ubicacion_id: "",
    stock: 0,
    stock_minimo: 1,
    precio: "",
    imagen: "",
  });
  const [imagenFile, setImagenFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Obtén usuario_id del usuario logueado
  // Obtén usuario_id del usuario logueado (versión segura)
  const usuario_id = (() => {
    try {
      const u = localStorage.getItem("usuario");
      return u ? JSON.parse(u)?.id : null;
    } catch {
      return null;
    }
  })();
  

  useEffect(() => {
    api.get("/categorias").then((res) => setCategorias(res.data));
    api.get("/ubicaciones").then((res) => setUbicaciones(res.data));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImagenFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = "";
    if (imagenFile) {
      const formData = new FormData();
      formData.append("imagen", imagenFile);
      try {
        const res = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        // Asegúrate de que la ruta devuelta es res.data.path o res.data.url según tu backend
        imageUrl = res.data.path || res.data.url;
      } catch (err) {
        alert("Error al subir la imagen");
        setLoading(false);
        return;
      }
    }

    try {
      await api.post("/productos", {
        ...form,
        imagen: imageUrl || null, // ✅ corregido aquí
        usuario_id,
      });
      setShowSuccess(true); // Mostrar el modal de éxito
      setForm({
        codigo: "",
        nombre: "",
        descripcion: "",
        categoria_id: "",
        ubicacion_id: "",
        stock: 0,
        stock_minimo: 1,
        precio: "",
        imagen: "",
      });
      setImagenFile(null);
      setPreview(null);
    } catch (error) {
      alert("Error al agregar el producto");
    }
    setLoading(false);
  };

  return (
    <section className="container py-4">
      {/* MODAL DE ÉXITO */}
      <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered>
        <Modal.Body className="text-center py-4">
          <CheckCircleFill size={64} color="#198754" className="mb-3" />
          <h5 className="mb-2 fw-bold text-success">
            ¡Producto registrado correctamente!
          </h5>
          <Button variant="success" onClick={() => setShowSuccess(false)}>
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>

      <h2 className="mb-4 text-center">Añadir Nuevo Repuesto</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 shadow rounded row g-3 add-product-form"
      >
        <div className="col-md-4 col-12">
          <label className="form-label">Código</label>
          <input
            className="form-control"
            name="codigo"
            value={form.codigo}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-4 col-12">
          <label className="form-label">Nombre</label>
          <input
            className="form-control"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-4 col-12">
          <label className="form-label">Categoría</label>
          <select
            className="form-select"
            name="categoria_id"
            value={form.categoria_id}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 col-12">
          <label className="form-label">Ubicación</label>
          <select
            className="form-select"
            name="ubicacion_id"
            value={form.ubicacion_id}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar</option>
            {ubicaciones.map((ub) => (
              <option key={ub.id} value={ub.id}>
                {ub.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 col-12">
          <label className="form-label">Stock</label>
          <input
            type="number"
            className="form-control"
            name="stock"
            value={form.stock}
            min={0}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-4 col-12">
          <label className="form-label">Stock mínimo</label>
          <input
            type="number"
            className="form-control"
            name="stock_minimo"
            value={form.stock_minimo}
            min={1}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-4 col-12">
          <label className="form-label">Precio</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            name="precio"
            value={form.precio}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-8 col-12">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-control"
            name="descripcion"
            rows={2}
            value={form.descripcion}
            onChange={handleChange}
          ></textarea>
        </div>
        <div className="col-md-6 col-12">
          <label className="form-label">Imagen</label>
          <input
            type="file"
            className="form-control"
            onChange={handleImageChange}
            accept="image/*"
          />
          {preview && (
            <div className="mt-2">
              <img
                src={preview}
                alt="preview"
                className="img-thumbnail"
                style={{ maxHeight: 140, maxWidth: "100%" }}
              />
            </div>
          )}
        </div>
        <div className="col-md-6 col-12 d-flex align-items-end">
          <button
            type="submit"
            className="btn btn-warning w-100"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar Producto"}
          </button>
        </div>
      </form>
      <style>{`
        /* FORMULARIO RESPONSIVO */
        @media (max-width: 991.98px) {
          .add-product-form > div {
            margin-bottom: 0.4rem !important;
          }
        }
        @media (max-width: 767.98px) {
          .add-product-form > div {
            width: 100% !important;
            max-width: 100% !important;
            flex: 0 0 100% !important;
          }
          .add-product-form {
            padding: 1.2rem 0.3rem !important;
            border-radius: 13px !important;
          }
        }
        @media (max-width: 575.98px) {
          .add-product-form .form-label,
          .add-product-form .form-control,
          .add-product-form .form-select,
          .add-product-form textarea {
            font-size: 1.07rem !important;
          }
          .add-product-form button {
            font-size: 1.08rem !important;
            padding: 0.8rem 1.2rem !important;
            border-radius: 10px !important;
          }
        }
      `}</style>
    </section>
  );
}
