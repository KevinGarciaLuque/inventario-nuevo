import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { useUser } from "../context/UserContext";
import { FaPlus, FaMinus, FaSearch, FaBoxOpen, FaBroom } from "react-icons/fa";
import { Modal, Button, InputGroup, FormControl, Table } from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";

export default function RegistrarMovimientoPage() {
  const { user } = useUser();
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [form, setForm] = useState({
    producto_id: "",
    tipo: "entrada",
    cantidad: 1,
    descripcion: "",
  });
  const [loading, setLoading] = useState(false);
  const [nombreBusqueda, setNombreBusqueda] = useState("");
  const [codigoBuffer, setCodigoBuffer] = useState("");
  const [modal, setModal] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const scannerTimeout = useRef(null);

  const showModal = ({ type, title, message }) => {
    setModal({ show: true, type, title, message });
  };

  const closeModal = () => setModal((prev) => ({ ...prev, show: false }));

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    if (modal.show) return;

    const handleKeyPress = (e) => {
      const char = e.key;
      if (char.length === 1) {
        setCodigoBuffer((prev) => prev + char);
      }
      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
      scannerTimeout.current = setTimeout(() => {
        if (codigoBuffer.length > 0) {
          procesarCodigoEscaneado(codigoBuffer);
          setCodigoBuffer("");
        }
      }, 300);
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
    };
  }, [codigoBuffer, modal.show]);

  useEffect(() => {
    const handleEnterCloseModal = (e) => {
      if (e.key === "Enter" && modal.show) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleEnterCloseModal);
    return () => window.removeEventListener("keydown", handleEnterCloseModal);
  }, [modal.show]);

  const cargarProductos = async () => {
    try {
      const res = await api.get("/productos");
      setProductos(res.data);
      setProductosFiltrados(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const procesarCodigoEscaneado = async (codigo) => {
    try {
      const res = await api.get(`/productos/buscar?codigo=${codigo.trim()}`);
      if (res.data.length > 0) {
        const producto = res.data[0];
        setForm((f) => ({ ...f, producto_id: producto.id }));
        showModal({
          type: "success",
          title: "Producto encontrado",
          message: `${producto.nombre} (Stock: ${producto.stock})`,
        });
      } else {
        showModal({
          type: "error",
          title: "No encontrado",
          message: "Producto no encontrado.",
        });
      }
    } catch (err) {
      console.error(err);
      showModal({
        type: "error",
        title: "Error de conexión",
        message: "No se pudo consultar el backend.",
      });
    }
  };

  useEffect(() => {
    if (nombreBusqueda.trim() === "") {
      setProductosFiltrados(productos);
    } else {
      const filtrados = productos.filter((p) =>
        p.nombre.toLowerCase().includes(nombreBusqueda.trim().toLowerCase())
      );
      setProductosFiltrados(filtrados);
    }
  }, [nombreBusqueda, productos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "cantidad" ? Math.max(1, Number(value)) : value,
    }));
  };

  const limpiarFiltros = () => {
    setNombreBusqueda("");
    setCodigoBuffer("");
    setForm((f) => ({ ...f, producto_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.producto_id || !form.tipo || !form.cantidad || !user?.id) {
      showModal({
        type: "error",
        title: "Campos requeridos",
        message: "Todos los campos son obligatorios.",
      });
      return;
    }
    setLoading(true);
    try {
      await api.post("/movimientos", {
        ...form,
        cantidad: Number(form.cantidad),
        usuario_id: user.id,
      });
      showModal({
        type: "success",
        title: "¡Movimiento registrado!",
        message: "Registro exitoso.",
      });
      setForm({
        producto_id: "",
        tipo: "entrada",
        cantidad: 1,
        descripcion: "",
      });
    } catch (error) {
      showModal({
        type: "error",
        title: "Error",
        message: "Error al registrar el movimiento.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">
        <FaBoxOpen className="text-primary me-2" /> Registrar Movimiento de
        Inventario 🚀
      </h2>

      <div className="mb-3 row">
        <div className="col-md-10 mb-2">
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <FormControl
              placeholder="Filtrar Código o Nombre"
              value={nombreBusqueda}
              onChange={(e) => setNombreBusqueda(e.target.value)}
              disabled={loading}
            />
          </InputGroup>
        </div>

        <div className="col-md-2 mb-2 text-end">
          <Button
            variant="warning"
            className="w-100 fw-bold d-flex align-items-center justify-content-center"
            style={{ backgroundColor: "#FFC107", borderColor: "#FFC107" }}
            onClick={limpiarFiltros}
          >
            <FaBroom className="me-2" /> Limpiar
          </Button>
        </div>
      </div>

      <div
        className="bg-white shadow-sm rounded mb-4"
        style={{
          maxHeight: "300px",
          height: "180px", // 🔥 Altura fija para scroll vertical
          overflowY: "auto",
          overflowX: "auto", // 🔁 Scroll horizontal para celular
          border: "1px solid #dee2e6", // 🧱 Opcional para mejor visibilidad
        }}
      >
        <Table
          striped
          bordered
          hover
          className="sticky-header w-100"
          style={{ minWidth: "700px" }} // ⬅️ Desencadena scroll horizontal si es necesario
        >
          <thead className="table-light sticky-top">
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Código</th>
              <th>Stock</th>
              <th>Categoría</th>
              <th>Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((p) => (
              <tr
                key={p.id}
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    p.id === form.producto_id ? "#d1e7dd" : "white",
                }}
                onClick={() => setForm((f) => ({ ...f, producto_id: p.id }))}
              >
                <td>{p.id}</td>
                <td>{p.nombre}</td>
                <td>{p.codigo}</td>
                <td>{p.stock}</td>
                <td>{p.categoria}</td>
                <td>{p.ubicacion}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 shadow rounded row g-3"
      >
        <div className="col-md-5 col-12">
          <label className="form-label">Producto</label>
          <select
            className="form-select"
            name="producto_id"
            value={form.producto_id}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="">Seleccione un producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.codigo}) — Stock: {p.stock}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-2 col-6">
          <label className="form-label">Tipo</label>
          <select
            className="form-select"
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </div>

        <div className="col-md-2 col-6">
          <label className="form-label">Cantidad</label>
          <input
            type="number"
            className="form-control"
            name="cantidad"
            value={form.cantidad}
            min={1}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="col-md-3 col-12">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-control"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Detalle (opcional)"
            disabled={loading}
          />
        </div>

        <div className="col-12 text-end">
          <button
            type="submit"
            className="btn btn-success w-150"
            disabled={loading}
          >
            {form.tipo === "entrada" ? (
              <>
                <FaPlus /> Entrada
              </>
            ) : (
              <>
                <FaMinus /> Salida
              </>
            )}
          </button>
        </div>
      </form>

      <Modal show={modal.show} onHide={closeModal} centered>
        <Modal.Body className="text-center py-4">
          {modal.type === "success" ? (
            <BsCheckCircleFill size={64} color="#198754" className="mb-3" />
          ) : (
            <BsExclamationTriangleFill
              size={64}
              color="#dc3545"
              className="mb-3"
            />
          )}
          <h5
            className={`mb-2 fw-bold ${
              modal.type === "success" ? "text-success" : "text-danger"
            }`}
          >
            {modal.title}
          </h5>
          <div className="mb-3 text-muted">{modal.message}</div>
          <Button
            variant={modal.type === "success" ? "success" : "danger"}
            onClick={closeModal}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
