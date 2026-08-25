import { useEffect, useRef, useState } from "react";
import { Badge } from "react-bootstrap";
import {
  BsTrash,
  BsPlus,
  BsArrowUp,
  BsArrowDown,
  BsPencil,
  BsImage,
  BsX,
} from "react-icons/bs";
import api from "../api/axios";

const CARRUSEL_ANCHO = 1920;
const CARRUSEL_ALTO = 750;

// Recorta y reescala la imagen (estilo "cover", centrada) al tamaño exacto
// del carrusel, sin importar las dimensiones originales que suba el admin.
const recortarImagenParaCarrusel = (file, targetW, targetH) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      const escala = Math.max(targetW / img.width, targetH / img.height);
      const anchoDibujo = img.width * escala;
      const altoDibujo = img.height * escala;
      const dx = (targetW - anchoDibujo) / 2;
      const dy = (targetH - altoDibujo) / 2;

      ctx.drawImage(img, dx, dy, anchoDibujo, altoDibujo);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen")),
        "image/jpeg",
        0.88,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });

const SLIDE_VACIO = {
  id: null,
  imagen_url: "",
  titulo: "",
  texto: "",
  boton_texto: "",
  boton_link: "",
  texto_color: "#ffffff",
  activo: true,
};

export default function CarruselConfigTab() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [form, setForm] = useState(SLIDE_VACIO);
  const fileInputRef = useRef(null);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    window.clearTimeout(window.__carruselConfigTimer);
    window.__carruselConfigTimer = window.setTimeout(() => setMensaje(null), 3000);
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tienda-carrusel");
      setSlides(res.data || []);
    } catch {
      mostrarMensaje("danger", "No se pudo cargar el carrusel.");
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const subirImagen = async (file) => {
    if (!file) return;
    try {
      setSubiendo(true);
      const blob = await recortarImagenParaCarrusel(file, CARRUSEL_ANCHO, CARRUSEL_ALTO);
      const data = new FormData();
      data.append("imagen", blob, "slide.jpg");
      const res = await api.post("/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      handleChange("imagen_url", res.data.path);
    } catch {
      mostrarMensaje("danger", "No se pudo subir la imagen.");
    }
    setSubiendo(false);
  };

  const limpiarForm = () => {
    setForm(SLIDE_VACIO);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const editarSlide = (slide) => {
    setForm({
      id: slide.id,
      imagen_url: slide.imagen_url || "",
      titulo: slide.titulo || "",
      texto: slide.texto || "",
      boton_texto: slide.boton_texto || "",
      boton_link: slide.boton_link || "",
      texto_color: slide.texto_color || "#ffffff",
      activo: !!slide.activo,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const guardarSlide = async (e) => {
    e.preventDefault();
    if (!form.imagen_url) {
      mostrarMensaje("danger", "Sube una imagen para el slide.");
      return;
    }
    try {
      setGuardando(true);
      if (form.id) {
        await api.put(`/tienda-carrusel/${form.id}`, form);
        mostrarMensaje("success", "Slide actualizado.");
      } else {
        await api.post("/tienda-carrusel", form);
        mostrarMensaje("success", "Slide agregado.");
      }
      limpiarForm();
      cargar();
    } catch {
      mostrarMensaje("danger", "No se pudo guardar el slide.");
    }
    setGuardando(false);
  };

  const eliminarSlide = async (id) => {
    try {
      await api.delete(`/tienda-carrusel/${id}`);
      if (form.id === id) limpiarForm();
      cargar();
    } catch {
      mostrarMensaje("danger", "No se pudo eliminar el slide.");
    }
  };

  const moverSlide = async (id, direccion) => {
    try {
      await api.patch(`/tienda-carrusel/${id}/orden`, { direccion });
      cargar();
    } catch {
      mostrarMensaje("danger", "No se pudo reordenar el slide.");
    }
  };

  return (
    <div>
      <p className="text-muted mb-3">
        Estos slides se muestran en el carrusel principal del inicio de la tienda
        pública. El orden aquí define el orden de aparición.
      </p>

      {mensaje && (
        <div className={`alert alert-${mensaje.tipo} py-2`}>{mensaje.texto}</div>
      )}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="bg-white shadow-sm rounded p-4">
            <h5 className="mb-3">{form.id ? "Editar slide" : "Nuevo slide"}</h5>
            <form onSubmit={guardarSlide}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Imagen de fondo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={(e) => subirImagen(e.target.files?.[0])}
                  disabled={subiendo}
                />
                {subiendo && <small className="text-muted">Ajustando y subiendo imagen...</small>}
                <small className="text-muted d-block mt-1">
                  Cualquier imagen sirve: se recorta y ajusta automáticamente al tamaño
                  del carrusel (1920x750px).
                </small>
                {form.imagen_url && (
                  <div
                    className="mt-2 rounded border"
                    style={{
                      height: 120,
                      backgroundImage: `url(${form.imagen_url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                )}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Título</label>
                <input
                  className="form-control"
                  value={form.titulo}
                  onChange={(e) => handleChange("titulo", e.target.value)}
                  placeholder="Ej. Carteras y mochilas"
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Texto</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.texto}
                  onChange={(e) => handleChange("texto", e.target.value)}
                  placeholder="Ej. Para toda ocasión, con estilo y calidad."
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Color del texto</label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="color"
                    className="form-control form-control-color"
                    value={form.texto_color || "#ffffff"}
                    onChange={(e) => handleChange("texto_color", e.target.value)}
                    title="Color del título y el texto"
                  />
                  <span
                    className="px-2 py-1 rounded small"
                    style={{
                      color: form.texto_color || "#ffffff",
                      background: "#333",
                      border: "1px solid #555",
                    }}
                  >
                    Vista previa del texto
                  </span>
                </div>
                <small className="text-muted d-block mt-1">
                  Úsalo si el color por defecto (blanco) no se lee bien sobre tu imagen.
                </small>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Texto del botón</label>
                  <input
                    className="form-control"
                    value={form.boton_texto}
                    onChange={(e) => handleChange("boton_texto", e.target.value)}
                    placeholder="Ver catálogo"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Link del botón</label>
                  <input
                    className="form-control"
                    value={form.boton_link}
                    onChange={(e) => handleChange("boton_link", e.target.value)}
                    placeholder="/productos"
                  />
                </div>
              </div>

              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="slideActivo"
                  checked={form.activo}
                  onChange={(e) => handleChange("activo", e.target.checked)}
                />
                <label className="form-check-label" htmlFor="slideActivo">
                  Visible en la tienda
                </label>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-primary" type="submit" disabled={guardando || subiendo}>
                  <BsPlus className="me-1" />
                  {guardando ? "Guardando..." : form.id ? "Guardar cambios" : "Agregar slide"}
                </button>
                {form.id && (
                  <button type="button" className="btn btn-outline-secondary" onClick={limpiarForm}>
                    <BsX className="me-1" />
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="bg-white shadow-sm rounded p-4">
            <h5 className="mb-3">Slides actuales</h5>
            {loading && <p className="text-muted">Cargando...</p>}
            {!loading && slides.length === 0 && (
              <p className="text-muted text-center py-4">
                <BsImage size={28} className="mb-2 d-block mx-auto" />
                No hay slides. Agrega el primero desde el formulario.
              </p>
            )}
            <ul className="list-group">
              {slides.map((slide, idx) => (
                <li key={slide.id} className="list-group-item">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded flex-shrink-0"
                      style={{
                        width: 72,
                        height: 48,
                        backgroundImage: `url(${slide.imagen_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: "#f0f0f0",
                      }}
                    />
                    <div className="flex-grow-1">
                      <div className="fw-semibold">
                        {slide.titulo || <span className="text-muted fst-italic">Sin título</span>}
                        {!slide.activo && (
                          <Badge bg="secondary" className="ms-2">Oculto</Badge>
                        )}
                      </div>
                      {slide.texto && <div className="text-muted small">{slide.texto}</div>}
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        title="Subir"
                        disabled={idx === 0}
                        onClick={() => moverSlide(slide.id, "arriba")}
                      >
                        <BsArrowUp />
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        title="Bajar"
                        disabled={idx === slides.length - 1}
                        onClick={() => moverSlide(slide.id, "abajo")}
                      >
                        <BsArrowDown />
                      </button>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        title="Editar"
                        onClick={() => editarSlide(slide)}
                      >
                        <BsPencil />
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        title="Eliminar"
                        onClick={() => eliminarSlide(slide.id)}
                      >
                        <BsTrash />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
