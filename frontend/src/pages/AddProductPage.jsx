import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { CheckCircleFill } from "react-bootstrap-icons";
import api from "../api/axios";

export default function AddProductPage() {
  const [categorias, setCategorias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    lote: "",
    fecha_vencimiento: "",
    descripcion: "",
    categoria_id: "",
    ubicacion_id: "",
    stock: 0,
    stock_minimo: 1,
    precio: "",

    // ✅ Medidas (DB)
    contenido_medida: "",
    unidad_medida_id: "",

    imagen: "",
  });

  const [imagenFile, setImagenFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ✅ Obtener usuario_id (seguro)
  const usuario_id = (() => {
    try {
      const u = localStorage.getItem("usuario");
      return u ? JSON.parse(u)?.id : null;
    } catch {
      return null;
    }
  })();

  // ========================
  // Cargar catálogos
  // ========================
  useEffect(() => {
    let mounted = true;

    const cargarCatalogos = async () => {
      try {
        const [cats, ubs, uns] = await Promise.all([
          api.get("/categorias"),
          api.get("/ubicaciones"),
          api.get("/unidades"),
        ]);

        if (!mounted) return;

        setCategorias(Array.isArray(cats.data) ? cats.data : []);
        setUbicaciones(Array.isArray(ubs.data) ? ubs.data : []);

        const listaUnidades = Array.isArray(uns.data) ? uns.data : [];
        // ✅ Solo activas
        setUnidades(listaUnidades.filter((u) => !!u.activo));
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setCategorias([]);
        setUbicaciones([]);
        setUnidades([]);
      }
    };

    cargarCatalogos();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ Limpiar preview (evita fuga de memoria)
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // ✅ Ordenar unidades por tipo y nombre
  const unidadesOrdenadas = useMemo(() => {
    const copy = [...unidades];
    copy.sort((a, b) => {
      const t = (a.tipo || "").localeCompare(b.tipo || "", "es");
      if (t !== 0) return t;
      return (a.nombre || "").localeCompare(b.nombre || "", "es");
    });
    return copy;
  }, [unidades]);

  // ========================
  // Handlers
  // ========================
  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Si viene un number input, mantenemos string para que el usuario pueda borrar
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImagenFile(file);

    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ fecha válida (HTML date ya ayuda)
      if (form.fecha_vencimiento && isNaN(Date.parse(form.fecha_vencimiento))) {
        alert("Fecha de vencimiento inválida");
        setLoading(false);
        return;
      }

      // ✅ medidas: si usa una, exigir la otra
      const unidadIdStr = String(form.unidad_medida_id || "").trim();
      const contenidoStr = String(form.contenido_medida ?? "").trim();

      const tieneUnidad = unidadIdStr !== "";
      const tieneContenido = contenidoStr !== "";

      if (
        (tieneUnidad && !tieneContenido) ||
        (!tieneUnidad && tieneContenido)
      ) {
        alert(
          "Si usas medidas, completa Cantidad/Contenido y Unidad de medida."
        );
        setLoading(false);
        return;
      }

      // ✅ Si hay contenido, debe ser número válido
      if (tieneContenido) {
        const n = Number(contenidoStr);
        if (!Number.isFinite(n) || n <= 0) {
          alert("Cantidad/Contenido debe ser un número válido mayor a 0.");
          setLoading(false);
          return;
        }
      }

      // ✅ Subir imagen si existe
      let imageUrl = "";
      if (imagenFile) {
        const formData = new FormData();
        formData.append("imagen", imagenFile);

        try {
          const res = await api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          imageUrl = res.data?.path || res.data?.url || "";
        } catch (err) {
          alert("Error al subir la imagen");
          setLoading(false);
          return;
        }
      }

      // ✅ Normalizar payload para backend
      const payload = {
        ...form,

        lote: (form.lote || "").trim() || null,
        fecha_vencimiento: form.fecha_vencimiento || null,

        unidad_medida_id: tieneUnidad ? Number(unidadIdStr) : null,
        contenido_medida: tieneContenido ? Number(contenidoStr) : null,

        imagen: imageUrl || null,
        usuario_id,
      };

      await api.post("/productos", payload);

      setShowSuccess(true);

      setForm({
        codigo: "",
        nombre: "",
        lote: "",
        fecha_vencimiento: "",
        descripcion: "",
        categoria_id: "",
        ubicacion_id: "",
        stock: 0,
        stock_minimo: 1,
        precio: "",
        contenido_medida: "",
        unidad_medida_id: "",
        imagen: "",
      });

      setImagenFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (error) {
      console.error(error);
      alert(error?.message || "Error al agregar el producto");
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

      <h2 className="mb-4 text-center">Añadir Nuevo Producto</h2>

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
          <label className="form-label">Lote</label>
          <input
            className="form-control"
            name="lote"
            value={form.lote}
            onChange={handleChange}
            placeholder="Ej: LOTE-2025-001"
          />
        </div>

        <div className="col-md-4 col-12">
          <label className="form-label">Fecha de vencimiento</label>
          <input
            type="date"
            className="form-control"
            name="fecha_vencimiento"
            value={form.fecha_vencimiento}
            onChange={handleChange}
          />
          <small className="text-muted">(Opcional)</small>
        </div>

        {/* ✅ MEDIDAS */}
        <div className="col-md-4 col-12">
          <label className="form-label">Cantidad / Contenido</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="form-control"
            name="contenido_medida"
            value={form.contenido_medida}
            onChange={handleChange}
            placeholder="Ej: 5, 2.5, 750"
          />
          <small className="text-muted">(Opcional)</small>
        </div>

        <div className="col-md-4 col-12">
          <label className="form-label">Unidad de medida</label>
          <select
            className="form-select"
            name="unidad_medida_id"
            value={form.unidad_medida_id}
            onChange={handleChange}
          >
            <option value="">Seleccionar (opcional)</option>
            {unidadesOrdenadas.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.abreviatura}) — {u.tipo}
              </option>
            ))}
          </select>
          <small className="text-muted">
            Las unidades se administran en el módulo “Unidades de Medida”.
          </small>
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
          />
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
        @media (max-width: 991.98px) {
          .add-product-form > div { margin-bottom: 0.4rem !important; }
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
