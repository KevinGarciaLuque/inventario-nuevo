import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import ProductCard from "../components/ProductCard.jsx";
import { SITE_INFO } from "../config/site.js";
import logo from "../assets/LaurenLogo.png";

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

  return (
    <div className="home-page">
      <section className="hero">
        <div className="container py-5 text-center">
          <img src={logo} alt={SITE_INFO.nombre} className="hero-logo mb-3" />
          <h1 className="display-5 fw-bold mb-3 brand-name">{SITE_INFO.nombre}</h1>
          <p className="lead text-secondary mb-4">{SITE_INFO.descripcion}</p>
          <Link to="/productos" className="btn btn-warning btn-lg fw-semibold">
            Ver catálogo
          </Link>
        </div>
      </section>

      <section className="container py-5">
        <h2 className="h4 fw-bold mb-4">Categorías</h2>
        {categorias.length === 0 && !cargando && (
          <p className="text-secondary">Aún no hay categorías disponibles.</p>
        )}
        <div className="row g-3">
          {categorias.map((cat) => (
            <div className="col-6 col-md-3" key={cat.id}>
              <Link to={`/categoria/${cat.id}`} className="category-tile">
                <span className="category-emoji">
                  {CATEGORIA_EMOJI[cat.nombre?.toLowerCase()] || "🛍️"}
                </span>
                <span className="fw-semibold">{cat.nombre}</span>
              </Link>
            </div>
          ))}
        </div>
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
