import { Carousel } from "react-bootstrap";
import { Link } from "react-router-dom";
import logo from "../assets/LaurenLogo.png";
import { SITE_INFO } from "../config/site.js";

const SLIDES = [
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

const HeroCarousel = () => (
  <Carousel fade className="hero-carousel" indicators controls interval={4500}>
    {SLIDES.map((slide) => (
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

export default HeroCarousel;
