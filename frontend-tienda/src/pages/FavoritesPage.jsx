import { Link } from "react-router-dom";
import { useFavorites } from "../context/FavoritesContext.jsx";
import ProductCard from "../components/ProductCard.jsx";

const FavoritesPage = () => {
  const { items } = useFavorites();

  if (items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h1 className="h3 fw-bold mb-3">Aún no tienes favoritos</h1>
        <p className="text-secondary mb-4">
          Toca el corazón de un producto para guardarlo aquí.
        </p>
        <Link to="/productos" className="btn btn-warning fw-semibold">Ver productos</Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h1 className="h3 fw-bold mb-4">Tus favoritos</h1>
      <div className="row g-4">
        {items.map((p) => (
          <div className="col-6 col-md-4 col-lg-3" key={p.id}>
            <ProductCard producto={p} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesPage;
