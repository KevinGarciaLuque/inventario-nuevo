import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import ProductCard from "../components/ProductCard.jsx";
import HeroCarousel from "../components/HeroCarousel.jsx";

const CATEGORIA_EMOJI = {
  maquillaje: "💄",
  carteras: "👜",
  mochilas: "🎒",
};

const HomePage = () => {
  const [categorias, setCategorias] = useState([]);
  const [destacados, setDestacados] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    Promise.all([
      api.get("/public/categorias"),
      api.get("/public/productos"),
    ])
      .then(([resCat, resProd]) => {
        if (!activo) return;
        setCategorias(resCat.data || []);
        setDestacados((resProd.data || []).slice(0, 8));
      })
      .catch(() => {})
      .finally(() => activo && setCargando(false));

    return () => {
      activo = false;
    };
  }, []);

  const categoriasPrincipales = useMemo(
    () => categorias.filter((cat) => !cat.categoria_padre_id),
    [categorias],
  );

  // El loop infinito se logra duplicando la tira y desplazándola con JS.
  // Si hay pocas categorías, una sola tanda no llena el ancho de pantallas
  // grandes y se ve un hueco antes de reiniciar. Repetimos la tanda base
  // hasta cubrir un ancho holgado antes de duplicarla para el loop.
  const categoriasLoop = useMemo(() => {
    if (categoriasPrincipales.length === 0) return [];
    const minTiles = 14;
    const repeticiones = Math.max(1, Math.ceil(minTiles / categoriasPrincipales.length));
    const tanda = Array.from({ length: repeticiones }, () => categoriasPrincipales).flat();
    return [...tanda, ...tanda];
  }, [categoriasPrincipales]);

  // Auto-scroll continuo + arrastre manual (mouse o dedo). Se controla todo
  // con un transform aplicado a mano en vez de una animación CSS, para poder
  // combinar el desplazamiento automático con el drag del usuario.
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const halfWidthRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isHoverRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const movedRef = useRef(false);

  const applyTransform = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${-offsetRef.current}px)`;
    }
  }, []);

  useEffect(() => {
    const medir = () => {
      if (trackRef.current) {
        halfWidthRef.current = trackRef.current.scrollWidth / 2;
      }
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [categoriasLoop]);

  useEffect(() => {
    if (categoriasLoop.length === 0) return undefined;
    const SPEED_PX_S = 40;
    let lastTime = null;
    let frameId;

    const step = (time) => {
      if (lastTime == null) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const half = halfWidthRef.current;
      if (!isDraggingRef.current && !isHoverRef.current && half > 0) {
        let next = offsetRef.current + SPEED_PX_S * dt;
        next = ((next % half) + half) % half;
        offsetRef.current = next;
        applyTransform();
      }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [categoriasLoop, applyTransform]);

  const handlePointerDown = useCallback((e) => {
    if (!trackRef.current) return;
    isDraggingRef.current = true;
    movedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    // Nota: NO capturamos el puntero aquí. Si lo hiciéramos, un clic simple
    // sobre una categoría dispararía el `click` en este <div> y no en el
    // <Link>, y la navegación no ocurriría. Capturamos recién al arrastrar.
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDraggingRef.current) return;
      const delta = dragStartXRef.current - e.clientX;

      if (!movedRef.current && Math.abs(delta) > 5) {
        movedRef.current = true;
        try {
          trackRef.current?.setPointerCapture(e.pointerId);
        } catch {
          /* algunos navegadores lanzan si el pointer ya se soltó */
        }
      }

      if (!movedRef.current) return;

      const half = halfWidthRef.current;
      let next = dragStartOffsetRef.current + delta;
      if (half > 0) next = ((next % half) + half) % half;
      offsetRef.current = next;
      applyTransform();
    },
    [applyTransform],
  );

  const handlePointerUp = useCallback((e) => {
    isDraggingRef.current = false;
    if (trackRef.current?.hasPointerCapture?.(e.pointerId)) {
      trackRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handleTileClick = useCallback((e) => {
    if (movedRef.current) {
      e.preventDefault();
    }
  }, []);

  return (
    <div className="home-page">
      <HeroCarousel />

      <section className="py-5 category-carousel-section">
        <h2 className="h4 fw-bold mb-4 container">Categorías</h2>
        {categorias.length === 0 && !cargando && (
          <p className="text-secondary container">Aún no hay categorías disponibles.</p>
        )}
        {categoriasPrincipales.length > 0 && (
          <div
            className="category-carousel"
            onMouseEnter={() => {
              isHoverRef.current = true;
            }}
            onMouseLeave={() => {
              isHoverRef.current = false;
            }}
          >
            <div
              className="category-carousel-track"
              ref={trackRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {categoriasLoop.map((cat, idx) => (
                <Link
                  to={`/categoria/${cat.id}`}
                  className="category-tile"
                  key={`${cat.id}-${idx}`}
                  onClick={handleTileClick}
                  draggable={false}
                >
                  <span
                    className="category-circle"
                    style={
                      cat.imagen
                        ? {
                            backgroundImage: `url(${cat.imagen})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    {!cat.imagen && (
                      <span className="category-emoji">
                        {CATEGORIA_EMOJI[cat.nombre?.toLowerCase()] || "🛍️"}
                      </span>
                    )}
                  </span>
                  <span className="fw-semibold">{cat.nombre}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h4 fw-bold mb-0">Productos destacados</h2>
          <Link to="/productos" className="link-warning fw-semibold">
            Ver todos →
          </Link>
        </div>
        <div className="row g-4">
          {destacados.map((p) => (
            <div className="col-6 col-md-4 col-lg-3" key={p.id}>
              <ProductCard producto={p} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
