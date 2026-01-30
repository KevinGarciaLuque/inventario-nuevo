// frontend/src/pages/RegistrarVenta/hooks/useVenta.js
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/axios";
import generarReciboPDF from "../../../utils/generarReciboPDF";
import { limpiarCodigo } from "../utils/ventaUtils";

export default function useVenta({ user }) {
  // =======================
  // CONSTANTES
  // =======================
  const round2 = (n) => Number((Number(n) || 0).toFixed(2));

  // =======================
  // ESTADOS PRINCIPALES
  // =======================
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);

  const [buscar, setBuscar] = useState("");
  const inputBuscarRef = useRef(null);

  // ✅ CAJA
  const [cajaLoading, setCajaLoading] = useState(true);
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [cajaInfo, setCajaInfo] = useState(null);
  const [msgCaja, setMsgCaja] = useState("");

  // ✅ CAI
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
    telefono: "",
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
    cliente_telefono: "",
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

  // =======================
  // ✅ IMPUESTOS (NUEVO)
  // =======================
  const [impuestos, setImpuestos] = useState([]);
  const [impuestosLoading, setImpuestosLoading] = useState(false);

  const cargarImpuestos = async () => {
    try {
      setImpuestosLoading(true);
      const res = await api.get("/impuestos");
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setImpuestos(rows.filter((r) => Number(r.activo ?? 1) === 1));
    } catch (e) {
      console.error("No se pudieron cargar impuestos", e);
      setImpuestos([]);
    } finally {
      setImpuestosLoading(false);
    }
  };

  // =======================
  // HELPERS
  // =======================
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

  // ✅ CARGAS INICIALES
  useEffect(() => {
    consultarCajaEstado();
    consultarCai();
    cargarProductos();
    cargarImpuestos(); // ✅ IMPORTANTE
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

      const impuestoId =
        producto.impuesto_id ??
        producto.id_impuesto ??
        producto.impuestoId ??
        null;

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
            impuesto_id: impuestoId, // ✅ CLAVE
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
          impuesto_id: impuestoId, // ✅ CLAVE
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
        `/productos/by-codigo/${encodeURIComponent(limpio)}`,
      );

      if (res.data) {
        agregarProductoAlCarrito(res.data);
        limpiarInputBuscar();
        return true;
      }

      return false;
    } catch (e) {
      if (e?.response?.status !== 404) {
        console.error(e);
        mostrarToast("Error al buscar producto");
      }
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

  const clientesFiltradosMemo = useMemo(() => {
    const f = (filtroCliente || "").toLowerCase();
    return clientes.filter((c) =>
      `${c.nombre || ""} ${c.rtn || ""}`.toLowerCase().includes(f),
    );
  }, [clientes, filtroCliente]);

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

      const creado =
        res?.data?.cliente ||
        (res?.data && typeof res.data === "object" ? res.data : null);

      setModalCliente(false);
      setFormularioCliente({
        nombre: "",
        rtn: "",
        telefono: "",
        direccion: "",
      });

      await cargarClientes();

      const finalCliente = creado || payload;

      setVenta((prev) => ({
        ...prev,
        cliente_nombre: finalCliente.nombre || "",
        cliente_rtn: finalCliente.rtn || "",
        cliente_telefono: finalCliente.telefono || payload.telefono || "",
        cliente_direccion: finalCliente.direccion || "",
      }));

      const t = finalCliente?.tipo_cliente || "";
      if (t && TIPOS_CON_DESCUENTO.includes(t)) setTipoCliente(t);
      else setTipoCliente("");

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


  useEffect(() => {
  console.table(
    carrito.map(i => ({
      producto: i.nombre,
      impuesto_id: i.impuesto_id,
      tasa_aplicada: getTasaItem(i)
    }))
  );
}, [carrito]);


  const descuentoClienteObj = useMemo(() => {
    if (!descuentoSeleccionadoId) return null;
    return (
      descuentos.find(
        (d) => String(d.id) === String(descuentoSeleccionadoId),
      ) || null
    );
  }, [descuentoSeleccionadoId, descuentos]);

  // =======================
  // IMPUESTOS DINÁMICOS (incluidos)
  // =======================
  const impuestosMap = useMemo(() => {
    const arr = Array.isArray(impuestos) ? impuestos : [];
    const map = {};
    for (const it of arr) {
      const id = it?.id;
      if (id == null) continue;
      map[id] = {
        id,
        nombre: it?.nombre ?? "",
        porcentaje: Number(it?.porcentaje ?? it?.valor ?? 0) || 0,
        activo: Number(it?.activo ?? 1) ? 1 : 0,
      };
    }
    return map;
  }, [impuestos]);

  function extraerImpuestoIncluido(montoConImpuesto, porcentaje) {
    const m = Number(montoConImpuesto || 0);
    const p = Number(porcentaje || 0);
    if (!Number.isFinite(m) || m <= 0) return 0;
    if (!Number.isFinite(p) || p <= 0) return 0;

    const neto = m / (1 + p / 100);
    return m - neto;
  }

function getTasaItem(item) {
  const impId = item?.impuesto_id ?? item?.id_impuesto ?? item?.impuestoId;

  // 1) impuesto explícito del producto
  if (impId != null && impuestosMap[impId]) {
    return Number(impuestosMap[impId].porcentaje || 0) || 0;
  }

  // 2) fallback por porcentaje directo
  const p =
    item?.porcentaje_impuesto ??
    item?.impuesto_porcentaje ??
    item?.isv ??
    item?.iva;

  if (Number(p) > 0) return Number(p);

  // 3) DEFAULT: ISV 15% (para que pan y la mayoría caigan aquí)
  return 15;
}

  function getNombreImpuestoItem(item) {
    const impId = item?.impuesto_id ?? item?.id_impuesto ?? item?.impuestoId;
    if (impId != null && impuestosMap[impId]) {
      const nom = impuestosMap[impId]?.nombre;
      const por = Number(impuestosMap[impId]?.porcentaje || 0) || 0;
      return nom?.trim() ? nom : por > 0 ? `Impuesto ${por}%` : "Exento";
    }

    const tasa = getTasaItem(item);
    return tasa > 0 ? `Impuesto ${tasa}%` : "Exento";
  }

  // =======================
  // TOTALES
  // =======================
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

  const { impuesto, impuestosDetalle } = useMemo(() => {
    const totalBase = Number(total || 0);
    const descCliente = Number(descuentoClienteMonto || 0);

    let impuestoTotal = 0;
    const detalle = {};

    for (const item of carrito) {
      const cant = Number(item.cantidad ?? 0) || 0;
      const pf = Number(item.precio_final ?? item.precio ?? 0) || 0;
      const linea = cant * pf;

      if (linea <= 0) continue;

      const proporcion = totalBase > 0 ? linea / totalBase : 0;
      const descLinea = descCliente > 0 ? descCliente * proporcion : 0;

      const lineaNeta = Math.max(0, linea - descLinea);

      const tasa = getTasaItem(item);
      const nombre = getNombreImpuestoItem(item);

      const isvLinea = extraerImpuestoIncluido(lineaNeta, tasa);

      impuestoTotal += isvLinea;
      detalle[nombre] = (detalle[nombre] || 0) + isvLinea;
    }

    const detalleRound = {};
    for (const [k, v] of Object.entries(detalle)) detalleRound[k] = round2(v);

    return {
      impuesto: round2(impuestoTotal),
      impuestosDetalle: detalleRound,
    };
  }, [carrito, total, descuentoClienteMonto, impuestosMap]);

  const subtotal = useMemo(() => {
    return round2(Number(totalConDescCliente || 0) - Number(impuesto || 0));
  }, [totalConDescCliente, impuesto]);

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
        impuesto_id: item.impuesto_id ?? null, // ✅ por si lo quieres registrar
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
      numeroFactura: data?.numeroFactura || data?.numero_factura || "",

      // detalle
      carrito: Array.isArray(carrito) ? carrito : [],

      // totales
      subtotalBruto: Number(subtotalBruto || 0),
      descuentoTotal: Number(descuentoTotal || 0),

      // ✅ neto + impuestos + total (ya calculados en useVenta)
      subtotal: Number(subtotal || 0),
      impuesto: Number(impuesto || 0),
      total: Number(totalConDescCliente || 0),

      // ✅ extras (descuento cliente)
      // total "antes del descuento cliente" = total (con desc de producto, sin desc cliente)
      totalSinDescCliente: Number(total || 0),

      descuentoCliente: Number(descuentoClienteMonto || 0),
      descuentoClienteNombre: String(descuentoClienteObj?.nombre || ""),

      // ✅ IMPORTANTÍSIMO: detalle de impuestos (15/18/etc) para el PDF
      impuestosDetalle:
        impuestosDetalle && typeof impuestosDetalle === "object"
          ? impuestosDetalle
          : {},

      // usuario/cai
      user,
      cai: cai || {},

      // cliente
      cliente_nombre: venta?.cliente_nombre || "",
      cliente_rtn: venta?.cliente_rtn || "",
      cliente_telefono: venta?.cliente_telefono || "",
      cliente_direccion: venta?.cliente_direccion || "",

      // pago
      metodoPago: venta?.metodo_pago || "efectivo",
      efectivo: Number(venta?.efectivo || 0),
      cambio: Number(venta?.cambio || 0),
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
    const data = modal?.dataRecibo;
    if (!data) return;

    generarReciboPDF({
      ...data,
      autoImprimir: true,
      abrirEnNuevaPestana: false,
    });

    setModal((prev) => ({ ...prev, show: false }));
  };

  console.table(
    carrito.map((i) => ({
      producto: i.nombre,
      impuesto_id: i.impuesto_id,
    })),
  );
  console.log("impuestosDetalle:", impuestosDetalle);


  // =======================
  // RETURN
  // =======================
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
    agregarProductoAlCarrito,
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

    // impuestos
    impuestos,
    impuestosLoading,
    impuestosDetalle,

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

