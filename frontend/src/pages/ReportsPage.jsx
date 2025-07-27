import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Bar } from "react-chartjs-2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { FaSearch, FaRedo } from "react-icons/fa";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function ReportsPage() {
  // Estados principales
  const [resumen, setResumen] = useState({
    productosUnicos: 0,
    totalStock: 0,
    valorInventario: 0,
    bajoStock: 0,
  });
  const [porCategoria, setPorCategoria] = useState([]);
  const [productos, setProductos] = useState([]);
  const [logoBase64, setLogoBase64] = useState(null);

  // Movimientos
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

  // Cargar logo base64 para PDF
  useEffect(() => {
    fetch("/logo.png")
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      });
  }, []);

  // Cargar resumen de inventario y productos para gráfica/resumen
  useEffect(() => {
    const fetchResumen = async () => {
      try {
        const productosRes = await api.get("/productos");
        const productos = productosRes.data;
        setProductos(productos);

        // KPIs
        const productosUnicos = productos.length;
        const totalStock = productos.reduce((sum, p) => sum + Number(p.stock || 0), 0);
        const valorInventario = productos.reduce(
          (sum, p) => sum + Number(p.stock || 0) * Number(p.precio || 0), 0);
        const bajoStock = productos.filter(
          (p) => Number(p.stock) < Number(p.stock_minimo)).length;

        // Por categoría
        const categoriasMap = {};
        productos.forEach((p) => {
          const cat = p.categoria || "Sin Categoría";
          categoriasMap[cat] = (categoriasMap[cat] || 0) + Number(p.stock || 0);
        });
        const categoriasArray = Object.entries(categoriasMap).map(
          ([categoria, cantidad]) => ({ categoria, cantidad })
        );

        setResumen({ productosUnicos, totalStock, valorInventario, bajoStock });
        setPorCategoria(categoriasArray);
      } catch (e) {
        setResumen({
          productosUnicos: 20,
          totalStock: 25,
          valorInventario: 64000,
          bajoStock: 3,
        });
        setPorCategoria([
          { categoria: "Motor", cantidad: 6 },
          { categoria: "Frenos", cantidad: 3 },
          { categoria: "Transmisión", cantidad: 5 },
          { categoria: "Eléctrico", cantidad: 2 },
          { categoria: "Suspensión", cantidad: 4 },
        ]);
      }
    };

    // Productos y usuarios para filtros de movimientos
    api.get("/usuarios").then((res) => setUsuarios(res.data));
    api.get("/productos").then((res) => setProductosFiltro(res.data));

    fetchResumen();
    cargarMovimientos(); // Carga movimientos al iniciar
    // eslint-disable-next-line
  }, []);

  // Cargar movimientos con filtros
  const cargarMovimientos = async () => {
    setMovLoading(true);
    try {
      const params = { ...filtros, limit: 15 }; // Solo últimos 15 por defecto
      Object.keys(params).forEach((k) => params[k] === "" && delete params[k]);
      const res = await api.get("/movimientos", { params });
      setMovimientos(res.data || []);
    } catch {
      setMovimientos([]);
    }
    setMovLoading(false);
  };

  // Filtros
  const handleFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      fecha_inicio: "",
      fecha_fin: "",
      usuario_id: "",
      tipo: "",
      producto_id: "",
    });
    setTimeout(cargarMovimientos, 0);
  };

  // --- Exportaciones ---
  const exportExcel = () => {
    const data = productos.map((prod) => ({
      Código: prod.codigo,
      Nombre: prod.nombre,
      Categoría: prod.categoria,
      Ubicación: prod.ubicacion,
      Stock: prod.stock,
      "Stock mínimo": prod.stock_minimo,
      Precio: prod.precio,
      Descripción: prod.descripcion,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "inventario.xlsx");
  };

  // Exportar movimientos filtrados
  const exportMovimientosExcel = () => {
    const data = movimientos.map((m) => ({
      Fecha: new Date(m.fecha).toLocaleString("es-HN"),
      Producto: m.producto_nombre,
      Tipo: m.tipo,
      Cantidad: m.cantidad,
      Usuario: m.usuario_nombre || "N/A",
      Descripción: m.descripcion,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "movimientos.xlsx");
  };

  const exportMovimientosPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    doc.setFontSize(16);
    doc.text("Movimientos recientes", 40, 40);
    autoTable(doc, {
      head: [["Fecha", "Producto", "Tipo", "Cantidad", "Usuario", "Descripción"]],
      body: movimientos.map((m) => [
        new Date(m.fecha).toLocaleString("es-HN"),
        m.producto_nombre,
        m.tipo,
        m.cantidad,
        m.usuario_nombre || "N/A",
        m.descripcion,
      ]),
      startY: 60,
      styles: { fontSize: 9 },
      margin: { left: 40, right: 40 },
    });
    doc.save("movimientos_recientes.pdf");
  };

  // Exportar PDF inventario
  const exportPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    // Logo y título
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 40, 20, 60, 60);
    }
    doc.setFontSize(18);
    doc.text("Inventario de Productos", 120, 50);

    const columns = [
      { header: "Código", dataKey: "codigo" },
      { header: "Nombre", dataKey: "nombre" },
      { header: "Categoría", dataKey: "categoria" },
      { header: "Ubicación", dataKey: "ubicacion" },
      { header: "Stock", dataKey: "stock" },
      { header: "Stock mínimo", dataKey: "stock_minimo" },
      { header: "Precio", dataKey: "precio" },
      { header: "Descripción", dataKey: "descripcion" },
    ];

    autoTable(doc, {
      head: [columns.map((col) => col.header)],
      body: productos.map((prod) => columns.map((col) => prod[col.dataKey])),
      startY: 90,
      theme: "striped",
      styles: { fontSize: 9 },
      margin: { left: 40, right: 40 },
    });

    doc.save("inventario.pdf");
  };

 // --- CHART DATA ---
 const chartData = {
  labels: porCategoria.map((x) => x.categoria),
  datasets: [
    {
      label: "Cantidad total en stock",
      data: porCategoria.map((x) => x.cantidad),
      backgroundColor: "#ffc107",
      borderRadius: 8,
      borderWidth: 1,
    },
  ],
};

return (
  <div className="container py-4 reportes-responsive-root">
    <h2 className="mb-4 text-center">
      <i className="bi bi-bar-chart-fill text-warning me-2"></i>
      Reportes
    </h2>
    <div className="row g-2 mb-4 justify-content-end">
      <div className="col-6 col-md-auto">
        <button className="btn btn-success w-100" onClick={exportExcel}>
          <i className="bi bi-file-earmark-excel me-1"></i> Inventario Excel
        </button>
      </div>
      <div className="col-6 col-md-auto">
        <button className="btn btn-primary w-100" onClick={exportPDF}>
          <i className="bi bi-file-earmark-pdf me-1"></i> Inventario PDF
        </button>
      </div>
    </div>

    {/* KPIs resumen */}
    <div className="row g-3 mb-4">
      <div className="col-6 col-md-3">
        <div className="card border-0 shadow h-100 text-center">
          <div className="card-body">
            <i className="bi bi-123 h2 text-primary"></i>
            <h6 className="card-title mt-2 text-muted">Referencias únicas</h6>
            <p className="fs-4 fw-bold">{resumen.productosUnicos}</p>
            <div className="small text-muted">Productos diferentes</div>
          </div>
        </div>
      </div>
      <div className="col-6 col-md-3">
        <div className="card border-0 shadow h-100 text-center">
          <div className="card-body">
            <i className="bi bi-boxes h2 text-warning"></i>
            <h6 className="card-title mt-2 text-muted">Total en stock</h6>
            <p className="fs-4 fw-bold">{resumen.totalStock}</p>
            <div className="small text-muted">Suma del stock</div>
          </div>
        </div>
      </div>
      <div className="col-6 col-md-3">
        <div className="card border-0 shadow h-100 text-center">
          <div className="card-body">
            <i className="bi bi-cash-stack h2 text-success"></i>
            <h6 className="card-title mt-2 text-muted">Valor inventario</h6>
            <p className="fs-4 fw-bold">
              {resumen.valorInventario.toLocaleString("es-HN", {
                style: "currency",
                currency: "HNL",
                minimumFractionDigits: 2,
              })}
            </p>
            <div className="small text-muted">Total estimado</div>
          </div>
        </div>
      </div>
      <div className="col-6 col-md-3">
        <div className="card border-0 shadow h-100 text-center">
          <div className="card-body">
            <i className="bi bi-exclamation-triangle h2 text-danger"></i>
            <h6 className="card-title mt-2 text-muted">Bajo stock</h6>
            <p className="fs-4 fw-bold">{resumen.bajoStock}</p>
            <div className="small text-muted">Por debajo del mínimo</div>
          </div>
        </div>
      </div>
    </div>

    {/* Gráfica */}
    <div className="card border-0 shadow p-3 mb-4">
      <h5 className="mb-3">
        <i className="bi bi-graph-up-arrow text-warning me-2"></i>
        Productos por Categoría
      </h5>
      <div style={{ minHeight: 250 }}>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: "#eee" } },
            },
          }}
          height={240}
        />
      </div>
    </div>

    {/* Movimientos recientes */}
    <div className="card border-0 shadow p-3">
      <h5 className="mb-3">
        <i className="bi bi-clock-history text-warning me-2"></i>
        Movimientos recientes de inventario
      </h5>
      {/* Filtros */}
      <form
        className="row g-2 align-items-end mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          cargarMovimientos();
        }}
      >
        <div className="col-6 col-md-2">
          <label className="form-label">Fecha inicio</label>
          <input
            type="date"
            className="form-control"
            name="fecha_inicio"
            value={filtros.fecha_inicio}
            onChange={handleFiltro}
          />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label">Fecha fin</label>
          <input
            type="date"
            className="form-control"
            name="fecha_fin"
            value={filtros.fecha_fin}
            onChange={handleFiltro}
          />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label">Usuario</label>
          <select
            className="form-select"
            name="usuario_id"
            value={filtros.usuario_id}
            onChange={handleFiltro}
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label">Producto</label>
          <select
            className="form-select"
            name="producto_id"
            value={filtros.producto_id}
            onChange={handleFiltro}
          >
            <option value="">Todos</option>
            {productosFiltro.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label">Tipo</label>
          <select
            className="form-select"
            name="tipo"
            value={filtros.tipo}
            onChange={handleFiltro}
          >
            <option value="">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </div>
        <div className="col-12 col-md-2 d-flex gap-2 flex-wrap">
          <button className="btn btn-warning flex-fill" type="submit">
            <FaSearch className="me-1" /> Buscar
          </button>
          <button
            className="btn btn-outline-secondary fw-bold flex-fill"
            type="button"
            onClick={limpiarFiltros}
          >
            <FaRedo />
          </button>
          <button
            className="btn btn-outline-success flex-fill"
            type="button"
            onClick={exportMovimientosExcel}
          >
            <i className="bi bi-file-earmark-excel"></i>
          </button>
          <button
            className="btn btn-outline-primary flex-fill"
            type="button"
            onClick={exportMovimientosPDF}
          >
            <i className="bi bi-file-earmark-pdf"></i>
          </button>
        </div>
      </form>
      {/* Tabla de movimientos */}
      <div
        className="bg-white shadow-sm rounded mb-4"
        style={{
          maxHeight: "220px",
          height: "220px", // 🔽 Altura fija
          overflowY: "auto",
          overflowX: "auto", // 🔁 Scroll horizontal
          border: "1px solid #dee2e6", // 🧱 Borde visual opcional
        }}
      >
        <table
          className="table table-bordered align-middle mb-0 sticky-header movimientos-table w-100"
          style={{ minWidth: "800px" }} // Ajuste según columnas
        >
          <thead className="table-light sticky-top">
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Usuario</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {movLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-5">
                  <span className="spinner-border text-warning me-2"></span>
                  Cargando...
                </td>
              </tr>
            ) : movimientos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted">
                  No hay movimientos para mostrar
                </td>
              </tr>
            ) : (
              movimientos.map((m) => (
                <tr key={m.id}>
                  <td>
                    {new Date(m.fecha).toLocaleString("es-HN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{m.producto_nombre || "—"}</td>
                  <td>
                    <span
                      className={`badge px-3 py-2 ${
                        m.tipo === "entrada" ? "bg-success" : "bg-danger"
                      }`}
                    >
                      {m.tipo === "entrada" ? "Entrada" : "Salida"}
                    </span>
                  </td>
                  <td>{m.cantidad}</td>
                  <td>
                    <span className="badge bg-primary bg-opacity-25 text-primary px-3 py-2">
                      {m.usuario_nombre || "Sistema"}
                    </span>
                  </td>
                  <td style={{ wordBreak: "break-word" }}>{m.descripcion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <small className="text-muted mt-2 d-block">
        {movimientos.length === 15 && !Object.values(filtros).some(Boolean)
          ? "Solo se muestran los últimos 15 movimientos."
          : "Filtrado por los criterios seleccionados."}
      </small>
    </div>
    {/* --- ESTILOS RESPONSIVOS --- */}
    <style>{`
      .reportes-responsive-root .card {
        min-width: 0;
      }
      @media (max-width: 991.98px) {
        .reportes-responsive-root .row.g-3 > [class^="col-"] {
          flex: 0 0 50%;
          max-width: 50%;
        }
      }
      @media (max-width: 767.98px) {
        .reportes-responsive-root .row.g-3 > [class^="col-"] {
          flex: 0 0 100%;
          max-width: 100%;
          margin-bottom: 1rem;
        }
        .reportes-responsive-root .card {
          padding: 0.8rem !important;
        }
      }
      @media (max-width: 575.98px) {
        .reportes-responsive-root .table th, 
        .reportes-responsive-root .table td {
          font-size: 0.95rem;
          padding: 0.45rem;
        }
        .reportes-responsive-root h2, 
        .reportes-responsive-root h5 {
          font-size: 1.1rem !important;
        }
      }
      .reportes-responsive-root .card .form-label {
        font-size: 0.97rem;
      }
    `}</style>
  </div>
);
}