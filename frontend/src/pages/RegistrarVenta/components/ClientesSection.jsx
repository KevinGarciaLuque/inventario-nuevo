// frontend/src/pages/RegistrarVenta/components/ClientesSection.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  FormCheck,
  FormControl,
  InputGroup,
  Spinner,
  Table,
  Badge,
} from "react-bootstrap";
import { FaUserPlus, FaExchangeAlt, FaTimes, FaWhatsapp } from "react-icons/fa";

export default function ClientesSection({
  usarRTN,
  clientesLoading,
  clientesFiltrados,
  filtroCliente,
  setFiltroCliente,
  setModalCliente,
  venta,
  setVenta,

  // opcional: tipo de cliente (descuentos)
  tipoCliente,
  setTipoCliente,
}) {
  if (!usarRTN) return null;

  const [mostrarLista, setMostrarLista] = useState(true);

  const TIPOS_CON_DESCUENTO = useMemo(
    () => [
      "tercera_edad",
      "cuarta_edad",
      "discapacitado",
      "empleado",
      "preferencial",
    ],
    [],
  );

  const soloDigitos = (s) => String(s || "").replace(/\D+/g, "");

  const esRtnValido = (rtn) => soloDigitos(rtn).length === 14;

  // Heurística Honduras: celular suele ser 8 dígitos y empieza 3/8/9
  const esCelularHN = (tel) => {
    const t = soloDigitos(tel);
    return t.length === 8 && ["3", "8", "9"].includes(t[0]);
  };

  const whatsappLinkHN = (tel) => {
    const t = soloDigitos(tel);
    if (!t) return "";
    // si ya viene con código país o 12+ dígitos, úsalo tal cual
    if (t.length >= 11) return `https://wa.me/${t}`;
    // si viene 8 dígitos, asumir Honduras 504
    if (t.length === 8) return `https://wa.me/504${t}`;
    // fallback
    return `https://wa.me/${t}`;
  };

  const hayClienteSeleccionado = useMemo(() => {
    return Boolean(
      (venta?.cliente_rtn || "").trim() || (venta?.cliente_nombre || "").trim(),
    );
  }, [venta]);

  useEffect(() => {
    if (hayClienteSeleccionado) setMostrarLista(false);
  }, [hayClienteSeleccionado]);

  const seleccionarCliente = (cliente) => {
    const tel = cliente.telefono || cliente.celular || "";

    setVenta((prev) => ({
      ...prev,
      cliente_nombre: cliente.nombre || "",
      cliente_rtn: cliente.rtn || "",
      cliente_direccion: cliente.direccion || "",
      cliente_telefono: tel,
    }));

    // ✅ Bloqueo de descuentos si no aplica
    if (setTipoCliente) {
      const t = cliente?.tipo_cliente || "";
      if (t && TIPOS_CON_DESCUENTO.includes(t)) setTipoCliente(t);
      else setTipoCliente(""); // limpia para que no aplique descuento
    }

    setFiltroCliente("");
    setMostrarLista(false);
  };

  const cambiarCliente = () => setMostrarLista(true);

  const quitarCliente = () => {
    setVenta((prev) => ({
      ...prev,
      cliente_nombre: "",
      cliente_rtn: "",
      cliente_direccion: "",
      cliente_telefono: "",
    }));

    if (setTipoCliente) setTipoCliente("");
    setFiltroCliente("");
    setMostrarLista(true);
  };

  const rtnOk = esRtnValido(venta?.cliente_rtn);
  const telOk = Boolean(soloDigitos(venta?.cliente_telefono));
  const telEsCel = esCelularHN(venta?.cliente_telefono);
  const waLink = whatsappLinkHN(venta?.cliente_telefono);

  return (
    <>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h5 className="m-0">Clientes</h5>

        <Button
          variant="success"
          size="sm"
          onClick={() => setModalCliente(true)}
          title="Agregar Cliente"
        >
          <FaUserPlus className="me-1" /> Agregar
        </Button>
      </div>

      {/* Tarjeta del cliente seleccionado */}
      {hayClienteSeleccionado && !mostrarLista && (
        <div className="p-3 bg-white border rounded shadow-sm mb-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div className="fw-semibold" style={{ fontSize: 16 }}>
                {venta.cliente_nombre || "Cliente"}
              </div>

              {/* RTN grande + validación */}
              {venta.cliente_rtn ? (
                <div className="mt-2 d-flex flex-wrap align-items-center gap-2">
                  <Badge
                    bg={rtnOk ? "success" : "danger"}
                    className="px-3 py-2"
                    style={{
                      fontSize: 14,
                      letterSpacing: 0.6,
                      borderRadius: 10,
                    }}
                    title={rtnOk ? "RTN válido (14 dígitos)" : "RTN no válido"}
                  >
                    RTN: {venta.cliente_rtn}
                  </Badge>

                  <span
                    className={`small ${rtnOk ? "text-success" : "text-danger"}`}
                  >
                    {rtnOk ? "RTN válido" : "RTN no válido"}
                  </span>
                </div>
              ) : null}

              {/* Teléfono + WhatsApp */}
              <div className="mt-2 d-flex flex-wrap align-items-center gap-2">
                <Badge
                  bg={telOk ? "secondary" : "warning"}
                  className="px-3 py-2"
                  style={{ fontSize: 13, borderRadius: 10 }}
                >
                  Tel: {venta.cliente_telefono || "No registrado"}
                </Badge>

                {telOk && telEsCel && waLink ? (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-success btn-sm"
                    title="Abrir WhatsApp"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FaWhatsapp /> WhatsApp
                  </a>
                ) : null}
              </div>

              {/* Dirección */}
              <div className="text-muted mt-2" style={{ fontSize: 13 }}>
                {venta.cliente_direccion || "Sin dirección"}
              </div>

              {/* Tipo cliente */}
              {tipoCliente ? (
                <div className="mt-2">
                  <Badge bg="info">
                    Tipo: {String(tipoCliente).replaceAll("_", " ")}
                  </Badge>
                </div>
              ) : (
                <div className="mt-2 text-muted" style={{ fontSize: 12 }}>
                  Sin tipo con descuento
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={cambiarCliente}
              >
                <FaExchangeAlt className="me-1" /> Cambiar cliente
              </Button>

              <Button
                variant="outline-danger"
                size="sm"
                onClick={quitarCliente}
              >
                <FaTimes className="me-1" /> Quitar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Buscador + tabla */}
      {(!hayClienteSeleccionado || mostrarLista) && (
        <>
          <InputGroup className="mb-2">
            <FormControl
              placeholder="Buscar por nombre o RTN"
              value={filtroCliente}
              onChange={(e) => {
                setFiltroCliente(e.target.value);
                setMostrarLista(true);
              }}
              onFocus={() => setMostrarLista(true)}
            />
          </InputGroup>

          {mostrarLista && (
            <div className="scroll-container" style={{ maxHeight: 180 }}>
              {clientesLoading ? (
                <div className="d-flex align-items-center gap-2 text-muted">
                  <Spinner animation="border" size="sm" />
                  Cargando clientes...
                </div>
              ) : (
                <Table bordered hover size="sm" responsive className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Nombre</th>
                      <th>RTN</th>
                      <th>Teléfono</th>
                      <th>Dirección</th>
                      <th>Activo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map((cliente) => (
                      <tr
                        key={cliente.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => seleccionarCliente(cliente)}
                        className={
                          venta.cliente_rtn === cliente.rtn
                            ? "table-primary"
                            : ""
                        }
                      >
                        <td>{cliente.nombre}</td>
                        <td>
                          <span
                            className={
                              esRtnValido(cliente.rtn)
                                ? "text-success fw-semibold"
                                : "text-danger fw-semibold"
                            }
                            title={
                              esRtnValido(cliente.rtn)
                                ? "RTN válido (14 dígitos)"
                                : "RTN no válido"
                            }
                          >
                            {cliente.rtn}
                          </span>
                        </td>
                        <td>{cliente.telefono || cliente.celular || "-"}</td>
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

                    {clientesFiltrados.length === 0 && !clientesLoading && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-3">
                          No hay resultados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
