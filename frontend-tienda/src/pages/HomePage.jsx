import { useEffect, useMemo, useState } from "react";
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

  // El loop infinito se logra duplicando la tira y desplazándola -50%.
  // Si hay pocas categorías, una sola tanda no llena el ancho de pantallas
  // grandes y se ve un hueco antes de reiniciar. Repetimos la tanda base
  // hasta cubrir un ancho holgado antes de duplicarla para el loop.
  const { categoriasLoop, duracionLoop } = useMemo(() => {
    if (categoriasPrincipales.length === 0) return { categoriasLoop: [], duracionLoop: 28 };
    const minTiles = 14;
    const repeticiones = Math.max(1, Math.ceil(minTiles / categoriasPrincipales.length));
    const tanda = Array.from({ length: repeticiones }, () => categoriasPrincipales).flat();
    return {
      categoriasLoop: [...tanda, ...tanda],
      duracionLoop: 28 * repeticiones,
    };
  }, [categoriasPrincipales]);

  return (
    <div className="home-page">
      <HeroCarousel />

      <section className="py-5 category-carousel-section">
        <h2 className="h4 fw-bold mb-4 container">Categorías</h2>
        {categorias.length === 0 && !cargando && (
          <p className="text-secondary container">Aún no hay categorías disponibles.</p>
        )}
        {categoriasPrincipales.length > 0 && (
          <div className="category-carousel">
            <div
              className="category-carousel-track"
              style={{ animationDuration: `${duracionLoop}s` }}
            >
              {categoriasLoop.map((cat, idx) => (
                <Link
                  to={`/categoria/${cat.id}`}
                  className="category-tile"
                  key={`${cat.id}-${idx}`}
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
