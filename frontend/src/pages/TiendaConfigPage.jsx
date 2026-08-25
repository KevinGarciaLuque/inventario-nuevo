import { useEffect, useState } from "react";
import { Badge, Tabs, Tab } from "react-bootstrap";
import { BsCheckCircleFill, BsStarFill, BsStar, BsTrash, BsPlus } from "react-icons/bs";
import api from "../api/axios";
import CarruselConfigTab from "./CarruselConfigTab";
import CategoriaImagenesTab from "./CategoriaImagenesTab";

const CAMPOS_CONFIG = [
  { key: "facebook_url", label: "Facebook (URL)", placeholder: "https://facebook.com/tuempresa" },
  { key: "instagram_url", label: "Instagram (URL)", placeholder: "https://instagram.com/tuempresa" },
  { key: "tiktok_url", label: "TikTok (URL)", placeholder: "https://tiktok.com/@tuempresa" },
  { key: "correo", label: "Correo de contacto", placeholder: "contacto@tuempresa.com" },
  { key: "direccion", label: "Dirección", placeholder: "Tegucigalpa, Honduras" },
  { key: "horario", label: "Horario de atención", placeholder: "Lun - Sáb, 9:00am - 6:00pm" },
  {
    key: "maps_embed_url",
    label: "URL de Google Maps (embed)",
    placeholder: "https://maps.google.com/maps?q=Tegucigalpa,Honduras&output=embed",
    hint: 'No pegues el link normal de "Compartir" (ej. maps.app.goo.gl) — ese Google lo bloquea. En Google Maps: busca tu ubicación → Compartir → pestaña "Insertar un mapa" → copia solo la URL de adentro de src="..." (empieza con https://www.google.com/maps/embed?pb=...).',
  },
];

export default function TiendaConfigPage() {
  const [config, setConfig] = useState({});
  const [telefonos, setTelefonos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    window.clearTimeout(window.__tiendaConfigTimer);
    window.__tiendaConfigTimer = window.setTimeout(() => setMensaje(null), 3000);
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tienda-config");
      setConfig(res.data.config || {});
      setTelefonos(res.data.telefonos || []);
    } catch {
      mostrarMensaje("danger", "No se pudo cargar la configuración.");
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const guardarConfig = async () => {
    try {
      setGuardando(true);
      await api.put("/tienda-config", config);
      mostrarMensaje("success", "Configuración guardada correctamente.");
    } catch {
      mostrarMensaje("danger", "No se pudo guardar la configuración.");
    }
    setGuardando(false);
  };

  const agregarTelefono = async (e) => {
    e.preventDefault();
    if (!nuevoNumero.trim()) return;
    try {
      await api.post("/tienda-config/telefonos", {
        numero: nuevoNumero.trim(),
        etiqueta: nuevaEtiqueta.trim(),
      });
      setNuevoNumero("");
      setNuevaEtiqueta("");
      cargar();
    } catch {
      mostrarMensaje("danger", "No se pudo agregar el teléfono.");
    }
  };

  const marcarPrincipal = async (id) => {
    try {
      await api.patch(`/tienda-config/telefonos/${id}/principal`);
      cargar();
    } catch {
      mostrarMensaje("danger", "No se pudo marcar como principal.");
    }
  };

  const eliminarTelefono = async (id) => {
    try {
      await api.delete(`/tienda-config/telefonos/${id}`);
      cargar();
    } catch {
      mostrarMensaje("danger", "No se pudo eliminar el teléfono.");
    }
  };

  return (
    <div className="container py-4">
      <h3 className="mb-1">Configuración de la Tienda Web</h3>
      <p className="text-muted mb-4">
        Estos datos se usan en la tienda pública: redes sociales, contacto, y el
        teléfono principal para el botón flotante de WhatsApp y el envío de pedidos.
      </p>

      {mensaje && (
        <div className={`alert alert-${mensaje.tipo} py-2`}>{mensaje.texto}</div>
      )}

      <Tabs defaultActiveKey="contacto" className="mb-4">
        <Tab eventKey="contacto" title="Redes y contacto">
      <div className="row g-4 mt-0">
        <div className="col-lg-7">
          <div className="bg-white shadow-sm rounded p-4">
            <h5 className="mb-3">Redes sociales y contacto</h5>
            {CAMPOS_CONFIG.map((campo) => (
              <div className="mb-3" key={campo.key}>
                <label className="form-label small fw-semibold">{campo.label}</label>
                <input
                  className="form-control"
                  placeholder={campo.placeholder}
                  value={config[campo.key] || ""}
                  onChange={(e) => handleChange(campo.key, e.target.value)}
                  disabled={loading}
                />
                {campo.hint && (
                  <small className="text-muted d-block mt-1">{campo.hint}</small>
                )}
              </div>
            ))}
            <button
              className="btn btn-primary"
              onClick={guardarConfig}
              disabled={guardando || loading}
            >
              <BsCheckCircleFill className="me-1" />
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="bg-white shadow-sm rounded p-4">
            <h5 className="mb-3">Teléfonos de la empresa</h5>
            <p className="text-muted small">
              El teléfono marcado con ⭐ es el que se usa en el botón flotante de
              WhatsApp y en "Enviar pedido por WhatsApp" de la tienda.
            </p>

            <form onSubmit={agregarTelefono} className="d-flex gap-2 mb-3">
              <input
                className="form-control"
                placeholder="Número (ej. 50493877292)"
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
              />
              <input
                className="form-control"
                placeholder="Etiqueta (opcional)"
                value={nuevaEtiqueta}
                onChange={(e) => setNuevaEtiqueta(e.target.value)}
                style={{ maxWidth: 140 }}
              />
              <button className="btn btn-success" type="submit">
                <BsPlus size={20} />
              </button>
            </form>

            <ul className="list-group">
              {telefonos.length === 0 && (
                <li className="list-group-item text-muted text-center">
                  {loading ? "Cargando..." : "No hay teléfonos registrados"}
                </li>
              )}
              {telefonos.map((t) => (
                <li
                  key={t.id}
                  className="list-group-item d-flex align-items-center justify-content-between"
                >
                  <div>
                    <span className="fw-semibold">{t.numero}</span>
                    {t.etiqueta && (
                      <Badge bg="secondary" className="ms-2">{t.etiqueta}</Badge>
                    )}
                    {!!t.es_principal && (
                      <Badge bg="warning" text="dark" className="ms-2">Principal</Badge>
                    )}
                  </div>
                  <div className="d-flex gap-1">
                    {!t.es_principal && (
                      <button
                        className="btn btn-outline-warning btn-sm"
                        title="Marcar como principal"
                        onClick={() => marcarPrincipal(t.id)}
                      >
                        <BsStar />
                      </button>
                    )}
                    {!!t.es_principal && (
                      <button className="btn btn-warning btn-sm" disabled title="Principal">
                        <BsStarFill />
                      </button>
                    )}
                    <button
                      className="btn btn-outline-danger btn-sm"
                      title="Eliminar"
                      onClick={() => eliminarTelefono(t.id)}
                    >
                      <BsTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
        </Tab>

        <Tab eventKey="carrusel" title="Carrusel de inicio">
          <CarruselConfigTab />
        </Tab>

        <Tab eventKey="categorias" title="Imágenes de categorías">
          <CategoriaImagenesTab />
        </Tab>
      </Tabs>
    </div>
  );
}
