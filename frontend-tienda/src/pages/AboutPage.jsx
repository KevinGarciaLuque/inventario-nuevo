import { Link } from "react-router-dom";

const AboutPage = () => (
  <div className="container py-5">
    <h1 className="h3 fw-bold mb-4">Sobre Nosotros</h1>
    <div className="row">
      <div className="col-lg-8">
        <p className="text-secondary">
          Somos una tienda dedicada a ofrecer productos de calidad en
          maquillaje, carteras, mochilas y mucho más, con atención
          personalizada y precios especiales para negocios y clientes
          mayoristas.
        </p>
        <p className="text-secondary">
          Escríbenos por WhatsApp o visítanos en nuestra ubicación, o
          <Link to="/productos"> explora nuestro catálogo</Link> para conocer
          todo lo que tenemos disponible.
        </p>
      </div>
    </div>
  </div>
);

export default AboutPage;
