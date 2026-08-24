import { useEffect, useRef, useState } from "react";
import api from "../api/axios";

// Permite marcar un producto como "variante" de otro ya existente (ej. el
// mismo modelo de silla en otro color). Busca por nombre/código y deja
// elegir el producto principal; el nombre de la variante (ej. "Azul") se
// captura aparte.
export default function ProductoPadreSelector({
  padreSeleccionado, // { id, nombre, codigo } | null
  onSeleccionar,
  onQuitar,
  excluirId, // no permitir elegirse a sí mismo al editar
}) {
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrar, setMostrar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const refWrap = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (refWrap.current && !refWrap.current.contains(e.target)) {
        setMostrar(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = texto.trim();
    if (!q) {
      setSugerencias([]);
      setMostrar(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setCargando(true);
        const { data } = await api.get(
          `/productos/buscar?q=${encodeURIComponent(q)}`,
        );
        const arr = (Array.isArray(data) ? data : []).filter(
          (p) => String(p.id) !== String(excluirId),
        );
        setSugerencias(arr);
        setMostrar(true);
      } catch {
        setSugerencias([]);
      } finally {
        setCargando(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [texto, excluirId]);

  if (padreSeleccionado) {
    return (
      <div className="d-flex align-items-center gap-2 border rounded p-2 bg-light">
        <div className="flex-grow-1">
          <div className="fw-semibold small">{padreSeleccionado.nombre}</div>
          {padreSeleccionado.codigo && (
            <div className="text-muted" style={{ fontSize: 12 }}>
              Código: {padreSeleccionado.codigo}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={onQuitar}
        >
          Quitar
        </button>
      </div>
    );
  }

  return (
    <div ref={refWrap} style={{ position: "relative" }}>
      <input
        className="form-control"
        placeholder="Buscar producto por nombre o código..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => texto.trim() && setMostrar(true)}
        autoComplete="off"
      />

      {mostrar && (
        <div
          className="bg-white border rounded shadow-sm"
          style={{
            position: "absolute",
            zIndex: 30,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {cargando && (
            <div className="p-2 text-muted small">Buscando...</div>
          )}
          {!cargando && sugerencias.length === 0 && (
            <div className="p-2 text-muted small">Sin resultados</div>
          )}
          {sugerencias.map((p) => (
            <button
              type="button"
              key={p.id}
              className="d-block w-100 text-start btn btn-light btn-sm border-0 rounded-0"
              onClick={() => {
                onSeleccionar(p);
                setTexto("");
                setMostrar(false);
              }}
            >
              <div className="fw-semibold">{p.nombre}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Código: {p.codigo}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
