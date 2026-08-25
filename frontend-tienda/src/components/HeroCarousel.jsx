import { useEffect, useState } from "react";
import { Carousel } from "react-bootstrap";
import { Link } from "react-router-dom";
import logo from "../assets/LaurenLogo.png";
import { SITE_INFO } from "../config/site.js";
import api from "../api/axios.js";

const SLIDES_DEFAULT = [
  {
    key: "bienvenida",
    className: "hero-slide--brand",
    emoji: "🛍️",
    titulo: SITE_INFO.nombre,
    texto: SITE_INFO.descripcion,
    ctaTo: "/productos",
    ctaTexto: "Ver catálogo",
  },
  {
    key: "carteras",
    className: "hero-slide--carteras",
    emoji: "👜",
    titulo: "Carteras y mochilas",
    texto: "Para toda ocasión, con estilo y calidad.",
    ctaTo: "/productos",
    ctaTexto: "Ver catálogo",
  },
  {
    key: "maquillaje",
    className: "hero-slide--maquillaje",
    emoji: "💄",
    titulo: "Maquillaje que enamora",
    texto: "Las últimas tendencias, a un mensaje de distancia.",
    ctaTo: "/productos",
    ctaTexto: "Ver catálogo",
  },
];

const esLinkExterno = (link) => /^https?:\/\//i.test(link || "");

const HeroCarousel = () => {
  const [slides, setSlides] = useState(null);

  useEffect(() => {
    let activo = true;
    api
      .get("/public/carrusel")
      .then((res) => {
        if (activo && Array.isArray(res.data) && res.data.length > 0) {
          setSlides(res.data);
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  if (slides) {
    return (
      <Carousel fade className="hero-carousel" indicators controls interval={4500}>
        {slides.map((slide) => (
          <Carousel.Item key={slide.id}>
            <div
              className="hero-slide hero-slide--imagen"
              style={{ backgroundImage: `url(${slide.imagen_url})` }}
            >
              <div className="hero-slide-overlay" />
              <div className="hero-slide-contenido">
                {slide.titulo && (
                  <h1 className="hero-slide-title brand-name">{slide.titulo}</h1>
                )}
                {slide.texto && <p className="hero-slide-text">{slide.texto}</p>}
                {slide.boton_texto && slide.boton_link && (
                  esLinkExterno(slide.boton_link) ? (
                    <a
                      href={slide.boton_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-warning btn-lg fw-semibold"
                    >
                      {slide.boton_texto}
                    </a>
                  ) : (
                    <Link to={slide.boton_link} className="btn btn-warning btn-lg fw-semibold">
                      {slide.boton_texto}
                    </Link>
                  )
                )}
              </div>
            </div>
          </Carousel.Item>
        ))}
      </Carousel>
    );
  }

  return (
    <Carousel fade className="hero-carousel" indicators controls interval={4500}>
      {SLIDES_DEFAULT.map((slide) => (
        <Carousel.Item key={slide.key}>
          <div className={`hero-slide ${slide.className}`}>
            <img src={logo} alt={SITE_INFO.nombre} className="hero-slide-logo" />
            <span className="hero-slide-emoji">{slide.emoji}</span>
            <h1 className="hero-slide-title brand-name">{slide.titulo}</h1>
            <p className="hero-slide-text">{slide.texto}</p>
            <Link to={slide.ctaTo} className="btn btn-warning btn-lg fw-semibold">
              {slide.ctaTexto}
            </Link>
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );
};

export default HeroCarousel;
