import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { saveAs } from "file-saver";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  FaBoxes,
  FaChartBar,
  FaExclamationTriangle,
  FaFileExcel,
  FaFilePdf,
  FaRedo,
  FaSearch,
  FaTag,
  FaWarehouse,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import api from "../api/axios";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/* ── Contador animado optimizado ── */
function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef(null);
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = to;
    if (from === to) return;

    // En móvil, actualizar instantáneamente
    if (isMobileDevice) {
      setDisplay(to);
      return;
    }

    // Cancelar animación anterior si existe
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const duration = 500;
    const start = performance.now();
    let lastUpdate = start;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      
      // Throttle: actualizar solo cada 16ms (60fps)
      if (now - lastUpdate >= 16 || progress === 1) {
        setDisplay(from + (to - from) * ease);
        lastUpdate = now;
      }
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, isMobileDevice]);

  return (
    <span>
      {prefix}
      {Number(display).toLocaleString("es-HN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ── Variantes de animación responsivas ── */
const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { 
      delay: isMobile() ? 0 : i * 0.05, 
      duration: isMobile() ? 0.2 : 0.3, 
      ease: "easeOut"
    },
  }),
};

const tableRowVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  },
};

/* ── Tarjeta KPI ── */
function KpiCard({ icon, label, sublabel, value, gradient, delay, children }) {
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return (
    <motion.div
      className="col-6 col-md-3"
      variants={fadeIn}
      custom={delay}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="rp-kpi-card h-100"
        style={{ background: gradient }}
        whileHover={isSmall ? {} : { y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="rp-kpi-icon">{icon}</div>
        <div className="rp-kpi-label">{label}</div>
        <div className="rp-kpi-value">{children || value}</div>
        <div className="rp-kpi-sub">{sublabel}</div>
        <div className="rp-kpi-glow" />
      </motion.div>
    </motion.div>
  );
}

export default function ReportsPage() {
  const [resumen, setResumen] = useState({
    productosUnicos: 0,
    totalStock: 0,
    valorInventario: 0,
    bajoStock: 0,
  });
  const [porCategoria, setPorCategoria] = useState([]);
  const [productos, setProductos] = useState([]);
  const [logoBase64, setLogoBase64] = useState(null);

  const [movimientos, setMovimientos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [productosFiltro, setProductosFiltro] = useState([]);
  const [movLoading, setMovLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    usuario_id: "",
    tipo: "",
    producto_id: "",
  });

  useEffect(() => {
    fetch("/logo.png")
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      });
  }, []);

  useEffect(() => {
    const fetchResumen = async () => {
      try {
        const productosRes = await api.get("/productos");
        const prods = productosRes.data;
        setProductos(prods);

        const productosUnicos = prods.length;
        const totalStock = prods.reduce((s, p) => s + Number(p.stock || 0), 0);
        const valorInventario = prods.reduce(
          (s, p) => s + Number(p.stock || 0) * Number(p.precio || 0),
          0
        );
        const bajoStock = prods.filter(
          (p) => Number(p.stock) < Number(p.stock_minimo)
        ).length;

        const categoriasMap = {};
        prods.forEach((p) => {
          const cat = p.categoria || "Sin Categoría";
          categoriasMap[cat] = (categoriasMap[cat] || 0) + Number(p.stock || 0);
        });
        const categoriasArray = Object.entries(categoriasMap).map(
          ([categoria, cantidad]) => ({ categoria, cantidad })
        );

        setResumen({ productosUnicos, totalStock, valorInventario, bajoStock });
        setPorCategoria(categoriasArray);
      } catch {
        setResumen({ productosUnicos: 20, totalStock: 25, valorInventario: 64000, bajoStock: 3 });
        setPorCategoria([
          { categoria: "Motor", cantidad: 6 },
          { categoria: "Frenos", cantidad: 3 },
          { categoria: "Transmisión", cantidad: 5 },
          { categoria: "Eléctrico", cantidad: 2 },
          { categoria: "Suspensión", cantidad: 4 },
        ]);
      }
    };

    api.get("/usuarios").then((res) => setUsuarios(res.data));
    api.get("/productos").then((res) => setProductosFiltro(res.data));
    fetchResumen();
    cargarMovimientos();
    // eslint-disable-next-line
  }, []);

  const cargarMovimientos = async () => {
    setMovLoading(true);
    try {
      const params = { ...filtros, limit: 15 };
      Object.keys(params).forEach((k) => params[k] === "" && delete params[k]);
      const res = await api.get("/movimientos", { params });
      setMovimientos(res.data || []);
    } catch {
      setMovimientos([]);
    }
    setMovLoading(false);
  };

  const handleFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  const limpiarFiltros = () => {
    setFiltros({ fecha_inicio: "", fecha_fin: "", usuario_id: "", tipo: "", producto_id: "" });
    setTimeout(cargarMovimientos, 0);
  };

  /* ── Exportaciones ── */
  const exportExcel = () => {
    const data = productos.map((p) => ({
      Código: p.codigo, Nombre: p.nombre, Categoría: p.categoria,
      Ubicación: p.ubicacion, Stock: p.stock, "Stock mínimo": p.stock_minimo,
      Precio: p.precio, Descripción: p.descripcion,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), "inventario.xlsx");
  };

  const exportMovimientosExcel = () => {
    const data = movimientos.map((m) => ({
      Fecha: new Date(m.fecha).toLocaleString("es-HN"),
      Producto: m.producto_nombre, Tipo: m.tipo, Cantidad: m.cantidad,
      Usuario: m.usuario_nombre || "N/A", Descripción: m.descripcion,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), "movimientos.xlsx");
  };

  const exportMovimientosPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    doc.setFontSize(16);
    doc.text("Movimientos recientes", 40, 40);
    autoTable(doc, {
      head: [["Fecha", "Producto", "Tipo", "Cantidad", "Usuario", "Descripción"]],
      body: movimientos.map((m) => [
        new Date(m.fecha).toLocaleString("es-HN"),
        m.producto_nombre, m.tipo, m.cantidad, m.usuario_nombre || "N/A", m.descripcion,
      ]),
      startY: 60, styles: { fontSize: 9 }, margin: { left: 40, right: 40 },
    });
    doc.save("movimientos_recientes.pdf");
  };

  /* ── Gráfica ── */
  const chartData = {
    labels: porCategoria.map((x) => x.categoria),
    datasets: [{
      label: "Stock total",
      data: porCategoria.map((x) => x.cantidad),
      backgroundColor: porCategoria.map((_, i) =>
        ["#ffc107","#3b82f6","#10b981","#f43f5e","#a855f7","#f97316","#06b6d4"][i % 7]
      ),
      borderRadius: 10,
      borderWidth: 0,
      hoverBackgroundColor: porCategoria.map((_, i) =>
        ["#fbbf24","#60a5fa","#34d399","#fb7185","#c084fc","#fb923c","#22d3ee"][i % 7]
      ),
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a1d2e",
        titleColor: "#ffc107",
        bodyColor: "#e2e8f0",
        padding: 12,
        cornerRadius: 10,
        borderColor: "rgba(255,193,7,0.3)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(100,116,139,0.12)" },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
    },
    animation: { duration: 1000, easing: "easeOutQuart" },
  };

  return (
    <div className="rp-root">

      {/* ── HEADER ── */}
      <motion.div
        className="rp-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="rp-header__inner">
          <div className="rp-header__icon">
            <FaChartBar />
          </div>
          <div>
            <h2 className="rp-header__title">Reportes de Inventario</h2>
            <p className="rp-header__sub">Panel de control y estadísticas en tiempo real</p>
          </div>
          <motion.button
            className="rp-export-btn ms-auto"
            onClick={exportExcel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <FaFileExcel className="me-2" />
            Exportar Excel
          </motion.button>
        </div>
      </motion.div>

      {/* ── KPIs ── */}
      <div className="row g-3 mb-4">
        <KpiCard
          delay={0}
          icon={<FaTag />}
          label="Referencias únicas"
          sublabel="Productos diferentes"
          gradient="linear-gradient(135deg,#1e3a5f 0%,#1a1d2e 100%)"
        >
          <AnimatedCounter value={resumen.productosUnicos} />
        </KpiCard>

        <KpiCard
          delay={1}
          icon={<FaBoxes />}
          label="Total en stock"
          sublabel="Suma del stock"
          gradient="linear-gradient(135deg,#78350f 0%,#1a1d2e 100%)"
        >
          <AnimatedCounter value={resumen.totalStock} />
        </KpiCard>

        <KpiCard
          delay={2}
          icon={<FaWarehouse />}
          label="Valor inventario"
          sublabel="Total estimado"
          gradient="linear-gradient(135deg,#14532d 0%,#1a1d2e 100%)"
        >
          <AnimatedCounter
            value={resumen.valorInventario}
            prefix="L "
            decimals={2}
          />
        </KpiCard>

        <KpiCard
          delay={3}
          icon={<FaExclamationTriangle />}
          label="Bajo stock"
          sublabel="Por debajo del mínimo"
          gradient="linear-gradient(135deg,#7f1d1d 0%,#1a1d2e 100%)"
        >
          <AnimatedCounter value={resumen.bajoStock} />
        </KpiCard>
      </div>

      {/* ── GRÁFICA ── */}
      <motion.div
        className="rp-card mb-4"
        variants={fadeIn}
        custom={4}
        initial="hidden"
        animate="visible"
      >
        <div className="rp-card__header">
          <span className="rp-card__icon rp-icon--amber">
            <i className="bi bi-graph-up-arrow" />
          </span>
          <span className="rp-card__title">Stock por Categoría</span>
        </div>
        <div style={{ height: 260 }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </motion.div>

      {/* ── MOVIMIENTOS ── */}
      <motion.div
        className="rp-card"
        variants={fadeIn}
        custom={5}
        initial="hidden"
        animate="visible"
      >
        <div className="rp-card__header mb-3">
          <span className="rp-card__icon rp-icon--amber">
            <i className="bi bi-clock-history" />
          </span>
          <span className="rp-card__title">Movimientos recientes</span>
        </div>

        {/* Filtros */}
        <form
          className="rp-filters row g-2 align-items-end mb-3"
          onSubmit={(e) => { e.preventDefault(); cargarMovimientos(); }}
        >
          {[
            { label: "Fecha inicio", name: "fecha_inicio", type: "date" },
            { label: "Fecha fin",    name: "fecha_fin",    type: "date" },
          ].map((f) => (
            <div className="col-6 col-md-2" key={f.name}>
              <label className="rp-label">{f.label}</label>
              <input
                type={f.type}
                className="rp-input"
                name={f.name}
                value={filtros[f.name]}
                onChange={handleFiltro}
              />
            </div>
          ))}

          <div className="col-6 col-md-2">
            <label className="rp-label">Usuario</label>
            <select className="rp-input" name="usuario_id" value={filtros.usuario_id} onChange={handleFiltro}>
              <option value="">Todos</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label className="rp-label">Producto</label>
            <select className="rp-input" name="producto_id" value={filtros.producto_id} onChange={handleFiltro}>
              <option value="">Todos</option>
              {productosFiltro.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label className="rp-label">Tipo</label>
            <select className="rp-input" name="tipo" value={filtros.tipo} onChange={handleFiltro}>
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
            </select>
          </div>

          <div className="col-12 col-md-2 d-flex gap-2 flex-wrap">
            <motion.button className="rp-btn rp-btn--primary flex-fill" type="submit"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
              <FaSearch className="me-1" /> Buscar
            </motion.button>
            <motion.button className="rp-btn rp-btn--ghost flex-fill" type="button"
              onClick={limpiarFiltros} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
              <FaRedo />
            </motion.button>
            <motion.button className="rp-btn rp-btn--green flex-fill" type="button"
              onClick={exportMovimientosExcel} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
              <FaFileExcel />
            </motion.button>
            <motion.button className="rp-btn rp-btn--blue flex-fill" type="button"
              onClick={exportMovimientosPDF} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
              <FaFilePdf />
            </motion.button>
          </div>
        </form>

        {/* Tabla */}
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                {["Fecha","Producto","Tipo","Cantidad","Usuario","Descripción"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movLoading ? (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={6} className="text-center py-5">
                    <span className="rp-spinner" />
                    <span className="ms-2 text-warning fw-semibold">Cargando...</span>
                  </td>
                </motion.tr>
              ) : movimientos.length === 0 ? (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No hay movimientos para mostrar
                  </td>
                </motion.tr>
              ) : (
                movimientos.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: isMobile() ? 0 : Math.min(i * 0.015, 0.2) }}
                    className="rp-tr"
                  >
                    <td className="rp-td--date">
                      {new Date(m.fecha).toLocaleString("es-HN", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="fw-medium">{m.producto_nombre || "—"}</td>
                    <td>
                      <span className={`rp-badge ${m.tipo === "entrada" ? "rp-badge--green" : "rp-badge--red"}`}>
                        {m.tipo === "entrada" ? "↑ Entrada" : "↓ Salida"}
                      </span>
                    </td>
                    <td className="fw-bold text-center">{m.cantidad}</td>
                    <td>
                      <span className="rp-badge rp-badge--blue">{m.usuario_nombre || "Sistema"}</span>
                    </td>
                    <td className="rp-td--desc">{m.descripcion}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <small className="rp-hint mt-2 d-block">
          {movimientos.length === 15 && !Object.values(filtros).some(Boolean)
            ? "Mostrando los últimos 15 movimientos."
            : "Filtrado por los criterios seleccionados."}
        </small>
      </motion.div>

      {/* ── ESTILOS ── */}
      <style>{`
        /* ROOT */
        .rp-root { padding: 1.5rem 0.5rem; min-height: 100%; }

        /* HEADER */
        .rp-header {
          background: linear-gradient(135deg, #1a1d2e 0%, #12263a 100%);
          border-radius: 18px;
          padding: 1.4rem 1.8rem;
          margin-bottom: 1.8rem;
          border: 1px solid rgba(255,193,7,0.18);
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        }
        .rp-header__inner {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          flex-wrap: wrap;
        }
        .rp-header__icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg,#ffc107,#f59e0b);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; color: #1a1d2e;
          box-shadow: 0 4px 16px rgba(255,193,7,0.35);
          flex-shrink: 0;
        }
        .rp-header__title {
          color: #fff; font-size: 1.35rem; font-weight: 700; margin: 0;
          letter-spacing: -.3px;
        }
        .rp-header__sub { color: #94a3b8; font-size: 0.85rem; margin: 0; }

        /* EXPORT BTN */
        .rp-export-btn {
          background: linear-gradient(135deg,#16a34a,#15803d);
          color: #fff; border: none; border-radius: 10px;
          padding: 0.55rem 1.2rem; font-weight: 600; font-size: 0.9rem;
          display: flex; align-items: center; cursor: pointer;
          box-shadow: 0 4px 14px rgba(22,163,74,0.3);
          white-space: nowrap;
        }

        /* KPI CARD */
        .rp-kpi-card {
          border-radius: 18px;
          padding: 1.4rem 1.2rem;
          position: relative; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 6px 24px rgba(0,0,0,0.16);
          cursor: default;
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rp-kpi-icon {
          font-size: 1.6rem; margin-bottom: 0.75rem;
          color: #ffc107;
          filter: drop-shadow(0 0 8px rgba(255,193,7,0.5));
        }
        .rp-kpi-label {
          font-size: 0.78rem; font-weight: 600; letter-spacing: .6px;
          text-transform: uppercase; color: rgba(255,255,255,0.55);
          margin-bottom: 0.3rem;
        }
        .rp-kpi-value {
          font-size: 1.9rem; font-weight: 800; color: #fff;
          line-height: 1.1; margin-bottom: 0.3rem;
          letter-spacing: -1px;
        }
        .rp-kpi-sub {
          font-size: 0.77rem; color: rgba(255,255,255,0.38);
        }
        .rp-kpi-glow {
          position: absolute; bottom: -30px; right: -30px;
          width: 110px; height: 110px;
          background: radial-gradient(circle, rgba(255,193,7,0.12) 0%, transparent 70%);
          border-radius: 50%; pointer-events: none;
        }

        /* CARD */
        .rp-card {
          background: #fff;
          border-radius: 18px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.07);
        }
        .rp-card__header {
          display: flex; align-items: center; gap: 0.6rem;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 0.85rem;
          margin-bottom: 1rem;
        }
        .rp-card__icon {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        }
        .rp-icon--amber { background: rgba(255,193,7,0.12); color: #d97706; }
        .rp-card__title { font-weight: 700; font-size: 1rem; color: #1e293b; }

        /* FILTERS */
        .rp-label { font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px; display: block; }
        .rp-input {
          width: 100%; border: 1.5px solid #e2e8f0; border-radius: 9px;
          padding: 0.42rem 0.7rem; font-size: 0.88rem; color: #334155;
          background: #f8fafc; outline: none; transition: border-color .2s;
        }
        .rp-input:focus { border-color: #fbbf24; box-shadow: 0 0 0 3px rgba(251,191,36,0.12); }

        /* BOTONES */
        .rp-btn {
          border: none; border-radius: 9px; padding: 0.45rem 0.8rem;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 4px;
          transition: box-shadow .15s ease-out;
          will-change: transform;
          backface-visibility: hidden;
        }
        .rp-btn--primary { background: linear-gradient(135deg,#fbbf24,#f59e0b); color: #1a1d2e; }
        .rp-btn--ghost   { background: #f1f5f9; color: #475569; }
        .rp-btn--green   { background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; }
        .rp-btn--blue    { background: linear-gradient(135deg,#3b82f6,#2563eb); color: #fff; }

        /* TABLA */
        .rp-table-wrap {
          max-height: 280px; overflow-y: auto; overflow-x: auto;
          border-radius: 12px; border: 1.5px solid #e2e8f0;
        }
        .rp-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 750px; }
        .rp-table thead tr th {
          background: #1a1d2e; color: #ffc107;
          font-size: 0.78rem; font-weight: 700; letter-spacing: .5px;
          text-transform: uppercase; padding: 0.75rem 1rem;
          position: sticky; top: 0; z-index: 1;
        }
        .rp-table thead tr th:first-child { border-radius: 10px 0 0 0; }
        .rp-table thead tr th:last-child  { border-radius: 0 10px 0 0; }
        .rp-tr td { padding: 0.65rem 1rem; font-size: 0.87rem; color: #334155; border-bottom: 1px solid #f1f5f9; }
        .rp-tr:last-child td { border-bottom: none; }
        .rp-tr:hover td { background: #fefce8; }
        
        /* Desactivar hover en touch devices */
        @media (hover: none) {
          .rp-tr:hover td { background: transparent; }
        }
        
        .rp-td--date { white-space: nowrap; color: #64748b; font-size: 0.82rem; }
        .rp-td--desc { word-break: break-word; max-width: 200px; }

        /* BADGES */
        .rp-badge {
          display: inline-block; border-radius: 20px;
          padding: 3px 12px; font-size: 0.78rem; font-weight: 700; white-space: nowrap;
        }
        .rp-badge--green { background: #dcfce7; color: #15803d; }
        .rp-badge--red   { background: #fee2e2; color: #b91c1c; }
        .rp-badge--blue  { background: #dbeafe; color: #1d4ed8; }

        /* SPINNER */
        .rp-spinner {
          display: inline-block; width: 22px; height: 22px;
          border: 3px solid rgba(255,193,7,0.25);
          border-top-color: #ffc107;
          border-radius: 50%;
          animation: rp-spin .7s linear infinite;
          vertical-align: middle;
        }
        @keyframes rp-spin { to { transform: rotate(360deg); } }

        .rp-hint { font-size: 0.8rem; color: #94a3b8; }

        /* RESPONSIVE */
        @media (max-width: 575.98px) {
          .rp-header { padding: 1rem; }
          .rp-header__title { font-size: 1.05rem; }
          .rp-kpi-value { font-size: 1.45rem; }
          .rp-card { padding: 1rem; }
          .rp-export-btn { width: 100%; justify-content: center; margin-top: 0.5rem; }
        }

        /* Respetar preferencias de movimiento reducido */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
