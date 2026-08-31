import { useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import api from "../api/axios";

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;
const POLL_MS = 30000;

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const getToken = () => {
  const raw = localStorage.getItem("token");
  if (!raw) return "";
  const c = raw.replace(/^"+|"+$/g, "").trim();
  return c.toLowerCase().startsWith("bearer ") ? c.slice(7).trim() : c;
};

/**
 * Campanita de pedidos web. Sondea /pedidos/resumen cada 30s y muestra los
 * pedidos en estado "nuevo". Al elegir uno lleva al módulo de Pedidos.
 */
export default function NotificacionesPedidos({ onChangePage = () => {} }) {
  const [nuevos, setNuevos] = useState(0);
  const [recientes, setRecientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const ref = useRef(null);
  const prevNuevosRef = useRef(null); // null = primera carga (no alertar)
  const audioCtxRef = useRef(null);
  const sseOkRef = useRef(false); // ¿el stream en vivo está conectado?

  // Sonido de "nuevo pedido": dos beeps ascendentes (Web Audio, sin archivos)
  const sonarNuevoPedido = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      [
        { f: 880, t: 0 },
        { f: 1175, t: 0.14 },
      ].forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now + t);
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.22, now + t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.3);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.32);
      });
    } catch {
      /* audio no disponible */
    }
  };

  const dispararAlerta = () => {
    sonarNuevoPedido();
    try {
      navigator.vibrate?.([25, 40, 25]);
    } catch {
      /* no soportado */
    }
    setShake(true);
    setTimeout(() => setShake(false), 900);
  };

  const cargar = async () => {
    try {
      const res = await api.get("/pedidos/resumen");
      setNuevos(Number(res.data?.nuevos || 0));
      setRecientes(Array.isArray(res.data?.recientes) ? res.data.recientes : []);
    } catch {
      /* silencioso: no romper el navbar si falla */
    }
  };

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Fallback por sondeo: si el stream en vivo NO está conectado, avisa cuando
  // el contador sube. Si el SSE está activo, él es quien dispara la alerta.
  useEffect(() => {
    const prev = prevNuevosRef.current;
    if (prev !== null && nuevos > prev && !sseOkRef.current) {
      dispararAlerta();
    }
    prevNuevosRef.current = nuevos;
  }, [nuevos]);

  // 🔴 Tiempo real: Server-Sent Events
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const es = new EventSource(
      `${API_BASE_URL}/pedidos-stream?token=${encodeURIComponent(token)}`,
    );

    es.addEventListener("ready", () => {
      sseOkRef.current = true;
    });
    es.addEventListener("nuevo-pedido", () => {
      cargar();
      dispararAlerta();
    });
    es.onerror = () => {
      // EventSource reintenta solo; mientras tanto vuelve el sondeo
      sseOkRef.current = false;
    };

    return () => {
      sseOkRef.current = false;
      es.close();
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const irAPedidos = async (pedidoId) => {
    setOpen(false);
    try {
      if (pedidoId) await api.patch(`/pedidos/${pedidoId}/leido`);
    } catch {
      /* ignorar */
    }
    onChangePage("pedidos");
  };

  return (
    <div className="np-wrapper" ref={ref}>
      <button
        type="button"
        className={`np-bell ${shake ? "np-bell--shake" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Pedidos nuevos"
      >
        <FaBell />
        {nuevos > 0 && (
          <span className={`np-badge ${shake ? "np-badge--pulse" : ""}`}>
            {nuevos > 9 ? "9+" : nuevos}
          </span>
        )}
      </button>

      {open && (
        <div className="np-dropdown">
          <div className="np-dropdown__head">
            <span>Pedidos nuevos</span>
            {nuevos > 0 && <span className="np-count">{nuevos}</span>}
          </div>

          {recientes.length === 0 ? (
            <div className="np-empty">No hay pedidos nuevos.</div>
          ) : (
            <ul className="np-list">
              {recientes.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => irAPedidos(p.id)}>
                    <span className="np-list__name">
                      {p.cliente_nombre}
                      {!p.leido && <span className="np-dot" />}
                    </span>
                    <span className="np-list__meta">
                      {money(p.total_aprox)} ·{" "}
                      {p.entrega === "envio" ? "Envío" : "Recoge"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="np-dropdown__foot"
            onClick={() => irAPedidos(null)}
          >
            Ver todos los pedidos
          </button>
        </div>
      )}

      <style>{`
        .np-wrapper { position: relative; }
        .np-bell {
          position: relative;
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.08);
          background: #f8f9fa;
          color: #6c757d;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; cursor: pointer; transition: all .2s;
        }
        .np-bell:hover { background: #eef0f4; color: #2d3748; }

        .np-bell--shake {
          animation: np-shake 0.9s cubic-bezier(.36,.07,.19,.97) both;
          background: #fff4d6;
          color: #d97706;
          border-color: #f5c04e;
        }
        @keyframes np-shake {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70% { transform: rotate(-14deg); }
          20%, 40%, 60%, 80% { transform: rotate(14deg); }
          90% { transform: rotate(-6deg); }
        }
        .np-badge--pulse { animation: np-pulse 0.9s ease-in-out 2; }
        @keyframes np-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.35); box-shadow: 0 0 0 4px rgba(220,53,69,0.25); }
        }
        @media (prefers-reduced-motion: reduce) {
          .np-bell--shake { animation: none; }
          .np-badge--pulse { animation: none; }
        }
        @media (max-width: 575.98px) {
          .np-bell { width: 34px; height: 34px; font-size: 0.9rem; }
        }
        @media (max-width: 575.98px) {
          .np-dropdown { width: calc(100vw - 24px); right: -8px; }
        }
        .np-badge {
          position: absolute; top: -3px; right: -3px;
          min-width: 18px; height: 18px; padding: 0 4px;
          border-radius: 9px; background: #dc3545; color: #fff;
          font-size: 0.68rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 2px #fff;
        }
        .np-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 300px; background: #fff;
          border: 1px solid rgba(0,0,0,0.08); border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
          z-index: 9999; overflow: hidden;
        }
        .np-dropdown__head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.7rem 0.9rem; font-weight: 700; font-size: 0.85rem;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .np-count {
          background: rgba(220,53,69,0.12); color: #dc3545;
          border-radius: 6px; padding: 1px 7px; font-size: 0.72rem;
        }
        .np-empty { padding: 1rem 0.9rem; color: #6c757d; font-size: 0.85rem; }
        .np-list { list-style: none; margin: 0; padding: 0; max-height: 320px; overflow-y: auto; }
        .np-list li button {
          width: 100%; text-align: left; background: transparent; border: none;
          padding: 0.6rem 0.9rem; cursor: pointer;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          display: flex; flex-direction: column; gap: 2px;
        }
        .np-list li button:hover { background: #f8f9fa; }
        .np-list__name {
          font-size: 0.85rem; font-weight: 600; color: #2d3748;
          display: flex; align-items: center; gap: 6px;
        }
        .np-list__meta { font-size: 0.75rem; color: #6c757d; }
        .np-dot { width: 7px; height: 7px; border-radius: 50%; background: #0d6efd; }
        .np-dropdown__foot {
          width: 100%; background: #f8f9fa; border: none;
          padding: 0.6rem; font-size: 0.8rem; font-weight: 600; color: #0d6efd;
          cursor: pointer;
        }
        .np-dropdown__foot:hover { background: #eef0f4; }
      `}</style>
    </div>
  );
}
