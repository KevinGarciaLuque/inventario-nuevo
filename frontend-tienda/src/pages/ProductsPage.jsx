import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import ProductCard from "../components/ProductCard.jsx";

const ProductsPage = () => {
  const { id: categoriaIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";

  const [texto, setTexto] = useState(q);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/public/categorias").then((res) => setCategorias(res.data || [])).catch(() => {});
  }, []);

  // Filtrado en vivo: espera una pequeña pausa mientras se escribe
  // antes de actualizar la URL/consulta, para no disparar una
  // petición por cada tecla.
  useEffect(() => {
    const handle = setTimeout(() => {
      const actual = searchParams.get("q") || "";
      if (texto.trim() === actual) return;
      const next = texto.trim() ? { q: texto.trim() } : {};
      setSearchParams(next, { replace: true });
    }, 300);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    const params = {};
    if (categoriaIdParam) params.categoria_id = categoriaIdParam;
    if (q) params.q = q;

    api
      .get("/public/productos", { params })
      .then((res) => activo && setProductos(res.data || []))
      .catch(() => activo && setError("No se pudieron cargar los productos."))
      .finally(() => activo && setCargando(false));

    return () => {
      activo = false;
    };
  }, [categoriaIdParam, q]);

  const categoriaActual = categorias.find((c) => String(c.id) === categoriaIdParam);

  return (
    <div className="container py-5">
      <h1 className="h3 fw-bold mb-4">
        {categoriaActual ? categoriaActual.nombre : "Todos los productos"}
      </h1>

      <div className="row g-4">
        <aside className="col-lg-3">
          <div className="input-group mb-4">
            <span className="input-group-text bg-white">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="form-control"
              placeholder="Buscar producto..."
            />
          </div>

          <h6 className="fw-bold mb-2">Categorías</h6>
          <ul className="list-unstyled d-flex flex-column gap-1">
            <li>
              <Link to="/productos" className={`category-link ${!categoriaIdParam ? "active" : ""}`}>
                Todas
              </Link>
            </li>
            {categorias.map((cat) => (
              <li key={cat.id}>
                <Link
                  to={`/categoria/${cat.id}`}
                  className={`category-link ${String(cat.id) === categoriaIdParam ? "active" : ""}`}
                >
                  {cat.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="col-lg-9">
          {cargando && <p className="text-secondary">Cargando productos...</p>}
          {error && <p className="text-danger">{error}</p>}
          {!cargando && !error && productos.length === 0 && (
            <p className="text-secondary">No hay productos disponibles en este momento.</p>
          )}

          <div className="row g-4">
            {productos.map((p) => (
              <div className="col-6 col-md-4" key={p.id}>
                <ProductCard producto={p} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
