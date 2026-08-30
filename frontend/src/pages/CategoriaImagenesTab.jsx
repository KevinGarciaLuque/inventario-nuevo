import { useEffect, useState } from "react";
import { BsImage, BsTrash } from "react-icons/bs";
import api from "../api/axios";

const TAMANO_IMG = 400;

// Reconstruye la URL de /uploads contra el backend actual (la BD puede tener
// guardado un dominio viejo).
const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:3000/api")
  .replace(/\/api\/?$/, "");
const resolverImg = (img) => {
  if (!img) return undefined;
  const idx = String(img).indexOf("/uploads/");
  return idx !== -1 ? API_ROOT + String(img).slice(idx) : img;
};

// Recorta y reescala la imagen (estilo "cover", centrada) a un cuadrado,
// ideal para mostrarla luego como círculo en la tienda.
const recortarImagenCuadrada = (file, tamano) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = tamano;
      canvas.height = tamano;
      const ctx = canvas.getContext("2d");

      const escala = Math.max(tamano / img.width, tamano / img.height);
      const anchoDibujo = img.width * escala;
      const altoDibujo = img.height * escala;
      const dx = (tamano - anchoDibujo) / 2;
      const dy = (tamano - altoDibujo) / 2;

      ctx.drawImage(img, dx, dy, anchoDibujo, altoDibujo);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen")),
        "image/jpeg",
        0.9,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });

export default function CategoriaImagenesTab() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subiendoId, setSubiendoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    window.clearTimeout(window.__catImgTimer);
    window.__catImgTimer = window.setTimeout(() => setMensaje(null), 3000);
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await api.get("/categorias");
      setCategorias((res.data || []).filter((c) => !c.categoria_padre_id));
    } catch {
      mostrarMensaje("danger", "No se pudo cargar las categorías.");
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardarImagen = async (cat, imagenUrl) => {
    try {
      await api.put(`/categorias/${cat.id}`, {
        nombre: cat.nombre,
        descripcion: cat.descripcion || "",
        categoria_padre_id: cat.categoria_padre_id || null,
        imagen: imagenUrl,
      });
      mostrarMensaje("success", `Imagen de "${cat.nombre}" actualizada.`);
      cargar();
    } catch {
      mostrarMensaje("danger", "No se pudo guardar la imagen.");
    }
  };

  const subirImagen = async (cat, file) => {
    if (!file) return;
    try {
      setSubiendoId(cat.id);
      const blob = await recortarImagenCuadrada(file, TAMANO_IMG);
      const data = new FormData();
      data.append("imagen", blob, "categoria.jpg");
      const res = await api.post("/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await guardarImagen(cat, res.data.path);
    } catch {
      mostrarMensaje("danger", "No se pudo subir la imagen.");
    }
    setSubiendoId(null);
  };

  const quitarImagen = async (cat) => {
    await guardarImagen(cat, "");
  };

  return (
    <div>
      <p className="text-muted mb-3">
        Sube una imagen para cada categoría principal — se recorta automáticamente
        en círculo y aparece en la fila de categorías del inicio de la tienda.
      </p>

      {mensaje && (
        <div className={`alert alert-${mensaje.tipo} py-2`}>{mensaje.texto}</div>
      )}

      <div className="bg-white shadow-sm rounded p-4">
        {loading && <p className="text-muted">Cargando...</p>}
        {!loading && categorias.length === 0 && (
          <p className="text-muted text-center py-4">
            No hay categorías principales. Créalas primero en Inventario → Categorías.
          </p>
        )}

        <div className="row g-3">
          {categorias.map((cat) => (
            <div className="col-6 col-md-4 col-lg-3" key={cat.id}>
              <div className="border rounded p-3 text-center h-100 d-flex flex-column align-items-center">
                <div
                  className="rounded-circle border mb-2 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 80,
                    height: 80,
                    backgroundImage: cat.imagen ? `url(${resolverImg(cat.imagen)})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  {!cat.imagen && <BsImage size={24} className="text-muted" />}
                </div>
                <span className="fw-semibold small mb-2">{cat.nombre}</span>

                <label
                  className="btn btn-outline-primary btn-sm w-100 mb-1"
                  style={{ cursor: subiendoId === cat.id ? "wait" : "pointer" }}
                >
                  {subiendoId === cat.id ? "Subiendo..." : cat.imagen ? "Cambiar" : "Subir imagen"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={subiendoId === cat.id}
                    onChange={(e) => subirImagen(cat, e.target.files?.[0])}
                  />
                </label>

                {cat.imagen && (
                  <button
                    className="btn btn-outline-danger btn-sm w-100"
                    onClick={() => quitarImagen(cat)}
                    disabled={subiendoId === cat.id}
                  >
                    <BsTrash className="me-1" />
                    Quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
