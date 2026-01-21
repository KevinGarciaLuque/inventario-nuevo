// frontend/src/pages/RegistrarVenta/hooks/useVenta.js
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

  // ✅ CAJA
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
    telefono: "", // ✅ NUEVO
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

  // Modal feedback
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
    cliente_telefono: "", // ✅ NUEVO
    cliente_direccion: "",
  });

  const [refreshCaiTrigger, setRefreshCaiTrigger] = useState(0);
  const [resetPagoTrigger, setResetPagoTrigger] = useState(0);

  // =======================
  // ✅ DESCUENTOS POR CLIENTE
  // =======================
  const TIPOS_CON_DESCUENTO = [
    "tercera_edad",
    "cuarta_edad",
    "discapacitado",
    "empleado",
    "preferencial",
  ];

  const [tipoCliente, setTipoCliente] = useState("");
  const [descuentos, setDescuentos] = useState([]);
  const [descuentosLoading, setDescuentosLoading] = useState(false);
  const [descuentoSeleccionadoId, setDescuentoSeleccionadoId] = useState("");

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

  // ✅ Consultar caja
  const consultarCajaEstado = async () => {
    try {
      setCajaLoading(true);
      setMsgCaja("");

      const res = await api.get("/caja/estado");
      const abierta = res.data?.abierta === true;

      setCajaAbierta(abierta);
      setCaiErrorMostradoRefSafe(); // no-op safe
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

  // helper no-op para evitar warning si se edita luego
  const setCaiErrorMostradoRefSafe = () => {};

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

      const descuentoPct = Math.max(
        0,
        Math.min(100, Number(producto.descuento || 0)),
      );

      const precioUnitario = Number(producto.precio ?? 0);

      const precioFinal = Number(
        (precioUnitario * (1 - descuentoPct / 100)).toFixed(2),
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
            (precioFinal * nuevaCantidad).toFixed(2),
          );

          return {
            ...p,
            cantidad: nuevaCantidad,
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
        `/productos/buscar?codigo=${encodeURIComponent(limpio)}`,
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
      (p) => (p.nombre || "").toLowerCase() === nombre,
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

  // Escáner por teclado
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
          p.precio_final ?? p.precio_unitario ?? p.precio ?? 0,
        );
        const subtotalLinea = Number((precioFinal * nuevaCantidad).toFixed(2));

        return {
          ...p,
          cantidad: nuevaCantidad,
          subtotal_linea: subtotalLinea,
        };
      }),
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

  // ✅ CORRECCIÓN: nombre distinto para no chocar con el return
  const clientesFiltradosMemo = useMemo(() => {
    const f = (filtroCliente || "").toLowerCase();
    return clientes.filter((c) =>
      `${c.nombre || ""} ${c.rtn || ""}`.toLowerCase().includes(f),
    );
  }, [clientes, filtroCliente]);

  // ✅ GUARDAR CLIENTE + SELECCIONAR AUTOMÁTICO
  const handleGuardarCliente = async () => {
    const payload = {
      nombre: (formularioCliente.nombre || "").trim(),
      rtn: (formularioCliente.rtn || "").trim(),
      telefono: (formularioCliente.telefono || "").trim(),
      direccion: (formularioCliente.direccion || "").trim(),
    };

    if (!payload.nombre) {
      mostrarToast("El nombre es obligatorio");
      return;
    }

    try {
      const res = await api.post("/clientes", payload);

      // Intentar obtener cliente creado desde respuesta (si tu backend lo devuelve)
      const creado =
        res?.data?.cliente ||
        (res?.data && typeof res.data === "object" ? res.data : null);

      // cerrar modal y limpiar
      setModalCliente(false);
      setFormularioCliente({
        nombre: "",
        rtn: "",
        telefono: "",
        direccion: "",
      });

      // refrescar lista
      await cargarClientes();

      // Seleccionar automático (fallback si backend no devolvió el cliente)
      const rtnNuevo = payload.rtn;
      const nombreNuevo = payload.nombre.toLowerCase();
      const dirNuevo = payload.direccion.toLowerCase();

      const seleccionado =
        creado ||
        clientes.find((c) => String(c.rtn || "").trim() === rtnNuevo) ||
        clientes.find((c) => {
          const n = String(c.nombre || "")
            .trim()
            .toLowerCase();
          const d = String(c.direccion || "")
            .trim()
            .toLowerCase();
          return n === nombreNuevo && d === dirNuevo;
        }) ||
        null;

      const finalCliente = seleccionado || {
        nombre: payload.nombre,
        rtn: payload.rtn,
        telefono: payload.telefono,
        direccion: payload.direccion,
      };

      setVenta((prev) => ({
        ...prev,
        cliente_nombre: finalCliente.nombre || "",
        cliente_rtn: finalCliente.rtn || "",
        cliente_telefono: finalCliente.telefono || payload.telefono || "",
        cliente_direccion: finalCliente.direccion || "",
      }));

      // si tu backend manda tipo_cliente y aplica, guárdalo; si no, limpiar
      if (setTipoCliente) {
        const t = finalCliente?.tipo_cliente || "";
        if (t && TIPOS_CON_DESCUENTO.includes(t)) setTipoCliente(t);
        else setTipoCliente("");
      }

      setFiltroCliente("");
      mostrarToast("Cliente agregado y seleccionado ✅");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al agregar cliente");
    }
  };

  const handleCerrarModalCliente = () => {
    setModalCliente(false);
    setFormularioCliente({ nombre: "", rtn: "", telefono: "", direccion: "" });
  };

  // =======================
  // ✅ CARGAR DESCUENTOS POR TIPO
  // =======================
  const cargarDescuentosPorTipo = async (tipo) => {
    if (!tipo) {
      setDescuentos([]);
      return;
    }

    setDescuentosLoading(true);
    try {
      const res = await api.get(`/descuentos?tipo=${encodeURIComponent(tipo)}`);
      setDescuentos(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setDescuentos([]);
    } finally {
      setDescuentosLoading(false);
    }
  };

  useEffect(() => {
    if (!TIPOS_CON_DESCUENTO.includes(tipoCliente)) {
      setDescuentos([]);
      setDescuentoSeleccionadoId("");
      return;
    }

    setDescuentoSeleccionadoId("");
    cargarDescuentosPorTipo(tipoCliente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoCliente]);

  const descuentoClienteObj = useMemo(() => {
    if (!descuentoSeleccionadoId) return null;
    return (
      descuentos.find(
        (d) => String(d.id) === String(descuentoSeleccionadoId),
      ) || null
    );
  }, [descuentoSeleccionadoId, descuentos]);

  // =======================
  // TOTALES
  // =======================
  const round2 = (n) => Number((Number(n) || 0).toFixed(2));

  const subtotalBruto = useMemo(() => {
    return round2(
      carrito.reduce((acc, item) => {
        const precioBase =
          Number(item.precio ?? item.precio_unitario ?? 0) || 0;
        const cantidad = Number(item.cantidad ?? 0) || 0;
        return acc + cantidad * precioBase;
      }, 0),
    );
  }, [carrito]);

  const descuentoTotal = useMemo(() => {
    return round2(
      carrito.reduce((acc, item) => {
        const cant = Number(item.cantidad ?? 0) || 0;
        const precioBase = Number(item.precio ?? 0) || 0;
        const precioFinal = Number(item.precio_final ?? precioBase) || 0;
        return acc + cant * Math.max(0, precioBase - precioFinal);
      }, 0),
    );
  }, [carrito]);

  const total = useMemo(() => {
    return round2(
      carrito.reduce((acc, item) => {
        const cant = Number(item.cantidad ?? 0) || 0;
        const pf = Number(item.precio_final ?? item.precio ?? 0) || 0;
        return acc + cant * pf;
      }, 0),
    );
  }, [carrito]);

  const descuentoClienteMonto = useMemo(() => {
    if (!descuentoClienteObj) return 0;

    const base = Number(total || 0);
    const porcentaje = Number(descuentoClienteObj.porcentaje ?? 0) || 0;
    const monto = Number(descuentoClienteObj.monto ?? 0) || 0;

    let desc = 0;
    if (porcentaje > 0) desc = base * (porcentaje / 100);
    else desc = monto;

    return round2(Math.max(0, Math.min(base, desc)));
  }, [descuentoClienteObj, total]);

  const totalConDescCliente = useMemo(() => {
    return round2(
      Math.max(0, Number(total || 0) - Number(descuentoClienteMonto || 0)),
    );
  }, [total, descuentoClienteMonto]);

  const impuesto = useMemo(
    () => round2((totalConDescCliente / IVA_FACTOR) * 0.15),
    [totalConDescCliente],
  );

  const subtotal = useMemo(
    () => round2(totalConDescCliente - impuesto),
    [totalConDescCliente, impuesto],
  );

  // =======================
  // VENTA
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

      if (
        venta.metodo_pago === "efectivo" &&
        Number(venta.efectivo) < totalConDescCliente
      ) {
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
        cliente_telefono: venta.cliente_telefono,
        cliente_direccion: venta.cliente_direccion,
        metodo_pago: venta.metodo_pago,
        efectivo: venta.efectivo,
        cambio: venta.cambio,

        tipo_cliente: tipoCliente || null,
        descuento_cliente_id: descuentoSeleccionadoId || null,
        descuento_cliente_monto: descuentoClienteMonto || 0,
      });

      const dataRecibo = {
        numeroFactura: data.numeroFactura,
        carrito,
        subtotalBruto,
        descuentoTotal,
        subtotal,
        impuesto,
        total: totalConDescCliente,

        totalSinDescCliente: total,
        descuentoCliente: descuentoClienteMonto,
        descuentoClienteNombre: descuentoClienteObj?.nombre || "",

        user,
        cai: cai || {},
        cliente_nombre: venta.cliente_nombre,
        cliente_rtn: venta.cliente_rtn,
        cliente_telefono: venta.cliente_telefono,
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

      // reset
      setCarrito([]);
      setVenta({
        metodo_pago: "efectivo",
        efectivo: 0,
        cambio: 0,
        cliente_nombre: "",
        cliente_rtn: "",
        cliente_telefono: "",
        cliente_direccion: "",
      });

      setTipoCliente("");
      setDescuentos([]);
      setDescuentoSeleccionadoId("");

      limpiarInputBuscar();
      setFormularioCliente({
        nombre: "",
        rtn: "",
        telefono: "",
        direccion: "",
      });
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
    clientesFiltrados: clientesFiltradosMemo,
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

    // descuentos por cliente
    tipoCliente,
    setTipoCliente,
    descuentos,
    descuentosLoading,
    descuentoSeleccionadoId,
    setDescuentoSeleccionadoId,
    descuentoClienteObj,
    descuentoClienteMonto,

    // totales
    subtotalBruto,
    descuentoTotal,
    total,
    totalConDescCliente,
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
