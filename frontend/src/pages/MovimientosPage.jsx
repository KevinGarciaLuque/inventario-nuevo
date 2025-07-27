import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { FaHistory, FaRedo, FaSearch, FaBroom } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    usuario_id: "",
    tipo: "",
    producto_id: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/usuarios").then((res) => setUsuarios(res.data));
    api.get("/productos").then((res) => setProductos(res.data));
    cargarMovimientos();
  }, []);

  const cargarMovimientos = async () => {
    setLoading(true);
    try {
      const params = { ...filtros };
      Object.keys(params).forEach((k) => params[k] === "" && delete params[k]);
      const res = await api.get("/movimientos", { params });
      setMovimientos(res.data);
    } catch {
      alert("No se pudo cargar el historial");
      setMovimientos([]);
    }
    setLoading(false);
  };

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

  const exportExcel = () => {
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
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "movimientos.xlsx"
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    doc.setFontSize(16);
    doc.text("Movimientos de Inventario", 40, 40);
    autoTable(doc, {
      head: [
        ["Fecha", "Producto", "Tipo", "Cantidad", "Usuario", "Descripción"],
      ],
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
    doc.save("movimientos.pdf");
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center mb-3 gap-2 movimientos-title-bar">
        <h2 className="me-auto text-center text-md-start w-100 w-md-auto mb-2 mb-md-0">
          <FaHistory className="text-warning me-2" />
          Historial de Movimientos
        </h2>
        <button className="btn btn-outline-success" onClick={exportExcel}>
          <i className="bi bi-file-earmark-excel me-1"></i> Excel
        </button>
        <button className="btn btn-outline-primary" onClick={exportPDF}>
          <i className="bi bi-file-earmark-pdf me-1"></i> PDF
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={cargarMovimientos}
          title="Refrescar"
        >
          <FaRedo />
        </button>
        <button
          className="btn fw-bold d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "#FFC107", borderColor: "#FFC107" }}
          type="button"
          onClick={limpiarFiltros}
        >
          <FaBroom className="me-2" /> Limpiar
        </button>
      </div>

      <form
        className="row g-2 align-items-end mb-4 movimientos-filtros-form"
        onSubmit={(e) => {
          e.preventDefault();
          cargarMovimientos();
        }}
      >
        <div className="col-md-2 col-12">
          <label className="form-label">Fecha inicio</label>
          <input
            type="date"
            className="form-control"
            name="fecha_inicio"
            value={filtros.fecha_inicio}
            onChange={handleFiltro}
          />
        </div>
        <div className="col-md-2 col-12">
          <label className="form-label">Fecha fin</label>
          <input
            type="date"
            className="form-control"
            name="fecha_fin"
            value={filtros.fecha_fin}
            onChange={handleFiltro}
          />
        </div>
        <div className="col-md-2 col-12">
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
        <div className="col-md-2 col-12">
          <label className="form-label">Producto</label>
          <select
            className="form-select"
            name="producto_id"
            value={filtros.producto_id}
            onChange={handleFiltro}
          >
            <option value="">Todos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2 col-12">
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
        <div className="col-md-2 col-12 d-flex gap-2 mb-2 mb-md-0">
          <button className="btn btn-warning w-100" type="submit">
            <FaSearch className="me-1" /> Buscar
          </button>
        </div>
      </form>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div
            className="bg-white"
            style={{
              maxHeight: "400px",
              height: "250px", // 🔥 Fijamos altura
              overflowY: "auto",
              overflowX: "auto",
              border: "1px solid #dee2e6", // 🧱 Borde visual
              position: "relative",
            }}
          >
            <table
              className="table table-bordered table-hover align-middle mb-0 sticky-header w-100"
              style={{ minWidth: "800px" }}
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <span className="spinner-border text-warning me-2"></span>{" "}
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
                      <td style={{ wordBreak: "break-word" }}>
                        {m.descripcion}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .sticky-top { position: sticky; top: 0; z-index: 2; }
      `}</style>
    </div>
  );
}
