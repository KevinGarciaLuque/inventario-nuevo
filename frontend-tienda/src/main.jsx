import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/global.css";
import { CartProvider } from "./context/CartContext.jsx";
import { SiteConfigProvider } from "./context/SiteConfigContext.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <SiteConfigProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </SiteConfigProvider>
    </BrowserRouter>
  </StrictMode>,
);
