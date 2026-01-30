import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, InputGroup, ListGroup, Spinner } from "react-bootstrap";
import api from "../../../api/axios";

export default function BuscadorProducto({ onAgregarProducto }) {
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [idxActivo, setIdxActivo] = useState(-1);
  const [mostrar, setMostrar] = useState(false);

  // ✅ Infinite scroll (paginado)
  const [page, setPage] = useState(0);
  const [hayMas, setHayMas] = useState(true);
  const [qActivo, setQActivo] = useState("");

  const refWrap = useRef(null);
  const refInput = useRef(null);

  const esProbableCodigo = useMemo(() => {
    const t = texto.trim();
    return /^\d{6,}$/.test(t);
  }, [texto]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const onDoc = (e) => {
      if (!refWrap.current) return;
      if (!refWrap.current.contains(e.target)) {
        setMostrar(false);
        setIdxActivo(-1);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const resetPaginado = () => {
    setPage(0);
    setHayMas(true);
  };

  // ✅ Cargar primera página (debounce)
  useEffect(() => {
    const q = texto.trim();

    if (!q) {
      setSugerencias([]);
      setMostrar(false);
      setIdxActivo(-1);
      setQActivo("");
      resetPaginado();
      return;
    }

    const t = setTimeout(async () => {
      try {
        setCargando(true);
        resetPaginado();
        setQActivo(q);

        const LIMIT = 12;

        const { data } = await api.get(
          `/productos/buscar?q=${encodeURIComponent(q)}&limit=${LIMIT}&offset=0`,
        );

        const arr = Array.isArray(data) ? data : [];
        setSugerencias(arr);
        setMostrar(true);
        setIdxActivo(-1);

        if (arr.length < LIMIT) setHayMas(false);
      } catch (err) {
        setSugerencias([]);
        setMostrar(false);
        setIdxActivo(-1);
        setHayMas(false);
      } finally {
        setCargando(false);
      }
    }, 180);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  // ✅ Cargar más (scroll hacia abajo)
  const cargarMas = async () => {
    if (cargando) return;
    if (!hayMas) return;

    const q = (qActivo || texto).trim();
    if (!q) return;

    try {
      setCargando(true);

      const LIMIT = 12;
      const nextPage = page + 1;
      const offset = nextPage * LIMIT;

      const { data } = await api.get(
        `/productos/buscar?q=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${offset}`,
      );

      const arr = Array.isArray(data) ? data : [];
      if (arr.length === 0) {
        setHayMas(false);
        return;
      }

      setSugerencias((prev) => [...prev, ...arr]);
      setPage(nextPage);

      if (arr.length < LIMIT) setHayMas(false);
    } catch (err) {
      setHayMas(false);
    } finally {
      setCargando(false);
    }
  };

  // ✅ Escáner / búsqueda exacta por código
  const buscarPorCodigoExacto = async () => {
    const codigo = texto.trim();
    if (!codigo) return;

    try {
      setCargando(true);

      const { data } = await api.get(
        `/productos/by-codigo/${encodeURIComponent(codigo)}`,
      );

      onAgregarProducto?.(data);

      // limpiar y mantener foco para escanear seguido
      setTexto("");
      setSugerencias([]);
      setMostrar(false);
      setIdxActivo(-1);
      setQActivo("");
      resetPaginado();
      refInput.current?.focus();
    } catch (err) {
      setMostrar(true);
    } finally {
      setCargando(false);
    }
  };

  const seleccionar = (p) => {
    onAgregarProducto?.(p);
    setTexto("");
    setSugerencias([]);
    setMostrar(false);
    setIdxActivo(-1);
    setQActivo("");
    resetPaginado();
    refInput.current?.focus();
  };

  const onKeyDown = (e) => {
    // Enter cuando dropdown no está visible => escáner directo
    if (!mostrar && e.key === "Enter") {
      e.preventDefault();
      return buscarPorCodigoExacto();
    }

    if (e.key === "Enter") {
      e.preventDefault();

      if (idxActivo >= 0 && sugerencias[idxActivo]) {
        return seleccionar(sugerencias[idxActivo]);
      }

      if (esProbableCodigo) return buscarPorCodigoExacto();

      if (sugerencias.length === 1) return seleccionar(sugerencias[0]);

      return;
    }

    if (!mostrar) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdxActivo((v) => Math.min(v + 1, sugerencias.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdxActivo((v) => Math.max(v - 1, 0));
    } else if (e.key === "Escape") {
      setMostrar(false);
      setIdxActivo(-1);
    }
  };

  return (
    <div ref={refWrap} style={{ position: "relative" }}>
      <Form.Label className="fw-bold mb-2">Buscar Producto</Form.Label>

      <InputGroup>
        <InputGroup.Text>🔎</InputGroup.Text>

        <Form.Control
          ref={refInput}
          value={texto}
          placeholder="Escanea el código o escribe el nombre..."
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => texto.trim() && setMostrar(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />

        <Button
          variant="primary"
          onClick={buscarPorCodigoExacto}
          disabled={cargando}
        >
          {cargando ? <Spinner size="sm" /> : "Agregar"}
        </Button>
      </InputGroup>

      {mostrar && sugerencias.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 9999,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            background: "#ffffff",
            border: "1px solid #0b203b",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.15)",
            maxHeight: 320, // ✅ evita que crezca infinito en pantalla
          }}
        >
          {/* ✅ Scroll interno + infinite load */}
          <div
            style={{ maxHeight: 320, overflowY: "auto" }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const nearBottom =
                el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
              if (nearBottom) cargarMas();
            }}
          > 
            <ListGroup variant="flush">
              {sugerencias.map((p, i) => {
                const activo = i === idxActivo;
                return (
                  <ListGroup.Item
                    key={p.id ?? `${p.codigo}-${i}`}
                    action
                    active={false}
                   
                    onMouseEnter={() => setIdxActivo(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => seleccionar(p)}
                    style={{
                    
                      display: "flex",
                      justifyContent: "space-between",
                      backgroundColor: activo ? "#d1d5db" : "transparent",

                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-semibold text-truncate">
                        {p.nombre}
                      </div>
                      <small className="text-muted">
                        {p.codigo ? `Código: ${p.codigo}` : ""}
                        {typeof p.stock !== "undefined"
                          ? ` · Stock: ${p.stock}`
                          : ""}
                      </small>
                    </div>

                    <div className="fw-bold">
                      {typeof p.precio !== "undefined"
                        ? `L ${Number(p.precio).toFixed(2)}`
                        : ""}
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>

            <div
              style={{ padding: "8px 12px", fontSize: 12, color: "#e1e7f0" }}
            >
              {cargando
                ? "Cargando..."
                : hayMas
                  ? "Desplázate para ver más..."
                  : "Fin de resultados"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
