import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Card } from "react-bootstrap";
import { FaEnvelope, FaWhatsapp, FaClock, FaInstagram } from "react-icons/fa";

const Soporte = forwardRef((props, ref) => {
  const [show, setShow] = useState(false);

  useImperativeHandle(ref, () => ({
    abrirModal: () => {
      reproducirSonido("abrir");
      setShow(true);
    },
  }));

  const handleClose = () => {
    reproducirSonido("cerrar");
    setShow(false);
  };

  const reproducirSonido = (tipo) => {
    const archivo = tipo === "abrir" ? "/abrir.mp3" : "/cerrar.mp3";
    const audio = new Audio(archivo);
    audio
      .play()
      .catch((err) =>
        console.warn(`🔇 Error al reproducir sonido (${tipo}):`, err)
      );
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Contacto de Soporte</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Card className="text-center shadow-sm">
          <Card.Body>
            <Card.Title>
              Kevin Garcia <br /> Desarrollador de Sistemas
            </Card.Title>
            <Card.Text className="text-start">
              <p>
                <FaEnvelope className="me-2 text-primary" />
                <strong>Correo:</strong> kevinxgt90@gmail.com
              </p>
              <p>
                <FaWhatsapp className="me-2 text-success" />
                <strong>WhatsApp:</strong> +504 9387-7292
              </p>
              <p>
                <FaInstagram className="me-2 text-danger" />
                <strong>Instagram:</strong>{" "}
                <a
                  href="https://www.instagram.com/pixeldigital.hn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pixeldigital.hn
                </a>
              </p>
              <p>
                <FaClock className="me-2 text-warning" />
                <strong>Horario:</strong> Lunes a Viernes, 8:00am - 5:00pm
              </p>
            </Card.Text>
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default Soporte;
