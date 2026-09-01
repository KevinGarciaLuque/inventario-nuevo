import { useEffect, useRef, useState } from "react";
import { Button, Form, Modal, Spinner, Tab, Tabs } from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";
import { FaEye, FaTrash } from "react-icons/fa";
import api from "../../api/axios";
import generarReciboPDF from "../../utils/generarReciboPDF";
import {
  DEFAULT_RECIBO_CONFIG,
  clearReciboConfigCache,
} from "../../utils/reciboConfig";

const MAX_LOGO_BYTES = 2_500_000; // ~2.5 MB

export default function ReciboConfigPage() {
  const [cfg, setCfg] = useState(DEFAULT_RECIBO_CONFIG);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modal, setModal] = useState({ show: false, type: "", message: "" });
  const [previewTipo, setPreviewTipo] = useState("recibo");
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/recibo-config");
        setCfg({ ...DEFAULT_RECIBO_CONFIG, ...(res.data || {}) });
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const set = (campo) => (e) =>
    setCfg((prev) => ({ ...prev, [campo]: e.target.value }));

  const onLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      setModal({ show: true, type: "error", message: "El archivo debe ser una imagen (PNG, JPG, WEBP o GIF)." });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setModal({ show: true, type: "error", message: "La imagen es muy grande. Máximo 2.5 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCfg((prev) => ({ ...prev, logo_base64: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };

  const quitarLogo = () => {
    setCfg((prev) => ({ ...prev, logo_base64: "" }));
    if (fileRef.current) fileRef.current.value = "";
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.put("/recibo-config", cfg);
      clearReciboConfigCache();
      setModal({ show: true, type: "success", message: "Configuración guardada. Los próximos recibos y facturas la usarán." });
    } catch (err) {
      console.error(err);
      setModal({
        show: true,
        type: "error",
        message: err?.response?.data?.message || "No se pudo guardar la configuración.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const verPDF = () => {
    generarReciboPDF({
      numeroFactura: previewTipo === "recibo" ? "REC-00000001" : "000-001-01-00000001",
      tipo: previewTipo,
      config: cfg,
      carrito: [
        { cantidad: 1, codigo: "EML-1134-B", nombre: "Corral para bebé", precio_final: 1030, precio_unitario: 1030 },
        { cantidad: 1, codigo: "112978", nombre: "memoria USB", precio_final: 200, precio_unitario: 200 },
      ],
      subtotal: 1069.57,
      impuesto: 160.43,
      total: 1230,
      impuestosDetalle: { "ISV 15%": 160.43 },
      user: { nombre: "Prueba" },
      cai: { cai_codigo: "PREVIEW-CAI", rango_inicio: 1, rango_fin: 100 },
      cliente_nombre: "Nelson",
      cliente_direccion: "col. suyapa",
      metodoPago: "transferencia",
      abrirEnNuevaPestana: true,
    });
  };

  if (cargando) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container py-3">
      <h2 className="mb-1 text-center">Configuración de Recibo / Factura</h2>
      <p className="text-center text-muted mb-4">
        Encabezado, logo y textos que aparecen en el documento impreso. Solo el superadministrador puede editarlo.
      </p>

      <div className="row g-4">
        {/* ─── FORM ─── */}
        <div className="col-lg-7">
          <div className="border rounded p-3 shadow-sm bg-light mb-3">
            <h5 className="mb-3">Encabezado (recibo y factura)</h5>

            <Form.Label className="fw-semibold">Logo</Form.Label>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="border rounded bg-white d-flex align-items-center justify-content-center"
                style={{ width: 120, height: 70, overflow: "hidden" }}
              >
                {cfg.logo_base64 ? (
                  <img src={cfg.logo_base64} alt="logo" style={{ maxWidth: "100%", maxHeight: "100%" }} />
                ) : (
                  <span className="text-muted small">Sin logo</span>
                )}
              </div>
              <div>
                <Form.Control ref={fileRef} type="file" accept="image/*" size="sm" onChange={onLogo} />
                <small className="text-muted">PNG/JPG, máx. 2.5 MB. Se guarda en la base de datos.</small>
                {cfg.logo_base64 && (
                  <div className="mt-1">
                    <Button size="sm" variant="outline-danger" onClick={quitarLogo}>
                      <FaTrash className="me-1" /> Quitar logo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="row g-2">
              <div className="col-12">
                <Form.Label>Nombre del negocio</Form.Label>
                <Form.Control value={cfg.negocio_nombre} onChange={set("negocio_nombre")} />
              </div>
              <div className="col-md-6">
                <Form.Label>Sucursal</Form.Label>
                <Form.Control value={cfg.sucursal} onChange={set("sucursal")} />
              </div>
              <div className="col-md-3">
                <Form.Label>RTN</Form.Label>
                <Form.Control value={cfg.rtn} onChange={set("rtn")} />
              </div>
              <div className="col-md-3">
                <Form.Label>Teléfono</Form.Label>
                <Form.Control value={cfg.telefono} onChange={set("telefono")} />
              </div>
            </div>
          </div>

          <div className="border rounded p-3 shadow-sm bg-light mb-3">
            <h5 className="mb-3">Textos del Recibo (no fiscal)</h5>
            <div className="row g-2">
              <div className="col-md-6">
                <Form.Label>Título</Form.Label>
                <Form.Control value={cfg.recibo_titulo} onChange={set("recibo_titulo")} />
              </div>
              <div className="col-md-6">
                <Form.Label>Leyenda bajo el título</Form.Label>
                <Form.Control value={cfg.recibo_leyenda} onChange={set("recibo_leyenda")} />
              </div>
              <div className="col-12">
                <Form.Label>Mensaje de pie</Form.Label>
                <Form.Control value={cfg.recibo_pie} onChange={set("recibo_pie")} />
              </div>
              <div className="col-md-6">
                <Form.Label>Nota final 1</Form.Label>
                <Form.Control value={cfg.recibo_nota1} onChange={set("recibo_nota1")} />
              </div>
              <div className="col-md-6">
                <Form.Label>Nota final 2</Form.Label>
                <Form.Control value={cfg.recibo_nota2} onChange={set("recibo_nota2")} />
              </div>
              <div className="col-md-6">
                <Form.Label>Color de todo el texto</Form.Label>
                <ColorField value={cfg.recibo_color} onChange={(v) => setCfg((p) => ({ ...p, recibo_color: v }))} />
              </div>
            </div>
          </div>

          <div className="border rounded p-3 shadow-sm bg-light mb-3">
            <h5 className="mb-3">Textos de la Factura (fiscal, con CAI)</h5>
            <div className="row g-2">
              <div className="col-md-6">
                <Form.Label>Título</Form.Label>
                <Form.Control value={cfg.factura_titulo} onChange={set("factura_titulo")} />
              </div>
              <div className="col-md-6">
                <Form.Label>Mensaje de pie</Form.Label>
                <Form.Control value={cfg.factura_pie} onChange={set("factura_pie")} />
              </div>
              <div className="col-md-6">
                <Form.Label>Nota final 1</Form.Label>
                <Form.Control value={cfg.factura_nota1} onChange={set("factura_nota1")} />
              </div>
              <div className="col-md-6">
                <Form.Label>Nota final 2</Form.Label>
                <Form.Control value={cfg.factura_nota2} onChange={set("factura_nota2")} />
              </div>
              <div className="col-md-6">
                <Form.Label>Color de todo el texto</Form.Label>
                <ColorField value={cfg.factura_color} onChange={(v) => setCfg((p) => ({ ...p, factura_color: v }))} />
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <Button variant="success" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
            <Button variant="outline-secondary" onClick={verPDF}>
              <FaEye className="me-1" /> Ver PDF real
            </Button>
          </div>
        </div>

        {/* ─── PREVIEW ─── */}
        <div className="col-lg-5">
          <div className="position-sticky" style={{ top: 16 }}>
            <Tabs activeKey={previewTipo} onSelect={(k) => setPreviewTipo(k || "recibo")} className="mb-2">
              <Tab eventKey="recibo" title="Recibo" />
              <Tab eventKey="factura" title="Factura" />
            </Tabs>
            <TicketPreview cfg={cfg} tipo={previewTipo} />
          </div>
        </div>
      </div>

      <Modal show={modal.show} onHide={() => setModal({ show: false })} centered>
        <Modal.Body className="text-center py-4">
          {modal.type === "success" ? (
            <BsCheckCircleFill size={56} color="#198754" className="mb-3" />
          ) : (
            <BsExclamationTriangleFill size={56} color="#dc3545" className="mb-3" />
          )}
          <h6 className="fw-bold mb-0">{modal.message}</h6>
        </Modal.Body>
      </Modal>
    </div>
  );
}

const PRESETS = ["#000000", "#1d4ed8", "#0e7490", "#15803d", "#b91c1c", "#db2777", "#7c3aed", "#c2410c"];

function ColorField({ value, onChange }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#000000";
  return (
    <div>
      <div className="d-flex align-items-center gap-2">
        <Form.Control
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 52, padding: 2 }}
          title="Elegir color"
        />
        <Form.Control
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          style={{ maxWidth: 120 }}
        />
      </div>
      <div className="d-flex gap-1 mt-1 flex-wrap">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: c,
              border: safe.toLowerCase() === c ? "2px solid #333" : "1px solid #ccc",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TicketPreview({ cfg, tipo }) {
  const esFactura = tipo === "factura";
  const titulo = esFactura ? cfg.factura_titulo : cfg.recibo_titulo;
  const pie = esFactura ? cfg.factura_pie : cfg.recibo_pie;
  const nota1 = esFactura ? cfg.factura_nota1 : cfg.recibo_nota1;
  const nota2 = esFactura ? cfg.factura_nota2 : cfg.recibo_nota2;
  const color = /^#[0-9a-fA-F]{6}$/.test(
    esFactura ? cfg.factura_color : cfg.recibo_color,
  )
    ? esFactura
      ? cfg.factura_color
      : cfg.recibo_color
    : "#000000";

  return (
    <div
      style={{
        width: 300,
        margin: "0 auto",
        background: "#fff",
        border: "1px solid #dee2e6",
        boxShadow: "0 6px 20px rgba(0,0,0,.12)",
        padding: "14px 12px",
        fontFamily: "'Courier New', monospace",
        fontSize: 11,
        color,
        lineHeight: 1.35,
      }}
    >
      <div style={{ textAlign: "center" }}>
        {cfg.logo_base64 && (
          <img src={cfg.logo_base64} alt="logo" style={{ maxWidth: 160, maxHeight: 70, marginBottom: 6 }} />
        )}
        <div style={{ fontWeight: 700, fontSize: 13 }}>{cfg.negocio_nombre}</div>
        {cfg.sucursal && <div>{cfg.sucursal}</div>}
        {cfg.rtn && <div>RTN: {cfg.rtn}</div>}
        {cfg.telefono && <div>Tel: {cfg.telefono}</div>}
      </div>

      <hr style={{ borderTop: "1px dashed currentColor", margin: "8px 0" }} />

      {esFactura && (
        <div style={{ fontSize: 10 }}>
          CAI: XXXXXX-XXXXXX-XXXXXX<br />
          Rango: 1 - 100<br />
        </div>
      )}

      <div style={{ textAlign: "center", fontWeight: 700, marginTop: 4 }}>{titulo}</div>
      {!esFactura && cfg.recibo_leyenda && (
        <div style={{ textAlign: "center", fontSize: 9 }}>{cfg.recibo_leyenda}</div>
      )}

      <div style={{ marginTop: 6, fontSize: 10 }}>
        No. {esFactura ? "000-001-01-00000001" : "REC-00000001"}<br />
        Fecha: {new Date().toLocaleString("es-HN")}<br />
        Cajero: Prueba<br />
        Cliente: Nelson
      </div>

      <hr style={{ borderTop: "1px dashed currentColor", margin: "8px 0" }} />

      <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: color, color: "#fff" }}>
            <th style={{ padding: "2px 3px" }}>Cant</th>
            <th style={{ padding: "2px 3px", textAlign: "left" }}>Desc.</th>
            <th style={{ padding: "2px 3px" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ textAlign: "center" }}>1</td>
            <td>Corral para be…</td>
            <td style={{ textAlign: "right" }}>1030.00</td>
          </tr>
          <tr>
            <td style={{ textAlign: "center" }}>1</td>
            <td>memoria USB</td>
            <td style={{ textAlign: "right" }}>200.00</td>
          </tr>
        </tbody>
      </table>

      <hr style={{ borderTop: "1px dashed currentColor", margin: "8px 0" }} />

      <div style={{ fontSize: 10, display: "flex", justifyContent: "space-between" }}>
        <span>Subtotal Gravado 15%:</span><span>L 1,069.57</span>
      </div>
      <div style={{ fontSize: 10, display: "flex", justifyContent: "space-between" }}>
        <span>ISV 15%:</span><span>L 160.43</span>
      </div>
      <div style={{ fontWeight: 700, display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span>TOTAL A PAGAR:</span><span>L 1,230.00</span>
      </div>

      <hr style={{ borderTop: "1px dashed currentColor", margin: "8px 0" }} />

      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 12 }}>{pie}</div>
      <div style={{ textAlign: "center", fontSize: 10, marginTop: 4 }}>{nota1}</div>
      <div style={{ textAlign: "center", fontSize: 10, fontWeight: esFactura ? 700 : 400 }}>{nota2}</div>
    </div>
  );
}
