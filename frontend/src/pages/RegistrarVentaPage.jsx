import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Form,
  FormCheck,
  FormControl,
  Image,
  InputGroup,
  Modal,
  Spinner,
  Table,
} from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";
import {
  FaBoxOpen,
  FaBroom,
  FaCashRegister,
  FaSearch,
  FaTrash,
  FaUserPlus,
} from "react-icons/fa";

import api from "../../api/axios";
import CardCaiDisponible from "../components/CardCaiDisponible";
import MetodosPagos from "../components/MetodosPagos";
import { useUser } from "../context/UserContext";
import generarReciboPDF from "../utils/generarReciboPDF";

const API_URL = "http://localhost:3000";
const getImgSrc = (imagen) => {
  if (!imagen) return "/default.jpg";
  if (imagen.startsWith("http")) return imagen;
  if (imagen.startsWith("/uploads")) return API_URL + imagen;
  if (imagen.startsWith("uploads")) return `${API_URL}/${imagen}`;
  return `${API_URL}/uploads/${imagen}`;
};

export default function RegistrarVentaPage() {
  const { user } = useUser();

  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);

  const [buscar, setBuscar] = useState("");
  const inputBuscarRef = useRef(null);

  const [cai, setCai] = useState(null);
  const [modalSinCai, setModalSinCai] = useState(false);
  const caiErrorMostradoRef = useRef(false);

  const bufferRef = useRef("");
  const scannerTimeout = useRef(null);

  const [toast, setToast] = useState({ show: false, message: "" });

  // Clientes
  const [usarRTN, setUsarRTN] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState("");

  // Modal agregar cliente rápido
  const [modalCliente, setModalCliente] = useState(false);
  const [formularioCliente, setFormularioCliente] = useState({
    nombre: "",
    rtn: "",
    direccion: "",
  });

  // Modal éxito venta (para imprimir)
  const [modal, setModal] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
    dataRecibo: null,
  });

  // Modal feedback (errores / advertencias)
  const [feedbackModal, setFeedbackModal] = useState({
    show: false,
    success: true,
    message: "",
  });

  // Pago / datos cliente en venta
  const [venta, setVenta] = useState({
    metodo_pago: "efectivo",
    efectivo: 0,
    cambio: 0,
    cliente_nombre: "",
    cliente_rtn: "",
    cliente_direccion: "",
  });

  const [refreshCaiTrigger, setRefreshCaiTrigger] = useState(0);
  const [resetPagoTrigger, setResetPagoTrigger] = useState(0);

  const mostrarToast = (message) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast({ show: false, message: "" }), 2000);
  };

  const limpiarCodigo = (codigo) => (codigo ?? "").trim().toUpperCase();

  const handleCambio = ({ metodo, efectivo, cambio }) => {
    setVenta((prev) => {
      if (
        prev.metodo_pago === metodo &&
        prev.efectivo === efectivo &&
        prev.cambio === cambio
      ) {
        return prev;
      }
      return { ...prev, metodo_pago: metodo, efectivo, cambio };
    });
  };

  const cargarProductos = async () => {
    const res = await api.get("/productos");
    setProductos(res.data || []);
  };

  const consultarCai = async () => {
    try {
      const res = await api.get("/cai/activo");
      setCai(res.data);
    } catch (error) {
      if (!caiErrorMostradoRef.current) {
        setModalSinCai(true);
        caiErrorMostradoRef.current = true;
      }
      setCai(null);
    }
  };

  useEffect(() => {
    consultarCai();
    cargarProductos();
  }, []);

  // =======================
  // BUSCAR Y AGREGAR PRODUCTOS
  // =======================
  const agregarProductoAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existe = prev.find((p) => p.id === producto.id);

      if (existe) {
        if (existe.cantidad + 1 > producto.stock) {
          mostrarToast(`Stock insuficiente. Stock actual: ${producto.stock}`);
          return prev;
        }
        return prev.map((p) =>
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
        );
      }

      if (producto.stock === 0) {
        mostrarToast("No hay stock disponible.");
        return prev;
      }

      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const limpiarInputBuscar = () => {
    setBuscar("");
    if (inputBuscarRef.current) inputBuscarRef.current.value = "";
  };

  const handleBuscarCodigo = async (codigo) => {
    const limpio = (codigo ?? "").trim();
    if (!limpio) return false;

    try {
      const res = await api.get(
        `/productos/buscar?codigo=${encodeURIComponent(limpio)}`
      );

      if (Array.isArray(res.data) && res.data.length > 0) {
        agregarProductoAlCarrito(res.data[0]);
        limpiarInputBuscar();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      mostrarToast("Error al buscar producto");
      return false;
    }
  };

  const handleBuscarNombre = (texto) => {
    const nombre = (texto ?? "").trim().toLowerCase();
    if (!nombre) return false;

    const prod = productos.find(
      (p) => (p.nombre || "").toLowerCase() === nombre
    );

    if (prod) {
      agregarProductoAlCarrito(prod);
      limpiarInputBuscar();
      return true;
    }
    return false;
  };

  // ✅ ÚNICA FUNCIÓN: intenta por código, si no existe, intenta por nombre
  const buscarYAgregar = async (valorOverride = null) => {
    const valor = (
      valorOverride ??
      inputBuscarRef.current?.value ??
      buscar ??
      ""
    ).trim();

    if (!valor) return;

    const okCodigo = await handleBuscarCodigo(valor);
    if (okCodigo) return;

    const okNombre = handleBuscarNombre(valor);
    if (!okNombre) mostrarToast("Producto no encontrado");
  };

  // Escáner por teclado (PC)
  useEffect(() => {
    const handleKeyPress = (e) => {
      const tag = e.target?.tagName;
      const esInputEditable = tag === "INPUT" || tag === "TEXTAREA";
      if (esInputEditable) return;

      const char = e.key;
      if (char.length === 1) bufferRef.current += char;

      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
      scannerTimeout.current = setTimeout(() => {
        const codigo = limpiarCodigo(bufferRef.current);
        if (codigo.length > 0) buscarYAgregar(codigo);
        bufferRef.current = "";
      }, 300);
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quitarProducto = (id) =>
    setCarrito((prev) => prev.filter((p) => p.id !== id));

  const modificarCantidad = (id, cantidad) => {
    setCarrito((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, cantidad: Math.max(1, Math.min(cantidad, p.stock)) }
          : p
      )
    );
  };

  // =======================
  // CLIENTES
  // =======================
  const cargarClientes = async () => {
    setClientesLoading(true);
    try {
      const res = await api.get("/clientes");
      setClientes(res.data || []);
    } catch {
      setClientes([]);
    } finally {
      setClientesLoading(false);
    }
  };

  useEffect(() => {
    if (usarRTN) cargarClientes();
  }, [usarRTN]);

  const clientesFiltrados = useMemo(() => {
    const f = (filtroCliente || "").toLowerCase();
    return clientes.filter((c) =>
      `${c.nombre || ""} ${c.rtn || ""}`.toLowerCase().includes(f)
    );
  }, [clientes, filtroCliente]);

  const handleGuardarCliente = async () => {
    if (!formularioCliente.nombre.trim()) {
      mostrarToast("El nombre es obligatorio");
      return;
    }
    try {
      await api.post("/clientes", formularioCliente);
      setModalCliente(false);
      setFormularioCliente({ nombre: "", rtn: "", direccion: "" });
      cargarClientes();
      mostrarToast("Cliente agregado");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al agregar cliente");
    }
  };

  const handleCerrarModalCliente = () => {
    setModalCliente(false);
    setFormularioCliente({ nombre: "", rtn: "", direccion: "" });
  };

  // =======================
  // VENTA Y FACTURA
  // =======================
  const total = useMemo(
    () =>
      carrito.reduce(
        (acc, item) => acc + item.cantidad * parseFloat(item.precio),
        0
      ),
    [carrito]
  );

  const impuesto = useMemo(() => (total / 1.15) * 0.15, [total]);
  const subtotal = useMemo(() => total - impuesto, [total, impuesto]);

  const registrarVenta = async () => {
    try {
      if (carrito.length === 0) {
        setFeedbackModal({
          show: true,
          success: false,
          message: "⚠️ No hay productos para registrar la venta.",
        });
        return;
      }

      if (venta.metodo_pago === "efectivo" && Number(venta.efectivo) < total) {
        setFeedbackModal({
          show: true,
          success: false,
          message: "⚠️ El efectivo recibido no puede ser menor al total.",
        });
        return;
      }

      const productosPayload = carrito.map((item) => ({
        producto_id: item.id,
        cantidad: item.cantidad,
      }));

      const { data } = await api.post("/ventas", {
        usuario_id: user?.id,
        productos: productosPayload,
        cliente_nombre: venta.cliente_nombre,
        cliente_rtn: venta.cliente_rtn,
        cliente_direccion: venta.cliente_direccion,
        metodo_pago: venta.metodo_pago,
        efectivo: venta.efectivo,
        cambio: venta.cambio,
      });

      const dataRecibo = {
        numeroFactura: data.numeroFactura,
        carrito,
        subtotal,
        impuesto,
        total,
        user,
        cai: cai || {},
        cliente_nombre: venta.cliente_nombre,
        cliente_rtn: venta.cliente_rtn,
        cliente_direccion: venta.cliente_direccion,
        metodoPago: venta.metodo_pago,
        efectivo: venta.efectivo,
        cambio: venta.cambio,
      };

      setModal({
        show: true,
        type: "success",
        title: "Venta registrada",
        message: "La venta fue registrada exitosamente.",
        dataRecibo,
      });

      setRefreshCaiTrigger((prev) => prev + 1);

      setCarrito([]);
      setVenta({
        metodo_pago: "efectivo",
        efectivo: 0,
        cambio: 0,
        cliente_nombre: "",
        cliente_rtn: "",
        cliente_direccion: "",
      });
      limpiarInputBuscar();
      setFormularioCliente({ nombre: "", rtn: "", direccion: "" });
      setResetPagoTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("❌ Error al registrar venta:", error);
      setFeedbackModal({
        show: true,
        success: false,
        message: error?.response?.data?.message
          ? `❌ ${error.response.data.message}`
          : "❌ Error al registrar la venta.",
      });
    }
  };

  const imprimirRecibo = () => {
    if (modal.dataRecibo) {
      generarReciboPDF(modal.dataRecibo);
      setModal((prev) => ({ ...prev, show: false }));
    }
  };

  // =======================
  // RENDER
  // =======================
  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">
        <FaBoxOpen className="text-primary me-2" /> Módulo de Ventas
      </h2>

      <div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
        <FormCheck
          type="switch"
          id="switch-rt"
          label={
            <span style={{ fontSize: "1rem", fontWeight: "400" }}>
              Usar cliente con RTN
            </span>
          }
          checked={usarRTN}
          onChange={() => setUsarRTN(!usarRTN)}
          style={{
            fontSize: "2.0rem",
            padding: "0.5rem",
            marginBottom: "1rem",
            marginLeft: "4rem",
          }}
        />

        <div style={{ flexShrink: 0 }}>
          <CardCaiDisponible refreshTrigger={refreshCaiTrigger} />
        </div>
      </div>

      {usarRTN && (
        <>
          <h5>Clientes</h5>
          <InputGroup className="mb-2">
            <FormControl
              placeholder="Buscar por nombre o RTN"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            />
            <Button
              variant="success"
              onClick={() => setModalCliente(true)}
              title="Agregar Cliente"
            >
              <FaUserPlus className="mb-1" /> Agregar Cliente
            </Button>
          </InputGroup>

          <div className="scroll-container" style={{ maxHeight: "150px" }}>
            {clientesLoading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <Table bordered hover size="sm" responsive className="w-100">
                <thead className="table-light">
                  <tr>
                    <th>Nombre</th>
                    <th>RTN</th>
                    <th>Dirección</th>
                    <th>Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => (
                    <tr
                      key={cliente.id}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setVenta({
                          ...venta,
                          cliente_nombre: cliente.nombre,
                          cliente_rtn: cliente.rtn,
                          cliente_direccion: cliente.direccion,
                        })
                      }
                      className={
                        venta.cliente_rtn === cliente.rtn ? "table-primary" : ""
                      }
                    >
                      <td>{cliente.nombre}</td>
                      <td>{cliente.rtn}</td>
                      <td>{cliente.direccion}</td>
                      <td>
                        <FormCheck
                          type="switch"
                          checked={cliente.activo}
                          disabled
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>

          <div className="row mt-3">
            <div className="col-md-4 mb-2">
              <FormControl
                placeholder="Nombre del Cliente"
                value={venta.cliente_nombre}
                onChange={(e) =>
                  setVenta({ ...venta, cliente_nombre: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-2">
              <FormControl
                placeholder="RTN del Cliente"
                value={venta.cliente_rtn}
                onChange={(e) =>
                  setVenta({ ...venta, cliente_rtn: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-2">
              <FormControl
                placeholder="Dirección del Cliente"
                value={venta.cliente_direccion}
                onChange={(e) =>
                  setVenta({ ...venta, cliente_direccion: e.target.value })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* ===== BUSCAR Y AGREGAR PRODUCTO ===== */}
      <h5 className="mt-4">Buscar Producto</h5>

      <Form
        onSubmit={(e) => {
          e.preventDefault();
          buscarYAgregar();
        }}
      >
        <InputGroup className="mb-3">
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>

          <FormControl
            ref={inputBuscarRef}
            placeholder="Buscar producto por nombre o escanear código"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            list="sugerencias"
            // 🔥 Forzar que el teclado muestre “Buscar/Ir” en vez de “Siguiente” (mejora en Android)
            enterKeyHint="search"
            inputMode="search"
            autoComplete="off"
          />

          <datalist id="sugerencias">
            {productos.map((p) => (
              <option key={p.id} value={p.nombre} />
            ))}
          </datalist>

          {/* IMPORTANTE: submit */}
          <Button variant="primary" type="submit">
            Agregar
          </Button>

          <Button variant="warning" type="button" onClick={limpiarInputBuscar}>
            <FaBroom />
          </Button>
        </InputGroup>
      </Form>

      {/* ===== CARRITO DE VENTA ===== */}
      {/* ===== CARRITO DE VENTA ===== */}
      <h4 className="mt-0 mb-4">Carrito de Venta</h4>

      <div
        className="mb-4"
        style={{
          maxHeight: "300px",
          height: "300px", // 🔥 Forzar altura en todos los dispositivos
          overflowY: "auto",
          overflowX: "auto",
          border: "1px solid #dee2e6", // opcional para claridad visual
        }}
      >
        <Table
          striped
          bordered
          hover
          className="sticky-header"
          style={{ minWidth: "800px" }} // ajusta a tus columnas
        >
          <thead className="table-light sticky-top">
            <tr>
              <th>Imagen</th>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Ubicación</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {carrito.map((item) => (
              <tr key={item.id}>
                <td>
                  <Image
                    src={getImgSrc(item.imagen)}
                    width={50}
                    height={50}
                    rounded
                  />
                </td>
                <td>{item.codigo || "-"}</td>
                <td>{item.nombre}</td>
                <td>{item.categoria || "-"}</td>
                <td>{item.ubicacion || "-"}</td>
                <td>{item.descripcion || "-"}</td>
                <td>{parseFloat(item.precio).toFixed(2)} Lps</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    className="form-control form-control-sm"
                    onChange={(e) =>
                      modificarCantidad(item.id, parseInt(e.target.value))
                    }
                  />
                </td>
                <td>
                  {(item.cantidad * parseFloat(item.precio)).toFixed(2)} Lps
                </td>
                <td>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => quitarProducto(item.id)}
                  >
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="row mt-3">
        <div className="col-md-6 mb-3">
          <MetodosPagos
            total={total}
            onCambioCalculado={handleCambio}
            resetTrigger={resetPagoTrigger}
          />
        </div>
        <div className="col-md-6 d-flex flex-column justify-content-between">
          <div className="bg-light p-3 rounded shadow-sm h-100">
            <div className="mb-2">
              <strong>Subtotal:</strong> L {subtotal.toFixed(2)}
            </div>
            <div className="mb-2">
              <strong>ISV 15%:</strong> L {impuesto.toFixed(2)}
            </div>
            <div className="mb-3">
              <h5 className="m-0">
                <strong>Total:</strong> L {total.toFixed(2)}
              </h5>
            </div>
            <Button
              variant="success"
              size="lg"
              onClick={registrarVenta}
              className="w-100"
            >
              <FaCashRegister className="me-2" /> Registrar Venta
            </Button>
          </div>
        </div>
      </div>

      {/* ===== MODAL FACTURA ===== */}
      <Modal
        show={modal.show}
        onHide={() => setModal({ show: false })}
        centered
      >
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

          <div className="d-flex justify-content-center align-items-center flex-wrap gap-3">
            {modal.type === "success" && (
              <Button variant="primary" onClick={imprimirRecibo}>
                Imprimir Recibo
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setModal({ show: false })}
            >
              Cerrar
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* ===== MODAL AGREGAR CLIENTE ===== */}
      <Modal show={modalCliente} onHide={handleCerrarModalCliente} centered>
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Cliente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              value={formularioCliente.nombre}
              onChange={(e) =>
                setFormularioCliente({
                  ...formularioCliente,
                  nombre: e.target.value,
                })
              }
              placeholder="Nombre del cliente"
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>RTN</Form.Label>
            <Form.Control
              value={formularioCliente.rtn}
              onChange={(e) =>
                setFormularioCliente({
                  ...formularioCliente,
                  rtn: e.target.value,
                })
              }
              placeholder="RTN"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              value={formularioCliente.direccion}
              onChange={(e) =>
                setFormularioCliente({
                  ...formularioCliente,
                  direccion: e.target.value,
                })
              }
              placeholder="Dirección"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCerrarModalCliente}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardarCliente}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===== MODAL SIN CAI ===== */}
      <Modal show={modalSinCai} onHide={() => setModalSinCai(false)} centered>
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill
            size={64}
            color="#dc3545"
            className="mb-3"
          />
          <h5 className="text-danger fw-bold mb-3">No hay CAI activo</h5>
          <p className="text-muted">
            No se puede registrar la venta porque no hay un CAI activo en el
            sistema.
          </p>
          <Button variant="secondary" onClick={() => setModalSinCai(false)}>
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>

      {/* ===== TOAST ===== */}
      {toast.show && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div className="toast show text-white bg-success">
            <div className="toast-body">{toast.message}</div>
          </div>
        </div>
      )}

      {/* ===== FEEDBACK MODAL ===== */}
      <Modal
        show={feedbackModal.show}
        onHide={() =>
          setFeedbackModal({ show: false, success: true, message: "" })
        }
        centered
      >
        <Modal.Body className="text-center py-4">
          {feedbackModal.success ? (
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
              feedbackModal.success ? "text-success" : "text-danger"
            }`}
          >
            {feedbackModal.success ? "Listo" : "Atención"}
          </h5>
          <div className="mb-3 text-muted">{feedbackModal.message}</div>
          <Button
            variant="secondary"
            onClick={() =>
              setFeedbackModal({ show: false, success: true, message: "" })
            }
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
