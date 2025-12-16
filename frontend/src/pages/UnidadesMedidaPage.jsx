import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import {
  Table,
  Button,
  Form,
  Modal,
  InputGroup,
  Spinner,
  Badge,
} from "react-bootstrap";

const TIPOS = [
  { value: "peso", label: "Peso" },
  { value: "longitud", label: "Longitud" },
  { value: "volumen", label: "Volumen" },
  { value: "unidad", label: "Unidad" },
];

export default function UnidadesMedidaPage() {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");

  // Modal Crear/Editar
  const [modalForm, setModalForm] = useState({
    show: false,
    mode: "create", // create | edit
    data: { id: null, nombre: "", abreviatura: "", tipo: "peso", activo: 1 },
  });

  // Modal Confirmar eliminar
  const [modalDelete, setModalDelete] = useState({
    show: false,
    unidad: null,
  });

  // ========================
  // Cargar
  // ========================
  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/unidades");
      setUnidades(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setUnidades([]);
      setError(e?.message || "Error al cargar unidades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // ========================
  // Filtro
  // ========================
  const unidadesFiltradas = useMemo(() => {
    const f = (filtro || "").trim().toLowerCase();
    if (!f) return unidades;

    return unidades.filter((u) =>
      `${u.nombre || ""} ${u.abreviatura || ""} ${u.tipo || ""}`
        .toLowerCase()
        .includes(f)
    );
  }, [unidades, filtro]);

  // ========================
  // Helpers
  // ========================
  const badgeTipo = (tipo) => {
    const t = (tipo || "").toLowerCase();
    if (t === "peso") return <Badge bg="secondary">Peso</Badge>;
    if (t === "longitud") return <Badge bg="info">Longitud</Badge>;
    if (t === "volumen") return <Badge bg="primary">Volumen</Badge>;
    return <Badge bg="dark">Unidad</Badge>;
  };

  const normalizar = (s) =>
    String(s || "")
      .trim()
      .toLowerCase();

  const existeDuplicado = (payload) => {
    const nombre = normalizar(payload.nombre);
    const abrev = normalizar(payload.abreviatura);
    const tipo = normalizar(payload.tipo);

    return unidades.some((u) => {
      // si estoy editando, no comparar conmigo mismo
      if (modalForm.mode === "edit" && Number(u.id) === Number(payload.id)) {
        return false;
      }

      const uNombre = normalizar(u.nombre);
      const uAbrev = normalizar(u.abreviatura);
      const uTipo = normalizar(u.tipo);

      // regla: mismo tipo + misma abreviatura O mismo tipo + mismo nombre
      return uTipo === tipo && (uAbrev === abrev || uNombre === nombre);
    });
  };

  // ========================
  // Modal Crear/Editar
  // ========================
  const abrirCrear = () => {
    setError("");
    setModalForm({
      show: true,
      mode: "create",
      data: { id: null, nombre: "", abreviatura: "", tipo: "peso", activo: 1 },
    });
  };

  const abrirEditar = (u) => {
    setError("");
    setModalForm({
      show: true,
      mode: "edit",
      data: {
        id: u.id,
        nombre: u.nombre || "",
        abreviatura: u.abreviatura || "",
        tipo: u.tipo || "peso",
        activo: u.activo ? 1 : 0,
      },
    });
  };

  const cerrarModalForm = () => {
    setError("");
    setModalForm((p) => ({ ...p, show: false }));
  };

  const onChangeForm = (e) => {
    const { name, value, type, checked } = e.target;
    setModalForm((p) => ({
      ...p,
      data: {
        ...p.data,
        [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
      },
    }));
  };

  const validarForm = () => {
    const n = (modalForm.data.nombre || "").trim();
    const a = (modalForm.data.abreviatura || "").trim();
    const t = (modalForm.data.tipo || "").trim();

    if (!n) return "El nombre es obligatorio.";
    if (!a) return "La abreviatura es obligatoria.";
    if (a.length > 10) return "La abreviatura no debe pasar de 10 caracteres.";
    if (!t) return "El tipo es obligatorio.";
    return "";
  };

  const guardarUnidad = async () => {
    const msg = validarForm();
    if (msg) {
      setError(msg);
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const payload = {
        id: modalForm.data.id,
        nombre: modalForm.data.nombre.trim(),
        abreviatura: modalForm.data.abreviatura.trim(),
        tipo: modalForm.data.tipo,
        activo: modalForm.data.activo ? 1 : 0,
      };

      // ✅ prevenir duplicados antes de enviar
      if (existeDuplicado(payload)) {
        setError(
          "Ya existe una unidad con el mismo tipo y (nombre o abreviatura)."
        );
        setGuardando(false);
        return;
      }

      if (modalForm.mode === "create") {
        await api.post("/unidades", payload);
      } else {
        await api.put(`/unidades/${payload.id}`, payload);
      }

      cerrarModalForm();
      await cargar();
    } catch (e) {
      setError(e?.message || "Error al guardar la unidad");
    } finally {
      setGuardando(false);
    }
  };

  // ========================
  // Eliminar
  // ========================
  const pedirEliminar = (u) => {
    setError("");
    setModalDelete({ show: true, unidad: u });
  };

  const cancelarEliminar = () => {
    setModalDelete({ show: false, unidad: null });
  };

  const confirmarEliminar = async () => {
    const u = modalDelete.unidad;
    if (!u) return;

    setGuardando(true);
    setError("");
    try {
      await api.delete(`/unidades/${u.id}`);
      cancelarEliminar();
      await cargar();
    } catch (e) {
      // ✅ si luego pones validación FK, aquí puedes mostrar recomendación de desactivar
      setError(e?.message || "Error al eliminar unidad. Mejor desactívala.");
    } finally {
      setGuardando(false);
    }
  };

  // ========================
  // Toggle Activo
  // ========================
  const toggleActivo = async (u) => {
    setGuardando(true);
    setError("");
    try {
      await api.put(`/unidades/${u.id}`, {
        id: u.id,
        nombre: u.nombre,
        abreviatura: u.abreviatura,
        tipo: u.tipo,
        activo: u.activo ? 0 : 1,
      });
      await cargar();
    } catch (e) {
      setError(e?.message || "Error al actualizar estado");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="container">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="mb-0">Unidades de Medida</h3>
          <small className="text-muted">
            Administra unidades para distintos rubros (ferretería, abarrotes,
            etc.)
          </small>
        </div>

        <div className="d-flex gap-2">
          <Button variant="warning" onClick={abrirCrear} disabled={guardando}>
            + Nueva unidad
          </Button>
        </div>
      </div>

      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Buscar por nombre, abreviatura o tipo…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <Button
          variant="outline-secondary"
          onClick={() => setFiltro("")}
          disabled={guardando}
        >
          Limpiar
        </Button>
      </InputGroup>

      {error && (
        <div className="alert alert-danger py-2">
          <strong>Atención:</strong> {error}
        </div>
      )}

      <div className="bg-white p-3 rounded shadow-sm">
        {loading ? (
          <div className="d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" />
            <span className="text-muted">Cargando unidades…</span>
          </div>
        ) : unidadesFiltradas.length === 0 ? (
          <div className="text-muted">No hay unidades registradas.</div>
        ) : (
          <Table bordered hover responsive className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Nombre</th>
                <th>Abrev.</th>
                <th>Tipo</th>
                <th className="text-center">Activo</th>
                <th style={{ width: 230 }}></th>
              </tr>
            </thead>
            <tbody>
              {unidadesFiltradas.map((u) => (
                <tr key={u.id}>
                  <td className="fw-semibold">{u.nombre}</td>
                  <td>{u.abreviatura}</td>
                  <td>{badgeTipo(u.tipo)}</td>
                  <td className="text-center">
                    <Form.Check
                      type="switch"
                      checked={!!u.activo}
                      disabled={guardando}
                      onChange={() => toggleActivo(u)}
                    />
                  </td>
                  <td className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => abrirEditar(u)}
                      disabled={guardando}
                    >
                      Editar
                    </Button>

                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => pedirEliminar(u)}
                      disabled={guardando}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {/* MODAL CREAR/EDITAR */}
      <Modal show={modalForm.show} onHide={cerrarModalForm} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalForm.mode === "create" ? "Nueva unidad" : "Editar unidad"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              name="nombre"
              value={modalForm.data.nombre}
              onChange={onChangeForm}
              placeholder="Ej: Kilogramo, Libra, Metro, Pulgada…"
              autoFocus
              disabled={guardando}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Abreviatura</Form.Label>
            <Form.Control
              name="abreviatura"
              value={modalForm.data.abreviatura}
              onChange={onChangeForm}
              placeholder="Ej: kg, lb, m, in…"
              disabled={guardando}
            />
            <small className="text-muted">Recomendado: 2–5 caracteres.</small>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tipo</Form.Label>
            <Form.Select
              name="tipo"
              value={modalForm.data.tipo}
              onChange={onChangeForm}
              disabled={guardando}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Check
            type="switch"
            id="activo"
            name="activo"
            label="Activo"
            checked={!!modalForm.data.activo}
            onChange={onChangeForm}
            disabled={guardando}
          />
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={cerrarModalForm}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={guardarUnidad}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL ELIMINAR */}
      <Modal show={modalDelete.show} onHide={cancelarEliminar} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalDelete.unidad ? (
            <>
              ¿Seguro que deseas eliminar la unidad{" "}
              <strong>{modalDelete.unidad.nombre}</strong> (
              {modalDelete.unidad.abreviatura})?
              <div className="text-muted mt-2" style={{ fontSize: ".95rem" }}>
                Recomendación: si ya se usó en productos, mejor desactívala.
              </div>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={cancelarEliminar}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmarEliminar}
            disabled={guardando}
          >
            {guardando ? "Eliminando..." : "Eliminar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
