// frontend/src/pages/AddProduct/EditProductModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { CheckCircleFill, XCircleFill } from "react-bootstrap-icons";
import api from "../../api/axios";
import { renderCategoriaOptions } from "../../utils/categoriasOptions.jsx";
import ProductoPadreSelector from "../../components/ProductoPadreSelector.jsx";

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:3000/api")
  .replace(/\/api\/?$/i, "")
  .trim();

export default function EditProductModal({
  show,
  product,
  categorias = [],
  ubicaciones = [],
  impuestos = [],
  unidades = [],
  usuario_id = null,
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    marca: "",
    lote: "",
    fecha_vencimiento: "",
    contenido_medida: "",
    unidad_medida_id: "",
    dimensiones: "",
    impuesto_id: "",
    descripcion: "",
    categoria_id: "",
    ubicacion_id: "",
    stock: 0,
    stock_minimo: 1,
    precio_costo: "",
    precio: "",
    precio_mayorista: "",
    descuento: "",
    imagen: "",
  });

  const [imagenFile, setImagenFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [productoPadre, setProductoPadre] = useState(null);
  const [varianteNombre, setVarianteNombre] = useState("");

  // ✅ Validación código (único)
  const [codigoVerificando, setCodigoVerificando] = useState(false);
  const [codigoExiste, setCodigoExiste] = useState(false);
  const [codigoMsg, setCodigoMsg] = useState("");
  const codigoTimerRef = useRef(null);

 
  // Estado de modal feedback
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [successType, setSuccessType] = useState("success"); // success | danger

  // ✅ Ordenamientos similares a AddProductPage
  const impuestosOrdenados = useMemo(() => {
    const arr = Array.isArray(impuestos) ? [...impuestos] : [];
    arr.sort((a, b) => Number(a?.porcentaje || 0) - Number(b?.porcentaje || 0));
    return arr;
  }, [impuestos]);

  const unidadesOrdenadas = useMemo(() => {
    const arr = Array.isArray(unidades) ? [...unidades] : [];
    arr.sort((a, b) =>
      String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es"),
    );
    return arr;
  }, [unidades]);

  const impuestoSeleccionado = useMemo(() => {
    const id = Number(String(form.impuesto_id || "").trim());
    if (!id) return null;
    return impuestosOrdenados.find((x) => Number(x?.id) === id) || null;
  }, [form.impuesto_id, impuestosOrdenados]);

  // ✅ Vistas tipo AddProductPage
  const precioVentaNum = useMemo(() => {
    const s = String(form.precio ?? "").trim();
    if (s === "") return null;
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [form.precio]);

  const costoNumVista = useMemo(() => {
    const s = String(form.precio_costo ?? "").trim();
    if (s === "") return null;
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [form.precio_costo]);

  const descuentoEstado = useMemo(() => {
    const s = String(form.descuento ?? "").trim();
    if (s === "") return { valido: true, num: 0 };
    const n = Number(s.replace(",", "."));
    const ok = Number.isFinite(n) && n >= 0 && n <= 100;
    return { valido: ok, num: ok ? n : null };
  }, [form.descuento]);

  const precioFinalVista = useMemo(() => {
    if (precioVentaNum === null) return null;
    const desc = descuentoEstado.valido ? Number(descuentoEstado.num || 0) : 0;
    const pf = precioVentaNum * (1 - desc / 100);
    return pf.toFixed(2);
  }, [precioVentaNum, descuentoEstado]);

  const impuestoMontoVista = useMemo(() => {
    if (!impuestoSeleccionado) return null;
    if (precioFinalVista === null) return null;
    const base = Number(precioFinalVista);
    const pct = Number(impuestoSeleccionado.porcentaje || 0);
    const m = base * (pct / 100);
    return m.toFixed(2);
  }, [impuestoSeleccionado, precioFinalVista]);

  const totalConImpuestoVista = useMemo(() => {
    if (precioFinalVista === null) return null;
    if (!impuestoSeleccionado) return null;
    const base = Number(precioFinalVista);
    const imp = Number(impuestoMontoVista || 0);
    return (base + imp).toFixed(2);
  }, [precioFinalVista, impuestoSeleccionado, impuestoMontoVista]);

  // ============
  // Cargar producto en form
  // ============
  useEffect(() => {
    if (!product) return;

    setForm({
      codigo: product.codigo || "",
      nombre: product.nombre || "",
      marca: product.marca || "",
      lote: product.lote || "",
      fecha_vencimiento: product.fecha_vencimiento
        ? String(product.fecha_vencimiento).slice(0, 10)
        : "",
      contenido_medida:
        product.contenido_medida != null
          ? String(product.contenido_medida)
          : "",
      unidad_medida_id:
        product.unidad_medida_id != null
          ? String(product.unidad_medida_id)
          : "",
      dimensiones: product.dimensiones || "",
      impuesto_id:
        product.impuesto_id != null ? String(product.impuesto_id) : "",
      descripcion: product.descripcion || "",
      categoria_id:
        product.categoria_id != null ? String(product.categoria_id) : "",
      ubicacion_id:
        product.ubicacion_id != null ? String(product.ubicacion_id) : "",
      stock: Number(product.stock || 0),
      stock_minimo: Number(product.stock_minimo || 1),
      precio_costo:
        product.precio_costo != null && product.precio_costo !== ""
          ? String(product.precio_costo)
          : "",
      precio: product.precio != null ? String(product.precio) : "",
      precio_mayorista:
        product.precio_mayorista != null && product.precio_mayorista !== ""
          ? String(product.precio_mayorista)
          : "",
      descuento:
        product.descuento != null && product.descuento !== ""
          ? String(product.descuento)
          : "",
      imagen: product.imagen || "",
    });

    // preview imagen
    const img = product.imagen;
    if (!img) {
      setPreview(null);
    } else if (String(img).startsWith("http")) {
      setPreview(img);
    } else if (String(img).startsWith("/uploads")) {
      setPreview(API_ROOT + img);
    } else {
      setPreview(API_ROOT + "/uploads/" + img);
    }

    setImagenFile(null);
    setCodigoExiste(false);
    setCodigoMsg("");

    // Variante (opcional)
    setProductoPadre(
      product.producto_padre_id
        ? {
            id: product.producto_padre_id,
            nombre: product.producto_padre_nombre || "",
            codigo: product.producto_padre_codigo || "",
          }
        : null,
    );
    setVarianteNombre(product.variante_nombre || "");
  }, [product]);

  // ============
  // Helpers
  // ============
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Al elegir el producto principal, copia sus datos (nombre, categoría,
  // precio, etc.) — así solo falta cambiar código, imagen y color.
  const handleSeleccionarPadre = (p) => {
    setProductoPadre(p);
    setForm((f) => ({
      ...f,
      nombre: p.nombre || f.nombre,
      marca: p.marca ?? f.marca,
      descripcion: p.descripcion ?? f.descripcion,
      categoria_id: p.categoria_id != null ? String(p.categoria_id) : f.categoria_id,
      ubicacion_id: p.ubicacion_id != null ? String(p.ubicacion_id) : f.ubicacion_id,
      impuesto_id: p.impuesto_id != null ? String(p.impuesto_id) : f.impuesto_id,
      precio: p.precio != null ? String(p.precio) : f.precio,
      precio_mayorista:
        p.precio_mayorista != null ? String(p.precio_mayorista) : f.precio_mayorista,
      contenido_medida:
        p.contenido_medida != null ? String(p.contenido_medida) : f.contenido_medida,
      unidad_medida_id:
        p.unidad_medida_id != null ? String(p.unidad_medida_id) : f.unidad_medida_id,
      dimensiones: p.dimensiones ?? f.dimensiones,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImagenFile(file);
    if (preview) {
      try {
        // si preview es de URL local creada por createObjectURL, revocar
        if (String(preview).startsWith("blob:")) URL.revokeObjectURL(preview);
      } catch {}
    }
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  // ✅ Validar código único en edición (si no cambias el código, permite)
  const verificarCodigoUnico = async (codigoRaw) => {
    const codigo = String(codigoRaw || "").trim();

    if (!codigo) {
      setCodigoExiste(false);
      setCodigoMsg("");
      return true;
    }

    // Si es el mismo código del producto actual, no validar como duplicado
    const codigoActual = String(product?.codigo || "").trim();
    if (codigoActual && codigo === codigoActual) {
      setCodigoExiste(false);
      setCodigoMsg("");
      return true;
    }

    setCodigoVerificando(true);

    try {
      // 200 => existe
      await api.get(`/productos/by-codigo/${encodeURIComponent(codigo)}`);
      setCodigoExiste(true);
      setCodigoMsg("⚠️ Este código ya existe.");
      return false;
    } catch (err) {
      const status = err?.response?.status;

      if (status === 404) {
        setCodigoExiste(false);
        setCodigoMsg("✅ Código disponible.");
        return true;
      }

      const msg =
        err?.userMessage ||
        err?.response?.data?.message ||
        err?.message ||
        "Error desconocido";

      console.error("❌ Error validando código:", msg, err);
      setCodigoExiste(false);
      setCodigoMsg("⚠️ No se pudo validar el código.");
      return false;
    } finally {
      setCodigoVerificando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ 0) validar código único
      const codigoTrim = String(form.codigo || "").trim();
      const okCodigo = await verificarCodigoUnico(codigoTrim);
      if (!okCodigo) {
        setLoading(false);
        return;
      }

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
          "Si usas medidas, completa Cantidad/Contenido y Unidad de medida.",
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

      // ✅ Precio de mayorista (opcional, solo para el catálogo PDF)
      const mayoristaStr = String(form.precio_mayorista ?? "").trim();
      const mayoristaNum =
        mayoristaStr === "" ? null : Number(mayoristaStr.replace(",", "."));
      if (
        mayoristaNum !== null &&
        (!Number.isFinite(mayoristaNum) || mayoristaNum < 0)
      ) {
        alert("Precio de mayorista inválido.");
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

      // ✅ Impuesto
      const impStr = String(form.impuesto_id || "").trim();
      const impId = impStr === "" ? null : Number(impStr);
      if (!impId || !Number.isFinite(impId) || impId <= 0) {
        alert("Selecciona un impuesto válido.");
        setLoading(false);
        return;
      }

      // ✅ Subir imagen si existe
      let imageUrl = form.imagen || "";
      if (imagenFile) {
        const formData = new FormData();
        formData.append("imagen", imagenFile);
        try {
          const res = await api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          imageUrl =
            res.data?.path || res.data?.url || res.data?.filename || "";
        } catch (err) {
          setSuccessType("danger");
          setSuccessMsg("Error al subir la imagen.");
          setShowSuccess(true);
          setLoading(false);
          return;
        }
      }

      // ✅ payload completo con los campos nuevos (igual que AddProduct)
      const payload = {
        codigo: codigoTrim,
        nombre: String(form.nombre || "").trim(),
        marca: String(form.marca || "").trim() || null,
        lote: String(form.lote || "").trim() || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        descripcion: String(form.descripcion || "").trim() || null,

        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        ubicacion_id: form.ubicacion_id ? Number(form.ubicacion_id) : null,

        impuesto_id: impId,

        stock: Number(form.stock) || 0,
        stock_minimo: Number(form.stock_minimo) || 1,

        precio: pv,
        precio_mayorista: mayoristaNum,
        precio_costo: costoNum,
        descuento: descNum,

        contenido_medida: tieneContenido
          ? Number(contenidoStr.replace(",", "."))
          : null,
        unidad_medida_id: tieneUnidad ? Number(unidadIdStr) : null,
        dimensiones: String(form.dimensiones || "").trim() || null,

        imagen: imageUrl || null,
        usuario_id: usuario_id || undefined,

        // ✅ variante (opcional)
        producto_padre_id: productoPadre?.id || null,
        variante_nombre: varianteNombre.trim() || null,
      };

      await api.put(`/productos/${product.id}`, payload);

      setSuccessType("success");
      setSuccessMsg("¡Producto actualizado correctamente!");
      setShowSuccess(true);

      onUpdated?.();
    } catch (error) {
      console.error(error);
      setSuccessType("danger");
      setSuccessMsg(
        error?.response?.data?.message ||
          error?.message ||
          "Error al actualizar el producto.",
      );
      setShowSuccess(true);
    }

    setLoading(false);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    onClose?.();
  };

  if (!show) return null;

  return (
    <>
      {/* Modal principal */}
      <Modal show={show} onHide={onClose} centered size="lg" backdrop="static">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Editar Producto</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div className="row g-3">
              {/* Código */}
              <div className="col-md-4 col-12">
                <Form.Label>Código</Form.Label>
                <Form.Control
                  name="codigo"
                  value={form.codigo}
                  onChange={(e) => {
                    handleChange(e);

                    const val = e.target.value;
                    if (codigoTimerRef.current)
                      clearTimeout(codigoTimerRef.current);
                    codigoTimerRef.current = setTimeout(() => {
                      verificarCodigoUnico(val);
                    }, 350);
                  }}
                  onBlur={(e) => verificarCodigoUnico(e.target.value)}
                  required
                  isInvalid={codigoExiste}
                />
                {codigoVerificando ? (
                  <small className="text-muted">Verificando código...</small>
                ) : codigoMsg ? (
                  <small
                    className={codigoExiste ? "text-danger" : "text-success"}
                  >
                    {codigoMsg}
                  </small>
                ) : null}
              </div>

              {/* Nombre */}
              <div className="col-md-4 col-12">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Marca */}
              <div className="col-md-4 col-12">
                <Form.Label>Marca</Form.Label>
                <Form.Control
                  name="marca"
                  value={form.marca}
                  onChange={handleChange}
                  placeholder="Opcional"
                />
              </div>

              {/* Lote */}
              <div className="col-md-4 col-12">
                <Form.Label>Lote</Form.Label>
                <Form.Control
                  name="lote"
                  value={form.lote}
                  onChange={handleChange}
                  placeholder="Ej: LOTE-2025-001"
                />
              </div>

              {/* Fecha vencimiento */}
              <div className="col-md-4 col-12">
                <Form.Label>Fecha de vencimiento</Form.Label>
                <Form.Control
                  type="date"
                  name="fecha_vencimiento"
                  value={form.fecha_vencimiento}
                  onChange={handleChange}
                />
                <small className="text-muted">(Opcional)</small>
              </div>

              {/* Contenido */}
              <div className="col-md-4 col-12">
                <Form.Label>Cantidad / Contenido</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  name="contenido_medida"
                  value={form.contenido_medida}
                  onChange={handleChange}
                  placeholder="Ej: 5, 2.5, 750"
                />
                <small className="text-muted">(Opcional)</small>
              </div>

              {/* Unidad */}
              <div className="col-md-4 col-12">
                <Form.Label>Unidad de medida</Form.Label>
                <Form.Select
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
                </Form.Select>
                <small className="text-muted">
                  Las unidades se administran en el módulo “Unidades de Medida”.
                </small>
              </div>

              {/* Dimensiones */}
              <div className="col-md-4 col-12">
                <Form.Label>Dimensiones</Form.Label>
                <Form.Control
                  name="dimensiones"
                  value={form.dimensiones}
                  onChange={handleChange}
                  placeholder='Ej: 120cm x 180cm x 62cm'
                />
                <small className="text-muted">(Opcional)</small>
              </div>

              {/* Impuesto */}
              <div className="col-md-4 col-12">
                <Form.Label>Impuesto</Form.Label>
                <Form.Select
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
                </Form.Select>

                {impuestoSeleccionado && (
                  <small className="text-muted d-block mt-1">
                    Aplicará:{" "}
                    <strong>
                      {`${impuestoSeleccionado.nombre} (${Number(
                        impuestoSeleccionado.porcentaje,
                      )}%)`}
                    </strong>
                  </small>
                )}

                <small className="text-muted">
                  Los impuestos se administran en “Mantenimiento → Impuestos”.
                </small>
              </div>

              {/* Categoría */}
              <div className="col-md-4 col-12">
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  name="categoria_id"
                  value={form.categoria_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar</option>
                  {renderCategoriaOptions(categorias)}
                </Form.Select>
              </div>

              {/* Ubicación */}
              <div className="col-md-4 col-12">
                <Form.Label>Ubicación</Form.Label>
                <Form.Select
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
                </Form.Select>
              </div>

              {/* Stock */}
              <div className="col-md-4 col-12">
                <Form.Label>Stock</Form.Label>
                <Form.Control
                  type="number"
                  name="stock"
                  value={form.stock}
                  min={0}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Stock mínimo */}
              <div className="col-md-4 col-12">
                <Form.Label>Stock mínimo</Form.Label>
                <Form.Control
                  type="number"
                  name="stock_minimo"
                  value={form.stock_minimo}
                  min={1}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Precio costo */}
              <div className="col-md-4 col-12">
                <Form.Label>Precio de costo</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  name="precio_costo"
                  value={form.precio_costo}
                  onChange={handleChange}
                  placeholder="Opcional"
                />
                <small className="text-muted">(Opcional)</small>
              </div>

              {/* Precio venta */}
              <div className="col-md-4 col-12">
                <Form.Label>Precio de venta</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  name="precio"
                  value={form.precio}
                  onChange={handleChange}
                  required
                  isInvalid={
                    precioVentaNum === null && String(form.precio).trim() !== ""
                  }
                />
                {precioVentaNum === null &&
                  String(form.precio).trim() !== "" && (
                    <small className="text-danger d-block mt-1">
                      Precio de venta inválido. Debe ser un número mayor o igual
                      a 0.
                    </small>
                  )}
              </div>

              {/* Precio mayorista */}
              <div className="col-md-4 col-12">
                <Form.Label>Precio de mayorista</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  name="precio_mayorista"
                  value={form.precio_mayorista}
                  onChange={handleChange}
                  placeholder="Opcional"
                />
                <small className="text-muted">
                  Solo se usa al exportar el catálogo en PDF.
                </small>
              </div>

              {/* Descuento */}
              <div className="col-md-4 col-12">
                <Form.Label>Descuento (%)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  name="descuento"
                  value={form.descuento}
                  onChange={handleChange}
                  placeholder="0"
                  isInvalid={!descuentoEstado.valido}
                />
                {!descuentoEstado.valido && (
                  <small className="text-danger d-block mt-1">
                    Descuento inválido. Debe ser un número entre 0 y 100.
                  </small>
                )}

                {precioVentaNum !== null &&
                  descuentoEstado.valido &&
                  precioFinalVista !== null && (
                    <small className="text-muted d-block mt-1">
                      Precio final: <strong>{`L ${precioFinalVista}`}</strong>
                    </small>
                  )}

                {impuestoSeleccionado && totalConImpuestoVista !== null && (
                  <small className="text-muted d-block mt-1">
                    Impuesto ({Number(impuestoSeleccionado.porcentaje)}%):{" "}
                    <strong>{`L ${impuestoMontoVista}`}</strong> — Total con
                    impuesto: <strong>{`L ${totalConImpuestoVista}`}</strong>
                  </small>
                )}

                <small className="text-muted">(0 a 100, opcional)</small>
              </div>

              {/* Descripción */}
              <div className="col-12">
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  name="descripcion"
                  rows={2}
                  value={form.descripcion}
                  onChange={handleChange}
                />
              </div>

              {/* Imagen */}
              <div className="col-12 col-sm-6">
                <Form.Label>Imagen</Form.Label>
                <Form.Control
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                />
                {preview && (
                  <div className="mt-2">
                    <img
                      src={preview}
                      alt="preview"
                      className="img-thumbnail"
                      style={{ maxHeight: 90, maxWidth: "100%" }}
                    />
                  </div>
                )}
              </div>

              {/* Variante */}
              <div className="col-12">
                <hr className="my-2" />
                <Form.Label className="fw-bold mb-1">
                  Color / opción de este producto (opcional)
                </Form.Label>
                <div className="text-muted small mb-2">
                  Ponle el nombre del color de <strong>este</strong> producto
                  (ej. "Azul"). Si además es una variante de otro producto que
                  ya creaste (mismo modelo, otro color), búscalo abajo para
                  copiar sus datos y enlazarlos.
                </div>
                <div className="row g-2">
                  <div className="col-md-4 col-12">
                    <Form.Control
                      placeholder="Nombre de este color/opción (ej. Azul)"
                      value={varianteNombre}
                      onChange={(e) => setVarianteNombre(e.target.value)}
                    />
                  </div>
                  <div className="col-md-8 col-12">
                    <ProductoPadreSelector
                      padreSeleccionado={productoPadre}
                      onSeleccionar={handleSeleccionarPadre}
                      onQuitar={() => setProductoPadre(null)}
                      excluirId={product?.id}
                    />
                    <small className="text-muted">
                      Producto principal (opcional) — solo si este color es
                      una variante de otro producto.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
            <Button
              variant="outline-secondary"
              onClick={onClose}
              disabled={loading}
              className="w-40 w-sm-auto"
            >
              Cancelar
            </Button>

            <Button
              variant="primary"
              type="submit"
              disabled={
                loading ||
                codigoExiste ||
                codigoVerificando ||
                !descuentoEstado.valido ||
                (String(form.unidad_medida_id || "").trim() !== "" &&
                  String(form.contenido_medida || "").trim() === "") ||
                (String(form.contenido_medida || "").trim() !== "" &&
                  String(form.unidad_medida_id || "").trim() === "") ||
                String(form.impuesto_id || "").trim() === ""
              }
              className="w-40 w-sm-auto"
            >
              {loading ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <Spinner size="sm" animation="border" /> Guardando...
                </span>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de éxito/error */}
      <Modal
        show={showSuccess}
        onHide={handleCloseSuccess}
        centered
        backdrop="static"
      >
        <Modal.Body className="text-center py-4">
          {successType === "success" ? (
            <CheckCircleFill size={65} color="#198754" className="mb-3" />
          ) : (
            <XCircleFill size={65} color="#dc3545" className="mb-3" />
          )}

          <h4
            className={`mb-3 fw-bold ${
              successType === "success" ? "text-success" : "text-danger"
            }`}
          >
            {successMsg}
          </h4>

          <Button
            variant={successType === "success" ? "success" : "danger"}
            size="lg"
            className="px-4"
            onClick={handleCloseSuccess}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
}
