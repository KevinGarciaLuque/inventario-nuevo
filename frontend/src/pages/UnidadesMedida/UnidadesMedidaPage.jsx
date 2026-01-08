// src/pages/UnidadesMedida/UnidadesMedidaPage.jsx
import { useMemo, useEffect, useState } from "react";
import { Badge } from "react-bootstrap";
import api from "../../api/axios";

import UnidadesHeader from "./components/UnidadesHeader";
import UnidadesFiltro from "./components/UnidadesFiltro";
import UnidadesTabla from "./components/UnidadesTabla";
import ModalUnidadForm from "./components/ModalUnidadForm";
import ModalEliminarUnidad from "./components/ModalEliminarUnidad";

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
      <UnidadesHeader abrirCrear={abrirCrear} guardando={guardando} />

      <UnidadesFiltro
        filtro={filtro}
        setFiltro={setFiltro}
        guardando={guardando}
      />

      {error && (
        <div className="alert alert-danger py-2">
          <strong>Atención:</strong> {error}
        </div>
      )}

      <div className="bg-white p-3 rounded shadow-sm">
        <UnidadesTabla
          loading={loading}
          unidades={unidadesFiltradas}
          guardando={guardando}
          abrirEditar={abrirEditar}
          pedirEliminar={pedirEliminar}
          toggleActivo={toggleActivo}
          badgeTipo={badgeTipo}
        />
      </div>

      <ModalUnidadForm
        modalForm={modalForm}
        cerrarModalForm={cerrarModalForm}
        onChangeForm={onChangeForm}
        guardarUnidad={guardarUnidad}
        guardando={guardando}
        TIPOS={TIPOS}
      />

      <ModalEliminarUnidad
        modalDelete={modalDelete}
        cancelarEliminar={cancelarEliminar}
        confirmarEliminar={confirmarEliminar}
        guardando={guardando}
      />
    </div>
  );
}
