import { Routes, Route, useLocation } from "react-router-dom";
import { useState } from "react";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import WhatsAppFloatingButton from "./components/WhatsAppFloatingButton.jsx";
import ClienteMayoristaModal from "./components/ClienteMayoristaModal.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import LinksPage from "./pages/LinksPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

function App() {
  const [showRegistro, setShowRegistro] = useState(false);
  const location = useLocation();
  const esPaginaEnlaces = location.pathname === "/enlaces";

  if (esPaginaEnlaces) {
    return (
      <Routes>
        <Route path="/enlaces" element={<LinksPage />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell d-flex flex-column min-vh-100">
      <Navbar onQuieroSerCliente={() => setShowRegistro(true)} />

      <main className="flex-grow-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/productos" element={<ProductsPage />} />
          <Route path="/categoria/:id" element={<ProductsPage />} />
          <Route path="/producto/:id" element={<ProductDetailPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/contacto" element={<ContactPage />} />
          <Route path="/sobre-nosotros" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer onQuieroSerCliente={() => setShowRegistro(true)} />
      <WhatsAppFloatingButton />
      <ClienteMayoristaModal
        show={showRegistro}
        onClose={() => setShowRegistro(false)}
      />
    </div>
  );
}

export default App;
