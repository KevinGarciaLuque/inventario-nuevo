import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { FaEnvelope, FaWhatsapp, FaClock, FaInstagram, FaTimes } from "react-icons/fa";

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
    <>
      <Modal 
        show={show} 
        onHide={handleClose} 
        centered 
        backdrop="static"
        contentClassName="soporte-modal-content"
      >
        <AnimatePresence mode="wait">
          {show && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Modal.Header className="soporte-modal-header">
                <motion.div 
                  className="soporte-header-content"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="soporte-header-icon">
                    <FaWhatsapp />
                  </div>
                  <div>
                    <Modal.Title className="soporte-modal-title">Soporte Técnico</Modal.Title>
                    <p className="soporte-modal-subtitle">Estamos aquí para ayudarte</p>
                  </div>
                </motion.div>
                <motion.button
                  className="soporte-close-btn"
                  onClick={handleClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <FaTimes />
                </motion.button>
              </Modal.Header>

              <Modal.Body className="soporte-modal-body">
                <motion.div 
                  className="soporte-card"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="soporte-avatar">
                    <img 
                      src="https://ui-avatars.com/api/?name=Kevin+Garcia&background=ffc107&color=1a1d2e&size=120&bold=true" 
                      alt="Kevin Garcia"
                    />
                  </div>
                  
                  <h5 className="soporte-name">Kevin Garcia</h5>
                  <p className="soporte-role">Desarrollador de Sistemas</p>

                  <div className="soporte-info">
                    <motion.a
                      href="mailto:kevinxgt90@gmail.com"
                      className="soporte-item"
                      whileHover={{ x: 3, backgroundColor: "rgba(59, 130, 246, 0.08)" }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="soporte-item-icon soporte-item-icon--email">
                        <FaEnvelope />
                      </div>
                      <div className="soporte-item-content">
                        <span className="soporte-item-label">Correo</span>
                        <span className="soporte-item-value">kevinxgt90@gmail.com</span>
                      </div>
                    </motion.a>

                    <motion.a
                      href="https://wa.me/50493877292"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="soporte-item"
                      whileHover={{ x: 3, backgroundColor: "rgba(34, 197, 94, 0.08)" }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="soporte-item-icon soporte-item-icon--whatsapp">
                        <FaWhatsapp />
                      </div>
                      <div className="soporte-item-content">
                        <span className="soporte-item-label">WhatsApp</span>
                        <span className="soporte-item-value">+504 9387-7292</span>
                      </div>
                    </motion.a>

                    <motion.a
                      href="https://www.instagram.com/pixeldigital.hn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="soporte-item"
                      whileHover={{ x: 3, backgroundColor: "rgba(236, 72, 153, 0.08)" }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="soporte-item-icon soporte-item-icon--instagram">
                        <FaInstagram />
                      </div>
                      <div className="soporte-item-content">
                        <span className="soporte-item-label">Instagram</span>
                        <span className="soporte-item-value">@pixeldigital.hn</span>
                      </div>
                    </motion.a>

                    <motion.div
                      className="soporte-item"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="soporte-item-icon soporte-item-icon--clock">
                        <FaClock />
                      </div>
                      <div className="soporte-item-content">
                        <span className="soporte-item-label">Horario</span>
                        <span className="soporte-item-value">Lun - Vie, 8:00am - 5:00pm</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </Modal.Body>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>

      <style>{`
        .soporte-modal-content {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: none;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }

        .soporte-modal-header {
          background: linear-gradient(135deg, #1a1d2e 0%, #2d3748 100%);
          border: none;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .soporte-header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .soporte-header-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ffc107, #ff9800);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a1d2e;
          font-size: 1.5rem;
          box-shadow: 0 4px 14px rgba(255, 193, 7, 0.4);
        }

        .soporte-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .soporte-modal-subtitle {
          font-size: 0.8rem;
          color: rgba(255, 193, 7, 0.7);
          margin: 0;
          letter-spacing: 0.3px;
        }

        .soporte-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .soporte-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.3);
        }

        .soporte-modal-body {
          padding: 2rem;
        }

        .soporte-card {
          text-align: center;
        }

        .soporte-avatar {
          width: 90px;
          height: 90px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #ffc107;
          box-shadow: 0 8px 24px rgba(255, 193, 7, 0.25);
        }

        .soporte-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .soporte-name {
          font-size: 1.35rem;
          font-weight: 700;
          color: #1a1d2e;
          margin: 0 0 0.25rem;
          letter-spacing: -0.4px;
        }

        .soporte-role {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0 0 1.5rem;
          font-weight: 500;
        }

        .soporte-info {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .soporte-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.2s;
          text-decoration: none;
          cursor: pointer;
        }

        .soporte-item:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .soporte-item-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .soporte-item-icon--email {
          background: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
        }

        .soporte-item-icon--whatsapp {
          background: rgba(34, 197, 94, 0.12);
          color: #22c55e;
        }

        .soporte-item-icon--instagram {
          background: rgba(236, 72, 153, 0.12);
          color: #ec4899;
        }

        .soporte-item-icon--clock {
          background: rgba(251, 191, 36, 0.12);
          color: #fbbf24;
        }

        .soporte-item-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          flex: 1;
        }

        .soporte-item-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .soporte-item-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          margin-top: 0.1rem;
        }

        @media (max-width: 575.98px) {
          .soporte-modal-header {
            padding: 1rem;
          }

          .soporte-header-icon {
            width: 42px;
            height: 42px;
            font-size: 1.25rem;
          }

          .soporte-modal-title {
            font-size: 1.05rem;
          }

          .soporte-modal-subtitle {
            font-size: 0.72rem;
          }

          .soporte-modal-body {
            padding: 1.25rem;
          }

          .soporte-avatar {
            width: 75px;
            height: 75px;
          }

          .soporte-name {
            font-size: 1.15rem;
          }

          .soporte-role {
            font-size: 0.8rem;
          }

          .soporte-item {
            padding: 0.7rem 0.85rem;
          }

          .soporte-item-icon {
            width: 38px;
            height: 38px;
            font-size: 1rem;
          }

          .soporte-item-value {
            font-size: 0.82rem;
          }
        }
      `}</style>
    </>
  );
});

export default Soporte;
