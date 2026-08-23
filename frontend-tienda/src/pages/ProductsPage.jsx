import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import ProductCard from "../components/ProductCard.jsx";

// Una fila de categoría y, si está expandida, sus hijas — recursivo, así
// que soporta cualquier profundidad (categoría > subcategoría > sub-sub).
function CategoriaItem({ nodo, nivel, categoriaIdParam, childrenMap, expandedIds, toggleExpand }) {
  const hijos = childrenMap[nodo.id] || [];
  const tieneHijos = hijos.length > 0;
  const expandida = expandedIds.has(nodo.id);

  return (
    <li>
      <div className="category-parent-row">
        <Link
          to={`/categoria/${nodo.id}`}
          className={`category-link flex-grow-1 ${nivel > 0 ? "category-sublink" : ""} ${
            String(nodo.id) === categoriaIdParam ? "active" : ""
          }`}
        >
          {nodo.nombre}
        </Link>
        {tieneHijos && (
          <button
            type="button"
            className="category-toggle"
            onClick={() => toggleExpand(nodo.id)}
            aria-expanded={expandida}
            aria-label={`Ver subcategorías de ${nodo.nombre}`}
          >
            <i className={`bi ${expandida ? "bi-chevron-down" : "bi-chevron-right"}`}></i>
          </button>
        )}
      </div>

      {tieneHijos && expandida && (
        <ul className="list-unstyled d-flex flex-column gap-1 category-sublist">
          {hijos.map((hijo) => (
            <CategoriaItem
              key={hijo.id}
              nodo={hijo}
              nivel={nivel + 1}
              categoriaIdParam={categoriaIdParam}
              childrenMap={childrenMap}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

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

  // Índice: id de padre -> lista de hijas (categoría, subcategoría o
  // sub-subcategoría; el árbol soporta cualquier profundidad)
  const childrenMap = useMemo(() => {
    const map = {};
    categorias.forEach((c) => {
      if (c.categoria_padre_id) {
        (map[c.categoria_padre_id] ||= []).push(c);
      }
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    return map;
  }, [categorias]);

  const principales = useMemo(
    () =>
      categorias
        .filter((c) => !c.categoria_padre_id)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [categorias],
  );

  const [expandedIds, setExpandedIds] = useState(new Set());

  // Si la URL apunta a una subcategoría (de cualquier nivel), despliega
  // toda la rama de ancestros para que se vea dónde está ubicada.
  useEffect(() => {
    if (!categoriaIdParam) return;
    const activa = categorias.find((c) => String(c.id) === categoriaIdParam);
    if (!activa) return;

    const idsARevelar = [];
    let actual = activa;
    while (actual?.categoria_padre_id) {
      idsARevelar.push(actual.categoria_padre_id);
      actual = categorias.find((c) => c.id === actual.categoria_padre_id);
    }
    if (idsARevelar.length === 0) return;

    setExpandedIds((prev) => {
      const next = new Set(prev);
      idsARevelar.forEach((id) => next.add(id));
      return next;
    });
  }, [categoriaIdParam, categorias]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
            {principales.map((cat) => (
              <CategoriaItem
                key={cat.id}
                nodo={cat}
                nivel={0}
                categoriaIdParam={categoriaIdParam}
                childrenMap={childrenMap}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
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
