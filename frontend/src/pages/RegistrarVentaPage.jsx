import { useEffect, useRef, useState } from "react";
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
    cliente_nombre: "",
    cliente_rtn: "",
    cliente_direccion: "",
  });

  const scannerTimeout = useRef(null);

  useEffect(() => {
    cargarProductos();
    consultarCai();
  }, []);

  useEffect(() => {
    if (usarRTN) {
      cargarClientes();
    }
  }, [usarRTN]);

useEffect(() => {
  const handleKeyPress = (e) => {
    const char = e.key;
    if (char.length === 1) {
      bufferRef.current += char;
    }

    if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
    scannerTimeout.current = setTimeout(() => {
      if (bufferRef.current.length > 0) {
        handleBuscarCodigo(bufferRef.current);
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
    const res = await api.get("/cai/activo");
    setCai(res.data);
  };

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
  const subtotal = carrito.reduce(
    (acc, item) => acc + item.cantidad * parseFloat(item.precio),
    0
  );
  const impuesto = subtotal * 0.15;
  const total = subtotal + impuesto;

  const registrarVenta = async () => {
    if (!carrito.length || !cai) {
      mostrarModal({
        type: "error",
        title: "Datos faltantes",
        message: "No hay productos o CAI activo.",
      });
      return;
    }

    try {
      const productosPayload = carrito.map((item) => ({
        producto_id: item.id,
        cantidad: item.cantidad,
      }));

      const res = await api.post("/ventas", {
        usuario_id: user.id,
        productos: productosPayload,
        cliente_nombre: venta.cliente_nombre,
        cliente_rtn: venta.cliente_rtn,
        cliente_direccion: venta.cliente_direccion,
      });

      setModal({
        show: true,
        type: "success",
        title: "Venta registrada",
        message: `Factura No. ${res.data.numeroFactura} generada.`,
        dataRecibo: {
          numeroFactura: res.data.numeroFactura,
          carrito: [...carrito],
          subtotal,
          impuesto,
          total,
          user,
          cai,
          cliente_nombre: venta.cliente_nombre,
          cliente_rtn: venta.cliente_rtn,
          cliente_direccion: venta.cliente_direccion,
        },
      });

      setCarrito([]);
      setVenta({ cliente_nombre: "", cliente_rtn: "", cliente_direccion: "" });
      consultarCai();
    } catch (err) {
      mostrarModal({
        type: "error",
        title: "Error",
        message: err.response?.data?.error || "No se pudo registrar la venta.",
      });
    }
  };

  const mostrarModal = ({ type, title, message }) =>
    setModal({ show: true, type, title, message, dataRecibo: null });

  const mostrarToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false }), 2000);
  };

  const imprimirRecibo = () => {
    if (modal.dataRecibo) generarReciboPDF(modal.dataRecibo);
  };

  // =======================
  // RENDER
  // =======================
  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">
        <FaBoxOpen className="text-primary me-2" /> Módulo de Ventas
      </h2>

      <FormCheck
        type="switch"
        label="Usar cliente con RTN"
        checked={usarRTN}
        onChange={() => setUsarRTN(!usarRTN)}
        className="mb-3"
      />

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
              const esCodigo = /^\d{6,}$/.test(buscar.trim()); // Puedes ajustar esta regla
              if (esCodigo) {
                handleBuscarCodigo(buscar.trim());
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
          maxHeight: "400px",
          height: "400px", // 🔥 Forzar altura en todos los dispositivos
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

      <div className="text-end">
        <div>Subtotal: {subtotal.toFixed(2)} Lps</div>
        <div>ISV 15%: {impuesto.toFixed(2)} Lps</div>
        <h4>Total: {total.toFixed(2)} Lps</h4>
        <Button variant="success" size="lg" onClick={registrarVenta}>
          <FaCashRegister className="me-2" /> Registrar Venta
        </Button>
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
    </div>
  );
}
