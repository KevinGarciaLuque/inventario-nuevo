import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "react-bootstrap";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUserCircle,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";
import api from "../api/axios";
import { useUser } from "../context/UserContext";
import "../styles/Login.css";

export default function Login() {
  const { login } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Modal recuperación
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await api.post("/auth/login", { email, password });

      if (!res.data.user || !res.data.user.nombre) {
        throw new Error("Respuesta del servidor inválida: falta nombre");
      }

      login(res.data.user, res.data.token);
    } catch (err) {
      const msg = err.response?.data?.error || "Error de autenticación";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setRecoveryError("");
    setRecoverySuccess(false);

    try {
      // Simulación (ajusta según tu backend)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // await api.post("/auth/recuperar", { email: recoveryEmail });
      setRecoverySuccess(true);
      setTimeout(() => {
        setShowRecovery(false);
        setRecoveryEmail("");
        setRecoverySuccess(false);
      }, 2500);
    } catch (err) {
      setRecoveryError(
        err.response?.data?.error || "Error al enviar recuperación"
      );
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="login-bg min-vh-100 d-flex align-items-center justify-content-center ">
      <div className="container">
        <div className="row login-row align-items-center justify-content-center min-vh-100">
          {/* Título izquierdo (desktop) */}
          <motion.div
            className="col-lg-6 d-none d-lg-flex flex-column justify-content-center align-items-center"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="inicio-titulo text-white text-center w-100 mb-0">
              SISTEMA
              <br />
              DE INVENTARIO
            </h1>
          </motion.div>

          {/* Card Login */}
          <div className="col-12 col-md-8 col-lg-5 mx-auto ">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="card shadow-sm login-card glass-login">
                <div className="card-body p-4 login-card-body">
                  {/* Avatar */}
                  <motion.div
                    className="text-center mb-3"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                    }}
                  >
                    <div className="login-avatar">
                      <FaUserCircle />
                    </div>
                  </motion.div>

                  <h2 className="card-title text-center mb-1 login-title">
                    Bienvenido
                  </h2>
                  <p className="text-center text-muter mb-4 ">
                    Ingresa tus credenciales
                  </p>

                  <AnimatePresence mode="wait">
                    {errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="alert alert-danger login-alert" role="alert">
                          {errorMsg}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label login-label">
                        Correo Electrónico
                      </label>
                      <div className="login-input-wrapper">
                        <FaEnvelope className="login-input-icon" />
                        <input
                          type="email"
                          id="email"
                          className="form-control login-input"
                          placeholder="tu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="mb-2">
                      <label htmlFor="password" className="form-label login-label">
                        Contraseña
                      </label>
                      <div className="login-input-wrapper">
                        <FaLock className="login-input-icon" />
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          className="form-control login-input login-input--password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="login-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    {/* Recuperar contraseña */}
                    <div className="text-end mb-3">
                      <button
                        type="button"
                        className="login-recovery-link"
                        onClick={() => setShowRecovery(true)}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>

                    {/* Botón Login */}
                    <motion.button
                      type="submit"
                      className="btn login-btn w-100 mb-3"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="login-spinner me-2" />
                          Ingresando...
                        </>
                      ) : (
                        "Iniciar Sesión"
                      )}
                    </motion.button>
                  </form>
                </div>
              </div>

              <div className="text-center mt-3">
                <small className="text-white login-footer">
                  © {new Date().getFullYear()} Kevin Garcia. Todos los derechos
                  reservados.
                </small>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── MODAL RECUPERACIÓN ── */}
      <Modal
        show={showRecovery}
        onHide={() => {
          setShowRecovery(false);
          setRecoveryEmail("");
          setRecoveryError("");
          setRecoverySuccess(false);
        }}
        centered
        className="login-recovery-modal"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="login-modal-title">
            Recuperar Contraseña
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pb-4">
          {recoverySuccess ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-4"
            >
              <FaCheckCircle className="login-success-icon mb-3" />
              <h5 className="text-success mb-2">¡Correo enviado!</h5>
              <p className="text-muted mb-0">
                Revisa tu bandeja de entrada para restablecer tu contraseña.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleRecovery}>
              <p className="text-muted mb-3 login-modal-desc">
                Ingresa tu correo electrónico y te enviaremos un enlace para
                restablecer tu contraseña.
              </p>

              {recoveryError && (
                <div className="alert alert-danger login-alert">{recoveryError}</div>
              )}

              <div className="mb-3">
                <label className="form-label login-label">Correo Electrónico</label>
                <div className="login-input-wrapper">
                  <FaEnvelope className="login-input-icon" />
                  <input
                    type="email"
                    className="form-control login-input"
                    placeholder="tu@email.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                className="btn login-btn w-100"
                disabled={recoveryLoading}
                whileHover={{ scale: recoveryLoading ? 1 : 1.02 }}
                whileTap={{ scale: recoveryLoading ? 1 : 0.98 }}
              >
                {recoveryLoading ? (
                  <>
                    <FaSpinner className="login-spinner me-2" />
                    Enviando...
                  </>
                ) : (
                  "Enviar enlace"
                )}
              </motion.button>
            </form>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
