import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="container py-5 text-center">
    <h1 className="display-6 fw-bold mb-3">404</h1>
    <p className="text-secondary mb-4">Página no encontrada.</p>
    <Link to="/" className="btn btn-warning fw-semibold">Volver al inicio</Link>
  </div>
);

export default NotFoundPage;
