import { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { BsClockHistory } from "react-icons/bs";
import { useUser } from "../context/UserContext";

const MINUTOS_INACTIVIDAD = 20;
const SEGUNDOS_AVISO = 60; // muestra el aviso 60s antes de cerrar sesión

const TIMEOUT_MS = MINUTOS_INACTIVIDAD * 60 * 1000;
const WARNING_MS = TIMEOUT_MS - SEGUNDOS_AVISO * 1000;

const EVENTOS_ACTIVIDAD = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

export default function InactivityWatcher() {
  const { user, logout } = useUser();
  const [showWarning, setShowWarning] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(SEGUNDOS_AVISO);

  // Refleja showWarning en un ref para que el listener de actividad
  // (que no se vuelve a registrar en cada render) siempre lea el valor
  // actual sin tener que reiniciar los timers cuando el modal aparece.
  const showWarningRef = useRef(false);
  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const countdownRef = useRef(null);

  const limpiarTimers = () => {
    clearTimeout(warningTimerRef.current);
    clearTimeout(logoutTimerRef.current);
    clearInterval(countdownRef.current);
  };

  const cerrarPorInactividad = () => {
    limpiarTimers();
    setShowWarning(false);
    logout();
  };

  const iniciarTimers = () => {
    limpiarTimers();

    warningTimerRef.current = setTimeout(() => {
      setSegundosRestantes(SEGUNDOS_AVISO);
      setShowWarning(true);

      countdownRef.current = setInterval(() => {
        setSegundosRestantes((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }, WARNING_MS);

    logoutTimerRef.current = setTimeout(cerrarPorInactividad, TIMEOUT_MS);
  };

  const seguirConectado = () => {
    setShowWarning(false);
    iniciarTimers();
  };

  useEffect(() => {
    if (!user) {
      limpiarTimers();
      return;
    }

    const registrarActividad = () => {
      // Mientras el aviso está visible, solo "Seguir conectado" reinicia
      // el conteo (si no, mover el mouse sobre el modal lo cerraría solo).
      if (showWarningRef.current) return;
      iniciarTimers();
    };

    iniciarTimers();
    EVENTOS_ACTIVIDAD.forEach((ev) =>
      window.addEventListener(ev, registrarActividad, { passive: true }),
    );

    return () => {
      limpiarTimers();
      EVENTOS_ACTIVIDAD.forEach((ev) =>
        window.removeEventListener(ev, registrarActividad),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  return (
    <Modal show={showWarning} onHide={seguirConectado} centered backdrop="static">
      <Modal.Body className="text-center py-4">
        <BsClockHistory size={54} color="#ffc107" className="mb-3" />
        <h5 className="mb-2 fw-bold">¿Sigues ahí?</h5>
        <p className="text-muted mb-1">
          Tu sesión se cerrará por inactividad en
        </p>
        <p className="fs-3 fw-bold text-warning mb-3">{segundosRestantes}s</p>
        <div className="d-flex gap-2 justify-content-center">
          <Button variant="outline-secondary" onClick={cerrarPorInactividad}>
            Cerrar sesión
          </Button>
          <Button variant="warning" onClick={seguirConectado}>
            Seguir conectado
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
