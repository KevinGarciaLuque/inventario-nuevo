import { useEffect, useRef, useState } from "react";
import { Alert } from "react-bootstrap";
import { FaExclamationTriangle } from "react-icons/fa";

import {
  Button,
  FormControl,
  FormCheck,
  Image,
  InputGroup,
  Modal,
  Table,
  Spinner,
  Form,
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
import { useUser } from "../context/UserContext";
import generarReciboPDF from "../utils/generarReciboPDF";
import MetodosPagos from "../components/MetodosPagos";
import CardCaiDisponible from "../components/CardCaiDisponible";

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
  const [codigoBuffer, setCodigoBuffer] = useState("");
  const [cai, setCai] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [usarRTN, setUsarRTN] = useState(false);
  const bufferRef = useRef("");
  const [datosPago, setDatosPago] = useState({});
  const yaMostroModalRef = useRef(false); // ✅ No causa render como useState
  const [modalSinCai, setModalSinCai] = useState(false);
  const caiErrorMostradoRef = useRef(false); // ✅ NO causa re-render
  const [refreshCaiTrigger, setRefreshCaiTrigger] = useState(0);
  const [resetPagoTrigger, setResetPagoTrigger] = useState(0);

  // Clientes
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState("");

  // Modal factura
  const [modal, setModal] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
    dataRecibo: null,
  });

  const [feedbackModal, setFeedbackModal] = useState({
    show: false,
    success: true,
    message: "",
  });

  // Modal agregar cliente rápido
  const [modalCliente, setModalCliente] = useState(false);
  const [formularioCliente, setFormularioCliente] = useState({
    nombre: "",
    rtn: "",
    direccion: "",
  });
  const [editandoCliente, setEditandoCliente] = useState(false);

  // Datos del cliente para factura
  const [venta, setVenta] = useState({
    metodo_pago: "efectivo",
    efectivo: 0,
    cambio: 0,
    cliente_nombre: "",
    cliente_rtn: "",
    cliente_direccion: "",
  });

  const handleCambio = ({ metodo, efectivo, cambio }) => {
    setVenta((prev) => {
      if (
        prev.metodo_pago === metodo &&
        prev.efectivo === efectivo &&
        prev.cambio === cambio
      ) {
        return prev; // Evita re-render innecesario
      }
      return {
        ...prev,
        metodo_pago: metodo,
        efectivo,
        cambio,
      };
    });
  };

  const limpiarCodigo = (codigo) => {
    return codigo.trim().toUpperCase();
  };

  const scannerTimeout = useRef(null);

  // ✅ Este se ejecuta solo cuando cambia el switch "usarRTN"
  useEffect(() => {
    if (usarRTN) {
      cargarClientes();
    }
  }, [usarRTN]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Evitar que se dispare si el usuario está escribiendo en un input
      const target = e.target.tagName;
      const esInputEditable = target === "INPUT" || target === "TEXTAREA";

      if (esInputEditable) return;

      const char = e.key;
      if (char.length === 1) {
        bufferRef.current += char;
      }

      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
      scannerTimeout.current = setTimeout(() => {
        if (bufferRef.current.length > 0) {
          handleBuscarCodigo(limpiarCodigo(bufferRef.current));
          bufferRef.current = "";
        }
      }, 300);
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
    };
  }, []);

  const cargarProductos = async () => {
    const res = await api.get("/productos");
    setProductos(res.data);
  };

  const consultarCai = async () => {
    try {
      const res = await api.get("/cai/activo");
      console.log("✅ CAI encontrado:", res.data);
      setCai(res.data);
    } catch (error) {
      console.error("❌ Error al consultar CAI:", error.message);

      if (!caiErrorMostradoRef.current) {
        setModalSinCai(true); // solo una vez
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
  const handleBuscarCodigo = async (codigo) => {
    // Buscar por código de barras
    const res = await api.get(`/productos/buscar?codigo=${codigo.trim()}`);
    if (res.data.length > 0) {
      agregarProductoAlCarrito(res.data[0]);
      setBuscar("");
    } else {
      mostrarToast("Producto no encontrado");
    }
  };

  const handleBuscarNombre = () => {
    // Buscar por nombre exacto (case insensitive)
    const nombre = buscar.trim().toLowerCase();
    const prod = productos.find((p) => p.nombre.toLowerCase() === nombre);
    if (prod) {
      agregarProductoAlCarrito(prod);
      setBuscar("");
    } else {
      mostrarToast("Producto no encontrado");
    }
  };

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
      } else {
        if (producto.stock === 0) {
          mostrarToast("No hay stock disponible.");
          return prev;
        }
        return [...prev, { ...producto, cantidad: 1 }];
      }
    });
  };

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
      setClientes(res.data);
    } catch (error) {
      setClientes([]);
    } finally {
      setClientesLoading(false);
    }
  };

  const clientesFiltrados = clientes.filter((c) =>
    `${c.nombre} ${c.rtn}`.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  // =======================
  // MODAL AGREGAR CLIENTE
  // =======================
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
  const total = carrito.reduce(
    (acc, item) => acc + item.cantidad * parseFloat(item.precio),
    0
  );

  // Calcula impuesto incluido (ya contenido dentro del precio)
  const impuesto = (total / 1.15) * 0.15;
  const subtotal = total - impuesto;

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

      if (venta.metodo_pago === "efectivo" && venta.efectivo < total) {
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
        usuario_id: user.id,
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

      // 🔁 Refrescar visual del stock de facturas disponibles
      setRefreshCaiTrigger((prev) => prev + 1);

      // ✅ Limpiar todos los estados
      setCarrito([]);
      setVenta({
        metodo_pago: "efectivo",
        efectivo: 0,
        cambio: 0,
        cliente_nombre: "",
        cliente_rtn: "",
        cliente_direccion: "",
      });
      setBuscar("");
      setDatosPago({});
      setFormularioCliente({ nombre: "", rtn: "", direccion: "" });
      setResetPagoTrigger((prev) => prev + 1); // <-- Este es el correcto
    } catch (error) {
      console.error("❌ Error al registrar venta:", error);
      setFeedbackModal({
        show: true,
        success: false,
        message: "❌ Error al registrar la venta.",
      });
    }
  };

  // =======================
  const mostrarModal = ({ type, title, message }) =>
    setModal({ show: true, type, title, message, dataRecibo: null });

  const mostrarToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false }), 2000);
  };

  const imprimirRecibo = () => {
    if (modal.dataRecibo) {
      generarReciboPDF(modal.dataRecibo);
      setModal((prev) => ({ ...prev, show: false }));
    }
  };

  // ==========================================================================================================================
  // RENDER
  // =======================
  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">
        <FaBoxOpen className="text-primary me-2" /> Módulo de Ventas
      </h2>
      <div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
        {/* Switch: Usar cliente con RTN */}
        <FormCheck
          type="switch"
          id="switch-rt"
          label={
            <span style={{ fontSize: "1.rem", fontWeight: "400" }}>
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

        {/* Card del CAI: alineado a la derecha */}
        <div style={{ flexShrink: 0 }}>
          <CardCaiDisponible refreshTrigger={refreshCaiTrigger} />
        </div>
      </div>

      {/* ============================================== STOCK DISponible ========== */}

      {/* ========== SECCIÓN CLIENTES ========== */}
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
              <Table
                bordered
                hover
                size="sm"
                responsive
                className="sticky-header w-100"
              >
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

          {/* Inputs cliente solo si está activado el switch */}
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
      <InputGroup className="mb-3">
        <InputGroup.Text>
          <FaSearch />
        </InputGroup.Text>
        <FormControl
          placeholder="Buscar producto por nombre o escanear código"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          list="sugerencias"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const valor = limpiarCodigo(buscar);
              const esCodigo = /^[a-zA-Z0-9\-]+$/.test(valor); // acepta letras, números y guiones
              if (esCodigo) {
                handleBuscarCodigo(valor);
              } else {
                handleBuscarNombre();
              }
            }
          }}
        />

        <datalist id="sugerencias">
          {productos.map((p) => (
            <option key={p.id} value={p.nombre} />
          ))}
        </datalist>
        <Button variant="primary" onClick={handleBuscarNombre}>
          Agregar
        </Button>
        <Button variant="warning" onClick={() => setBuscar("")}>
          <FaBroom />
        </Button>
      </InputGroup>

      <h4 className="mt-4">Carrito de Venta</h4>
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
      {feedbackModal.show && (
        <Modal
          show={modal.show}
          onHide={() => setModal({ ...modal, show: false })}
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
                <Button
                  variant="primary"
                  onClick={() => generarReciboPDF(modal.dataRecibo)}
                >
                  🧾 Imprimir Recibo
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setModal({ ...modal, show: false })}
              >
                Cerrar
              </Button>
            </div>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}
