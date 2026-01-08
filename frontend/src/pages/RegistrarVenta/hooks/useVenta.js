import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/axios";
import generarReciboPDF from "../../../utils/generarReciboPDF";
import { limpiarCodigo } from "../utils/ventaUtils";

const IVA_FACTOR = 1.15;

export default function useVenta({ user }) {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);

  const [buscar, setBuscar] = useState("");
  const inputBuscarRef = useRef(null);

  // ✅ CAJA: bloqueo de ventas si no está abierta
  const [cajaLoading, setCajaLoading] = useState(true);
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [cajaInfo, setCajaInfo] = useState(null);
  const [msgCaja, setMsgCaja] = useState("");

  const [cai, setCai] = useState(null);
  const [modalSinCai, setModalSinCai] = useState(false);
  const caiErrorMostradoRef = useRef(false);

  // Scanner
  const bufferRef = useRef("");
  const scannerTimeout = useRef(null);

  // Toast
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

  // ✅ Consultar estado de caja (bloqueo estándar POS)
  const consultarCajaEstado = async () => {
    try {
      setCajaLoading(true);
      setMsgCaja("");

      const res = await api.get("/caja/estado");
      const abierta = res.data?.abierta === true;

      setCajaAbierta(abierta);
      setCajaInfo(res.data?.caja || null);

      if (!abierta) setMsgCaja("Debes abrir caja antes de registrar ventas.");
    } catch (e) {
      setCajaAbierta(false);
      setCajaInfo(null);
      setMsgCaja(e?.message || "No se pudo consultar el estado de caja.");
    } finally {
      setCajaLoading(false);
    }
  };

  const consultarCai = async () => {
    try {
      const res = await api.get("/cai/activo");
      setCai(res.data);
    } catch {
      setCai(null);
      if (!caiErrorMostradoRef.current) {
        setModalSinCai(true);
        caiErrorMostradoRef.current = true;
      }
    }
  };

  useEffect(() => {
    consultarCajaEstado();
    consultarCai();
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================
  // BUSCAR Y AGREGAR PRODUCTOS
  // =======================
  const agregarProductoAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existe = prev.find((p) => p.id === producto.id);

      const stockProd = Number(producto.stock ?? 0);

      // ✅ Descuento del producto (0-100)
      const descuentoPct = Math.max(
        0,
        Math.min(100, Number(producto.descuento || 0))
      );


      // ✅ Precio base
      const precioUnitario = Number(producto.precio ?? 0);

      // ✅ Precio final
      const precioFinal = Number(
        (precioUnitario * (1 - descuentoPct / 100)).toFixed(2)
      );

      if (existe) {
        if (Number(existe.cantidad) + 1 > stockProd) {
          mostrarToast(`Stock insuficiente. Stock actual: ${stockProd}`);
          return prev;
        }

        return prev.map((p) => {
          if (p.id !== producto.id) return p;

          const nuevaCantidad = Number(p.cantidad) + 1;
          const subtotalLinea = Number(
            (precioFinal * nuevaCantidad).toFixed(2)
          );

          return {
            ...p,
            cantidad: nuevaCantidad,

            // ✅ campos clave para UI/recibo
            precio_unitario: precioUnitario,
            descuento_pct: descuentoPct,
            precio_final: precioFinal,
            subtotal_linea: subtotalLinea,
          };
        });
      }

      if (stockProd <= 0) {
        mostrarToast("No hay stock disponible.");
        return prev;
      }

      return [
        ...prev,
        {
          ...producto,
          cantidad: 1,

          // ✅ campos clave para UI/recibo
          precio_unitario: precioUnitario,
          descuento_pct: descuentoPct,
          precio_final: precioFinal,
          subtotal_linea: Number(precioFinal.toFixed(2)),
        },
      ];
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
    const cant = Number(cantidad);
    if (!Number.isFinite(cant)) return;

    setCarrito((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const stock = Number(p.stock ?? 0);
        const nuevaCantidad = Math.max(1, Math.min(cant, stock || cant));

        const precioFinal = Number(
          p.precio_final ?? p.precio_unitario ?? p.precio ?? 0
        );
        const subtotalLinea = Number((precioFinal * nuevaCantidad).toFixed(2));

        return {
          ...p,
          cantidad: nuevaCantidad,
          subtotal_linea: subtotalLinea,
        };
      })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // TOTALES (✅ con descuento)
  // =======================
  // =======================
  // TOTALES (✅ con descuento)
  // =======================
const round2 = (n) => Number((Number(n) || 0).toFixed(2));

const subtotalBruto = useMemo(() => {
  return round2(
    carrito.reduce((acc, item) => {
      const precioBase = Number(item.precio ?? item.precio_unitario ?? 0) || 0;
      const cantidad = Number(item.cantidad ?? 0) || 0;
      return acc + cantidad * precioBase;
    }, 0)
  );
}, [carrito]);

const descuentoTotal = useMemo(() => {
  return round2(
    carrito.reduce((acc, item) => {
      const cant = Number(item.cantidad ?? 0) || 0;
      const precioBase = Number(item.precio ?? 0) || 0;
      const precioFinal = Number(item.precio_final ?? precioBase) || 0;
      return acc + cant * Math.max(0, precioBase - precioFinal);
    }, 0)
  );
}, [carrito]);

const total = useMemo(() => {
  return round2(
    carrito.reduce((acc, item) => {
      const cant = Number(item.cantidad ?? 0) || 0;
      const pf = Number(item.precio_final ?? item.precio ?? 0) || 0;
      return acc + cant * pf;
    }, 0)
  );
}, [carrito]);

const impuesto = useMemo(() => round2((total / 1.15) * 0.15), [total]);
const subtotal = useMemo(() => round2(total - impuesto), [total, impuesto]);
  // =======================
  // VENTA Y FACTURA
  // =======================
  const registrarVenta = async () => {
    try {
      if (!cajaAbierta) {
        setFeedbackModal({
          show: true,
          success: false,
          message:
            "⚠️ No puedes registrar una venta sin abrir caja. Ve a Apertura de Caja.",
        });
        return;
      }

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

      // ✅ (recomendado) backend calcula precio_final/desc desde BD
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
        subtotalBruto,
        descuentoTotal,
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

  return {
    // caja
    cajaLoading,
    cajaAbierta,
    cajaInfo,
    msgCaja,
    consultarCajaEstado,

    // cai
    cai,
    modalSinCai,
    setModalSinCai,
    refreshCaiTrigger,

    // productos/buscador
    productos,
    buscar,
    setBuscar,
    inputBuscarRef,
    buscarYAgregar,
    limpiarInputBuscar,

    // carrito
    carrito,
    quitarProducto,
    modificarCantidad,

    // clientes
    usarRTN,
    setUsarRTN,
    clientesLoading,
    clientesFiltrados,
    filtroCliente,
    setFiltroCliente,
    venta,
    setVenta,

    modalCliente,
    setModalCliente,
    formularioCliente,
    setFormularioCliente,
    handleGuardarCliente,
    handleCerrarModalCliente,

    // totales ✅
    subtotalBruto,
    descuentoTotal,

    total,
    impuesto,
    subtotal,

    handleCambio,
    resetPagoTrigger,

    // venta
    registrarVenta,
    modal,
    setModal,
    imprimirRecibo,

    // feedback
    feedbackModal,
    setFeedbackModal,

    // toast
    toast,
  };
}
