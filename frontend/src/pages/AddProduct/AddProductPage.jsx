import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { CheckCircleFill } from "react-bootstrap-icons";
import api from "../../api/axios";

export default function AddProductPage() {
  const [categorias, setCategorias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [impuestos, setImpuestos] = useState([]); // ✅ NUEVO

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    lote: "",
    fecha_vencimiento: "",
    descripcion: "",
    categoria_id: "",
    ubicacion_id: "",
    impuesto_id: "", // ✅ NUEVO
    stock: 0,
    stock_minimo: 1,

    // ✅ PRECIOS + DESCUENTO (DB)
    precio_costo: "", // opcional
    precio: "", // ✅ precio de venta (obligatorio)
    descuento: "", // opcional (0-100)

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
  // Helpers vista (solo UI)
  // ========================
  const clampPct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, n));
  };

  const precioVentaNum = useMemo(() => {
    const n = Number(String(form.precio ?? "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }, [form.precio]);

  const costoNumVista = useMemo(() => {
    const raw = String(form.precio_costo ?? "").trim();
    if (raw === "") return null;
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }, [form.precio_costo]);

  const descuentoEstado = useMemo(() => {
    const raw = String(form.descuento ?? "").trim();

    if (raw === "") return { valido: true, pct: 0, mostrar: 0 };

    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n)) return { valido: false, pct: null, mostrar: null };
    if (n < 0 || n > 100) return { valido: false, pct: null, mostrar: null };

    const clamped = clampPct(n);
    return { valido: true, pct: clamped ?? 0, mostrar: n };
  }, [form.descuento]);

  const precioFinalVista = useMemo(() => {
    if (precioVentaNum === null) return null;
    if (!descuentoEstado.valido) return null;

    const final = precioVentaNum * (1 - (descuentoEstado.pct ?? 0) / 100);
    return Number(final.toFixed(2));
  }, [precioVentaNum, descuentoEstado]);

  const gananciaVista = useMemo(() => {
    if (precioFinalVista === null) return null;
    if (costoNumVista === null) return null;

    const g = precioFinalVista - costoNumVista;
    return Number(g.toFixed(2));
  }, [precioFinalVista, costoNumVista]);

  // ✅ Impuesto seleccionado (vista)
  const impuestoSeleccionado = useMemo(() => {
    const id = Number(form.impuesto_id);
    if (!Number.isFinite(id) || id <= 0) return null;
    return impuestos.find((x) => Number(x.id) === id) || null;
  }, [form.impuesto_id, impuestos]);

  const impuestoPct = useMemo(() => {
    if (!impuestoSeleccionado) return null;
    const n = Number(impuestoSeleccionado.porcentaje);
    return Number.isFinite(n) ? n : null;
  }, [impuestoSeleccionado]);

  const impuestoMontoVista = useMemo(() => {
    if (precioFinalVista === null) return null;
    if (impuestoPct === null) return null;
    const m = precioFinalVista * (impuestoPct / 100);
    return Number(m.toFixed(2));
  }, [precioFinalVista, impuestoPct]);

  const totalConImpuestoVista = useMemo(() => {
    if (precioFinalVista === null) return null;
    if (impuestoMontoVista === null) return null;
    return Number((precioFinalVista + impuestoMontoVista).toFixed(2));
  }, [precioFinalVista, impuestoMontoVista]);

  // ========================
  // Cargar catálogos
  // ========================
  useEffect(() => {
    let mounted = true;

    const cargarCatalogos = async () => {
      try {
        const [cats, ubs, uns, imps] = await Promise.all([
          api.get("/categorias"),
          api.get("/ubicaciones"),
          api.get("/unidades"),
          api.get("/impuestos?activo=1"), // ✅ NUEVO (solo activos)
        ]);

        if (!mounted) return;

        setCategorias(Array.isArray(cats.data) ? cats.data : []);
        setUbicaciones(Array.isArray(ubs.data) ? ubs.data : []);

        const listaUnidades = Array.isArray(uns.data) ? uns.data : [];
        setUnidades(listaUnidades.filter((u) => !!u.activo));

        const listaImpuestos = Array.isArray(imps.data) ? imps.data : [];
        setImpuestos(listaImpuestos);

        // ✅ si aún no hay seleccionado y existe ISV 15%, seleccionarlo por defecto (ERP friendly)
        setForm((f) => {
          if (String(f.impuesto_id || "").trim() !== "") return f;

          const isv15 =
            listaImpuestos.find(
              (x) =>
                String(x?.nombre || "")
                  .toLowerCase()
                  .includes("15") || Number(x?.porcentaje) === 15
            ) || null;

          return { ...f, impuesto_id: isv15 ? String(isv15.id) : "" };
        });
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setCategorias([]);
        setUbicaciones([]);
        setUnidades([]);
        setImpuestos([]);
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

  // ✅ Ordenar impuestos por porcentaje y nombre
  const impuestosOrdenados = useMemo(() => {
    const copy = [...impuestos];
    copy.sort((a, b) => {
      const pa = Number(a.porcentaje);
      const pb = Number(b.porcentaje);
      if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb)
        return pa - pb;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });
    return copy;
  }, [impuestos]);

  // ========================
  // Handlers
  // ========================
  const handleChange = (e) => {
    const { name, value } = e.target;
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
      // ✅ fecha válida
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

      if (tieneContenido) {
        const n = Number(contenidoStr.replace(",", "."));
        if (!Number.isFinite(n) || n <= 0) {
          alert("Cantidad/Contenido debe ser un número válido mayor a 0.");
          setLoading(false);
          return;
        }
      }

      // ✅ Precio venta
      const pv = Number(String(form.precio ?? "").replace(",", "."));
      if (!Number.isFinite(pv) || pv < 0) {
        alert("Precio de venta inválido.");
        setLoading(false);
        return;
      }

      // ✅ Costo (opcional)
      const costoStr = String(form.precio_costo ?? "").trim();
      const costoNum =
        costoStr === "" ? null : Number(costoStr.replace(",", "."));
      if (costoNum !== null && (!Number.isFinite(costoNum) || costoNum < 0)) {
        alert("Precio de costo inválido.");
        setLoading(false);
        return;
      }

      // ✅ Descuento (opcional)
      const descStr = String(form.descuento ?? "").trim();
      const descNum = descStr === "" ? 0 : Number(descStr.replace(",", "."));
      if (!Number.isFinite(descNum) || descNum < 0 || descNum > 100) {
        alert("Descuento debe estar entre 0 y 100.");
        setLoading(false);
        return;
      }

      // ✅ Impuesto (obligatorio recomendado ERP)
      const impStr = String(form.impuesto_id || "").trim();
      const impId = impStr === "" ? null : Number(impStr);
      if (!impId || !Number.isFinite(impId) || impId <= 0) {
        alert("Selecciona un impuesto válido.");
        setLoading(false);
        return;
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

      // ✅ Payload SIN ...form (evita sobreescrituras)
      const payload = {
        codigo: String(form.codigo || "").trim(),
        nombre: String(form.nombre || "").trim(),
        lote: (form.lote || "").trim() || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        descripcion: String(form.descripcion || "").trim() || null,

        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        ubicacion_id: form.ubicacion_id ? Number(form.ubicacion_id) : null,

        // ✅ impuesto
        impuesto_id: impId,

        stock: Number(form.stock) || 0,
        stock_minimo: Number(form.stock_minimo) || 1,

        // ✅ precios
        precio: pv,
        precio_costo: costoNum,
        descuento: descNum,

        // ✅ medidas
        contenido_medida: tieneContenido
          ? Number(contenidoStr.replace(",", "."))
          : null,
        unidad_medida_id: tieneUnidad ? Number(unidadIdStr) : null,

        imagen: imageUrl || null,
        usuario_id,
      };

      console.log("✅ Payload enviado a /productos:", payload);

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
        impuesto_id: impStr || "", // se reasigna abajo si existe ISV 15%
        stock: 0,
        stock_minimo: 1,

        precio_costo: "",
        precio: "",
        descuento: "",

        contenido_medida: "",
        unidad_medida_id: "",
        imagen: "",
      });

      // ✅ re-seleccionar impuesto por defecto (ISV 15%) si está disponible
      setForm((f) => {
        const isv15 =
          impuestosOrdenados.find(
            (x) =>
              String(x?.nombre || "")
                .toLowerCase()
                .includes("15") || Number(x?.porcentaje) === 15
          ) || null;
        return { ...f, impuesto_id: isv15 ? String(isv15.id) : "" };
      });

      setImagenFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Error al agregar el producto"
      );
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

        {/* ✅ IMPUESTO (NUEVO) */}
        <div className="col-md-4 col-12">
          <label className="form-label">Impuesto</label>
          <select
            className="form-select"
            name="impuesto_id"
            value={form.impuesto_id}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar</option>
            {impuestosOrdenados.map((imp) => (
              <option key={imp.id} value={imp.id}>
                {imp.nombre} — {Number(imp.porcentaje)}%
              </option>
            ))}
          </select>

          {impuestoSeleccionado && (
            <small className="text-muted d-block mt-1">
              Aplicará:{" "}
              <strong>{`${impuestoSeleccionado.nombre} (${Number(
                impuestoSeleccionado.porcentaje
              )}%)`}</strong>
            </small>
          )}

          <small className="text-muted">
            Los impuestos se administran en “Mantenimiento → Impuestos”.
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

        {/* ✅ PRECIOS + DESCUENTO */}
        <div className="col-md-4 col-12">
          <label className="form-label">Precio de costo</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`form-control ${
              form.precio_costo !== "" && costoNumVista === null
                ? "is-invalid"
                : ""
            }`}
            name="precio_costo"
            value={form.precio_costo}
            onChange={handleChange}
            placeholder="Opcional"
          />
          {form.precio_costo !== "" && costoNumVista === null && (
            <small className="text-danger d-block mt-1">
              Costo inválido. Debe ser un número mayor o igual a 0.
            </small>
          )}
          <small className="text-muted">(Opcional)</small>
        </div>

        <div className="col-md-4 col-12">
          <label className="form-label">Precio de venta</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`form-control ${
              precioVentaNum === null && form.precio !== "" ? "is-invalid" : ""
            }`}
            name="precio"
            value={form.precio}
            onChange={handleChange}
            required
          />
          {precioVentaNum === null && form.precio !== "" && (
            <small className="text-danger d-block mt-1">
              Precio de venta inválido. Debe ser un número mayor o igual a 0.
            </small>
          )}
        </div>

        <div className="col-md-4 col-12">
          <label className="form-label">Descuento (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className={`form-control ${
              descuentoEstado.valido ? "" : "is-invalid"
            }`}
            name="descuento"
            value={form.descuento}
            onChange={handleChange}
            placeholder="0"
          />

          {!descuentoEstado.valido && (
            <small className="text-danger d-block mt-1">
              Descuento inválido. Debe ser un número entre 0 y 100.
            </small>
          )}

          {precioVentaNum !== null && descuentoEstado.valido && (
            <small className="text-muted d-block mt-1">
              Precio final: <strong>{`L ${precioFinalVista}`}</strong>
            </small>
          )}

          {precioFinalVista !== null && costoNumVista !== null && (
            <small
              className={`d-block mt-1 ${
                gananciaVista < 0 ? "text-danger" : "text-muted"
              }`}
            >
              Ganancia estimada: <strong>{`L ${gananciaVista}`}</strong>
              {gananciaVista < 0 ? " (pérdida)" : ""}
            </small>
          )}

          {impuestoSeleccionado && totalConImpuestoVista !== null && (
            <small className="text-muted d-block mt-1">
              Impuesto ({Number(impuestoSeleccionado.porcentaje)}%):{" "}
              <strong>{`L ${impuestoMontoVista}`}</strong> — Total con impuesto:{" "}
              <strong>{`L ${totalConImpuestoVista}`}</strong>
            </small>
          )}

          <small className="text-muted">(0 a 100, opcional)</small>
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
            disabled={
              loading ||
              !descuentoEstado.valido ||
              (form.precio_costo !== "" && costoNumVista === null) ||
              (form.precio !== "" && precioVentaNum === null) ||
              String(form.impuesto_id || "").trim() === ""
            }
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
